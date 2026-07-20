/* ============================================================
   NotionNest — blocks/ColumnsBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L1773
   ============================================================ */
import { useRef, useCallback, useEffect, useState, memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { Move } from 'lucide-react';

export const ColumnsBlock = memo(function ColumnsBlock({ block }) {
  const { updateBlockProperty, insertColumn, deleteColumn, moveColumn, showContextMenu, moveBlockToColumn, setDeleteConfirm } = usePageContext();
  const [BR, setBR] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [colReorderId, setColReorderId] = useState(null);
  const [activeDropPos, setActiveDropPos] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => { import('../core/BlockRenderer').then(m => setBR(() => m.default)); }, []);

  const columns = block.columns || [];
  const rawWidths = block.colWidths || columns.map(() => 1);
  const colWidths = rawWidths.length === columns.length ? rawWidths : columns.map(() => 1);

  const startResize = (e, idx) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidths = [...colWidths];
    const total = startWidths.reduce((a, b) => a + b, 0);
    setResizing({ idx, startX, startWidths, total });
  };

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      if (!wrapRef.current) return;
      const wrapW = wrapRef.current.getBoundingClientRect().width;
      const dx = e.clientX - resizing.startX;
      const ratio = dx / wrapW;
      const totalFlex = resizing.total;
      const delta = ratio * totalFlex;
      const newWidths = [...resizing.startWidths];
      const leftMin = totalFlex * 0.1;
      const rightMin = totalFlex * 0.1;
      newWidths[resizing.idx] = Math.max(leftMin, resizing.startWidths[resizing.idx] + delta);
      newWidths[resizing.idx + 1] = Math.max(rightMin, resizing.startWidths[resizing.idx + 1] - delta);
      const newTotal = newWidths.reduce((a, b) => a + b, 0);
      const scale = totalFlex / newTotal;
      updateBlockProperty(block.id, 'colWidths', newWidths.map(w => +(w * scale).toFixed(3)));
    };
    const onUp = () => setResizing(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizing, block.id, updateBlockProperty]);

  const handleDeleteColumn = useCallback((col) => {
    const contentBlocks = col.blocks && col.blocks.filter(b => hasRealContent(b));
    if (!contentBlocks || contentBlocks.length === 0) {
      deleteColumn(block.id, col.id);
      return;
    }
    const count = contentBlocks.length;
    setDeleteConfirm({
      type: 'column',
      blockId: block.id,
      title: 'Delete column?',
      message: `This column contains ${count} block${count > 1 ? 's' : ''} with content and will be permanently deleted.`,
      cancelText: 'Cancel',
      confirmText: 'Delete column',
      onConfirm: () => deleteColumn(block.id, col.id),
      onCancel: () => setDeleteConfirm(null)
    });
  }, [block.id, deleteColumn, setDeleteConfirm]);

  const openColMenu = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    const items = [
      { label: 'Delete column', action: () => handleDeleteColumn(col), danger: true },
    ];
    showContextMenu(e.clientX, e.clientY, items, null, 'column', block.id);
  };

  const handleBlockDragOver = useCallback((e, colId) => {
    if (e.dataTransfer.types.includes('text/block-id')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleBlockDrop = useCallback((e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/block-id');
    if (!sourceId) return;
    if (moveBlockToColumn) moveBlockToColumn(sourceId, block.id, colId);
  }, [block.id, moveBlockToColumn]);

  const handleColDragStart = useCallback((e, colId) => {
    e.dataTransfer.setData('text/col-id', colId);
    e.dataTransfer.effectAllowed = 'move';
    setColReorderId(colId);
  }, []);

  const handleColDragEnd = useCallback(() => {
    setColReorderId(null);
    setActiveDropPos(null);
  }, []);

  const handleDropZoneDragOver = useCallback((e, pos) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('text/col-id')) {
      e.dataTransfer.dropEffect = 'move';
      setActiveDropPos(pos);
    }
  }, []);

  const handleDropZoneDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setActiveDropPos(null);
  }, []);

  const handleDropZoneDrop = useCallback((e, pos) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropPos(null);
    setColReorderId(null);
    const sourceId = e.dataTransfer.getData('text/col-id');
    if (sourceId && moveColumn) {
      moveColumn(block.id, sourceId, pos);
    }
  }, [block.id, moveColumn]);

  const items = [];
  columns.forEach((col, idx) => {
    if (idx === 0) {
      items.push(
        <div key="dz-0" className={`nn-col-drop-zone${activeDropPos === 0 ? ' nn-col-drop-active' : ''}`}
          onDragOver={(e) => handleDropZoneDragOver(e, 0)}
          onDragLeave={handleDropZoneDragLeave}
          onDrop={(e) => handleDropZoneDrop(e, 0)}
        >
          <div className="nn-col-drop-line" />
        </div>
      );
    }
    items.push(
      <div
        key={col.id}
        className={`nn-column${colReorderId === col.id ? ' nn-column-reorder' : ''}`}
        data-col-id={col.id}
        style={{ flex: colWidths[idx] || 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
        onContextMenu={(e) => openColMenu(e, col)}
        onDragOver={(e) => handleBlockDragOver(e, col.id)}
        onDrop={(e) => handleBlockDrop(e, col.id)}
        onDragEnd={handleColDragEnd}
      >
        <div className="nn-col-toolbar">
          {columns.length > 1 && <div className="nn-col-toolbar-btn nn-col-delete-btn" onClick={() => handleDeleteColumn(col)} title="Delete column">−</div>}
          {columns.length < 5 && <div className="nn-col-toolbar-btn nn-col-insert-btn" onClick={() => insertColumn(block.id, col.id, 'right')} title="Insert column right">+</div>}
          <div className="nn-col-toolbar-btn nn-col-drag-btn" draggable onDragStart={(e) => handleColDragStart(e, col.id)} title="Drag to reorder"><Move size={14} /></div>
        </div>
        <div className="blocks-container">
          {BR && col.blocks.map((b, i) => <BR key={b.id} block={b} blocksArray={col.blocks} blockIndex={i} />)}
        </div>
      </div>
    );
    items.push(
      <div key={`dz-${idx + 1}`} className={`nn-col-drop-zone${activeDropPos === idx + 1 ? ' nn-col-drop-active' : ''}`}
        onDragOver={(e) => handleDropZoneDragOver(e, idx + 1)}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={(e) => handleDropZoneDrop(e, idx + 1)}
      >
        <div className="nn-col-drop-line" />
      </div>
    );
    if (idx < columns.length - 1) {
      items.push(
        <div key={`div-${idx}`} className={`nn-col-divider${resizing?.idx === idx ? ' nn-col-divider-active' : ''}`} onMouseDown={e => startResize(e, idx)} title="Drag to resize" />
      );
    }
  });

  return (
    <div className="block-content">
      <div className={`nn-columns-wrap${colReorderId ? ' is-reordering' : ''}`} ref={wrapRef}>
        {items}
      </div>
    </div>
  );
});

