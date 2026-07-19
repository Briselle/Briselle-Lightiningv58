/* Corrected NotionPage.jsx (best-effort reconstruction) */
import { useState, useCallback, useEffect, useRef } from 'react';
import { PageProvider, usePageContext } from './PageContext';
import { Sidebar, Topbar, PageHeader, CoverImage } from './layout';
import BlockRenderer from './BlockRenderer';
import { SlashMenu, ContextMenu, InlineToolbar, NotionPageTextComment, NotionPageTopComments } from './menus';
import { POPULAR_FONTS } from './pages/NotionNestPage';
import { deobfuscateText, getRedactedContent } from './utils';
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
  commentsHoverMode = 'text',
  restrictedDeletion = false,
  imperativeRef
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
      imperativeRef={imperativeRef}
      restrictedDeletion={restrictedDeletion}
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

function unescapeHtml(html) {
  if (!html) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function convertHtmlToBlocks(element) {
  const blocks = [];
  const walk = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'p', 'li', 'blockquote', 'pre', 'hr'].includes(tag)) {
        let type = 'paragraph';
        if (tag === 'h1') type = 'heading1';
        else if (tag === 'h2') type = 'heading2';
        else if (tag === 'h3') type = 'heading3';
        else if (tag === 'blockquote') type = 'quote';
        else if (tag === 'pre') type = 'code';
        else if (tag === 'hr') type = 'divider';
        else if (tag === 'li') {
          const parentTag = node.parentNode?.tagName.toLowerCase();
          type = parentTag === 'ol' ? 'numbered_list' : 'bulleted_list';
        }
        
        let content = node.innerHTML || '';
        if (type === 'code') {
          content = node.textContent || '';
        }
        
        blocks.push({
          id: 'temp_id',
          type,
          content
        });
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          walk(node.childNodes[i]);
        }
      }
    }
  };
  walk(element);
  return blocks;
}

function UndoPopover() {
  const { undoPopover, hideUndoPopover, updateBlockProperty } = usePageContext();
  if (!undoPopover.open) return null;

  const getLabel = () => {
    switch (undoPopover.type) {
      case 'redact': return 'Undo Redact';
      case 'mask': return 'Undo Masking';
      case 'strike': return 'Undo Strike';
      default: return 'Undo';
    }
  };

  const handleUndo = (e) => {
    e.stopPropagation();
    updateBlockProperty(undoPopover.blockId, 'content', undoPopover.originalText);
    hideUndoPopover();
  };

  return (
    <div
      className="nn-undo-popover"
      style={{
        position: 'fixed',
        left: undoPopover.x,
        top: undoPopover.y,
        transform: 'translateX(-50%)',
        zIndex: 999999,
      }}
    >
      <button className="nn-undo-btn" onClick={handleUndo}>
        {getLabel()}
      </button>
      <div className="nn-undo-popover-arrow" />
    </div>
  );
}

