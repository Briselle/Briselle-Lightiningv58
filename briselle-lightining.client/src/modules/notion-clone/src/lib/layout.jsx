/* ============================================================
   NotionNest — layout.jsx
   Sidebar, Topbar, PageHeader
   ============================================================ */
import { useState, useCallback, useRef, memo } from 'react';
import { usePageContext } from './PageContext';
import { EmojiPicker } from './menus';

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

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} title="Toggle sidebar">
          ☰
        </button>
        <div className="topbar-breadcrumb">
          <span>{pageState.icon}</span>
          <span className="breadcrumb-title">{pageState.title || 'Untitled'}</span>
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

/* ---- PageHeader ---- */
export const PageHeader = memo(function PageHeader() {
  const { pageState, updatePage } = usePageContext();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const iconRef = useRef(null);
  const titleRef = useRef(null);

  const handleTitleInput = useCallback((e) => {
    updatePage({ title: e.target.textContent });
    e.target.classList.toggle('is-empty', e.target.textContent.trim().length === 0);
  }, [updatePage]);

  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus first block
      const first = document.querySelector('.blocks-container .block [contenteditable]');
      if (first) first.focus();
    }
  }, []);

  const handleIconClick = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  const handleEmojiSelect = useCallback((emoji) => {
    updatePage({ icon: emoji });
    setShowEmojiPicker(false);
  }, [updatePage]);

  return (
    <div className="page-header">
      <div className="page-icon-wrapper" style={{ position: 'relative' }}>
        <span className="page-icon" ref={iconRef} onClick={handleIconClick}>
          {pageState.icon || '📄'}
        </span>
        {showEmojiPicker && (
          <EmojiPicker
            position={{ x: 0, y: 90 }}
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>
      <div
        className={`page-title${!pageState.title ? ' is-empty' : ''}`}
        ref={titleRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Untitled"
        onInput={handleTitleInput}
        onKeyDown={handleTitleKeyDown}
      >
        {pageState.title}
      </div>
    </div>
  );
});
