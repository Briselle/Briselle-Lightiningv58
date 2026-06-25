/* Corrected NotionPage.jsx (best-effort reconstruction) */
import { useState, useCallback, useEffect } from 'react';
import { PageProvider, usePageContext } from './PageContext';
import { Sidebar, Topbar, PageHeader, CoverImage } from './layout';
import BlockRenderer from './BlockRenderer';
import { SlashMenu, ContextMenu, InlineToolbar, NotionPageTextComment, NotionPageTopComments } from './menus';
import './NotionPage.css';

export default function NotionPage({
  initialBlocks,
  initialTitle,
  initialIcon,
  initialCover,
  initialCoverPosition,
  initialComments,
  initialAuditData,
  onChange,
  showSidebar = true,
  commentsAlwaysShow = false,
  commentsAlwaysOff = false,
  commentsAutoHideDelay = 30,
  commentsHoverMode = 'text'
}) {
  return (
    <PageProvider
      initialBlocks={initialBlocks}
      initialTitle={initialTitle}
      initialIcon={initialIcon}
      initialCover={initialCover}
      initialCoverPosition={initialCoverPosition}
      initialComments={initialComments}
      initialAuditData={initialAuditData}
      onChange={onChange}
    >
      <NotionPageInner
        showSidebarProp={showSidebar}
        commentsAlwaysShow={commentsAlwaysShow}
        commentsAlwaysOff={commentsAlwaysOff}
        commentsAutoHideDelay={commentsAutoHideDelay}
        commentsHoverMode={commentsHoverMode}
      />
    </PageProvider>
  );
}