function AiRephrasePopover() {
  const { aiRephrase, closeAiRephrase, updateBlockProperty, addBlock } = usePageContext();
  if (!aiRephrase.open) return null;

  const handleReplace = (e) => {
    e.stopPropagation();
    updateBlockProperty(aiRephrase.blockId, 'content', aiRephrase.rephrasedText);
    closeAiRephrase();
  };

  const handleInsertBelow = (e) => {
    e.stopPropagation();
    addBlock('paragraph', aiRephrase.blockId, aiRephrase.rephrasedText);
    closeAiRephrase();
  };

  return (
    <div
      className="ai-rephrase-popover"
      style={{
        position: 'fixed',
        left: aiRephrase.x,
        top: aiRephrase.y,
        zIndex: 999999,
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="ai-rephrase-header">
        <span style={{ marginRight: '6px' }}>✨</span>
        <span>Ziva AI Rephrase ({aiRephrase.tone})</span>
      </div>
      <div className="ai-rephrase-body">
        {aiRephrase.rephrasedText}
      </div>
      <div className="ai-rephrase-actions">
        <button className="ai-rephrase-btn primary" onClick={handleReplace}>
          Replace Block
        </button>
        <button className="ai-rephrase-btn secondary" onClick={handleInsertBelow}>
          Insert Below
        </button>
        <button className="ai-rephrase-btn dismiss" onClick={(e) => { e.stopPropagation(); closeAiRephrase(); }}>
          Dismiss
        </button>
      </div>
    </div>
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
    showPageCommentComposer,
    undoPopover,
    showUndoPopover,
    hideUndoPopover,
    updateBlockProperty,
    selectedBlockIds,
    setSelectedBlockIds,
    selectionStartId,
    setSelectionStartId,
    deleteMultipleBlocks,
    flatVisibleBlocks,
    insertBlocks
  } = usePageContext();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredTooltipRect, setHoveredTooltipRect] = useState(null);
  const [isCommentRegionHovered, setIsCommentRegionHovered] = useState(false);

  const [dragBox, setDragBox] = useState(null);
  const isDraggingRef = useRef(false);
  const isPotentialDragRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, select, input, .block-handle, .block-plus, .comment-annotations, .context-menu, .slash-menu, .inline-toolbar, .ai-rephrase-popover, .confirm-modal-overlay')) {
      return;
    }
    isPotentialDragRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    if (!e.target.closest('[contenteditable="true"]')) {
      setSelectedBlockIds([]);
      setSelectionStartId(null);
    }
  }, [setSelectedBlockIds, setSelectionStartId]);

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
        hideUndoPopover();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hideSlashMenu, hideContextMenu, hideUndoPopover]);

  useEffect(() => {
    const handleCopy = (e) => {
      const selection = window.getSelection();
      let idsToCopy = [];
      
      if (selectedBlockIds && selectedBlockIds.length > 0) {
        idsToCopy = selectedBlockIds;
      } else if (selection && !selection.isCollapsed) {
        const blocks = document.querySelectorAll('.block');
        blocks.forEach(blockEl => {
          if (selection.containsNode(blockEl, true)) {
            const id = blockEl.getAttribute('data-block-id');
            if (id) {
              idsToCopy.push(id);
            }
          }
        });
      }
      
      if (idsToCopy.length > 0) {
        if (idsToCopy.length === 1 && (!selectedBlockIds || !selectedBlockIds.includes(idsToCopy[0]))) {
          return;
        }
        e.preventDefault();
        
        let markdownParts = [];
        let htmlParts = [];
        
        const blockToMarkdownAndHtml = (b, depth = 0) => {
          let md = '';
          let ht = '';
          const cleanText = (b.content || '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?[^>]+(>|$)/g, "");

          // Build inline style for styling preservation (color, background, font-family, indent)
          let inlineStyle = `margin-left: ${depth * 24}px;`;
          if (b.textColor) inlineStyle += ` color: ${b.textColor};`;
          if (b.backgroundColor) inlineStyle += ` background-color: ${b.backgroundColor};`;
          if (b.fontFamily) {
            const cssFont = POPULAR_FONTS.find(f => f.id === b.fontFamily)?.css || b.fontFamily;
            inlineStyle += ` font-family: ${cssFont};`;
          }
          if (b.fontSize !== undefined && b.fontSize !== null) {
            const sizeMap = {
              '-2': '12px',
              '-1': '14px',
              '0': '16px',
              '1': '18px',
              '2': '20px',
            };
            inlineStyle += ` font-size: ${sizeMap[String(b.fontSize)] || '16px'};`;
          }
            
          switch (b.type) {
            case 'heading1':
              md = `${'  '.repeat(depth)}# ${cleanText}`;
              ht = `<h1 style="${inlineStyle}">${b.content}</h1>`;
              break;
            case 'heading2':
              md = `${'  '.repeat(depth)}## ${cleanText}`;
              ht = `<h2 style="${inlineStyle}">${b.content}</h2>`;
              break;
            case 'heading3':
              md = `${'  '.repeat(depth)}### ${cleanText}`;
              ht = `<h3 style="${inlineStyle}">${b.content}</h3>`;
              break;
            case 'toggle_heading1':
              md = `${'  '.repeat(depth)}# ▶ ${cleanText}`;
              ht = `<h1 style="${inlineStyle}">▶ ${b.content}</h1>`;
              break;
            case 'toggle_heading2':
              md = `${'  '.repeat(depth)}## ▶ ${cleanText}`;
              ht = `<h2 style="${inlineStyle}">▶ ${b.content}</h2>`;
              break;
            case 'toggle_heading3':
              md = `${'  '.repeat(depth)}### ▶ ${cleanText}`;
              ht = `<h3 style="${inlineStyle}">▶ ${b.content}</h3>`;
              break;
            case 'bulleted_list':
              md = `${'  '.repeat(depth)}* ${cleanText}`;
              ht = `<ul style="${inlineStyle}"><li>${b.content}</li></ul>`;
              break;
            case 'numbered_list':
              md = `${'  '.repeat(depth)}1. ${cleanText}`;
              ht = `<ol style="${inlineStyle}"><li>${b.content}</li></ol>`;
              break;
            case 'todo':
              md = `${'  '.repeat(depth)}${b.checked ? '[x]' : '[ ]'} ${cleanText}`;
              ht = `<div style="${inlineStyle}"><input type="checkbox" ${b.checked ? 'checked' : ''}/> ${b.content}</div>`;
              break;
            case 'toggle':
              md = `${'  '.repeat(depth)}▶ ${cleanText}`;
              ht = `<div style="${inlineStyle}">▶ ${b.content}</div>`;
              break;
            case 'quote':
              md = `${'  '.repeat(depth)}> ${cleanText}`;
              ht = `<blockquote style="border-left: 4px solid #ccc; padding-left: 8px; ${inlineStyle}">${b.content}</blockquote>`;
              break;
            case 'code':
              md = `${'  '.repeat(depth)}\`\`\`${b.language || ''}\n${b.content || ''}\n\`\`\``;
              ht = `<pre style="background-color: #f4f4f4; padding: 8px; border-radius: 4px; ${inlineStyle}"><code>${b.content}</code></pre>`;
              break;
            case 'divider':
              md = `${'  '.repeat(depth)}---`;
              ht = `<hr style="${inlineStyle}"/>`;
              break;
            default:
              md = `${'  '.repeat(depth)}${cleanText}`;
              ht = `<p style="${inlineStyle}">${b.content}</p>`;
              break;
          }

          if (b.children && b.children.length > 0) {
            const childResults = b.children.map(c => blockToMarkdownAndHtml(c, depth + 1));
            const childMd = childResults.map(r => r.md).join('\n\n');
            md += '\n' + childMd;
            const childHt = childResults.map(r => r.ht).join('\n');
            ht += '\n' + childHt;
          }
          if (b.columns && b.columns.length > 0) {
            let colMdParts = [];
            let colHtParts = [];
            b.columns.forEach((col, cIdx) => {
              if (col.blocks && col.blocks.length > 0) {
                const childResults = col.blocks.map(c => blockToMarkdownAndHtml(c, depth + 1));
                const colMd = childResults.map(r => r.md).join('\n\n');
                const colHt = childResults.map(r => r.ht).join('\n');
                colMdParts.push(`Column ${cIdx + 1}:\n${colMd}`);
                colHtParts.push(`<div style="flex: 1; min-width: 0; margin-right: 10px;">${colHt}</div>`);
              }
            });
            md += '\n' + colMdParts.map(s => s.split('\n').map(line => '  ' + line).join('\n')).join('\n\n');
            ht += `\n<div style="display: flex; flex-direction: row; ${inlineStyle}">${colHtParts.join('')}</div>`;
          }
          if (b.tabs && b.tabs.length > 0) {
            let tabMdParts = [];
            let tabHtParts = [];
            b.tabs.forEach((tab) => {
              if (tab.blocks && tab.blocks.length > 0) {
                const childResults = tab.blocks.map(c => blockToMarkdownAndHtml(c, depth + 1));
                const tabMd = childResults.map(r => r.md).join('\n\n');
                const tabHt = childResults.map(r => r.ht).join('\n');
                tabMdParts.push(`Tab: ${tab.title || ''}\n${tabMd}`);
                tabHtParts.push(`<div style="margin-bottom: 15px;"><h4>Tab: ${tab.title || ''}</h4>${tabHt}</div>`);
              }
            });
            md += '\n' + tabMdParts.map(s => s.split('\n').map(line => '  ' + line).join('\n')).join('\n\n');
            ht += `\n<div style="${inlineStyle}">${tabHtParts.join('')}</div>`;
          }
          
          return { md, ht };
        };

        const findBlock = (list, targetId) => {
          for (const b of list) {
            if (b.id === targetId) return b;
            if (b.children) {
              const found = findBlock(b.children, targetId);
              if (found) return found;
            }
            if (b.tabs) {
              for (const t of b.tabs) {
                const found = findBlock(t.blocks, targetId);
                if (found) return found;
              }
            }
            if (b.columns) {
              for (const c of b.columns) {
                const found = findBlock(c.blocks, targetId);
                if (found) return found;
              }
            }
          }
          return null;
        };

        const topLevelIds = idsToCopy.filter(id => {
          return !idsToCopy.some(otherId => {
            if (otherId === id) return false;
            const otherBlock = findBlock(pageState.blocks, otherId);
            if (!otherBlock) return false;
            const hasDescendant = (parent, targetId) => {
              if (parent.children) {
                for (const c of parent.children) {
                  if (c.id === targetId) return true;
                  if (hasDescendant(c, targetId)) return true;
                }
              }
              if (parent.tabs) {
                for (const t of parent.tabs) {
                  if (t.blocks) {
                    for (const b of t.blocks) {
                      if (b.id === targetId) return true;
                      if (hasDescendant(b, targetId)) return true;
                    }
                  }
                }
              }
              if (parent.columns) {
                for (const col of parent.columns) {
                  if (col.blocks) {
                    for (const b of col.blocks) {
                      if (b.id === targetId) return true;
                      if (hasDescendant(b, targetId)) return true;
                    }
                  }
                }
              }
              return false;
            };
            return hasDescendant(otherBlock, id);
          });
        });
        
        const topLevelBlocks = [];
        topLevelIds.forEach(blockId => {
          const block = findBlock(pageState.blocks, blockId);
          if (block) {
            topLevelBlocks.push(block);
            const { md, ht } = blockToMarkdownAndHtml(block);
            markdownParts.push(md);
            htmlParts.push(ht);
          }
        });
        
        const finalMarkdown = markdownParts.join('\n\n');
        const finalHtml = `<div class="notion-nest-copied-content" data-notion-nest-json="${encodeURIComponent(JSON.stringify(topLevelBlocks))}">${htmlParts.join('\n')}</div>`;
        
        e.clipboardData.setData('text/plain', finalMarkdown);
        e.clipboardData.setData('text/html', finalHtml);
        e.clipboardData.setData('application/x-notion-nest-blocks', JSON.stringify(topLevelBlocks));
      }
    };
    
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [pageState.blocks, selectedBlockIds]);

  useEffect(() => {
    const handlePaste = (e) => {
      const activeEl = document.activeElement;
      if (!activeEl || !activeEl.closest('.block')) return;
      if (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT') return;

      const activeBlockId = activeEl.closest('.block').getAttribute('data-block-id');
      if (!activeBlockId) return;

      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      const customFormat = e.clipboardData.getData('application/x-notion-nest-blocks');

      let blocksToInsert = null;

      if (customFormat) {
        try {
          blocksToInsert = JSON.parse(customFormat);
        } catch (err) {}
      }

      if (!blocksToInsert && html) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const container = doc.querySelector('.notion-nest-copied-content');
          if (container && container.hasAttribute('data-notion-nest-json')) {
            blocksToInsert = JSON.parse(decodeURIComponent(container.getAttribute('data-notion-nest-json')));
          }
        } catch (err) {}
      }

      if (blocksToInsert && Array.isArray(blocksToInsert) && blocksToInsert.length > 0) {
        e.preventDefault();
        insertBlocks(activeBlockId, blocksToInsert);
        return;
      }

      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const bodyChildren = Array.from(doc.body.children);
        const blockTags = ['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'pre', 'blockquote', 'table', 'hr'];
        const hasBlockTags = bodyChildren.some(el => blockTags.includes(el.tagName.toLowerCase())) || doc.body.querySelector(blockTags.join(','));
        
        if (hasBlockTags) {
          e.preventDefault();
          const parsedBlocks = convertHtmlToBlocks(doc.body);
          if (parsedBlocks.length > 0) {
            insertBlocks(activeBlockId, parsedBlocks);
            return;
          }
        }
      }

      if (text && text.includes('\n')) {
        const lines = text.split(/\r?\n/).map(line => line.trim());
        if (lines.length > 1) {
          e.preventDefault();
          const parsedBlocks = lines.map(line => ({
            id: 'temp_id',
            type: 'paragraph',
            content: line
          }));
          insertBlocks(activeBlockId, parsedBlocks);
          return;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [insertBlocks]);

  useEffect(() => {
    if (!selectedBlockIds || selectedBlockIds.length === 0) return;
    
    const handleGlobalKeyDown = (e) => {
      if (['ArrowDown', 'ArrowUp', 'Backspace', 'Delete', 'Escape', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }
      
      const all = flatVisibleBlocks();
      
      if (e.key === 'Escape') {
        setSelectedBlockIds([]);
        setSelectionStartId(null);
      } else if (e.key === 'ArrowDown' && !e.shiftKey) {
        const lastId = selectedBlockIds[selectedBlockIds.length - 1];
        const idx = all.findIndex(b => b.id === lastId);
        setSelectedBlockIds([]);
        setSelectionStartId(null);
        if (idx !== -1 && idx < all.length - 1) {
          const nextEl = document.querySelector(`[data-block-id="${all[idx + 1].id}"] [contenteditable]`);
          if (nextEl) {
            nextEl.focus();
            const sel = window.getSelection();
            const r = document.createRange();
            r.selectNodeContents(nextEl);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        }
      } else if (e.key === 'ArrowUp' && !e.shiftKey) {
        const firstId = selectedBlockIds[0];
        const idx = all.findIndex(b => b.id === firstId);
        setSelectedBlockIds([]);
        setSelectionStartId(null);
        if (idx !== -1 && idx > 0) {
          const prevEl = document.querySelector(`[data-block-id="${all[idx - 1].id}"] [contenteditable]`);
          if (prevEl) {
            prevEl.focus();
            const sel = window.getSelection();
            const r = document.createRange();
            r.selectNodeContents(prevEl);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        }
      } else if (e.key === 'ArrowDown' && e.shiftKey) {
        const lastId = selectedBlockIds[selectedBlockIds.length - 1];
        const idx = all.findIndex(b => b.id === lastId);
        if (idx !== -1 && idx < all.length - 1) {
          const nextBlock = all[idx + 1];
          setSelectedBlockIds(prev => [...prev, nextBlock.id]);
        }
      } else if (e.key === 'ArrowUp' && e.shiftKey) {
        const firstId = selectedBlockIds[0];
        const idx = all.findIndex(b => b.id === firstId);
        if (idx !== -1 && idx > 0) {
          const prevBlock = all[idx - 1];
          setSelectedBlockIds(prev => [prevBlock.id, ...prev]);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const ids = [...selectedBlockIds];
        setSelectedBlockIds([]);
        setSelectionStartId(null);
        deleteMultipleBlocks(ids);
      } else if (e.key === 'Enter') {
        const firstId = selectedBlockIds[0];
        setSelectedBlockIds([]);
        setSelectionStartId(null);
        const el = document.querySelector(`[data-block-id="${firstId}"] [contenteditable]`);
        if (el) {
          el.focus();
          const sel = window.getSelection();
          const r = document.createRange();
          r.selectNodeContents(el);
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [selectedBlockIds, flatVisibleBlocks, setSelectedBlockIds, setSelectionStartId, deleteMultipleBlocks]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isPotentialDragRef.current) {
        const startX = startPosRef.current.x;
        const startY = startPosRef.current.y;
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        
        if (dx > 10 || dy > 10) {
          isDraggingRef.current = true;
          isPotentialDragRef.current = false;
          
          if (document.activeElement) {
            document.activeElement.blur();
          }
          window.getSelection().removeAllRanges();
        }
      }
      
      if (!isDraggingRef.current) return;
      
      const startX = startPosRef.current.x;
      const startY = startPosRef.current.y;
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(startX - currentX);
      const height = Math.abs(startY - currentY);
      
      setDragBox({ left, top, width, height });
      
      const selectionRect = { left, top, right: left + width, bottom: top + height };
      const blockElements = document.querySelectorAll('.block');
      const nextSelectedIds = [];
      
      blockElements.forEach(blockEl => {
        let targetEl = null;
        const candidates = blockEl.querySelectorAll('.block-content, [contenteditable], .image-block-content, .divider');
        for (const cand of candidates) {
          if (cand.closest('.block') === blockEl) {
            targetEl = cand;
            break;
          }
        }
        if (!targetEl) targetEl = blockEl;
        
        const rect = targetEl.getBoundingClientRect();
        const blockRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        
        const intersects = !(blockRect.left > selectionRect.right || 
                             blockRect.right < selectionRect.left || 
                             blockRect.top > selectionRect.bottom || 
                             blockRect.bottom < selectionRect.top);
                             
        if (intersects) {
          const id = blockEl.getAttribute('data-block-id');
          if (id) nextSelectedIds.push(id);
        }
      });
      
      setSelectedBlockIds(nextSelectedIds);
    };
    
    const handleMouseUp = () => {
      isPotentialDragRef.current = false;
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setDragBox(null);
        if (selectedBlockIds && selectedBlockIds.length > 0) {
          if (document.activeElement) {
            document.activeElement.blur();
          }
          window.getSelection().removeAllRanges();
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSelectedBlockIds, selectedBlockIds]);

  useEffect(() => {
    const handleScroll = () => hideUndoPopover();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideUndoPopover]);

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
      // Check for redact/mask/strike span clicks
      const specialText = e.target.closest('.nn-redact-text, .nn-mask-text, .nn-strike-text');
      if (specialText) {
        const blockEl = specialText.closest('.block');
        const blockId = blockEl?.getAttribute('data-block-id');
        if (blockId) {
          let type = 'redact';
          if (specialText.classList.contains('nn-mask-text')) type = 'mask';
          if (specialText.classList.contains('nn-strike-text')) type = 'strike';
          
          let originalText = '';
          if (type === 'redact') {
            originalText = getRedactedContent(blockId) || '';
          } else {
            const originalEscaped = specialText.getAttribute('data-original') || '';
            originalText = originalEscaped.startsWith('nnobf:')
              ? deobfuscateText(originalEscaped)
              : unescapeHtml(originalEscaped);
          }
          
          const rect = specialText.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top - 36;
          
          showUndoPopover(x, y, blockId, type, originalText);
          return;
        }
      }

      if (!e.target.closest('.nn-undo-popover')) {
        hideUndoPopover();
      }

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
    [showUndoPopover, hideUndoPopover, setActiveCommentId]
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
            onMouseDown={handleMouseDown}
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

            {dragBox && (
              <div 
                className="drag-selection-box" 
                style={{
                  position: 'fixed',
                  left: dragBox.left,
                  top: dragBox.top,
                  width: dragBox.width,
                  height: dragBox.height,
                  backgroundColor: 'rgba(35, 131, 226, 0.08)',
                  border: '1.5px solid rgba(35, 131, 226, 0.4)',
                  borderRadius: '2px',
                  zIndex: 99999,
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>
        </div>

        <SlashMenu />
        <ContextMenu />
        <InlineToolbar />
        <UndoPopover />
        <AiRephrasePopover />

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
        <h3>{config.title || 'Delete associated comments?'}</h3>
        <p>{config.message}</p>

        <div className="confirm-modal-actions">
          <button className="confirm-btn-cancel" onClick={config.onCancel}>
            {config.cancelText || 'Keep comments'}
          </button>

          <button className="confirm-btn-delete" onClick={config.onConfirm}>
            {config.confirmText || 'Delete comments'}
          </button>
        </div>
      </div>
    </div>
  );
}
