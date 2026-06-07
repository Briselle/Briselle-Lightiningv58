/* ============================================================
   NotionNest — TabBlock.jsx
   ★ Full Notion tab block behavior
   ============================================================ */
import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { usePageContext } from './PageContext';
import { generateId, makeBlock, getBlockById, findBlockContainer, deepCloneBlock } from './utils';

const TabBlock = memo(function TabBlock({ block }) {
  const { updateBlockProperty, showContextMenu, hideContextMenu } = usePageContext();
  const [dragOverTabId, setDragOverTabId] = useState(null);
  const [dragSide, setDragSide] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [BR, setBR] = useState(null);
  const barRef = useRef(null);

  // Dynamic import BlockRenderer to avoid circular dep
  useEffect(() => { import('./BlockRenderer').then(m => setBR(() => m.default)); }, []);

  const tabs = block.tabs || [];
  const activeTabId = block.activeTabId || (tabs[0] && tabs[0].id);
  const activeTab = tabs.find(t => t.id === activeTabId);

  /* ---- Switch tab ---- */
  const switchTab = useCallback((tabId) => {
    if (tabId !== activeTabId) updateBlockProperty(block.id, 'activeTabId', tabId);
  }, [block.id, activeTabId, updateBlockProperty]);

  /* ---- Add tab ---- */
  const addTab = useCallback(() => {
    const newTab = { id: generateId(), name: `Tab ${tabs.length + 1}`, blocks: [makeBlock('paragraph', '')] };
    const newTabs = [...tabs, newTab];
    updateBlockProperty(block.id, 'tabs', newTabs);
    setTimeout(() => updateBlockProperty(block.id, 'activeTabId', newTab.id), 10);
  }, [block.id, tabs, updateBlockProperty]);

  /* ---- Close tab ---- */
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

  /* ---- Rename tab ---- */
  const startRename = useCallback((tabId) => {
    setEditingTabId(tabId);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-tab-block="${block.id}"] [data-tab-id="${tabId}"] .tab-name`);
      if (el) {
        el.contentEditable = 'true';
        el.focus();
        document.execCommand('selectAll', false, null);
      }
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

  /* ---- Drag reorder ---- */
  const handleDragStart = useCallback((e, tabId) => {
    e.dataTransfer.setData('text/tab-id', tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('dragging');
    setDragOverTabId(null);
    setDragSide(null);
  }, []);

  const handleDragOver = useCallback((e, tabId) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    setDragOverTabId(tabId);
    setDragSide(e.clientX < mid ? 'left' : 'right');
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
    setDragOverTabId(null);
    setDragSide(null);
  }, [block.id, tabs, dragSide, updateBlockProperty]);

  /* ---- Right-click context menu ---- */
  const handleContextMenu = useCallback((e, tab) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = tabs.findIndex(t => t.id === tab.id);
    showContextMenu(e.clientX, e.clientY, [
      { label: 'Rename', action: () => startRename(tab.id) },
      { label: 'Duplicate tab', action: () => {
        const clone = JSON.parse(JSON.stringify(tab));
        clone.id = generateId();
        clone.name += ' copy';
        function reassign(b) { b.id = generateId(); if (b.children) b.children.forEach(reassign); if (b.tabs) b.tabs.forEach(t => { t.id = generateId(); t.blocks.forEach(reassign); }); if (b.columns) b.columns.forEach(c => { c.id = generateId(); c.blocks.forEach(reassign); }); }
        clone.blocks.forEach(reassign);
        const newTabs = [...tabs]; newTabs.splice(idx + 1, 0, clone);
        updateBlockProperty(block.id, 'tabs', newTabs);
        updateBlockProperty(block.id, 'activeTabId', clone.id);
      }},
      { divider: true },
      { label: 'Move left', disabled: idx === 0, action: () => {
        const nt = [...tabs]; [nt[idx - 1], nt[idx]] = [nt[idx], nt[idx - 1]];
        updateBlockProperty(block.id, 'tabs', nt);
      }},
      { label: 'Move right', disabled: idx === tabs.length - 1, action: () => {
        const nt = [...tabs]; [nt[idx], nt[idx + 1]] = [nt[idx + 1], nt[idx]];
        updateBlockProperty(block.id, 'tabs', nt);
      }},
      { divider: true },
      { label: 'Delete tab', danger: true, disabled: tabs.length <= 1, action: () => {
        const nt = tabs.filter(t => t.id !== tab.id);
        updateBlockProperty(block.id, 'tabs', nt);
        if (activeTabId === tab.id) updateBlockProperty(block.id, 'activeTabId', nt[Math.min(idx, nt.length - 1)]?.id);
      }},
    ]);
  }, [block.id, tabs, activeTabId, showContextMenu, startRename, updateBlockProperty]);

  return (
    <div className="block-content">
      <div className="tab-block" data-tab-block={block.id}>
        {/* Tab bar */}
        <div className="tab-bar" ref={barRef}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab-item${tab.id === activeTabId ? ' active' : ''}${dragOverTabId === tab.id && dragSide === 'left' ? ' tab-drop-left' : ''}${dragOverTabId === tab.id && dragSide === 'right' ? ' tab-drop-right' : ''}`}
              data-tab-id={tab.id}
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
              <span
                className="tab-name"
                contentEditable={editingTabId === tab.id}
                suppressContentEditableWarning
                onBlur={() => finishRename(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); finishRename(tab.id); }
                  if (e.key === 'Escape') { e.preventDefault(); setEditingTabId(null); e.target.contentEditable = 'false'; }
                }}
                onClick={(e) => { if (editingTabId === tab.id) e.stopPropagation(); }}
              >{tab.name}</span>
              {tabs.length > 1 && (
                <span className="tab-close" onClick={(e) => closeTab(tab.id, e)}>×</span>
              )}
            </div>
          ))}
          <div className="tab-add-btn" onClick={addTab} title="Add tab">+</div>
        </div>

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
