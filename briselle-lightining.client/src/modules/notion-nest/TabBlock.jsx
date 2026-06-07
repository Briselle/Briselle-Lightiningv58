/* ============================================================
   NotionNest — TabBlock.jsx
   ★ Full Notion tab block with Settings, Shapes, Icons
   ============================================================ */
import { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import { usePageContext } from './PageContext';
import { generateId, makeBlock } from './utils';
import { NotionIconPicker } from './menus';

/* ---- Helpers ---- */
function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const DEFAULT_SELECTION_COLOR = '#0176d3';

/* ---- Tab Shape Options ---- */
const TAB_SHAPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'pill', label: 'Pill' },
  { value: 'rounded', label: 'Top Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'underline', label: 'Underline Only' },
  { value: 'trapezoid', label: 'Trapezoid' },
  { value: 'trapezoid-asym', label: 'Trapezoid Asymmetric' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'tags', label: 'Tags' },
  { value: 'segment', label: 'Segment' },
  { value: 'button', label: 'Button' },
  { value: 'lifted', label: 'Lifted' },
];

const HEIGHT_MAP = { small: 32, medium: 40, large: 48 };

/* ---- Emoji categories for tab icon picker ---- */
/* TAB_ICON_EMOJIS removed — now using NotionIconPicker from menus.jsx */

/* ============ Tab Settings Popover ============ */
const TabSettingsPopover = memo(function TabSettingsPopover({ style, position, onPatch, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const onOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          !e.target.closest('.tab-settings-btn')) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 10);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onOutside, true);
    };
  }, [onClose]);

  const selColor = (style.tabSelectionColor && style.tabSelectionColor.startsWith('#')) ? style.tabSelectionColor : DEFAULT_SELECTION_COLOR;

  return (
    <div ref={panelRef} className="tab-settings-popover" style={{ top: position.top, left: position.left }} onPointerDown={(e) => e.stopPropagation()}>
      <header className="tab-settings-header">
        <span className="tab-settings-heading">Tab settings</span>
        <button className="tab-settings-close" onClick={onClose}>×</button>
      </header>

      {/* Shape */}
      <div className="tab-settings-row">
        <span className="tab-settings-label">Shape</span>
        <select className="tab-settings-select" value={style.tabStyle || 'standard'} onChange={(e) => onPatch({ tabStyle: e.target.value })}>
          {TAB_SHAPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Tab Highlight */}
      <div className="tab-settings-row">
        <span className="tab-settings-label">Tab Highlight</span>
        <div className="tab-settings-control-cluster">
          {style.tabShowUnderline && (
            <>
              <input type="color" className="tab-settings-color-input" value={selColor}
                onChange={(e) => onPatch({ tabSelectionColor: e.target.value, tabCustomSelection: true })} />
              <button className="tab-settings-clear-btn" title="Reset to default"
                onClick={() => onPatch({ tabSelectionColor: DEFAULT_SELECTION_COLOR, tabCustomSelection: true })}>✕</button>
            </>
          )}
          <button
            className={`tab-settings-toggle${style.tabShowUnderline ? ' is-on' : ''}`}
            onClick={() => onPatch({
              tabShowUnderline: !style.tabShowUnderline,
              tabCustomSelection: !style.tabShowUnderline,
              ...(!style.tabShowUnderline ? { tabSelectionColor: DEFAULT_SELECTION_COLOR } : {}),
            })}
          />
        </div>
      </div>

      {/* Gap */}
      <div className="tab-settings-row">
        <span className="tab-settings-label">Gap</span>
        <div className="tab-settings-stepper">
          <button className="tab-settings-step-btn" onClick={() => onPatch({ tabGap: Math.max(0, (style.tabGap || 0) - 2) })}>−</button>
          <span className="tab-settings-step-val">{style.tabGap || 0}px</span>
          <button className="tab-settings-step-btn" onClick={() => onPatch({ tabGap: Math.min(32, (style.tabGap || 0) + 2) })}>+</button>
        </div>
      </div>

      {/* Align */}
      <div className="tab-settings-row">
        <span className="tab-settings-label">Align</span>
        <select className="tab-settings-select" value={style.tabAlignment || 'left'} onChange={(e) => onPatch({ tabAlignment: e.target.value })}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Height */}
      <div className="tab-settings-row">
        <span className="tab-settings-label">Height</span>
        <select className="tab-settings-select" value={style.tabHeight || 'medium'} onChange={(e) => onPatch({ tabHeight: e.target.value })}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  );
});

