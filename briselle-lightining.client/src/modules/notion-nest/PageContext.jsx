/* ============================================================
   NotionNest — PageContext.jsx
   React context providing page state and all mutation actions
   ============================================================ */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  buildDefaultBlocks, fixTabDefaults, generateId, makeBlock,
  getBlockById as _getBlockById, findBlockContainer as _findBlockContainer,
  flatVisibleBlocks as _flatVisibleBlocks, createNewBlock, deepCloneBlock,
  calculateInitials,
} from './utils';
const PageContext = createContext(null);
export function usePageContext() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePageContext must be used within PageProvider');
  return ctx;
}
export function PageProvider({ children, initialBlocks, initialTitle, initialIcon, initialCover, initialCoverPosition, initialComments, initialAuditData, onChange }) {
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
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, items: [] });
  const [activeBlockId, setActiveBlockId] = useState(null);
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
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [showPageCommentComposer, setShowPageCommentComposer] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [tick, setTick] = useState(0);
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const pageRef = useRef(pageState);
  pageRef.current = pageState;
  const triggerUpdate = useCallback(() => setTick(n => n + 1), []);

  useEffect(() => {
    const timer = setInterval(() => {
      triggerUpdate();
    }, 30000);
    return () => clearInterval(timer);
  }, [triggerUpdate]);
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
  /* ---- Immutable state update helper ---- */
  const updateState = useCallback((fn) => {
    setPageState(prev => {
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      fn(next);
      return next;
    });
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
  const addBlock = useCallback((type, afterBlockId) => {
    const newBlock = createNewBlock(type);
    setPageState(prev => {
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      if (afterBlockId) {
        const container = _findBlockContainer(afterBlockId, next.blocks);
        if (container) {
          container.arr.splice(container.index + 1, 0, newBlock);
        } else {
          next.blocks.push(newBlock);
        }
      } else {
        next.blocks.push(newBlock);
      }
      return next;
    });
    return newBlock;
  }, []);
  const deleteBlock = useCallback((blockId) => {
    const blockComments = commentsRef.current.filter(c => c.blockId === blockId);
    if (blockComments.length > 0) {
      setDeleteConfirm({
        type: 'block',
        blockId,
        message: `This block contains active comments. Deleting it will also delete those comments.`,
        onConfirm: () => {
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
          setPageState(prev => {
            const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
            const container = _findBlockContainer(blockId, next.blocks);
            if (container) {
              container.arr.splice(container.index, 1);
            }
            return next;
          });
          setDeleteConfirm(null);
        },
        onCancel: () => {
          setDeleteConfirm(null);
        }
      });
    } else {
      setPageState(prev => {
        const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
        const container = _findBlockContainer(blockId, next.blocks);
        if (!container) return prev;
        if (container.arr.length <= 1 && container.arr === next.blocks) return prev;
        container.arr.splice(container.index, 1);
        return next;
      });
    }
  }, []);
  const duplicateBlock = useCallback((blockId) => {
    let cloned = null;
    setPageState(prev => {
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      const block = _getBlockById(blockId, next.blocks);
      if (!block) return prev;
      cloned = deepCloneBlock(block);
      const container = _findBlockContainer(blockId, next.blocks);
      if (container) {
        container.arr.splice(container.index + 1, 0, cloned);
      }
      return next;
    });
    return cloned;
  }, []);
  const changeBlockType = useCallback((blockId, newType) => {
    setPageState(prev => {
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      const block = _getBlockById(blockId, next.blocks);
      if (!block) return prev;
      const tmp = document.createElement('div');
      tmp.innerHTML = block.content || '';
      const textContent = tmp.textContent;
      block.type = newType;
      // Reset type-specific props
      delete block.checked; delete block.open; delete block.children;
      delete block.calloutIcon; delete block.language;
      delete block.rows; delete block.columns; delete block.tabs; delete block.activeTabId;
      delete block.url; delete block.bookmarkTitle; delete block.description; delete block.caption;
      if (newType === 'todo') block.checked = false;
      if (newType === 'toggle') { block.open = false; block.children = [makeBlock('paragraph', '')]; }
      if (newType === 'callout') block.calloutIcon = '💡';
      if (newType === 'code') { block.language = 'javascript'; block.content = textContent; }
      if (newType === 'table') { block.rows = [['Col 1', 'Col 2', 'Col 3'], ['', '', ''], ['', '', '']]; block.content = ''; }
      if (newType === 'columns') { block.content = ''; block.columns = [{ id: generateId(), blocks: [makeBlock('paragraph', textContent)] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }]; }
      if (newType === 'tabs') { block.content = ''; block.tabs = [{ id: generateId(), name: 'Tab 1', blocks: [makeBlock('paragraph', textContent)] }, { id: generateId(), name: 'Tab 2', blocks: [makeBlock('paragraph', '')] }]; block.activeTabId = block.tabs[0].id; }
      if (newType === 'divider' || newType === 'toc') block.content = '';
      if (newType === 'image') { block.url = ''; block.caption = ''; block.content = ''; }
      if (newType === 'bookmark') { block.url = ''; block.bookmarkTitle = ''; block.description = ''; block.content = ''; }
      return next;
    });
  }, []);
  const moveBlock = useCallback((blockId, direction) => {
    setPageState(prev => {
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      const container = _findBlockContainer(blockId, next.blocks);
      if (!container) return prev;
      const { arr, index } = container;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= arr.length) return prev;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return next;
    });
  }, []);
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
            setPageState(prev => {
              const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
              const block = _getBlockById(blockId, next.blocks);
              if (block) block.content = content;
              return next;
            });
            setDeleteConfirm(null);
          },
          onCancel: () => {
            // Restore previous block layout in page content
            setPageState(prev => ({ ...prev }));
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
    setPageState(prev => {
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      const block = _getBlockById(blockId, next.blocks);
      if (block) block.content = content;
      return next;
    });
  }, []);
  const updateBlockProperty = useCallback((blockId, prop, value) => {
    setPageState(prev => {
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      const block = _getBlockById(blockId, next.blocks);
      if (block) block[prop] = value;
      return next;
    });
  }, []);
  const updatePage = useCallback((updates) => {
    setPageState(prev => {
      let nextIcon = prev.icon;
      if (updates.title !== undefined && prev.icon && prev.icon.startsWith('initials:')) {
        const parts = prev.icon.slice(9).split(':');
        const mode = parts[2] || 'two';
        const color = parts[1] || 'default';
        const customText = parts[2] === 'custom' ? parts[0] : '';
        const newText = calculateInitials(updates.title, mode, customText);
        nextIcon = `initials:${newText}:${color}:${mode}`;
      }
      return { ...prev, ...updates, icon: updates.icon !== undefined ? updates.icon : nextIcon };
    });
  }, []);
  /* ---- Menu actions ---- */
  const showSlashMenu = useCallback((blockId, position) => {
    setSlashMenu({ open: true, blockId, position, filter: '' });
  }, []);
  const hideSlashMenu = useCallback(() => {
    setSlashMenu({ open: false, blockId: null, position: null, filter: '' });
  }, []);
  const updateSlashFilter = useCallback((filter) => {
    setSlashMenu(prev => ({ ...prev, filter }));
  }, []);
  const showContextMenu = useCallback((x, y, items) => {
    setContextMenu({ open: true, x, y, items });
  }, []);
  const hideContextMenu = useCallback(() => {
    setContextMenu({ open: false, x: 0, y: 0, items: [] });
  }, []);
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
  }, []);
  const cancelDraftComment = useCallback((commentId) => {
    setComments(prev => {
      const next = prev.filter(c => c.id !== commentId);
      persistComments(next);
      return next;
    });
  }, []);
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
    const markEl = document.querySelector(`.inline-comment-highlight[data-comment-id="${commentId}"], .inline-comment[data-comment-id="${commentId}"]`);
    if (markEl) {
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
          setPageState(prev => {
            const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
            const blockObj = _getBlockById(bId, next.blocks);
            if (blockObj) blockObj.content = ce.innerHTML;
            return next;
          });
        }
      }
    }
    setComments(prev => {
      const next = prev.filter(c => c.id !== commentId);
      persistComments(next);
      return next;
    });
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
  }, [activeCommentId]);
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
            const existing = reactions.find(r => r.emoji === emoji);
            let nextReactions = [];
            if (existing) {
              if (existing.users.includes('Briselle')) {
                existing.users = existing.users.filter(u => u !== 'Briselle');
                existing.count -= 1;
              } else {
                existing.users.push('Briselle');
                existing.count += 1;
              }
              nextReactions = reactions;
            } else {
              nextReactions = [...reactions, { emoji, count: 1, users: ['Briselle'] }];
            }
            return { ...msg, reactions: nextReactions.filter(r => r.count > 0) };
          });
          return { ...c, thread: newThread };
        } else {
          const reactions = c.reactions ? [...c.reactions] : [];
          const existing = reactions.find(r => r.emoji === emoji);
          let nextReactions = [];
          if (existing) {
            if (existing.users.includes('Briselle')) {
              existing.users = existing.users.filter(u => u !== 'Briselle');
              existing.count -= 1;
            } else {
              existing.users.push('Briselle');
              existing.count += 1;
            }
            nextReactions = reactions;
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
  const value = {
    pageState, setPageState: updateState, updatePage,
    addBlock, deleteBlock, duplicateBlock, changeBlockType, moveBlock,
    updateBlockContent, updateBlockProperty,
    getBlockById, findBlockContainer, flatVisibleBlocks,
    triggerUpdate, tick,
    slashMenu, showSlashMenu, hideSlashMenu, updateSlashFilter,
    contextMenu, showContextMenu, hideContextMenu,
    activeBlockId, setActiveBlockId,
    comments, addComment, addPageComment, addDraftComment, saveDraftComment, cancelDraftComment, addReply, resolveComment,
    updateCommentMsg, deleteCommentMsg, deleteComment, toggleUnreadComment, toggleMuteComment, addReaction, markCommentAsRead,
    commentSidebarOpen, setCommentSidebarOpen,
    activeCommentId, setActiveCommentId,
    deleteConfirm, setDeleteConfirm,
    hoveredCommentId, setHoveredCommentId,
    showPageCommentComposer, setShowPageCommentComposer,
    auditData: initialAuditData,
  };
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}
