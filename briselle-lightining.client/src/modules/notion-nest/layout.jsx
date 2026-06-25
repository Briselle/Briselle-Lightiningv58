import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Image, MessageSquare, Smile } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePageContext } from './PageContext';
import { NotionIconPicker, NotionCoverPicker, SVG_ICONS, renderIconSvg, hasPageIcon, renderPageIcon } from './menus';

// Helper functions for Page Audit Metadata
export function resolveUserDisplayName(userId, currentUser) {
  if (!userId) return 'System';
  const uId = String(userId);
  if (currentUser && String(currentUser.id) === uId) {
    return currentUser.name || 'Current User';
  }
  if (uId === '1212' || uId === '1') return 'John Doe';
  if (uId === '2') return 'Jane Smith';
  if (uId === '3') return 'Bob Wilson';
  return `User #${uId}`;
}

export function formatAuditDateTime(isoString) {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'N/A';
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch (e) {
    return 'N/A';
  }
}

export function calculateWordCount(blocks) {
  if (!blocks || !Array.isArray(blocks)) return 0;
  let totalWords = 0;

  function countWordsInText(text) {
    if (!text || typeof text !== 'string') return 0;
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, " ").trim();
    if (!cleanText) return 0;
    const words = cleanText.split(/\s+/);
    return words.filter(w => w.length > 0).length;
  }

  function traverse(block) {
    if (!block) return;
    if (block.content) {
      totalWords += countWordsInText(block.content);
    }
    if (block.type === 'equation' && block.expression) {
      totalWords += countWordsInText(block.expression);
    }
    if (block.type === 'bookmark') {
      if (block.bookmarkTitle) totalWords += countWordsInText(block.bookmarkTitle);
      if (block.description) totalWords += countWordsInText(block.description);
    }
    if (block.type === 'file' && block.fileName) {
      totalWords += countWordsInText(block.fileName);
    }
    if (block.type === 'sub_page' && block.pageTitle) {
      totalWords += countWordsInText(block.pageTitle);
    }
    if (block.type === 'table' && Array.isArray(block.rows)) {
      block.rows.forEach(row => {
        if (Array.isArray(row)) {
          row.forEach(cell => {
            totalWords += countWordsInText(cell);
          });
        }
      });
    }
    if (Array.isArray(block.children)) {
      block.children.forEach(traverse);
    }
    if (Array.isArray(block.columns)) {
      block.columns.forEach(col => {
        if (col && Array.isArray(col.blocks)) {
          col.blocks.forEach(traverse);
        }
      });
    }
    if (Array.isArray(block.tabs)) {
      block.tabs.forEach(tab => {
        if (tab && Array.isArray(tab.blocks)) {
          tab.blocks.forEach(traverse);
        }
      });
    }
  }

  blocks.forEach(traverse);
  return totalWords;
}

/* ---- Sidebar ---- */
export const Sidebar = memo(function Sidebar({ collapsed, onToggle }) {
  const { pageState } = usePageContext();
  const pages = [
    { icon: '📝', name: 'Getting Started' },
    { icon: '✅', name: 'Tasks' },
    { icon: '📒', name: 'Notes' },
    { icon: '🚀', name: 'Projects' },
  ];

  return (
    <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-workspace">
          <span className="workspace-icon">🏠</span>
          <span className="workspace-name">NotionNest</span>
        </div>
        <button className="sidebar-collapse-btn" onClick={onToggle} title="Collapse sidebar">
          ‹‹
        </button>
      </div>

      <div className="sidebar-search">
        🔍 Search
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section">Private</div>
        {pages.map(p => (
          <div key={p.name} className={`sidebar-item${pageState.title === p.name ? ' active' : ''}`}>
            <span className="sidebar-item-icon">{p.icon}</span>
            <span className="sidebar-item-name">{p.name}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-new-page">
        ＋ New page
      </div>
    </div>
  );
});

/* ---- Topbar ---- */
export const Topbar = memo(function Topbar({ onToggleSidebar }) {
  const { pageState } = usePageContext();
  const { recordId } = useParams();

  const displayTitle = pageState.title && pageState.title !== recordId
    ? `${pageState.title} (${recordId})`
    : recordId;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} title="Toggle sidebar">
          ☰
        </button>
        <div className="topbar-breadcrumb">
          {pageState.icon && (
            <span className="topbar-breadcrumb-icon" style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}>
              {renderPageIcon(pageState.icon, '16px')}
            </span>
          )}
          <span className="breadcrumb-title">{displayTitle || 'Untitled'}</span>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="topbar-btn">Share</button>
        <button className="topbar-btn topbar-btn-icon">☆</button>
        <button className="topbar-btn topbar-btn-icon">⋯</button>
      </div>
    </div>
  );
});