/* Tab Icon Picker removed — using NotionIconPicker from menus.jsx */

/* ============ Main TabBlock Component ============ */
const TabBlock = memo(function TabBlock({ block }) {
  const { updateBlockProperty, showContextMenu } = usePageContext();
  const [dragOverTabId, setDragOverTabId] = useState(null);
  const [dragSide, setDragSide] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [iconPickerState, setIconPickerState] = useState(null);
  const [BR, setBR] = useState(null);
  const barRef = useRef(null);
  const settingsBtnRef = useRef(null);

  useEffect(() => { import('./BlockRenderer').then(m => setBR(() => m.default)); }, []);

  const tabs = block.tabs || [];
  const activeTabId = block.activeTabId || (tabs[0] && tabs[0].id);
  const activeTab = tabs.find(t => t.id === activeTabId);

  /* Tab settings state with defaults */
  const tabStyle = useMemo(() => ({
    tabStyle: block.tabStyle || 'standard',
    tabShowUnderline: block.tabShowUnderline !== undefined ? block.tabShowUnderline : true,
    tabGap: block.tabGap || 0,
    tabHeight: block.tabHeight || 'medium',
    tabCustomSelection: block.tabCustomSelection || false,
    tabSelectionColor: block.tabSelectionColor || DEFAULT_SELECTION_COLOR,
    tabAlignment: block.tabAlignment || 'left',
  }), [block.tabStyle, block.tabShowUnderline, block.tabGap, block.tabHeight, block.tabCustomSelection, block.tabSelectionColor, block.tabAlignment]);

  const patchStyle = useCallback((patch) => {
    for (const [key, val] of Object.entries(patch)) {
      updateBlockProperty(block.id, key, val);
    }
  }, [block.id, updateBlockProperty]);

  /* Dynamic bar style */
  const barStyle = useMemo(() => {
    const s = {};
    s.height = HEIGHT_MAP[tabStyle.tabHeight] || 40;
    s.gap = `${tabStyle.tabGap}px`;
    if (tabStyle.tabAlignment === 'center') s.justifyContent = 'center';
    else if (tabStyle.tabAlignment === 'right') s.justifyContent = 'flex-end';
    return s;
  }, [tabStyle]);

  /* Dynamic tab-item style */
  const getTabItemStyle = useCallback((tab) => {
    const s = {};
    const isActive = tab.id === activeTabId;
    const shape = tabStyle.tabStyle;

    // Underline/highlight
    if (!tabStyle.tabShowUnderline) {
      s.borderBottom = '2px solid transparent';
    } else if (isActive && tabStyle.tabCustomSelection) {
      s.borderBottomColor = tabStyle.tabSelectionColor;
      // Auto-tint the active tab background with a pale shade of the selection color
      s.background = hexToRgba(tabStyle.tabSelectionColor, 0.12);
    }

    // Shape-specific overrides
    if (shape === 'pill' && isActive) s.background = s.background || 'rgba(255,255,255,.08)';
    else if (shape === 'square' && isActive) s.background = s.background || 'rgba(255,255,255,.06)';
    else if (shape === 'rounded' && isActive) s.background = s.background || 'rgba(255,255,255,.06)';

    return s;
  }, [activeTabId, tabStyle]);

  /* Tab actions */
  const switchTab = useCallback((tabId) => {
    if (tabId !== activeTabId) updateBlockProperty(block.id, 'activeTabId', tabId);
  }, [block.id, activeTabId, updateBlockProperty]);

  const addTab = useCallback(() => {
    const newTab = { id: generateId(), name: `Tab ${tabs.length + 1}`, icon: '', blocks: [makeBlock('paragraph', '')] };
    const newTabs = [...tabs, newTab];
    updateBlockProperty(block.id, 'tabs', newTabs);
    setTimeout(() => updateBlockProperty(block.id, 'activeTabId', newTab.id), 10);
  }, [block.id, tabs, updateBlockProperty]);

  const closeTab = useCallback((tabId, e) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    updateBlockProperty(block.id, 'tabs', newTabs);
    if (activeTabId === tabId) {
      const newActive = newTabs[Math.min(idx, newTabs.length - 1)]?.id;
      updateBlockProperty(block.id, 'activeTabId', newActive);
    }
  }, [block.id, tabs, activeTabId, updateBlockProperty]);

  /* Rename */
  const startRename = useCallback((tabId) => {
    setEditingTabId(tabId);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-tab-block="${block.id}"] [data-tab-id="${tabId}"] .tab-name`);
      if (el) { el.contentEditable = 'true'; el.focus(); document.execCommand('selectAll', false, null); }
    });
  }, [block.id]);

  const finishRename = useCallback((tabId) => {
    const el = document.querySelector(`[data-tab-block="${block.id}"] [data-tab-id="${tabId}"] .tab-name`);
    if (el) {
      el.contentEditable = 'false';
      const newName = el.textContent.trim() || 'Untitled';
      const newTabs = tabs.map(t => t.id === tabId ? { ...t, name: newName } : t);
      updateBlockProperty(block.id, 'tabs', newTabs);
    }
    setEditingTabId(null);
  }, [block.id, tabs, updateBlockProperty]);

  /* Tab icon */
  const setTabIcon = useCallback((tabId, icon) => {
    const newTabs = tabs.map(t => t.id === tabId ? { ...t, icon } : t);
    updateBlockProperty(block.id, 'tabs', newTabs);
  }, [block.id, tabs, updateBlockProperty]);

  /* Drag reorder */
  const handleDragStart = useCallback((e, tabId) => {
    e.dataTransfer.setData('text/tab-id', tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  }, []);
  const handleDragEnd = useCallback((e) => { e.currentTarget.classList.remove('dragging'); setDragOverTabId(null); setDragSide(null); }, []);
  const handleDragOver = useCallback((e, tabId) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOverTabId(tabId);
    setDragSide(e.clientX < rect.left + rect.width / 2 ? 'left' : 'right');
  }, []);
  const handleDrop = useCallback((e, targetTabId) => {
    e.preventDefault();
    const sourceTabId = e.dataTransfer.getData('text/tab-id');
    if (!sourceTabId || sourceTabId === targetTabId) { setDragOverTabId(null); setDragSide(null); return; }
    const srcIdx = tabs.findIndex(t => t.id === sourceTabId);
    const tgtIdx = tabs.findIndex(t => t.id === targetTabId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(srcIdx, 1);
    const insertIdx = dragSide === 'left' ? (srcIdx < tgtIdx ? tgtIdx - 1 : tgtIdx) : (srcIdx < tgtIdx ? tgtIdx : tgtIdx + 1);
    newTabs.splice(insertIdx, 0, moved);
    updateBlockProperty(block.id, 'tabs', newTabs);
    setDragOverTabId(null); setDragSide(null);
  }, [block.id, tabs, dragSide, updateBlockProperty]);

  /* Enhanced right-click context menu */
  const handleContextMenu = useCallback((e, tab) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = tabs.findIndex(t => t.id === tab.id);
    showContextMenu(e.clientX, e.clientY, [
      { label: '✏️  Rename', action: () => startRename(tab.id) },
      { label: `${tab.icon || '😊'}  Edit icon`, action: () => {
        const tabEl = document.querySelector(`[data-tab-block="${block.id}"] [data-tab-id="${tab.id}"]`);
        const rect = tabEl?.getBoundingClientRect();
        setIconPickerState({ tabId: tab.id, top: rect ? rect.bottom + 4 : e.clientY, left: rect ? rect.left : e.clientX });
      }},
      { label: '🔗  Copy link', action: () => {
        navigator.clipboard?.writeText(`${window.location.href}#tab:${block.id}:${tab.id}`);
      }},
      { divider: true },
      { label: 'Duplicate tab', action: () => {
        const clone = JSON.parse(JSON.stringify(tab));
        clone.id = generateId(); clone.name += ' copy';
        function reassign(b) { b.id = generateId(); if (b.children) b.children.forEach(reassign); if (b.tabs) b.tabs.forEach(t => { t.id = generateId(); t.blocks.forEach(reassign); }); if (b.columns) b.columns.forEach(c => { c.id = generateId(); c.blocks.forEach(reassign); }); }
        clone.blocks.forEach(reassign);
        const newTabs = [...tabs]; newTabs.splice(idx + 1, 0, clone);
        updateBlockProperty(block.id, 'tabs', newTabs);
        updateBlockProperty(block.id, 'activeTabId', clone.id);
      }},
      { label: 'Move left', disabled: idx === 0, action: () => { const nt = [...tabs]; [nt[idx - 1], nt[idx]] = [nt[idx], nt[idx - 1]]; updateBlockProperty(block.id, 'tabs', nt); }},
      { label: 'Move right', disabled: idx === tabs.length - 1, action: () => { const nt = [...tabs]; [nt[idx], nt[idx + 1]] = [nt[idx + 1], nt[idx]]; updateBlockProperty(block.id, 'tabs', nt); }},
      { divider: true },
      { label: '🗑️  Delete tab', danger: true, disabled: tabs.length <= 1, action: () => {
        const nt = tabs.filter(t => t.id !== tab.id);
        updateBlockProperty(block.id, 'tabs', nt);
        if (activeTabId === tab.id) updateBlockProperty(block.id, 'activeTabId', nt[Math.min(idx, nt.length - 1)]?.id);
      }},
    ]);
  }, [block.id, tabs, activeTabId, showContextMenu, startRename, updateBlockProperty]);

  /* Settings popover position */
  const settingsPosition = useMemo(() => {
    if (!settingsBtnRef.current) return { top: 0, left: 0 };
    const r = settingsBtnRef.current.getBoundingClientRect();
    return { top: r.bottom + 4, left: Math.max(8, r.right - 240) };
  }, [settingsOpen]);

  const showSpacer = tabStyle.tabAlignment === 'left';

  return (
    <div className="block-content">
      <div className={`tab-block tab-shape-${tabStyle.tabStyle}`} data-tab-block={block.id}>
        {/* Tab bar */}
        <div className="tab-bar" ref={barRef} style={barStyle}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab-item${tab.id === activeTabId ? ' active' : ''}${dragOverTabId === tab.id && dragSide === 'left' ? ' tab-drop-left' : ''}${dragOverTabId === tab.id && dragSide === 'right' ? ' tab-drop-right' : ''}`}
              data-tab-id={tab.id}
              style={getTabItemStyle(tab)}
              onClick={() => switchTab(tab.id)}
              onDoubleClick={() => startRename(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragLeave={() => { setDragOverTabId(null); setDragSide(null); }}
              onDrop={(e) => handleDrop(e, tab.id)}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span className="tab-name" contentEditable={editingTabId === tab.id} suppressContentEditableWarning
                onBlur={() => finishRename(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); finishRename(tab.id); }
                  if (e.key === 'Escape') { e.preventDefault(); setEditingTabId(null); e.target.contentEditable = 'false'; }
                }}
                onClick={(e) => { if (editingTabId === tab.id) e.stopPropagation(); }}
              >{tab.name}</span>
              {tabs.length > 1 && <span className="tab-close" onClick={(e) => closeTab(tab.id, e)}>×</span>}
            </div>
          ))}
          <div className="tab-add-btn" onClick={addTab} title="Add tab">+</div>
          {showSpacer && <div className="tab-bar-spacer" />}
          <div ref={settingsBtnRef} className="tab-settings-btn" title="Tab settings" onClick={() => setSettingsOpen(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
        </div>

        {settingsOpen && <TabSettingsPopover style={tabStyle} position={settingsPosition} onPatch={patchStyle} onClose={() => setSettingsOpen(false)} />}
        {iconPickerState && (
          <NotionIconPicker
            position={{ x: iconPickerState.left, y: iconPickerState.top }}
            onSelect={(val) => { setTabIcon(iconPickerState.tabId, val || ''); setIconPickerState(null); }}
            onClose={() => setIconPickerState(null)}
          />
        )}

        {/* Tab content */}
        <div className="tab-content" key={activeTabId}>
          <div className="blocks-container">
            {BR && activeTab && activeTab.blocks.map((b, i) => (
              <BR key={b.id} block={b} blocksArray={activeTab.blocks} blockIndex={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TabBlock;
