/* ============================================================
   NotionNest — blocks.jsx — All block components
   ============================================================ */
import { useRef, useCallback, useEffect, useState, memo } from 'react';
import { usePageContext } from './PageContext';
import { getCaretPosition, setCaretToEnd, getCaretCoordinates, findBlockContainer, flatVisibleBlocks as flatVis } from './utils';

/* ---- Shared: focus helper ---- */
function focusBlock(blockId, atEnd = false) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`);
    if (el) { el.focus(); if (atEnd) setCaretToEnd(el); }
  });
}

/* ---- Shared: useEditable hook ---- */
function useEditable(block, opts = {}) {
  const ref = useRef(null);
  const ctx = usePageContext();
  const { placeholder = "Type '/' for commands", isCode = false } = opts;

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const val = isCode ? ref.current.textContent : ref.current.innerHTML;
    ctx.updateBlockContent(block.id, val);
    const text = ref.current.textContent;
    if (text.startsWith('/')) ctx.showSlashMenu(block.id, getCaretCoordinates());
    else ctx.hideSlashMenu();
    ref.current.classList.toggle('is-empty', text.trim().length === 0);
  }, [block.id, isCode]);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); return; }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); return; }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); return; }
    }
    if (isCode && e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }
    if (e.key === 'Enter' && !e.shiftKey && !isCode) {
      e.preventDefault();
      const nb = ctx.addBlock('paragraph', block.id);
      if (nb) focusBlock(nb.id);
      return;
    }
    if (e.key === 'Backspace' && ref.current) {
      const text = ref.current.textContent.trim();
      if (text.length === 0 && getCaretPosition(ref.current) === 0) {
        const all = ctx.flatVisibleBlocks();
        const idx = all.findIndex(b => b.id === block.id);
        const prev = idx > 0 ? all[idx - 1] : null;
        if (prev || idx > 0) { e.preventDefault(); ctx.deleteBlock(block.id); if (prev) focusBlock(prev.id, true); }
        return;
      }
    }
    if (e.key === 'ArrowUp' && ref.current && getCaretPosition(ref.current) === 0) {
      const all = ctx.flatVisibleBlocks();
      const idx = all.findIndex(b => b.id === block.id);
      if (idx > 0) { e.preventDefault(); focusBlock(all[idx - 1].id, true); }
    }
    if (e.key === 'ArrowDown' && ref.current && getCaretPosition(ref.current) >= ref.current.textContent.length) {
      const all = ctx.flatVisibleBlocks();
      const idx = all.findIndex(b => b.id === block.id);
      if (idx < all.length - 1) { e.preventDefault(); focusBlock(all[idx + 1].id); }
    }
  }, [block.id, isCode]);

  const handleFocus = useCallback(() => ctx.setActiveBlockId(block.id), [block.id]);

  useEffect(() => {
    if (!ref.current) return;
    if (isCode) { if (ref.current.textContent !== (block.content || '')) ref.current.textContent = block.content || ''; }
    else { if (ref.current.innerHTML !== (block.content || '')) ref.current.innerHTML = block.content || ''; }
    ref.current.classList.toggle('is-empty', !(block.content && block.content.trim().length > 0));
  }, [block.id]); // eslint-disable-line

  return { ref, handleInput, handleKeyDown, handleFocus, placeholder };
}

/* ============ COMPONENTS ============ */

export const TextBlock = memo(function TextBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus, placeholder } = useEditable(block);
  return (
    <div className="block-content">
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder={placeholder}
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} />
    </div>
  );
});

export const ListBlock = memo(function ListBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'List' });
  const { pageState } = usePageContext();
  let marker = '•';
  if (block.type === 'numbered_list') {
    const container = findBlockContainer(block.id, pageState.blocks);
    let num = 1;
    if (container) { for (let i = container.index - 1; i >= 0; i--) { if (container.arr[i].type === 'numbered_list') num++; else break; } }
    marker = num + '.';
  }
  return (
    <div className="block-content">
      <span className="list-marker">{marker}</span>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="List"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
    </div>
  );
});

export const TodoBlock = memo(function TodoBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'To-do' });
  const { updateBlockProperty } = usePageContext();
  return (
    <div className="block-content">
      <div className={`todo-checkbox${block.checked ? ' checked' : ''}`} onClick={() => updateBlockProperty(block.id, 'checked', !block.checked)}>
        {block.checked ? '✓' : ''}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="To-do"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
    </div>
  );
});

export const ToggleBlock = memo(function ToggleBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Toggle' });
  const { updateBlockProperty } = usePageContext();
  // Use dynamic import to avoid circular dep
  const [BR, setBR] = useState(null);
  useEffect(() => { import('./BlockRenderer').then(m => setBR(() => m.default)); }, []);
  const children = block.children || [];
  return (
    <>
      <div className="block-content">
        <span className="toggle-icon" onClick={() => updateBlockProperty(block.id, 'open', !block.open)}>▶</span>
        <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Toggle"
          onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
      </div>
      <div className="block-toggle-children">
        <div className="blocks-container">
          {BR && children.map((child, i) => <BR key={child.id} block={child} blocksArray={children} blockIndex={i} />)}
        </div>
      </div>
    </>
  );
});

export const QuoteBlock = memo(function QuoteBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Quote' });
  return (
    <div className="block-content">
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Quote"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} />
    </div>
  );
});

export const CalloutBlock = memo(function CalloutBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Callout' });
  const { updateBlockProperty } = usePageContext();
  const [showPicker, setShowPicker] = useState(false);
  const emojis = ['💡','⚠️','❗','✅','❌','🔥','📌','🚀','⭐','❤️','🎯','📝','🛠','⚡','🌟','📢'];
  return (
    <div className="block-content" style={{ position: 'relative' }}>
      <span className="block-callout-icon" onClick={() => setShowPicker(!showPicker)}>{block.calloutIcon || '💡'}</span>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Callout"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
      {showPicker && (
        <div className="emoji-picker-menu" style={{ position: 'absolute', top: '100%', left: 0 }}>
          <div className="emoji-grid">
            {emojis.map(em => <span key={em} onClick={() => { updateBlockProperty(block.id, 'calloutIcon', em); setShowPicker(false); }}>{em}</span>)}
          </div>
        </div>
      )}
    </div>
  );
});

export const DividerBlock = memo(function DividerBlock() {
  return <div className="block-content"><hr /></div>;
});

export const CodeBlock = memo(function CodeBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Write code...', isCode: true });
  const { updateBlockProperty } = usePageContext();
  const [copied, setCopied] = useState(false);
  const langs = ['plain','javascript','typescript','python','html','css','java','c','cpp','go','rust','sql','json','bash','ruby','php'];
  return (
    <div className="block-content">
      <div className="block-code-header">
        <select value={block.language || 'javascript'} onChange={e => updateBlockProperty(block.id, 'language', e.target.value)}>
          {langs.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button className="code-copy-btn" onClick={() => { if (ref.current) { navigator.clipboard.writeText(ref.current.textContent); setCopied(true); setTimeout(() => setCopied(false), 1500); } }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre ref={ref} className="block-code-content" contentEditable suppressContentEditableWarning
        data-placeholder="Write code..." onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} />
    </div>
  );
});

export const ImageBlock = memo(function ImageBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  return (
    <div className="block-content">
      {block.url ? (
        <><img src={block.url} alt="" /><div className="image-caption" contentEditable suppressContentEditableWarning
          data-placeholder="Add a caption" onBlur={e => updateBlockProperty(block.id, 'caption', e.target.textContent)}>{block.caption || ''}</div></>
      ) : (
        <div className="image-placeholder" onClick={() => { const u = prompt('Enter image URL:'); if (u) updateBlockProperty(block.id, 'url', u); }}>🖼 Click to add an image URL</div>
      )}
    </div>
  );
});

export const BookmarkBlock = memo(function BookmarkBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  return (
    <div className="block-content">
      {block.url ? (
        <a className="bookmark-card" href={block.url} target="_blank" rel="noopener noreferrer">
          <div className="bookmark-info">
            <div className="bookmark-title">{block.bookmarkTitle || block.url}</div>
            <div className="bookmark-desc">{block.description || ''}</div>
            <div className="bookmark-url">🔗 {block.url}</div>
          </div>
        </a>
      ) : (
        <div className="bookmark-placeholder" onClick={() => { const u = prompt('Enter bookmark URL:'); if (u) { updateBlockProperty(block.id, 'url', u); updateBlockProperty(block.id, 'bookmarkTitle', u); } }}>🔗 Click to add a bookmark URL</div>
      )}
    </div>
  );
});

export const TableBlock = memo(function TableBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const rows = block.rows || [['','',''],['','','']];
  return (
    <div className="block-content">
      <table>
        <thead><tr>{rows[0]?.map((c, ci) => <th key={ci} contentEditable suppressContentEditableWarning onBlur={e => { const nr = rows.map(r => [...r]); nr[0][ci] = e.target.textContent; updateBlockProperty(block.id, 'rows', nr); }}>{c}</th>)}</tr></thead>
        <tbody>{rows.slice(1).map((row, ri) => <tr key={ri+1}>{row.map((c, ci) => <td key={ci} contentEditable suppressContentEditableWarning onBlur={e => { const nr = rows.map(r => [...r]); nr[ri+1][ci] = e.target.textContent; updateBlockProperty(block.id, 'rows', nr); }}>{c}</td>)}</tr>)}</tbody>
      </table>
      <div className="table-controls">
        <button onClick={() => updateBlockProperty(block.id, 'rows', [...rows.map(r => [...r]), new Array(rows[0].length).fill('')])}>+ Row</button>
        <button onClick={() => updateBlockProperty(block.id, 'rows', rows.map(r => [...r, '']))}>+ Column</button>
      </div>
    </div>
  );
});

export const ColumnsBlock = memo(function ColumnsBlock({ block }) {
  const [BR, setBR] = useState(null);
  useEffect(() => { import('./BlockRenderer').then(m => setBR(() => m.default)); }, []);
  const columns = block.columns || [];
  return (
    <div className="block-content">
      {columns.map(col => (
        <div className="block-column" key={col.id}>
          <div className="blocks-container">
            {BR && col.blocks.map((b, i) => <BR key={b.id} block={b} blocksArray={col.blocks} blockIndex={i} />)}
          </div>
        </div>
      ))}
    </div>
  );
});

export const TocBlock = memo(function TocBlock() {
  const { pageState } = usePageContext();
  const headings = [];
  function collect(blocks) {
    for (const b of blocks) {
      if (['heading1','heading2','heading3'].includes(b.type)) {
        const d = document.createElement('div'); d.innerHTML = b.content || '';
        headings.push({ id: b.id, type: b.type, text: d.textContent });
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