/* ---- CoverImage ---- */
export const CoverImage = memo(function CoverImage() {
  const { pageState, updatePage } = usePageContext();
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [tempPosition, setTempPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const btnRef = useRef(null);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const startPos = useRef(50);

  useEffect(() => {
    if (pageState.coverPosition !== undefined) {
      setTempPosition(pageState.coverPosition);
    }
  }, [pageState.coverPosition, isRepositioning]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const height = rect.height || 240;
      const deltaY = e.clientY - startY.current;
      const deltaPercent = (deltaY / height) * 100;
      const nextPos = Math.max(0, Math.min(100, startPos.current - deltaPercent));
      setTempPosition(nextPos);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    if (!isRepositioning) return;
    e.preventDefault();
    startY.current = e.clientY;
    startPos.current = tempPosition;
    setIsDragging(true);
  };

  if (!pageState.cover) return null;

  const currentPosPercent = isRepositioning ? tempPosition : (pageState.coverPosition ?? 50);

  return (
    <div
      ref={containerRef}
      className={`page-cover${isRepositioning ? ' is-repositioning' : ''}`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isRepositioning ? (isDragging ? 'grabbing' : 'ns-resize') : 'default' }}
    >
      <img
        src={pageState.cover}
        alt="Cover"
        style={{ objectPosition: `center ${currentPosPercent}%` }}
      />
      
      {isRepositioning && (
        <div className="page-cover-reposition-banner">
          Drag image to reposition
        </div>
      )}

      <div className="page-cover-actions">
        {isRepositioning ? (
          <>
            <button
              className="page-cover-btn save-pos-btn"
              onClick={() => {
                updatePage({ coverPosition: tempPosition });
                setIsRepositioning(false);
              }}
            >
              Save position
            </button>
            <button
              className="page-cover-btn cancel-pos-btn"
              onClick={() => {
                setIsRepositioning(false);
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="page-cover-btn"
              onClick={() => {
                setIsRepositioning(true);
              }}
            >
              Reposition
            </button>
            <button
              ref={btnRef}
              className="page-cover-btn"
              onClick={() => setShowCoverPicker(v => !v)}
            >
              Change cover
            </button>
            <button
              className="page-cover-btn"
              onClick={() => updatePage({ cover: null, coverPosition: 50 })}
            >
              Remove
            </button>
          </>
        )}
      </div>

      {showCoverPicker && (
        <NotionCoverPicker
          position={{
            x: btnRef.current ? Math.max(10, btnRef.current.getBoundingClientRect().right - 340) : 100,
            y: btnRef.current ? btnRef.current.getBoundingClientRect().bottom + window.scrollY : 100
          }}
          onSelect={(url) => updatePage({ cover: url, coverPosition: 50 })}
          onClose={() => setShowCoverPicker(false)}
        />
      )}
    </div>
  );
});

/* ---- PageHeader ---- */
export const PageHeader = memo(function PageHeader({ hasComments, commentsVisible, onClick }) {
  const { pageState, updatePage, setCommentSidebarOpen, setShowPageCommentComposer, auditData } = usePageContext();
  const currentUser = useAuthStore((s) => s.user);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const iconRef = useRef(null);
  const titleRef = useRef(null);
  const coverBtnRef = useRef(null);
  const titleInitialized = useRef(false);

  useEffect(() => {
    if (titleRef.current && !titleInitialized.current) {
      titleRef.current.textContent = pageState.title || '';
      titleInitialized.current = true;
      if (!pageState.title) {
        titleRef.current.classList.add('is-empty');
      }
    }
  }, []);

  const handleTitleInput = useCallback((e) => {
    const text = e.currentTarget.textContent;
    updatePage({ title: text });
    e.currentTarget.classList.toggle('is-empty', text.trim().length === 0);
  }, [updatePage]);

  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = document.querySelector('.blocks-container .block [contenteditable]');
      if (first) first.focus();
    }
  }, []);

  const handleIconClick = useCallback(() => {
    if (!hasPageIcon(pageState.icon)) {
      updatePage({ icon: '📝' });
    }
    setShowEmojiPicker(true);
  }, [pageState.icon, updatePage]);

  const handleEmojiSelect = useCallback((emoji) => {
    updatePage({ icon: emoji });
  }, [updatePage]);

  const showAuditBlock = auditData?.showAuditMetadata && (auditData.createdAt || auditData.updatedAt);
  const createdByName = resolveUserDisplayName(auditData?.createdById, currentUser);
  const modifiedByName = resolveUserDisplayName(auditData?.modifiedById, currentUser);
  const formattedCreatedAt = formatAuditDateTime(auditData?.createdAt);
  const formattedUpdatedAt = formatAuditDateTime(auditData?.updatedAt);
  const wordCount = calculateWordCount(pageState.blocks);

  const showAuditCreatedOn = auditData?.showAuditCreatedOn ?? true;
  const showAuditCreatedBy = auditData?.showAuditCreatedBy ?? true;
  const showAuditModifiedOn = auditData?.showAuditModifiedOn ?? true;
  const showAuditModifiedBy = auditData?.showAuditModifiedBy ?? true;
  const showAuditWordCount = auditData?.showAuditWordCount ?? true;
  const freezeTitle = auditData?.freezeTitle ?? false;

  const auditItems = [];
  if (showAuditCreatedOn && auditData?.createdAt) {
    auditItems.push(
      <span key="created-on" className="page-audit-item">
        Created On: <span className="page-audit-value">{formattedCreatedAt}</span>
      </span>
    );
  }
  if (showAuditCreatedBy) {
    auditItems.push(
      <span key="created-by" className="page-audit-item">
        Created By: <span className="page-audit-value">{createdByName}</span>
      </span>
    );
  }
  if (showAuditModifiedOn && auditData?.updatedAt) {
    auditItems.push(
      <span key="modified-on" className="page-audit-item">
        Last Modified On: <span className="page-audit-value">{formattedUpdatedAt}</span>
      </span>
    );
  }
  if (showAuditModifiedBy) {
    auditItems.push(
      <span key="modified-by" className="page-audit-item">
        Last Modified By: <span className="page-audit-value">{modifiedByName}</span>
      </span>
    );
  }
  if (showAuditWordCount) {
    auditItems.push(
      <span key="word-count" className="page-audit-item">
        Word Count: <span className="page-audit-value">{wordCount}</span>
      </span>
    );
  }

  const renderAuditContent = () => {
    const rendered = [];
    auditItems.forEach((item, idx) => {
      rendered.push(item);
      if (idx < auditItems.length - 1) {
        rendered.push(<span key={`sep-${idx}`} style={{ color: '#dddbda', margin: '0 0.25rem' }}> | </span>);
      }
    });
    return rendered;
  };

  const hasCover = !!pageState.cover;
  const showHeaderSpacer = freezeTitle && !hasCover;

  return (
    <>
      {showHeaderSpacer && <div className="page-header-spacer" style={{ height: '56px' }} />}
      <div className={`page-header${freezeTitle ? ' is-frozen' : ''}`} onClick={onClick}>
        <div className={`page-header-inner${hasComments ? ' has-comments' : ''}${commentsVisible ? '' : ' comments-hidden'}`}>
        {/* Hover action buttons */}
        <div className="page-header-actions">
          {!hasPageIcon(pageState.icon) && (
            <button className="page-header-action-btn" onClick={handleIconClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Smile size={14} /> Add icon
            </button>
          )}
          {!pageState.cover && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                ref={coverBtnRef}
                className="page-header-action-btn"
                onClick={() => setShowCoverPicker(v => !v)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Image size={14} /> Add cover
              </button>
              {showCoverPicker && (
                <NotionCoverPicker
                  position={{
                    x: coverBtnRef.current ? Math.max(10, coverBtnRef.current.getBoundingClientRect().left) : 100,
                    y: coverBtnRef.current ? coverBtnRef.current.getBoundingClientRect().bottom + window.scrollY : 100
                  }}
                  onSelect={(url) => {
                    updatePage({ cover: url });
                    setShowCoverPicker(false);
                  }}
                  onClose={() => setShowCoverPicker(false)}
                />
              )}
            </div>
          )}
          <button
            className="page-header-action-btn"
            onClick={() => setShowPageCommentComposer(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <MessageSquare size={14} /> Add comment
          </button>
        </div>

        {/* Icon */}
        {hasPageIcon(pageState.icon) && (
          <div className="page-icon-wrapper" style={{ position: 'relative' }}>
            <span className="page-icon" ref={iconRef} onClick={handleIconClick}>
              {renderPageIcon(pageState.icon, '78px')}
            </span>
            {showEmojiPicker && (
              <NotionIconPicker
                position={{ x: 0, y: 90 }}
                currentIcon={pageState.icon}
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
        )}

        {/* Title — do NOT put children here; content is set once via useEffect to avoid cursor reset */}
        <div
          className={`page-title${!pageState.title ? ' is-empty' : ''}`}
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Untitled"
          onInput={handleTitleInput}
          onKeyDown={handleTitleKeyDown}
        />

        {/* Audit Metadata */}
        {showAuditBlock && auditItems.length > 0 && (
          <div className="page-audit-metadata">
            {renderAuditContent()}
          </div>
        )}
        </div>
      </div>
    </>
  );
});

