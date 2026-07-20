/* ============================================================
   NotionNest — PageContext.jsx
   React context providing page state and all mutation actions
   ============================================================ */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  buildDefaultBlocks, fixTabDefaults, generateId, makeBlock,
  getBlockById as _getBlockById, findBlockContainer as _findBlockContainer,
  flatVisibleBlocks as _flatVisibleBlocks, createNewBlock, deepCloneBlock,
  calculateInitials, setCaretToEnd,
  storeRedactedContent, getRedactedContent, clearRedactedContent, clearAllRedactedContent,
} from './utils';
import { supabase } from '../../../utils/supabase';
import { parseNotionPageFromValues } from './notionNestPageDefaults';
import { NOTION_PAGE_STORAGE_KEY } from './types';
import { UndoHistoryManager } from './undoHistory';
const PageContext = createContext(null);

function cleanBlockContentOrphans(htmlString, validCommentIdsSet) {
  if (!htmlString || typeof htmlString !== 'string' || !htmlString.includes('data-comment-id')) {
    return htmlString;
  }
  return htmlString.replace(/<mark\s+[^>]*data-comment-id=["']([^"']+)["'][^>]*>(.*?)<\/mark>/gi, (match, id, innerText) => {
    if (!validCommentIdsSet.has(id)) {
      return innerText;
    }
    return match;
  });
}

