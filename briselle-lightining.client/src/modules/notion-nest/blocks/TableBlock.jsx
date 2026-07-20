/* ============================================================
   NotionNest — blocks/TableBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L1473
   ============================================================ */
import { useRef, useEffect, useState, memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { LucideIcon } from '../menus/menus';
import { Plus } from 'lucide-react';

export const TableBlock = memo(function TableBlock({ block }) {
  const { updateBlockProperty, showContextMenu, contextMenu, getBlockById } = usePageContext();
  const rows = block.rows || [['', '', ''], ['', '', ''], ['', '', '']];
  const lockCols = block.lockCols || false;
  const lockTable = block.lockTable || false;

  const [selCells, setSelCells] = useState(new Set());
  const [selStart, setSelStart] = useState(null);
  const [cellDrag, setCellDrag] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCol, setHoveredCol] = useState(null);

  const wrapRef = useRef(null);
  const tableRef = useRef(null);

  const colCount = rows[0]?.length || 0;

  const updCell = (ri, ci, val) => { if (lockTable) return; const nr = rows.map(r => [...r]); nr[ri][ci] = val; updateBlockProperty(block.id, 'rows', nr); };
  const addRow = () => { if (lockTable) return; updateBlockProperty(block.id, 'rows', [...rows.map(r => [...r]), new Array(colCount).fill('')]); };
  const addCol = () => { if (lockTable || lockCols) return; updateBlockProperty(block.id, 'rows', rows.map(r => [...r, ''])); };
  const insRowAt = (ri, dir) => { if (lockTable) return; const nr = [...rows]; nr.splice(dir === 'below' ? ri + 1 : ri, 0, new Array(colCount).fill('')); updateBlockProperty(block.id, 'rows', nr); };
  const insColAt = (ci, dir) => { if (lockTable || lockCols) return; const nr = rows.map(r => { const c = [...r]; c.splice(dir === 'right' ? ci + 1 : ci, 0, ''); return c; }); updateBlockProperty(block.id, 'rows', nr); };
  const delRow = (ri) => { if (lockTable || rows.length <= 1) return; updateBlockProperty(block.id, 'rows', rows.filter((_, i) => i !== ri)); };
  const delCol = (ci) => { if (lockTable || colCount <= 1) return; updateBlockProperty(block.id, 'rows', rows.map(r => r.filter((_, i) => i !== ci))); };
  const clearRow = (ri) => { if (lockTable) return; const nr = rows.map((r, i) => i === ri ? r.map(() => '') : [...r]); updateBlockProperty(block.id, 'rows', nr); };
  const clearCol = (ci) => { if (lockTable) return; const nr = rows.map(r => { const c = [...r]; c[ci] = ''; return c; }); updateBlockProperty(block.id, 'rows', nr); };
  const dupCol = (ci) => { if (lockTable) return; const nr = rows.map(r => { const c = [...r]; c.splice(ci + 1, 0, c[ci]); return c; }); updateBlockProperty(block.id, 'rows', nr); };

  const hasHeader = block.hasHeader === true;
  const hasTotalRow = block.hasTotalRow === true;
  const colBorders = block.colBorders !== false;
  const rowBorders = block.rowBorders !== false;
  const striped = block.striped === true;

  const openCellMenu = (e, ri, ci) => {
    e.preventDefault(); e.stopPropagation();
    const items = [
      { label: 'Color', action: () => { } },
      { divider: true },
      { label: 'Enable Header Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasHeader', !(b?.hasHeader === true)); }, isToggle: true, checked: hasHeader },
      { label: 'Enable Total Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasTotalRow', !(b?.hasTotalRow === true)); }, isToggle: true, checked: hasTotalRow },
      { label: 'Enable Row Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'rowBorders', !(b?.rowBorders !== false)); }, isToggle: true, checked: rowBorders },
      { label: 'Enable Column Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'colBorders', !(b?.colBorders !== false)); }, isToggle: true, checked: colBorders },
      { label: 'Enable Stripe Rows', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'striped', !(b?.striped === true)); }, isToggle: true, checked: striped },
      { divider: true },
      { label: 'Insert above', action: () => insRowAt(ri, 'above'), disabled: lockTable },
      { label: 'Insert below', action: () => insRowAt(ri, 'below'), disabled: lockTable },
      { label: 'Insert left', action: () => insColAt(ci, 'left'), disabled: lockTable || lockCols },
      { label: 'Insert right', action: () => insColAt(ci, 'right'), disabled: lockTable || lockCols },
      { divider: true },
      { label: 'Duplicate', action: () => dupCol(ci), shortcut: 'Ctrl+D', disabled: lockTable || lockCols },
      { label: 'Clear contents', action: () => { clearRow(ri); clearCol(ci); }, disabled: lockTable },
      { label: 'Delete', action: () => delRow(ri), danger: true, disabled: lockTable || rows.length <= 1 },
    ];
    showContextMenu(e.clientX, e.clientY, items, { ri, ci, selCells }, 'table-cell', block.id);
  };

  const openRowMenu = (e, ri) => {
    e.preventDefault(); e.stopPropagation();
    const s = new Set();
    rows[ri]?.forEach((_, ci) => s.add(`${ri},${ci}`));
    setSelCells(s);

    const items = [
      { label: 'Color', action: () => { } },
      { divider: true },
      { label: 'Enable Header Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasHeader', !(b?.hasHeader === true)); }, isToggle: true, checked: hasHeader },
      { label: 'Enable Total Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasTotalRow', !(b?.hasTotalRow === true)); }, isToggle: true, checked: hasTotalRow },
      { label: 'Enable Row Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'rowBorders', !(b?.rowBorders !== false)); }, isToggle: true, checked: rowBorders },
      { label: 'Enable Column Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'colBorders', !(b?.colBorders !== false)); }, isToggle: true, checked: colBorders },
      { label: 'Enable Stripe Rows', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'striped', !(b?.striped === true)); }, isToggle: true, checked: striped },
      { divider: true },
      { label: 'Insert above', action: () => insRowAt(ri, 'above'), disabled: lockTable },
      { label: 'Insert below', action: () => insRowAt(ri, 'below'), disabled: lockTable },
      { divider: true },
      { label: 'Duplicate', action: () => { const nr = [...rows.map(r => [...r])]; nr.splice(ri + 1, 0, [...rows[ri]]); updateBlockProperty(block.id, 'rows', nr); }, shortcut: 'Ctrl+D', disabled: lockTable },
      { label: 'Clear contents', action: () => clearRow(ri), disabled: lockTable },
      { label: 'Delete', action: () => delRow(ri), danger: true, disabled: lockTable || rows.length <= 1 },
    ];
    showContextMenu(e.clientX, e.clientY, items, { ri, selCells: s }, 'table-row', block.id);
  };

  const openColMenu = (e, ci) => {
    e.preventDefault(); e.stopPropagation();
    const s = new Set();
    rows.forEach((_, ri) => s.add(`${ri},${ci}`));
    setSelCells(s);

    const items = [
      { label: 'Color', action: () => { } },
      { divider: true },
      { label: 'Enable Header Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasHeader', !(b?.hasHeader === true)); }, isToggle: true, checked: hasHeader },
      { label: 'Enable Total Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasTotalRow', !(b?.hasTotalRow === true)); }, isToggle: true, checked: hasTotalRow },
      { label: 'Enable Row Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'rowBorders', !(b?.rowBorders !== false)); }, isToggle: true, checked: rowBorders },
      { label: 'Enable Column Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'colBorders', !(b?.colBorders !== false)); }, isToggle: true, checked: colBorders },
      { label: 'Enable Stripe Rows', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'striped', !(b?.striped === true)); }, isToggle: true, checked: striped },
      { divider: true },
      { label: 'Insert left', action: () => insColAt(ci, 'left'), disabled: lockTable || lockCols },
      { label: 'Insert right', action: () => insColAt(ci, 'right'), disabled: lockTable || lockCols },
      { divider: true },
      { label: 'Duplicate', action: () => dupCol(ci), shortcut: 'Ctrl+D', disabled: lockTable || lockCols },
      { label: 'Clear contents', action: () => clearCol(ci), disabled: lockTable },
      { label: 'Delete', action: () => delCol(ci), danger: true, disabled: lockTable || colCount <= 1 },
    ];
    showContextMenu(e.clientX, e.clientY, items, { ci, selCells: s }, 'table-col', block.id);
  };

  const onCellDown = (e, ri, ci) => {
    if (e.button !== 0) return;
    const key = `${ri},${ci}`;
    if (e.shiftKey && selStart) {
      const [sr, sc] = selStart.split(',').map(Number);
      const s = new Set();
      for (let r = Math.min(sr, ri); r <= Math.max(sr, ri); r++) for (let c = Math.min(sc, ci); c <= Math.max(sc, ci); c++) s.add(`${r},${c}`);
      setSelCells(s);
    } else { setSelCells(new Set([key])); setSelStart(key); }
    setCellDrag(true);
  };

  const onCellEnter = (ri, ci) => {
    if (!cellDrag || !selStart) return;
    const [sr, sc] = selStart.split(',').map(Number);
    const s = new Set();
    for (let r = Math.min(sr, ri); r <= Math.max(sr, ri); r++) for (let c = Math.min(sc, ci); c <= Math.max(sc, ci); c++) s.add(`${r},${c}`);
    setSelCells(s);
  };

  useEffect(() => { const up = () => setCellDrag(false); window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up); }, []);
  useEffect(() => { const d = (e) => { if (!wrapRef.current?.contains(e.target)) { setSelCells(new Set()); setSelStart(null); } }; document.addEventListener('mousedown', d, true); return () => document.removeEventListener('mousedown', d, true); }, []);

  const tableCls = ['nn-table', !colBorders && 'nn-no-col-borders', !rowBorders && 'nn-no-row-borders', striped && 'nn-striped'].filter(Boolean).join(' ');

  const renderCell = (cellVal, ri, ci, isHead, isTotal = false) => {
    const Tag = isHead ? 'th' : 'td';
    const isSel = selCells.has(`${ri},${ci}`);

    const colorInfo = block.cellColors?.[`${ri},${ci}`] || {};
    const cellStyle = {};
    if (colorInfo.textColor) {
      cellStyle.color = colorInfo.textColor;
    }
    if (colorInfo.backgroundColor) {
      cellStyle.backgroundColor = colorInfo.backgroundColor;
    }

    const isColHovered = hoveredCol === ci;
    const isRowHovered = hoveredRow === ri;
    const isColActive = contextMenu.open && contextMenu.blockId === block.id && contextMenu.type === 'table-col' && contextMenu.triggerRect?.ci === ci;
    const isRowActive = contextMenu.open && contextMenu.blockId === block.id && contextMenu.type === 'table-row' && contextMenu.triggerRect?.ri === ri;

    return (
      <Tag key={ci}
        className={[
          'nn-tc',
          isSel && 'nn-tc-sel',
          isHead && 'nn-tc-head',
          isTotal && 'nn-tc-total',
          isColActive && 'nn-cell-active-col',
          isRowActive && 'nn-cell-active-row'
        ].filter(Boolean).join(' ')}
        style={{ ...cellStyle, position: 'relative' }}
        onMouseDown={e => onCellDown(e, ri, ci)}
        onMouseEnter={() => {
          onCellEnter(ri, ci);
          setHoveredRow(ri);
          setHoveredCol(ci);
        }}
        onMouseLeave={() => {
          setHoveredRow(null);
          setHoveredCol(null);
        }}
        onContextMenu={e => openCellMenu(e, ri, ci)}
        contentEditable={!lockTable}
        suppressContentEditableWarning
        onBlur={e => updCell(ri, ci, e.target.textContent)}
        onFocus={() => {
          setSelCells(new Set([`${ri},${ci}`]));
          setSelStart(`${ri},${ci}`);
        }}
      >
        <span
          style={{ display: 'inline-block', width: '100%', minHeight: '1.2em', outline: 'none', color: colorInfo.textColor }}
          dangerouslySetInnerHTML={{ __html: cellVal }}
        />
        {/* Absolute column handle at the top-center of row 0 cell headers */}
        {ri === 0 && (
          <div
            className={['nn-table-col-handle-wrap', (isColHovered || isColActive) && 'visible', isColActive && 'active'].filter(Boolean).join(' ')}
            contentEditable={false}
            suppressContentEditableWarning
            onMouseEnter={() => setHoveredCol(ci)}
            onMouseLeave={() => setHoveredCol(null)}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openColMenu(e, ci); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openColMenu(e, ci); }}
          >
            <div className="nn-table-col-handle-line" />
            <div className="nn-table-col-handle-dots">
              <span className="nn-bh-dots">
                {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="nn-bh-dot" />)}
              </span>
            </div>
          </div>
        )}

        {/* Absolute row handle at the left-center of column 0 first cells */}
        {ci === 0 && (
          <div
            className={['nn-table-row-handle-wrap', (isRowHovered || isRowActive) && 'visible', isRowActive && 'active'].filter(Boolean).join(' ')}
            contentEditable={false}
            suppressContentEditableWarning
            onMouseEnter={() => setHoveredRow(ri)}
            onMouseLeave={() => setHoveredRow(null)}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRowMenu(e, ri); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openRowMenu(e, ri); }}
          >
            <div className="nn-table-row-handle-line" />
            <div className="nn-table-row-handle-dots">
              <span className="nn-bh-dots nn-vertical">
                {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="nn-bh-dot" />)}
              </span>
            </div>
          </div>
        )}
      </Tag>
    );
  };

  const bodyRows = hasHeader ? rows.slice(1) : rows;
  const headRow = hasHeader ? rows[0] : null;

  const hasTotal = hasTotalRow && (hasHeader ? rows.length > 2 : rows.length > 1);
  const totalRow = hasTotal ? bodyRows[bodyRows.length - 1] : null;
  const mainBodyRows = hasTotal ? bodyRows.slice(0, -1) : bodyRows;

  return (
    <div className="block-content">
      <div className="nn-table-wrap" ref={wrapRef}>
        <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
          <table className={tableCls} ref={tableRef} style={{ flex: 1 }}>
            {headRow && (
              <thead>
                <tr>{headRow.map((c, ci) => renderCell(c, 0, ci, true))}</tr>
              </thead>
            )}
            <tbody>
              {mainBodyRows.map((row, relRi) => {
                const ri = hasHeader ? relRi + 1 : relRi;
                return (<tr key={ri}>{row.map((c, ci) => renderCell(c, ri, ci, false))}</tr>);
              })}
            </tbody>
            {totalRow && (
              <tfoot>
                <tr className="nn-tr-total">
                  {totalRow.map((c, ci) => renderCell(c, rows.length - 1, ci, false, true))}
                </tr>
              </tfoot>
            )}
          </table>

          {/* Add Column Button (Right) */}
          {!lockTable && !lockCols && (
            <div
              className="nn-table-add-col-trigger"
              onClick={addCol}
              data-tooltip="Add column"
              contentEditable={false}
              suppressContentEditableWarning
            >
              <LucideIcon name="Plus" size={14} className="nn-table-add-icon" />
            </div>
          )}
        </div>

        {/* Add Row Button (Bottom) */}
        {!lockTable && (
          <div
            className="nn-table-add-row-trigger"
            onClick={addRow}
            data-tooltip="Add row"
            contentEditable={false}
            suppressContentEditableWarning
          >
            <LucideIcon name="Plus" size={14} className="nn-table-add-icon" />
          </div>
        )}
      </div>
    </div>
  );
});

function hasRealContent(b) {
  if (!b) return false;
  if (b.content && b.content.trim().length > 0) return true;
  if (['image', 'video', 'file', 'bookmark', 'audio', 'code', 'equation', 'callout', 'quote', 'embed', 'pdf', 'map', 'divider'].includes(b.type)) return true;
  if (b.children && b.children.some(hasRealContent)) return true;
  if (b.tabs && b.tabs.length > 0) return true;
  if (b.columns && b.columns.some(c => c.blocks && c.blocks.some(hasRealContent))) return true;
  return false;
}