function NotionPageInner({
  showSidebarProp,
  commentsAlwaysShow = false,
  commentsAlwaysOff = false,
  commentsAutoHideDelay = 30,
  commentsHoverMode = 'text'
}) {
  const {
    pageState,
    addBlock,
    hideSlashMenu,
    hideContextMenu,
    comments,
    activeCommentId,
    setActiveCommentId,
    deleteConfirm,
    hoveredCommentId,
    setHoveredCommentId,
    showPageCommentComposer
  } = usePageContext();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredTooltipRect, setHoveredTooltipRect] = useState(null);
  const [isCommentRegionHovered, setIsCommentRegionHovered] = useState(false);

  const activeComment = (comments || []).find(c => c.id === activeCommentId);
  const isActiveTextComment = activeComment && !activeComment.isPageComment && activeComment.blockId !== 'page';
  const isActivePageComment = activeComment && (activeComment.isPageComment || activeComment.blockId === 'page');
  const hasTextComments = (comments || []).some(c => !c.isPageComment && c.blockId !== 'page');
  const hasTextDraft = (comments || []).some(c => c.isDraft && !c.isPageComment && c.blockId !== 'page');

  const isHoverActive =
    commentsAlwaysOff ? false :
    commentsHoverMode === 'region' ? isCommentRegionHovered :
    commentsHoverMode === 'both' ? (!!hoveredCommentId || isCommentRegionHovered) :
    !!hoveredCommentId;

  const [isCommentsSidebarVisible, setIsCommentsSidebarVisible] = useState(
    (commentsAlwaysShow && !commentsAlwaysOff) || isActiveTextComment || (!commentsAlwaysOff && isHoverActive) || hasTextDraft
  );
  const [isPageCommentsVisible, setIsPageCommentsVisible] = useState(
    showPageCommentComposer || isActivePageComment
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(v => !v);
  }, []);

  useEffect(() => {
    // 1. If always show is true and not always off, keep it visible
    if (commentsAlwaysShow && !commentsAlwaysOff) {
      setIsCommentsSidebarVisible(true);
      return;
    }

    // 2. Draft comments should keep the sidebar visible
    if (hasTextDraft) {
      setIsCommentsSidebarVisible(true);
      return;
    }

    // 3. Under normal hover activation (if not Always Off)
    if (!commentsAlwaysOff && isHoverActive) {
      setIsCommentsSidebarVisible(true);
      return;
    }

    // 4. If there is an active text comment (clicked comment)
    if (isActiveTextComment) {
      // Ensure it is visible immediately when active
      setIsCommentsSidebarVisible(true);

      // If Always Off is configured
      if (commentsAlwaysOff) {
        // If cursor is in the comment area (sidebar), keep it open immediately
        if (isCommentRegionHovered) {
          return;
        }
        // Otherwise, start a 5-second auto-hide timer
        const timer = setTimeout(() => {
          setIsCommentsSidebarVisible(false);
          setActiveCommentId(null); // Clear active comment when auto-hiding
        }, 5000);
        return () => clearTimeout(timer);
      } else {
        // Normal behavior: clicked comment keeps it open
        return;
      }
    }

    // 5. Otherwise, start the standard auto-hide delay timer
    const delay = commentsAlwaysOff ? 5 : (commentsAutoHideDelay || 30);
    const timer = setTimeout(() => {
      setIsCommentsSidebarVisible(false);
      if (commentsAlwaysOff) {
        setActiveCommentId(null);
      }
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [
    commentsAlwaysShow,
    commentsAlwaysOff,
    commentsAutoHideDelay,
    isActiveTextComment,
    isHoverActive,
    hasTextDraft,
    isCommentRegionHovered,
    setActiveCommentId
  ]);

  useEffect(() => {
    if (
      showPageCommentComposer ||
      isActivePageComment
    ) {
      setIsPageCommentsVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsPageCommentsVisible(false);
    }, (commentsAutoHideDelay || 30) * 1000);

    return () => clearTimeout(timer);
  }, [
    commentsAutoHideDelay,
    showPageCommentComposer,
    isActivePageComment
  ]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        hideSlashMenu();
        hideContextMenu();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hideSlashMenu, hideContextMenu]);

  useEffect(() => {
    let lastInRegion = false;
    const handleMouseMove = (e) => {
      const container = document.querySelector('.page-content');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const isHidden = container.classList.contains('comments-hidden');
      const threshold = isHidden ? 96 : 360;
      let inCommentRegion = e.clientX >= rect.right - threshold && e.clientX <= rect.right &&
                             e.clientY >= rect.top && e.clientY <= rect.bottom;
      
      // Exclude page-level comments container (expanded or minimized) to prevent hover activation clashes
      if (e.target && e.target.closest('.notion-page-top-comments')) {
        inCommentRegion = false;
      }

      if (inCommentRegion !== lastInRegion) {
        lastInRegion = inCommentRegion;
        setIsCommentRegionHovered(inCommentRegion);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    document
      .querySelectorAll('.inline-comment-highlight.active, .inline-comment.active')
      .forEach(el => el.classList.remove('active'));

    if (activeCommentId) {
      const el = document.querySelector(
        `.inline-comment-highlight[data-comment-id="${activeCommentId}"], .inline-comment[data-comment-id="${activeCommentId}"]`
      );

      if (el) el.classList.add('active');
    }
  }, [activeCommentId]);

  useEffect(() => {
    document
      .querySelectorAll('.inline-comment-highlight.hovered, .inline-comment.hovered')
      .forEach(el => el.classList.remove('hovered'));

    if (hoveredCommentId) {
      document
        .querySelectorAll(
          `.inline-comment-highlight[data-comment-id="${hoveredCommentId}"], .inline-comment[data-comment-id="${hoveredCommentId}"]`
        )
        .forEach(el => el.classList.add('hovered'));
    }
  }, [hoveredCommentId]);

  const handleMouseOverContent = useCallback((e) => {
    // If hovering inside the sidebar comment cards, do not clear or override
    if (e.target.closest('.comment-annotations')) {
      return;
    }

    const mark = e.target.closest('.inline-comment-highlight, .inline-comment');
    if (mark) {
      const id = mark.getAttribute('data-comment-id');
      if (id) {
        setHoveredCommentId(id);
        return;
      }
    }

    setHoveredCommentId(null);
  }, [setHoveredCommentId]);

  const handleMouseLeaveContent = useCallback(() => {
    setHoveredCommentId(null);
  }, [setHoveredCommentId]);

  useEffect(() => {
    if (!hoveredCommentId) {
      setHoveredTooltipRect(null);
      return;
    }

    const markEl = document.querySelector(
      `.inline-comment-highlight[data-comment-id="${hoveredCommentId}"], .inline-comment[data-comment-id="${hoveredCommentId}"]`
    );

    if (markEl) {
      const rect = markEl.getBoundingClientRect();
      const parent = document.querySelector('.page-content')?.getBoundingClientRect();

      if (parent) {
        setHoveredTooltipRect({
          left: rect.left - parent.left + rect.width / 2,
          top: rect.top - parent.top - 8,
          text:
            comments?.find(c => c.id === hoveredCommentId)?.thread?.[0]?.text ||
            'Comment'
        });
      }
    }
  }, [hoveredCommentId, comments]);

  const handleBottomClick = useCallback(() => {
    const last = pageState.blocks?.[pageState.blocks.length - 1];
    const nb = addBlock('paragraph', last?.id);

    if (!nb) return;

    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-block-id="${nb.id}"] [contenteditable]`
      );
      if (el) el.focus();
    });
  }, [pageState.blocks, addBlock]);

  const handlePageClick = useCallback(
    (e) => {
      const mark = e.target.closest('.inline-comment-highlight, .inline-comment');

      if (mark) {
        const commentId = mark.getAttribute('data-comment-id');
        if (commentId) {
          setActiveCommentId(commentId);
          return;
        }
      }

      if (!e.target.closest('.comment-annotations')) {
        setActiveCommentId(null);
      }
    },
    [setActiveCommentId]
  );

  return (
    <div className="notion-app">
      {showSidebarProp && (
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      )}

      <div className="main-content">
        {showSidebarProp && <Topbar onToggleSidebar={toggleSidebar} />}

        <div className="page-scroll">
          <CoverImage />

          <PageHeader
            hasComments={hasTextComments}
            commentsVisible={isCommentsSidebarVisible}
            onClick={handlePageClick}
          />

          <div
            className={`page-content${hasTextComments ? ' has-comments' : ''}${isCommentsSidebarVisible ? '' : ' comments-hidden'}`}
            onClick={handlePageClick}
            onMouseOver={handleMouseOverContent}
            onMouseLeave={handleMouseLeaveContent}
          >
            <NotionPageTopComments
              visible={isPageCommentsVisible}
              setVisible={setIsPageCommentsVisible}
            />

            <div className="blocks-container">
              {pageState.blocks?.map((block, i) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  blocksArray={pageState.blocks}
                  blockIndex={i}
                />
              ))}
            </div>

            <div className="page-bottom-space" onClick={handleBottomClick} />

            {hoveredTooltipRect && (
              <div
                className="comment-hover-tooltip"
                style={{
                  left: hoveredTooltipRect.left,
                  top: hoveredTooltipRect.top
                }}
              >
                {hoveredTooltipRect.text}
                <div className="tooltip-arrow" />
              </div>
            )}

            <NotionPageTextComment
              visible={isCommentsSidebarVisible}
              onHoverChange={setIsCommentRegionHovered}
            />
          </div>
        </div>

        <SlashMenu />
        <ContextMenu />
        <InlineToolbar />

        {deleteConfirm && <DeleteConfirmModal config={deleteConfirm} />}
      </div>
    </div>
  );
}

function DeleteConfirmModal({ config }) {
  if (!config) return null;

  return (
    <div className="confirm-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <div className="confirm-modal">
        <h3>Delete associated comments?</h3>
        <p>{config.message}</p>

        <div className="confirm-modal-actions">
          <button className="confirm-btn-cancel" onClick={config.onCancel}>
            Keep comments
          </button>

          <button className="confirm-btn-delete" onClick={config.onConfirm}>
            Delete comments
          </button>
        </div>
      </div>
    </div>
  );
}