export function usePageContext() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePageContext must be used within PageProvider');
  return ctx;
}
export function PageProvider({ children, initialBlocks, initialTitle, initialIcon, initialCover, initialCoverPosition, initialComments, initialAuditData, onChange, imperativeRef, restrictedDeletion = false }) {
  const [pageState, setPageState] = useState(() => {
    const blocks = initialBlocks || buildDefaultBlocks();
    fixTabDefaults(blocks);
    return {
      title: initialTitle !== undefined && initialTitle !== null ? initialTitle : 'Getting Started',
      icon: initialIcon !== undefined && initialIcon !== null ? initialIcon : '📝',
      cover: initialCover !== undefined && initialCover !== null ? initialCover : null,
      coverPosition: initialCoverPosition !== undefined && initialCoverPosition !== null ? initialCoverPosition : 50,
      blocks
    };
  });
  const [slashMenu, setSlashMenu] = useState({ open: false, blockId: null, position: null, filter: '' });
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, items: [], triggerRect: null, type: null, blockId: null, initialSubmenu: null });
  const [activeBlockId, _setActiveBlockId] = useState(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [selectionStartId, setSelectionStartId] = useState(null);
  const [activeMediaPickerId, setActiveMediaPickerId] = useState(null);

  const setActiveBlockId = useCallback((id) => {
    _setActiveBlockId(id);
    if (id) {
      setSelectionStartId(id);
    }
  }, []);

  // Load persisted comments from initialComments (db)
  const [comments, setComments] = useState(() => {
    if (initialComments && Array.isArray(initialComments)) {
      return initialComments;
    }
    return [];
  });
  useEffect(() => {
    if (initialComments && Array.isArray(initialComments)) {
      setComments(prev => {
        const drafts = prev.filter(c => c.isDraft);
        const draftIds = new Set(drafts.map(d => d.id));
        const filteredInitial = initialComments.filter(c => !draftIds.has(c.id));
        return [...filteredInitial, ...drafts];
      });
    }
  }, [initialComments]);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [undoPopover, setUndoPopover] = useState({ open: false, x: 0, y: 0, blockId: null, type: null, originalText: null });
  const showUndoPopover = useCallback((x, y, blockId, type, originalText) => {
    setUndoPopover({ open: true, x, y, blockId, type, originalText });
  }, []);
  const hideUndoPopover = useCallback(() => {
    setUndoPopover(prev => ({ ...prev, open: false }));
  }, []);
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [aiRephrase, setAiRephrase] = useState({ open: false, blockId: null, tone: null, originalText: '', rephrasedText: '', x: 0, y: 0 });
  const openAiRephrase = useCallback((blockId, tone, originalText, rephrasedText, x, y) => {
    setAiRephrase({ open: true, blockId, tone, originalText, rephrasedText, x, y });
  }, []);
  const closeAiRephrase = useCallback(() => {
    setAiRephrase(prev => ({ ...prev, open: false }));
  }, []);
  const [showPageCommentComposer, setShowPageCommentComposer] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [tick, setTick] = useState(0);
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const pageRef = useRef(pageState);
  pageRef.current = pageState;
  const triggerUpdate = useCallback(() => setTick(n => n + 1), []);
  const historyManagerRef = useRef(new UndoHistoryManager());
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      triggerUpdate();
    }, 30000);
    return () => clearInterval(timer);
  }, [triggerUpdate]);

  useEffect(() => {
    const handleBeforeUnload = () => clearAllRedactedContent();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Initialize undo history with the initial page state
  useEffect(() => {
    historyManagerRef.current.pushSnapshot(pageState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for undo/redo/restore custom events from NotionNestPage toolbar
  useEffect(() => {
    const handleUndo = () => {
      const snapshot = historyManagerRef.current.undo();
      if (snapshot) {
        isRestoringRef.current = true;
        setPageState(snapshot);
        isRestoringRef.current = false;
      }
    };
    const handleRedo = () => {
      const snapshot = historyManagerRef.current.redo();
      if (snapshot) {
        isRestoringRef.current = true;
        setPageState(snapshot);
        isRestoringRef.current = false;
      }
    };
    const handleRestore = (e) => {
      const snapshot = e.detail?.snapshot;
      if (snapshot) {
        historyManagerRef.current.pushSnapshot(snapshot);
        isRestoringRef.current = true;
        setPageState(snapshot);
        isRestoringRef.current = false;
      }
    };
    window.addEventListener('notion-nest-undo', handleUndo);
    window.addEventListener('notion-nest-redo', handleRedo);
    window.addEventListener('notion-nest-restore-checkpoint', handleRestore);
    return () => {
      window.removeEventListener('notion-nest-undo', handleUndo);
      window.removeEventListener('notion-nest-redo', handleRedo);
      window.removeEventListener('notion-nest-restore-checkpoint', handleRestore);
    };
  }, []);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (onChangeRef.current) {
      // Filter out draft comments so they are never persisted to the database
      const persistableComments = comments.filter(c => !c.isDraft);
      onChangeRef.current({
        ...pageState,
        comments: persistableComments
      });
    }
  }, [pageState, comments]);

  // Sweep and clean any orphaned comment highlight marks across blocks when comments change
  useEffect(() => {
    const validSet = new Set(comments.map(c => c.id));
    setPageState(prev => {
      let modified = false;
      const deepCopy = JSON.parse(JSON.stringify(prev.blocks));
      const cleanBlocks = (list) => {
        list.forEach(b => {
          if (b.content && typeof b.content === 'string' && b.content.includes('data-comment-id')) {
            const cleaned = cleanBlockContentOrphans(b.content, validSet);
            if (cleaned !== b.content) {
              b.content = cleaned;
              modified = true;
            }
          }
          if (b.children) cleanBlocks(b.children);
          if (b.tabs) b.tabs.forEach(t => cleanBlocks(t.blocks));
          if (b.columns) b.columns.forEach(c => cleanBlocks(c.blocks));
        });
      };
      cleanBlocks(deepCopy);
      return modified ? { ...prev, blocks: deepCopy } : prev;
    });
  }, [comments]);
  /* ---- Immutable state update helper ---- */
  // mutateState captures the PRE-mutation snapshot for undo, then applies the mutation.
  // All user-initiated mutations MUST go through mutateState (not setPageState directly).
  const mutateState = useCallback((fn) => {
    setPageState(prev => {
      if (isRestoringRef.current) {
        // Undo/redo restore — skip snapshot, just apply
        const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
        fn(next);
        return next;
      }
      // Record pre-mutation state for undo
      historyManagerRef.current.pushSnapshot(prev);
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      fn(next);
      return next;
    });
  }, []);
  /* ---- Undo / Redo ---- */
  const undo = useCallback(() => {
    const snapshot = historyManagerRef.current.undo();
    if (snapshot) {
      isRestoringRef.current = true;
      setPageState(snapshot);
      isRestoringRef.current = false;
    }
  }, []);
  const redo = useCallback(() => {
    const snapshot = historyManagerRef.current.redo();
    if (snapshot) {
      isRestoringRef.current = true;
      setPageState(snapshot);
      isRestoringRef.current = false;
    }
  }, []);
  const canUndo = useCallback(() => historyManagerRef.current.canUndo(), [tick]);
  const canRedo = useCallback(() => historyManagerRef.current.canRedo(), [tick]);
  const restoreFromCheckpoint = useCallback((snapshot) => {
    if (snapshot) {
      historyManagerRef.current.pushSnapshot(snapshot);
      isRestoringRef.current = true;
      setPageState(snapshot);
      isRestoringRef.current = false;
    }
  }, []);
  /* ---- Getters (work on current ref for immediate access) ---- */
  const getBlockById = useCallback((blockId) => {
    return _getBlockById(blockId, pageRef.current.blocks);
  }, []);
  const findBlockContainer = useCallback((blockId) => {
    return _findBlockContainer(blockId, pageRef.current.blocks);
  }, []);
  const flatVisibleBlocks = useCallback(() => {
    return _flatVisibleBlocks(pageRef.current.blocks);
  }, []);
  /* ---- Mutations ---- */
  const addBlock = useCallback((type, afterBlockId, initialContent = '', forceChild = false) => {
    const newBlock = createNewBlock(type);
    if (initialContent) {
      newBlock.content = initialContent;
    }
    mutateState(prev => {
      if (afterBlockId) {
        const afterBlock = _getBlockById(afterBlockId, prev.blocks);
        if (afterBlock && (afterBlock.type === 'toggle' || afterBlock.type.startsWith('toggle_heading')) && (afterBlock.open || forceChild)) {
          afterBlock.open = true;
          if (!afterBlock.children) {
            afterBlock.children = [];
          }
          afterBlock.children.unshift(newBlock);
        } else {
          const container = _findBlockContainer(afterBlockId, prev.blocks);
          if (container) {
            container.arr.splice(container.index + 1, 0, newBlock);
          } else {
            prev.blocks.push(newBlock);
          }
        }
      } else {
        prev.blocks.push(newBlock);
      }
    });
    return newBlock;
  }, [mutateState]);

  const insertBlocks = useCallback((afterBlockId, blocksToInsert) => {
    const reassignIds = (blocks) => {
      if (!Array.isArray(blocks)) return [];
      return blocks.map(b => {
        const nb = { ...b, id: generateId() };
        if (b.children) {
          nb.children = reassignIds(b.children);
        }
        if (b.tabs) {
          nb.tabs = b.tabs.map(t => ({ ...t, id: generateId(), blocks: reassignIds(Array.isArray(t.blocks) ? t.blocks : []) }));
        }
        if (b.columns) {
          nb.columns = b.columns.map(c => ({ ...c, id: generateId(), blocks: reassignIds(Array.isArray(c.blocks) ? c.blocks : []) }));
        }
        return nb;
      });
    };
    
    const freshBlocks = reassignIds(blocksToInsert);
    
    mutateState(prev => {
      const container = _findBlockContainer(afterBlockId, prev.blocks);
      if (container) {
        container.arr.splice(container.index + 1, 0, ...freshBlocks);
      } else {
        prev.blocks.push(...freshBlocks);
      }
    });

    const lastBlock = freshBlocks[freshBlocks.length - 1];
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${lastBlock.id}"] [contenteditable]`);
      if (el) {
        el.focus();
        setCaretToEnd(el);
      }
    }, 50);
  }, [mutateState]);
  const deleteBlock = useCallback((blockId) => {
    const target = _getBlockById(blockId, pageRef.current.blocks);
    if (!target) return;

    const blockComments = commentsRef.current.filter(c => c.blockId === blockId);

    const actualDelete = () => {
      if (blockComments.length > 0) {
        // Unwrap highlights in DOM first
        blockComments.forEach(c => {
          const markEl = document.querySelector(`.inline-comment-highlight[data-comment-id="${c.id}"], .inline-comment[data-comment-id="${c.id}"]`);
          if (markEl) {
            const parent = markEl.parentNode;
            if (parent) {
              while (markEl.firstChild) {
                parent.insertBefore(markEl.firstChild, markEl);
              }
              parent.removeChild(markEl);
            }
          }
        });
        setComments(prev => {
          const next = prev.filter(c => c.blockId !== blockId);
          persistComments(next);
          return next;
        });
      }
      mutateState(prev => {
        const container = _findBlockContainer(blockId, prev.blocks);
        if (!container) return;
        if (container.arr.length <= 1 && container.arr === prev.blocks) return;
        const targetNode = container.arr[container.index];
        if (targetNode && targetNode.children && targetNode.children.length > 0) {
          container.arr.splice(container.index + 1, 0, ...targetNode.children);
        }
        container.arr.splice(container.index, 1);
      });
      setDeleteConfirm(null);
    };

    const isTextType = ['paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5'].includes(target.type);
    const hasContent = target.content && target.content.trim() !== '';

    // Check if it's a columns block with real content
    const getColContentCount = (col) => {
      if (!col || !col.blocks) return 0;
      return col.blocks.filter(b => {
        if (b.content && b.content.trim().length > 0) return true;
        if (['image','video','file','bookmark','audio','code','equation','callout','quote','embed','pdf','map','divider'].includes(b.type)) return true;
        if (b.children && b.children.some(c => c.content && c.content.trim().length > 0)) return true;
        return false;
      }).length;
    };
    const isColumnsWithContent = target.type === 'columns' && target.columns && target.columns.some(c => getColContentCount(c) > 0);

    // If restrictedDeletion is on, we need confirmation unless it's a text block with no content
    const needsConfirmation = restrictedDeletion && (!isTextType || hasContent);

    const totalContentInColumns = target.type === 'columns' && target.columns ? target.columns.reduce((sum, c) => sum + getColContentCount(c), 0) : 0;

    if (blockComments.length > 0) {
      setDeleteConfirm({
        type: 'block',
        blockId,
        title: 'Delete block & comments?',
        message: 'This block contains active comments. Deleting it will also delete those comments.',
        cancelText: 'Cancel',
        confirmText: 'Delete block',
        onConfirm: actualDelete,
        onCancel: () => setDeleteConfirm(null)
      });
    } else if (isColumnsWithContent) {
      setDeleteConfirm({
        type: 'block',
        blockId,
        title: 'Delete columns block?',
        message: `This columns block contains ${totalContentInColumns} block${totalContentInColumns > 1 ? 's' : ''} with content and will be permanently deleted.`,
        cancelText: 'Cancel',
        confirmText: 'Delete',
        onConfirm: actualDelete,
        onCancel: () => setDeleteConfirm(null)
      });
    } else if (needsConfirmation) {
      setDeleteConfirm({
        type: 'block',
        blockId,
        title: 'Delete Block?',
        message: 'Are you sure you want to delete this block?',
        cancelText: 'Cancel',
        confirmText: 'Delete',
        onConfirm: actualDelete,
        onCancel: () => setDeleteConfirm(null)
      });
    } else {
      actualDelete();
    }
  }, [restrictedDeletion]);
  const duplicateBlock = useCallback((blockId) => {
    const block = _getBlockById(blockId, pageRef.current.blocks);
    if (!block) return null;
    const cloned = deepCloneBlock(block);
    mutateState(prev => {
      const container = _findBlockContainer(blockId, prev.blocks);
      if (container) {
        container.arr.splice(container.index + 1, 0, cloned);
      }
    });

    const targetId = cloned.id;
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${targetId}"] [contenteditable]`);
      if (el) {
        el.focus();
        setCaretToEnd(el);
      }
    }, 50);

    return cloned;
  }, [mutateState]);
  const changeBlockType = useCallback((blockId, newType) => {
    mutateState(prev => {
      const block = _getBlockById(blockId, prev.blocks);
      if (!block) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = block.content || '';
      const textContent = tmp.textContent;
      block.type = newType;
      // Reset type-specific props
      delete block.checked; delete block.open; delete block.children;
      delete block.calloutIcon; delete block.language;
      delete block.rows; delete block.columns; delete block.tabs; delete block.activeTabId;
      delete block.hasHeader; delete block.hasTotalRow; delete block.colBorders; delete block.rowBorders;
      delete block.striped; delete block.lockCols; delete block.lockTable; delete block.cellColors;
      delete block.url; delete block.bookmarkTitle; delete block.description; delete block.image; delete block.favicon; delete block.isVisualBookmark; delete block.caption;
      if (newType === 'todo') block.checked = false;
      if (newType === 'toggle') { block.open = false; block.children = [makeBlock('paragraph', '')]; }
      if (newType === 'callout') block.calloutIcon = '💡';
      if (newType === 'code') { block.language = 'javascript'; block.content = textContent; }
      if (newType === 'table') { block.rows = [['', '', ''], ['', '', ''], ['', '', '']]; block.content = ''; }
      if (newType === 'columns' || newType === 'columns2' || newType === 'columns3' || newType === 'columns4' || newType === 'columns5') {
        const count = newType === 'columns5' ? 5 : newType === 'columns4' ? 4 : newType === 'columns3' ? 3 : 2;
        block.type = 'columns';
        block.content = '';
        block.columns = Array.from({ length: count }, (_, i) => ({ id: generateId(), blocks: [makeBlock('paragraph', i === 0 ? textContent : '')] }));
      }
      if (newType === 'tabs') { block.content = ''; block.tabs = [{ id: generateId(), name: 'Tab 1', blocks: [makeBlock('paragraph', textContent)] }, { id: generateId(), name: 'Tab 2', blocks: [makeBlock('paragraph', '')] }]; block.activeTabId = block.tabs[0].id; }
      if (newType === 'divider' || newType === 'toc') block.content = '';
      if (newType === 'image') { block.url = ''; block.caption = ''; block.content = ''; }
      if (newType === 'bookmark') { block.url = ''; block.bookmarkTitle = ''; block.description = ''; block.image = ''; block.favicon = ''; block.isVisualBookmark = true; block.content = ''; }
    });
  }, [mutateState]);
  const moveBlock = useCallback((sourceId, targetIdOrDirection, position) => {
    mutateState(prev => {
      // Handle legacy behavior: swapping with immediate neighbor when direction is 'up' or 'down'
      if (targetIdOrDirection === 'up' || targetIdOrDirection === 'down') {
        const container = _findBlockContainer(sourceId, prev.blocks);
        if (!container) return;
        const { arr, index } = container;
        const newIndex = targetIdOrDirection === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= arr.length) return;
        [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
        return;
      }

      // Tree-agnostic drop movement: move sourceId next to targetId
      const sourceContainer = _findBlockContainer(sourceId, prev.blocks);
      if (!sourceContainer) return;

      // Remove source block from its current container
      const [sourceBlock] = sourceContainer.arr.splice(sourceContainer.index, 1);

      // Find target container in the modified tree
      const targetContainer = _findBlockContainer(targetIdOrDirection, prev.blocks);
      if (!targetContainer) {
        sourceContainer.arr.splice(sourceContainer.index, 0, sourceBlock);
        return;
      }

      const { arr: targetArr, index: targetIndex } = targetContainer;
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
      targetArr.splice(insertIndex, 0, sourceBlock);
    });
  }, [mutateState]);
  const updateBlockContent = useCallback((blockId, content) => {
    const blockComments = commentsRef.current.filter(c => c.blockId === blockId && !c.isDraft);
    if (blockComments.length > 0) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const remainingIds = Array.from(doc.querySelectorAll('[data-comment-id]')).map(el => el.getAttribute('data-comment-id'));
      const deletedComments = blockComments.filter(c => !remainingIds.includes(c.id));
      if (deletedComments.length > 0) {
        setDeleteConfirm({
          type: 'text',
          commentIds: deletedComments.map(c => c.id),
          message: `The text you deleted contains comments. Do you want to delete these comments too?`,
          onConfirm: () => {
            setComments(prev => {
              const next = prev.filter(c => !deletedComments.map(dc => dc.id).includes(c.id));
              persistComments(next);
              return next;
            });
            mutateState(prev => {
              const block = _getBlockById(blockId, prev.blocks);
              if (block) block.content = content;
            });
            setDeleteConfirm(null);
          },
          onCancel: () => {
            // Restore previous block layout in page content
            const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`);
            if (el) {
              const block = _getBlockById(blockId, pageRef.current.blocks);
              if (block) {
                el.innerHTML = block.content || '';
                el.classList.toggle('is-empty', !(block.content && block.content.trim().length > 0));
              }
            }
            setDeleteConfirm(null);
          }
        });
        return;
      }
    }
    mutateState(prev => {
      const block = _getBlockById(blockId, prev.blocks);
      if (block) block.content = content;
    });
  }, [mutateState]);
  const updateBlockProperty = useCallback((blockId, prop, value) => {
    mutateState(prev => {
      const block = _getBlockById(blockId, prev.blocks);
      if (block) {
        if (value === undefined) {
          delete block[prop];
        } else {
          block[prop] = value;
        }
      }
    });
  }, [mutateState]);
  /* ---- Column mutations (for ColumnsBlock) ---- */
  const insertColumn = useCallback((blockId, afterColumnId, direction = 'right') => {
    mutateState(prev => {
      const block = _getBlockById(blockId, prev.blocks);
      if (block && block.columns) {
        const newCol = { id: generateId(), blocks: [makeBlock('paragraph', '')] };
        const idx = block.columns.findIndex(c => c.id === afterColumnId);
        if (idx === -1) {
          block.columns.push(newCol);
        } else {
          block.columns.splice(direction === 'right' ? idx + 1 : idx, 0, newCol);
        }
      }
    });
  }, [mutateState]);
  const deleteColumn = useCallback((blockId, columnId) => {
    mutateState(prev => {
      const block = _getBlockById(blockId, prev.blocks);
      if (block && block.columns && block.columns.length > 1) {
        const idx = block.columns.findIndex(c => c.id === columnId);
        if (idx === -1) return;
        block.columns = block.columns.filter(c => c.id !== columnId);
        if (block.colWidths && block.colWidths.length > 1) {
          const removed = block.colWidths[idx];
          const total = block.colWidths.reduce((a, b) => a + b, 0) - removed;
          const remaining = block.colWidths.filter((_, i) => i !== idx);
          const scale = total > 0 ? (total + removed) / total : 1;
          block.colWidths = remaining.map(w => +(w * scale).toFixed(3));
        }
      }
    });
  }, [mutateState]);
  const reorderColumnToPosition = useCallback((blockId, sourceColId, targetPos) => {
    mutateState(prev => {
      const block = _getBlockById(blockId, prev.blocks);
      if (!block || !block.columns) return;
      const srcIdx = block.columns.findIndex(c => c.id === sourceColId);
      if (srcIdx === -1 || targetPos === srcIdx) return;
      const [col] = block.columns.splice(srcIdx, 1);
      const insertAt = Math.min(targetPos, block.columns.length);
      block.columns.splice(insertAt, 0, col);
      if (block.colWidths) {
        const [w] = block.colWidths.splice(srcIdx, 1);
        block.colWidths.splice(insertAt, 0, w);
      }
    });
  }, [mutateState]);
  const clearAllBlockFonts = useCallback(() => {
    const stripFonts = (blocks) => {
      if (!Array.isArray(blocks)) return blocks;
      return blocks.map(b => {
        const nb = { ...b };
        delete nb.fontFamily;
        delete nb.fontSize;
        if (nb.children) nb.children = stripFonts(nb.children);
        if (nb.tabs) nb.tabs = nb.tabs.map(t => ({ ...t, blocks: stripFonts(t.blocks) }));
        if (nb.columns) nb.columns = nb.columns.map(c => ({ ...c, blocks: stripFonts(c.blocks) }));
        return nb;
      });
    };
    mutateState(prev => {
      prev.blocks = stripFonts(prev.blocks);
    });
  }, [mutateState]);
  useEffect(() => {
    if (imperativeRef) imperativeRef.current = { clearAllBlockFonts };
  }, [imperativeRef, clearAllBlockFonts]);
  const updatePage = useCallback((updates) => {
    mutateState(prev => {
      let nextIcon = prev.icon;
      if (updates.title !== undefined && prev.icon && prev.icon.startsWith('initials:')) {
        const parts = prev.icon.slice(9).split(':');
        const mode = parts[2] || 'two';
        const color = parts[1] || 'default';
        const customText = parts[2] === 'custom' ? parts[0] : '';
        const newText = calculateInitials(updates.title, mode, customText);
        nextIcon = `initials:${newText}:${color}:${mode}`;
      }
      Object.assign(prev, updates, { icon: updates.icon !== undefined ? updates.icon : nextIcon });
    });
  }, [mutateState]);
  /* ---- Menu actions ---- */
  const showSlashMenu = useCallback((blockId, position, filter = '') => {
    setSlashMenu({ open: true, blockId, position, filter });
  }, []);
  const hideSlashMenu = useCallback(() => {
    setSlashMenu({ open: false, blockId: null, position: null, filter: '' });
  }, []);
  const updateSlashFilter = useCallback((filter) => {
    setSlashMenu(prev => ({ ...prev, filter }));
  }, []);
  const showContextMenu = useCallback((x, y, items, triggerRect = null, type = null, blockId = null, initialSubmenu = null) => {
    setContextMenu({ open: true, x, y, items, triggerRect, type, blockId, initialSubmenu });
  }, []);
  const hideContextMenu = useCallback(() => {
    setContextMenu({ open: false, x: 0, y: 0, items: [], triggerRect: null, type: null, blockId: null, initialSubmenu: null });
  }, []);

  const moveBlockToTop = useCallback((blockId) => {
    mutateState(prev => {
      const container = _findBlockContainer(blockId, prev.blocks);
      if (!container) return;
      const { arr, index } = container;
      const [block] = arr.splice(index, 1);
      arr.unshift(block);
    });
  }, [mutateState]);

  const moveBlockToBottom = useCallback((blockId) => {
    mutateState(prev => {
      const container = _findBlockContainer(blockId, prev.blocks);
      if (!container) return;
      const { arr, index } = container;
      const [block] = arr.splice(index, 1);
      arr.push(block);
    });
  }, [mutateState]);

  const moveBlockToTab = useCallback((sourceId, tabBlockId, tabId) => {
    mutateState(prev => {
      const sourceContainer = _findBlockContainer(sourceId, prev.blocks);
      if (!sourceContainer) return;
      const [sourceBlock] = sourceContainer.arr.splice(sourceContainer.index, 1);
      const tabBlock = _getBlockById(tabBlockId, prev.blocks);
      if (!tabBlock || tabBlock.type !== 'tabs' || !tabBlock.tabs) {
        sourceContainer.arr.splice(sourceContainer.index, 0, sourceBlock);
        return;
      }
      const tab = tabBlock.tabs.find(t => t.id === tabId);
      if (!tab) {
        sourceContainer.arr.splice(sourceContainer.index, 0, sourceBlock);
        return;
      }
      if (!tab.blocks) tab.blocks = [];
      tab.blocks.push(sourceBlock);
    });
  }, [mutateState]);

  const moveBlockToColumn = useCallback((sourceId, columnsBlockId, columnId) => {
    mutateState(prev => {
      const sourceContainer = _findBlockContainer(sourceId, prev.blocks);
      if (!sourceContainer) return;
      const [sourceBlock] = sourceContainer.arr.splice(sourceContainer.index, 1);
      const colBlock = _getBlockById(columnsBlockId, prev.blocks);
      if (!colBlock || colBlock.type !== 'columns' || !colBlock.columns) {
        sourceContainer.arr.splice(sourceContainer.index, 0, sourceBlock);
        return;
      }
      const col = colBlock.columns.find(c => c.id === columnId);
      if (!col) {
        sourceContainer.arr.splice(sourceContainer.index, 0, sourceBlock);
        return;
      }
      if (!col.blocks) col.blocks = [];
      col.blocks.push(sourceBlock);
    });
  }, [mutateState]);

  const moveBlockToPage = useCallback(async (blockId, targetDdataId) => {
    const block = _getBlockById(blockId, pageRef.current.blocks);
    if (!block) return;

    // Delete from current page
    mutateState(prev => {
      const container = _findBlockContainer(blockId, prev.blocks);
      if (container) {
        container.arr.splice(container.index, 1);
      }
    });

    // Append to target page
    const { data: targetRecord } = await supabase
      .from('ddata')
      .select('ddata_values')
      .eq('ddata_id', targetDdataId)
      .single();

    if (targetRecord) {
      const values = targetRecord.ddata_values || {};
      const targetPayload = parseNotionPageFromValues(values);
      targetPayload.blocks = [...(targetPayload.blocks || []), block];

      const nextValues = { ...values };
      nextValues[NOTION_PAGE_STORAGE_KEY] = targetPayload;

      await supabase
        .from('ddata')
        .update({ ddata_values: nextValues })
        .eq('ddata_id', targetDdataId);
    }
  }, [mutateState]);

  const acceptSuggestion = useCallback((commentId) => {
    setComments(prev => {
      const cmt = prev.find(c => c.id === commentId);
      if (cmt && cmt.suggestedText) {
        updateBlockProperty(cmt.blockId, 'content', cmt.suggestedText);
      }
      const next = prev.filter(c => c.id !== commentId);
      persistComments(next);
      return next;
    });
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
  }, [updateBlockProperty, activeCommentId, setActiveCommentId]);

  const createBlockLevelComment = useCallback((blockId, isSuggestion = false) => {
    const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`);
    if (!el) return;
    const selectedText = el.textContent || '';
    const draftId = 'cmt-draft-' + Date.now();
    const commentClass = `inline-comment-highlight draft${isSuggestion ? ' suggestion' : ''}`;
    
    el.innerHTML = `<mark class="${commentClass}" data-comment-id="${draftId}">${el.innerHTML}</mark>`;
    updateBlockContent(blockId, el.innerHTML);

    const newComment = {
      id: draftId,
      blockId,
      selectedText,
      thread: [],
      resolved: false,
      isDraft: true,
      isSuggestion
    };
    setComments(prev => [...prev, newComment]);
    setActiveCommentId(draftId);
    setCommentSidebarOpen(true);
  }, [updateBlockContent]);

  const triggerBlockAi = useCallback((blockId, promptText, isSuggestion = false) => {
    const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`);
    if (!el) return;
    const text = el.textContent || '';
    const generated = `✨ ${text} (AI: ${promptText}) ✨`;

    if (isSuggestion) {
      const draftId = 'cmt-draft-' + Date.now();
      const commentClass = `inline-comment-highlight draft suggestion`;
      el.innerHTML = `<mark class="${commentClass}" data-comment-id="${draftId}">${el.innerHTML}</mark>`;
      updateBlockContent(blockId, el.innerHTML);

      const newComment = {
        id: draftId,
        blockId,
        selectedText: text,
        thread: [{
          author: 'Ziva AI',
          text: `[SUGGESTION] Suggest edit to: "${generated}"`
        }],
        resolved: false,
        isDraft: false,
        isSuggestion: true,
        suggestedText: generated
      };
      setComments(prev => [...prev, newComment]);
      setActiveCommentId(draftId);
      setCommentSidebarOpen(true);
    } else {
      updateBlockProperty(blockId, 'content', generated);
    }
  }, [updateBlockContent, updateBlockProperty]);
  /* ---- Comment actions ---- */
  // Helper to persist comments (deprecated localStorage in favor of DB/payload)
  const persistComments = (newComments) => {};
  const addComment = useCallback((blockId, selectedText, commentText) => {
    const newComment = {
      id: 'cmt-' + Date.now(),
      blockId,
      selectedText,
      thread: [{ 
        author: 'Briselle', 
        text: commentText, 
        time: new Date().toISOString(),
        unread: false,
        muted: false,
        reactions: [],
        attachments: []
      }],
      resolved: false,
      isDraft: false,
    };
    setComments(prev => {
      const next = [...prev, newComment];
      persistComments(next);
      return next;
    });
    setCommentSidebarOpen(true);
    return newComment;
  }, []);
  const addDraftComment = useCallback((blockId, selectedText, draftId) => {
    const newComment = {
      id: draftId,
      blockId,
      selectedText,
      thread: [],
      resolved: false,
      isDraft: true,
    };
    setComments(prev => {
      const next = [...prev, newComment];
      persistComments(next);
      return next;
    });
    setActiveCommentId(draftId);
    setCommentSidebarOpen(true);
    return newComment;
  }, []);
  const saveDraftComment = useCallback((commentId, text) => {
    setComments(prev => {
      const c = prev.find(item => item.id === commentId);
      if (c) {
        mutateState(pagePrev => {
          const block = _getBlockById(c.blockId, pagePrev.blocks);
          if (block && block.content) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(block.content, 'text/html');
            const markEl = doc.querySelector(`[data-comment-id="${commentId}"]`);
            if (markEl) {
              markEl.classList.remove('draft');
            }
            block.content = doc.body.innerHTML;
          }
        });
      }
      const next = prev.map(c => c.id === commentId ? {
        ...c,
        isDraft: false,
        thread: [{
          author: 'Briselle',
          text,
          time: new Date().toISOString(),
          unread: false,
          muted: false,
          reactions: [],
          attachments: []
        }]
      } : c);
      persistComments(next);
      return next;
    });
  }, [mutateState]);
  const cancelDraftComment = useCallback((commentId) => {
    setComments(prev => {
      const c = prev.find(item => item.id === commentId);
      if (c) {
        mutateState(pagePrev => {
          const block = _getBlockById(c.blockId, pagePrev.blocks);
          if (block && block.content) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(block.content, 'text/html');
            const markEl = doc.querySelector(`[data-comment-id="${commentId}"]`);
            if (markEl) {
              const parent = markEl.parentNode;
              while (markEl.firstChild) {
                parent.insertBefore(markEl.firstChild, markEl);
              }
              parent.removeChild(markEl);
            }
            block.content = doc.body.innerHTML;
          }
        });
      }
      const next = prev.filter(c => c.id !== commentId);
      persistComments(next);
      return next;
    });
  }, [mutateState]);
  const addReply = useCallback((commentId, text, attachments = []) => {
    setComments(prev => {
      const next = prev.map(c => c.id === commentId ? {
        ...c,
        thread: [...c.thread, { 
          author: 'Briselle', 
          text, 
          time: new Date().toISOString(),
          unread: false,
          muted: false,
          reactions: [],
          attachments
        }],
      } : c);
      persistComments(next);
      return next;
    });
  }, []);
  const resolveComment = useCallback((commentId) => {
    const markEl = document.querySelector(`.inline-comment-highlight[data-comment-id="${commentId}"], .inline-comment[data-comment-id="${commentId}"]`);
    setComments(prev => {
      const cmt = prev.find(c => c.id === commentId);
      const newResolved = cmt ? !cmt.resolved : true;
      // Toggle resolved class on the inline highlight
      if (markEl) {
        markEl.classList.toggle('resolved', newResolved);
      }
      const next = prev.map(c => c.id === commentId ? { ...c, resolved: newResolved } : c);
      persistComments(next);
      return next;
    });
  }, []);
  const deleteComment = useCallback((commentId) => {
    const markEls = document.querySelectorAll(`.inline-comment-highlight[data-comment-id="${commentId}"], .inline-comment[data-comment-id="${commentId}"]`);
    markEls.forEach(markEl => {
      const parent = markEl.parentNode;
      if (parent) {
        while (markEl.firstChild) {
          parent.insertBefore(markEl.firstChild, markEl);
        }
        parent.removeChild(markEl);
        const ce = parent.closest('[contenteditable]') || parent;
        const block = parent.closest('.block');
        const bId = block?.getAttribute('data-block-id');
        if (ce && bId) {
          mutateState(prev => {
            const blockObj = _getBlockById(bId, prev.blocks);
            if (blockObj) blockObj.content = ce.innerHTML;
          });
        }
      }
    });
    setComments(prev => {
      const next = prev.filter(c => c.id !== commentId);
      const validSet = new Set(next.map(c => c.id));
      mutateState(pagePrev => {
        let modified = false;
        const cleanBlocks = (list) => {
          list.forEach(b => {
            if (b.content && typeof b.content === 'string' && b.content.includes(commentId)) {
              const cleaned = cleanBlockContentOrphans(b.content, validSet);
              if (cleaned !== b.content) {
                b.content = cleaned;
                modified = true;
              }
            }
            if (b.children) cleanBlocks(b.children);
            if (b.tabs) b.tabs.forEach(t => cleanBlocks(t.blocks));
            if (b.columns) b.columns.forEach(c => cleanBlocks(c.blocks));
          });
        };
        cleanBlocks(pagePrev.blocks);
      });
      persistComments(next);
      return next;
    });
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
  }, [activeCommentId, mutateState]);
  const toggleUnreadComment = useCallback((commentId) => {
    setComments(prev => {
      const next = prev.map(c => {
        if (c.id !== commentId) return c;
        const hasAnyUnread = c.unread || c.thread?.some(msg => msg.unread);
        const willBeUnread = !hasAnyUnread;
        const newThread = c.thread?.map(msg => ({ ...msg, unread: willBeUnread })) || [];
        return { ...c, unread: willBeUnread, thread: newThread };
      });
      persistComments(next);
      return next;
    });
  }, []);
  const markCommentAsRead = useCallback((commentId) => {
    setComments(prev => {
      let changed = false;
      const next = prev.map(c => {
        if (c.id !== commentId) return c;
        const hasUnread = c.unread || c.thread?.some(msg => msg.unread);
        if (!hasUnread) return c;
        changed = true;
        const newThread = c.thread?.map(msg => msg.unread ? { ...msg, unread: false } : msg) || [];
        return { ...c, unread: false, thread: newThread };
      });
      if (changed) persistComments(next);
      return changed ? next : prev;
    });
  }, []);
  const toggleMuteComment = useCallback((commentId) => {
    setComments(prev => {
      const next = prev.map(c => c.id === commentId ? { ...c, muted: !c.muted } : c);
      persistComments(next);
      return next;
    });
  }, []);
  const addReaction = useCallback((commentId, emoji, msgIndex) => {
    setComments(prev => {
      const next = prev.map(c => {
        if (c.id !== commentId) return c;
        if (msgIndex !== undefined && msgIndex !== null) {
          const newThread = c.thread.map((msg, idx) => {
            if (idx !== msgIndex) return msg;
            const reactions = msg.reactions ? [...msg.reactions] : [];
            const existingIndex = reactions.findIndex(r => r.emoji === emoji);
            let nextReactions = [];
            if (existingIndex >= 0) {
              const existing = reactions[existingIndex];
              const hasReacted = existing.users.includes('Briselle');
              const newUsers = hasReacted ? existing.users.filter(u => u !== 'Briselle') : [...existing.users, 'Briselle'];
              const newCount = hasReacted ? existing.count - 1 : existing.count + 1;
              nextReactions = [...reactions];
              nextReactions[existingIndex] = { ...existing, count: newCount, users: newUsers };
            } else {
              nextReactions = [...reactions, { emoji, count: 1, users: ['Briselle'] }];
            }
            return { ...msg, reactions: nextReactions.filter(r => r.count > 0) };
          });
          return { ...c, thread: newThread };
        } else {
          const reactions = c.reactions ? [...c.reactions] : [];
          const existingIndex = reactions.findIndex(r => r.emoji === emoji);
          let nextReactions = [];
          if (existingIndex >= 0) {
            const existing = reactions[existingIndex];
            const hasReacted = existing.users.includes('Briselle');
            const newUsers = hasReacted ? existing.users.filter(u => u !== 'Briselle') : [...existing.users, 'Briselle'];
            const newCount = hasReacted ? existing.count - 1 : existing.count + 1;
            nextReactions = [...reactions];
            nextReactions[existingIndex] = { ...existing, count: newCount, users: newUsers };
          } else {
            nextReactions = [...reactions, { emoji, count: 1, users: ['Briselle'] }];
          }
          return { ...c, reactions: nextReactions.filter(r => r.count > 0) };
        }
      });
      persistComments(next);
      return next;
    });
  }, []);
  const updateCommentMsg = useCallback((commentId, msgIndex, patch) => {
    setComments(prev => {
      const next = prev.map(c => {
        if (c.id !== commentId) return c;
        const newThread = c.thread.map((msg, idx) => {
          if (idx !== msgIndex) return msg;
          return { ...msg, ...patch };
        });
        const anyUnreadInThread = newThread.some(msg => msg.unread);
        const nextUnread = anyUnreadInThread ? c.unread : false;
        return { ...c, unread: nextUnread, thread: newThread };
      });
      persistComments(next);
      return next;
    });
  }, []);
  const deleteCommentMsg = useCallback((commentId, msgIndex) => {
    setComments(prev => {
      const next = prev.map(c => {
        if (c.id !== commentId) return c;
        const newThread = c.thread.filter((_, idx) => idx !== msgIndex);
        return { ...c, thread: newThread };
      }).filter(c => c.thread.length > 0);
      persistComments(next);
      return next;
    });
  }, []);
  const addPageComment = useCallback((commentText) => {
    const newComment = {
      id: 'cmt-' + Date.now(),
      blockId: 'page',
      selectedText: null,
      isPageComment: true,
      thread: [{ 
        author: 'Briselle', 
        text: commentText, 
        time: new Date().toISOString(),
        unread: false,
        muted: false,
        reactions: [],
        attachments: []
      }],
      resolved: false,
      isDraft: false,
    };
    setComments(prev => {
      const next = [...prev, newComment];
      persistComments(next);
      return next;
    });
    return newComment;
  }, []);

  const indentBlock = useCallback((blockId, caretOffset = 0) => {
    mutateState(prev => {
      const container = _findBlockContainer(blockId, prev.blocks);
      if (!container || container.index === 0) return; // Cannot indent first child
      
      const block = container.arr[container.index];
      const prevSibling = container.arr[container.index - 1];
      
      // Move block to prevSibling's children
      container.arr.splice(container.index, 1);
      if (!prevSibling.children) {
        prevSibling.children = [];
      }
      prevSibling.children.push(block);
      
      // If previous sibling is toggle/toggle_heading, expand it
      if (prevSibling.type === 'toggle' || prevSibling.type.startsWith('toggle_heading')) {
        prevSibling.open = true;
      }
    });
    
    // Restore focus after React DOM updates
    let attempts = 0;
    const focusTarget = () => {
      const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`);
      if (el) {
        el.focus();
        const sel = window.getSelection();
        const r = document.createRange();
        
        let charCount = 0;
        let set = false;
        function traverse(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const nextCount = charCount + node.length;
            if (caretOffset >= charCount && caretOffset <= nextCount) {
              r.setStart(node, caretOffset - charCount);
              r.collapse(true);
              sel.removeAllRanges();
              sel.addRange(r);
              set = true;
              return true;
            }
            charCount = nextCount;
          } else {
            for (let i = 0; i < node.childNodes.length; i++) {
              if (traverse(node.childNodes[i])) return true;
            }
          }
          return false;
        }
        traverse(el);
        if (!set) {
          r.selectNodeContents(el);
          r.collapse(caretOffset === 0);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      } else if (attempts < 10) {
        attempts++;
        requestAnimationFrame(focusTarget);
      }
    };
    requestAnimationFrame(focusTarget);
  }, [mutateState]);

  const outdentBlock = useCallback((blockId, caretOffset = 0) => {
    mutateState(prev => {
      let foundParent = null;
      let foundContainer = null;
      
      const search = (list, parent = null) => {
        const idx = list.findIndex(b => b.id === blockId);
        if (idx !== -1) {
          foundParent = parent;
          foundContainer = { arr: list, index: idx };
          return true;
        }
        for (const b of list) {
          if (b.children && search(b.children, b)) return true;
          if (b.tabs) {
            for (const t of b.tabs) {
              if (search(t.blocks, null)) return true;
            }
          }
          if (b.columns) {
            for (const c of b.columns) {
              if (search(c.blocks, null)) return true;
            }
          }
        }
        return false;
      };
      
      search(prev.blocks);
      if (!foundParent || !foundContainer) return; // Cannot outdent if no parent
      
      const block = foundContainer.arr[foundContainer.index];
      foundContainer.arr.splice(foundContainer.index, 1);
      
      // Insert after parent in parent's container
      const parentContainer = _findBlockContainer(foundParent.id, prev.blocks);
      if (parentContainer) {
        parentContainer.arr.splice(parentContainer.index + 1, 0, block);
      } else {
        prev.blocks.push(block);
      }
    });
    
    // Restore focus after React DOM updates
    let attempts = 0;
    const focusTarget = () => {
      const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`);
      if (el) {
        el.focus();
        const sel = window.getSelection();
        const r = document.createRange();
        
        let charCount = 0;
        let set = false;
        function traverse(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const nextCount = charCount + node.length;
            if (caretOffset >= charCount && caretOffset <= nextCount) {
              r.setStart(node, caretOffset - charCount);
              r.collapse(true);
              sel.removeAllRanges();
              sel.addRange(r);
              set = true;
              return true;
            }
            charCount = nextCount;
          } else {
            for (let i = 0; i < node.childNodes.length; i++) {
              if (traverse(node.childNodes[i])) return true;
            }
          }
          return false;
        }
        traverse(el);
        if (!set) {
          r.selectNodeContents(el);
          r.collapse(caretOffset === 0);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      } else if (attempts < 10) {
        attempts++;
        requestAnimationFrame(focusTarget);
      }
    };
    requestAnimationFrame(focusTarget);
  }, [mutateState]);

  const deleteAndMergeBlocks = useCallback((id1, id2) => {
    const all = _flatVisibleBlocks(pageRef.current.blocks);
    let idx1 = all.findIndex(b => b.id === id1);
    let idx2 = all.findIndex(b => b.id === id2);
    if (idx1 === -1 || idx2 === -1) return;
    if (idx1 > idx2) {
      const tmp = idx1; idx1 = idx2; idx2 = tmp;
    }
    
    const startBlock = all[idx1];
    const endBlock = all[idx2];
    
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    
    const startEl = document.querySelector(`[data-block-id="${startBlock.id}"] [contenteditable]`);
    const endEl = document.querySelector(`[data-block-id="${endBlock.id}"] [contenteditable]`);
    
    if (!startEl || !endEl) return;
    
    // Get start block content before selection
    const preRange = range.cloneRange();
    preRange.selectNodeContents(startEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    const divBefore = document.createElement('div');
    divBefore.appendChild(preRange.cloneContents());
    const contentBefore = divBefore.innerHTML;
    
    // Get end block content after selection
    const postRange = range.cloneRange();
    postRange.selectNodeContents(endEl);
    postRange.setStart(range.endContainer, range.endOffset);
    const divAfter = document.createElement('div');
    divAfter.appendChild(postRange.cloneContents());
    const contentAfter = divAfter.innerHTML;
    
    const mergedContent = contentBefore + contentAfter;
    
    // Update state
    mutateState(prev => {
      // Update first block
      const targetStart = _getBlockById(startBlock.id, prev.blocks);
      if (targetStart) {
        targetStart.content = mergedContent;
      }
      
      // Delete end block and intermediate blocks
      for (let i = idx1 + 1; i <= idx2; i++) {
        const blockToDelete = all[i];
        const container = _findBlockContainer(blockToDelete.id, prev.blocks);
        if (container) {
          const target = container.arr[container.index];
          if (target && target.children && target.children.length > 0) {
            container.arr.splice(container.index + 1, 0, ...target.children);
          }
          container.arr.splice(container.index, 1);
        }
      }
    });
    
    // Place cursor at merge point
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-block-id="${startBlock.id}"] [contenteditable]`);
      if (el) {
        el.innerHTML = mergedContent;
        el.focus();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentBefore;
        const caretOffset = tempDiv.textContent.length;
        
        const sel = window.getSelection();
        const r = document.createRange();
        
        let charCount = 0;
        let nodeToFocus = el;
        let offsetInNode = 0;
        
        function traverse(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const nextCount = charCount + node.length;
            if (caretOffset >= charCount && caretOffset <= nextCount) {
              nodeToFocus = node;
              offsetInNode = caretOffset - charCount;
              return true;
            }
            charCount = nextCount;
          } else {
            for (let i = 0; i < node.childNodes.length; i++) {
              if (traverse(node.childNodes[i])) return true;
            }
          }
          return false;
        }
        
        traverse(el);
        r.setStart(nodeToFocus, offsetInNode);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    });
  }, [mutateState]);

  const deleteMultipleBlocks = useCallback((blockIds) => {
    mutateState(prev => {
      blockIds.forEach(id => {
        const container = _findBlockContainer(id, prev.blocks);
        if (container) {
          container.arr.splice(container.index, 1);
        }
      });
    });
  }, [mutateState]);

  const value = {
    pageState, setPageState: mutateState, updatePage,
    addBlock, deleteBlock, duplicateBlock, changeBlockType, moveBlock,
    indentBlock, outdentBlock, deleteAndMergeBlocks, deleteMultipleBlocks, insertBlocks,
    updateBlockContent, updateBlockProperty, clearAllBlockFonts,
    insertColumn, deleteColumn, moveColumn: reorderColumnToPosition,
    getBlockById, findBlockContainer, flatVisibleBlocks,
    triggerUpdate, tick,
    slashMenu, showSlashMenu, hideSlashMenu, updateSlashFilter,
    contextMenu, showContextMenu, hideContextMenu,
    activeBlockId, setActiveBlockId,
    activeMediaPickerId, setActiveMediaPickerId,
    selectedBlockIds, setSelectedBlockIds,
    selectionStartId, setSelectionStartId,
    comments, addComment, addPageComment, addDraftComment, saveDraftComment, cancelDraftComment, addReply, resolveComment,
    updateCommentMsg, deleteCommentMsg, deleteComment, toggleUnreadComment, toggleMuteComment, addReaction, markCommentAsRead,
    commentSidebarOpen, setCommentSidebarOpen,
    activeCommentId, setActiveCommentId,
    deleteConfirm, setDeleteConfirm,
    hoveredCommentId, setHoveredCommentId,
    showPageCommentComposer, setShowPageCommentComposer,
    auditData: initialAuditData,
    moveBlockToTop, moveBlockToBottom, moveBlockToTab, moveBlockToColumn, moveBlockToPage, createBlockLevelComment, triggerBlockAi, acceptSuggestion,
    undoPopover, showUndoPopover, hideUndoPopover,
    aiRephrase, openAiRephrase, closeAiRephrase,
    restrictedDeletion,
    storeRedactedContent, getRedactedContent, clearRedactedContent, clearAllRedactedContent,
    undo, redo, canUndo, canRedo, restoreFromCheckpoint, historyManager: historyManagerRef,
  };
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}
