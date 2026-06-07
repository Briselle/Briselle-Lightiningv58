/* ============================================================
   NotionNest — menus.jsx
   SlashMenu, ContextMenu, InlineToolbar, EmojiPicker
   ============================================================ */
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { usePageContext } from './PageContext';
import { slashMenuSections } from './utils';

/* ---- Slash Command Menu ---- */
export const SlashMenu = memo(function SlashMenu() {
  const { slashMenu, hideSlashMenu, updateSlashFilter, changeBlockType, updateBlockContent } = usePageContext();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  const getVisibleItems = useCallback(() => {
    const items = [];
    slashMenuSections.forEach(section => {
      section.items.forEach(item => {
        const match = !slashMenu.filter || item.name.toLowerCase().includes(slashMenu.filter) || item.type.includes(slashMenu.filter);
        if (match) items.push(item);
      });
    });
    return items;
  }, [slashMenu.filter]);

  const selectItem = useCallback((type) => {
    if (slashMenu.blockId) {
      updateBlockContent(slashMenu.blockId, '');
      changeBlockType(slashMenu.blockId, type);
    }
    hideSlashMenu();
  }, [slashMenu.blockId, updateBlockContent, changeBlockType, hideSlashMenu]);

  useEffect(() => {
    if (!slashMenu.open) return;
    setSelectedIndex(0);
    const handler = (e) => {
      const visible = getVisibleItems();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => (i + 1) % Math.max(1, visible.length)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => (i - 1 + visible.length) % Math.max(1, visible.length)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (visible[selectedIndex]) selectItem(visible[selectedIndex].type); }
      else if (e.key === 'Escape') { hideSlashMenu(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [slashMenu.open, slashMenu.filter, selectedIndex, getVisibleItems, selectItem, hideSlashMenu]);

  // Close on click outside
  useEffect(() => {
    if (!slashMenu.open) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) hideSlashMenu(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [slashMenu.open, hideSlashMenu]);

  if (!slashMenu.open) return null;

  const visibleItems = getVisibleItems();
  let itemIndex = 0;

  const style = {};
  if (slashMenu.position) {
    style.left = Math.max(8, (slashMenu.position.x || 0) - 16);
    style.top = (slashMenu.position.y || 0) + 6;
  }

  return (
    <div className="slash-menu" ref={menuRef} style={style}>
      {slashMenuSections.map(section => {
        const sectionItems = section.items.filter(item =>
          !slashMenu.filter || item.name.toLowerCase().includes(slashMenu.filter) || item.type.includes(slashMenu.filter)
        );
        if (sectionItems.length === 0) return null;
        return (
          <div key={section.label}>
            <div className="slash-menu-header">{section.label}</div>
            {sectionItems.map(item => {
              const idx = itemIndex++;
              return (
                <div
                  key={item.type}
                  className={`slash-menu-item${idx === selectedIndex ? ' selected' : ''}`}
                  onClick={() => selectItem(item.type)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="slash-menu-item-icon">{item.icon}</span>
                  <div className="slash-menu-item-info">
                    <span className="slash-menu-item-name">{item.name}</span>
                    <span className="slash-menu-item-description">{item.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {visibleItems.length === 0 && <div className="slash-menu-empty">No results</div>}
    </div>
  );
});

/* ---- Context Menu ---- */
export const ContextMenu = memo(function ContextMenu() {
  const { contextMenu, hideContextMenu } = usePageContext();
  const menuRef = useRef(null);

  useEffect(() => {
    if (!contextMenu.open) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) hideContextMenu(); };
    const esc = (e) => { if (e.key === 'Escape') hideContextMenu(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [contextMenu.open, hideContextMenu]);

  if (!contextMenu.open) return null;

  return (
    <div className="context-menu" ref={menuRef} style={{ left: contextMenu.x, top: contextMenu.y }}>
      {contextMenu.items.map((item, i) => {
        if (item.divider) return <div key={`d${i}`} className="context-menu-divider" />;
        return (
          <div
            key={item.label}
            className={`context-menu-item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`}
            onClick={() => { if (!item.disabled && item.action) { item.action(); hideContextMenu(); } }}
          >
            {item.label}
            {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
          </div>
        );
      })}
    </div>
  );
});

/* ---- Inline Formatting Toolbar ---- */
export const InlineToolbar = memo(function InlineToolbar() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setVisible(false); return; }
      const anchor = sel.anchorNode;
      const editable = anchor?.nodeType === 1 ? anchor.closest?.('[contenteditable]') : anchor?.parentElement?.closest?.('[contenteditable]');
      const block = editable?.closest?.('.block');
      if (!block || !editable) { setVisible(false); return; }
      // Don't show in code blocks or tab names
      if (block.classList.contains('block-code') || editable.closest('.tab-name')) { setVisible(false); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
      setVisible(true);
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  const exec = useCallback((cmd, val) => { document.execCommand(cmd, false, val); }, []);

  if (!visible) return null;

  return (
    <div className="inline-toolbar" ref={toolbarRef}
      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
      onMouseDown={e => e.preventDefault()} // keep selection
    >
      <button className={`inline-toolbar-btn${document.queryCommandState('bold') ? ' active' : ''}`} onClick={() => exec('bold')} title="Bold"><b>B</b></button>
      <button className={`inline-toolbar-btn${document.queryCommandState('italic') ? ' active' : ''}`} onClick={() => exec('italic')} title="Italic"><i>I</i></button>
      <button className={`inline-toolbar-btn${document.queryCommandState('underline') ? ' active' : ''}`} onClick={() => exec('underline')} title="Underline"><u>U</u></button>
      <button className={`inline-toolbar-btn${document.queryCommandState('strikeThrough') ? ' active' : ''}`} onClick={() => exec('strikeThrough')} title="Strikethrough"><s>S</s></button>
      <div className="inline-toolbar-divider" />
      <button className="inline-toolbar-btn" onClick={() => exec('formatBlock', 'code')} title="Code">&lt;&gt;</button>
      <button className="inline-toolbar-btn" onClick={() => { const url = prompt('Enter URL:'); if (url) exec('createLink', url); }} title="Link">🔗</button>
    </div>
  );
});

/* ---- Emoji Picker ---- */
export function EmojiPicker({ onSelect, position, onClose }) {
  const ref = useRef(null);
  const emojis = ['📝','📌','🚀','⭐','❤️','🔥','💡','✅','❌','🎯','📢','🛠','⚡','🌟','💬','🧪','🎨','📚','🔑','🏆','💎','🌈','🎵','📎','📒','🗂','📊','🖼'];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="emoji-picker-menu" ref={ref} style={{ left: position?.x || 0, top: position?.y || 0 }}>
      <div className="emoji-grid">
        {emojis.map(em => <span key={em} onClick={() => onSelect(em)}>{em}</span>)}
      </div>
    </div>
  );
}
