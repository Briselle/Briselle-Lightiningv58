/* ============================================================
   NotionNest — PageContext.jsx
   React context providing page state and all mutation actions
   ============================================================ */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  buildDefaultBlocks, fixTabDefaults, generateId, makeBlock,
  getBlockById as _getBlockById, findBlockContainer as _findBlockContainer,
  flatVisibleBlocks as _flatVisibleBlocks, createNewBlock, deepCloneBlock,
} from './utils';

const PageContext = createContext(null);

export function usePageContext() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePageContext must be used within PageProvider');
  return ctx;
}

export function PageProvider({ children, initialBlocks, initialTitle, initialIcon, initialCover, onChange }) {
  const [pageState, setPageState] = useState(() => {
    const blocks = initialBlocks || buildDefaultBlocks();
    fixTabDefaults(blocks);
    return {
      title: initialTitle !== undefined && initialTitle !== null ? initialTitle : 'Getting Started',
      icon: initialIcon !== undefined && initialIcon !== null ? initialIcon : '📝',
      cover: initialCover !== undefined && initialCover !== null ? initialCover : null,
      blocks
    };
  });

  const [slashMenu, setSlashMenu] = useState({ open: false, blockId: null, position: null, filter: '' });
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, items: [] });
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const pageRef = useRef(pageState);
  pageRef.current = pageState;

  const triggerUpdate = useCallback(() => setTick(n => n + 1), []);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (onChangeRef.current) {
      onChangeRef.current(pageState);
    }
  }, [pageState]);

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
    setPageState(prev => {
      const next = { ...prev, blocks: JSON.parse(JSON.stringify(prev.blocks)) };
      const container = _findBlockContainer(blockId, next.blocks);
      if (!container) return prev;
      if (container.arr.length <= 1 && container.arr === next.blocks) return prev;
      container.arr.splice(container.index, 1);
      return next;
    });
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
    setPageState(prev => ({ ...prev, ...updates }));
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
  const addComment = useCallback((blockId, selectedText, commentText) => {
    const newComment = {
      id: 'cmt-' + Date.now(),
      blockId,
      selectedText,
      thread: [{ author: 'You', text: commentText, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }],
      resolved: false,
    };
    setComments(prev => [...prev, newComment]);
    setCommentSidebarOpen(true);
    return newComment;
  }, []);

  const addReply = useCallback((commentId, text) => {
    setComments(prev => prev.map(c => c.id === commentId ? {
      ...c,
      thread: [...c.thread, { author: 'You', text, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }],
    } : c));
  }, []);

  const resolveComment = useCallback((commentId) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
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
    comments, addComment, addReply, resolveComment,
    commentSidebarOpen, setCommentSidebarOpen,
  };

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}
