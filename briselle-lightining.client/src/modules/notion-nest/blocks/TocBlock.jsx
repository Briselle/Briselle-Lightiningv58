/* ============================================================
   NotionNest — blocks/TocBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L1958
   ============================================================ */
import { memo } from 'react';
import { usePageContext } from '../core/PageContext';

export const TocBlock = memo(function TocBlock() {
  const { pageState } = usePageContext();
  const headings = [];
  const headingTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'toggle_heading1', 'toggle_heading2', 'toggle_heading3', 'toggle_heading4', 'toggle_heading5'];
  function collect(blocks) {
    for (const b of blocks) {
      if (headingTypes.includes(b.type)) {
        const d = document.createElement('div'); d.innerHTML = b.content || '';
        const baseType = b.type.replace('toggle_', '');
        headings.push({ id: b.id, type: baseType, text: d.textContent });
      }
      if (b.children) collect(b.children);
      if (b.tabs) b.tabs.forEach(t => collect(t.blocks));
      if (b.columns) b.columns.forEach(c => collect(c.blocks));
    }
  }
  collect(pageState.blocks);
  return (
    <div className="block-content">
      {headings.length > 0 ? (
        <ul className="toc-list">{headings.map(h => (
          <li key={h.id} className={`toc-item toc-${h.type}`}>
            <a href="#" onClick={e => { e.preventDefault(); document.querySelector(`[data-block-id="${h.id}"]`)?.scrollIntoView({ behavior: 'smooth' }); }}>{h.text || 'Untitled'}</a>
          </li>
        ))}</ul>
      ) : <div className="toc-empty">Add headings to create a table of contents</div>}
    </div>
  );
});

/* ============ NEW BLOCK TYPES ============ */
