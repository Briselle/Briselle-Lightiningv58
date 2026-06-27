/* ============================================================
   NotionNest — blocks.jsx — All block components
   ============================================================ */
import { useRef, useCallback, useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageContext } from './PageContext';
import { NotionIconPicker, SVG_ICONS, renderIconSvg, hasPageIcon, renderPageIcon } from './menus';
import UploadZone from './components/UploadZone';
import { getCaretPosition, setCaretToEnd, getCaretCoordinates, findBlockContainer, flatVisibleBlocks as flatVis, markdownShortcuts, slashMenuSections } from './utils';
import { useAuthStore } from '../../stores/authStore';
import { listNotionPages, createNotionNestRecord, notionNestPagePath } from './notionPageStorage';

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
    // Slash command trigger (pass the query filter query)
    if (text.startsWith('/')) ctx.showSlashMenu(block.id, getCaretCoordinates(), text.slice(1));
    else ctx.hideSlashMenu();
    // Markdown shortcuts (e.g. # → heading, - → bullet)
    if (!isCode && block.type === 'paragraph') {
      for (const shortcut of markdownShortcuts) {
        if (shortcut.pattern.test(text)) {
          ctx.changeBlockType(block.id, shortcut.type);
          requestAnimationFrame(() => {
            const el = document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`);
            if (el) { el.textContent = ''; el.innerHTML = ''; el.focus(); }
          });
          return;
        }
      }
    }
    ref.current.classList.toggle('is-empty', text.trim().length === 0);
  }, [block.id, isCode, block.type]);

  const handleKeyDown = useCallback((e) => {
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      const url = `${window.location.origin}${window.location.pathname}#${block.id}`;
      navigator.clipboard.writeText(url);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      const rect = ref.current?.getBoundingClientRect();
      ctx.showContextMenu(rect?.left || 100, rect?.top || 100, [], rect, 'block', block.id, 'move-to');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      ctx.createBlockLevelComment(block.id, false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      const promptText = prompt("Enter prompt for Ziva AI to suggest edits for this block:");
      if (promptText) {
        ctx.triggerBlockAi(block.id, promptText, true);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      const promptText = prompt("Enter prompt for Ziva AI to rewrite this block:");
      if (promptText) {
        ctx.triggerBlockAi(block.id, promptText, false);
      }
      return;
    }
    if (e.key === 'Delete' && ref.current) {
      const text = ref.current.textContent || '';
      if (text.trim().length === 0) {
        e.preventDefault();
        const all = ctx.flatVisibleBlocks();
        const idx = all.findIndex(b => b.id === block.id);
        const nextBlock = idx < all.length - 1 ? all[idx + 1] : null;
        ctx.deleteBlock(block.id);
        if (nextBlock) focusBlock(nextBlock.id);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); return; }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); return; }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); return; }
      if (e.key === 'z') { e.preventDefault(); document.execCommand('undo'); return; }
      if (e.key === 'y') { e.preventDefault(); document.execCommand('redo'); return; }
      if (e.key === 'd') { e.preventDefault(); ctx.duplicateBlock(block.id); return; }
    }
    if (isCode && e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }
    if (e.key === 'Enter' && !e.shiftKey && !isCode) {
      if (ref.current) {
        const text = ref.current.textContent.trim();
        if (text.startsWith('/')) {
          const cmd = text.slice(1).toLowerCase();
          let matchedType = null;
          for (const section of slashMenuSections) {
            for (const item of section.items) {
              if (item.type === cmd || item.name.toLowerCase() === cmd || (item.keywords && item.keywords.includes(cmd))) {
                matchedType = item.type;
                break;
              }
            }
            if (matchedType) break;
          }
          if (matchedType) {
            e.preventDefault();
            ctx.changeBlockType(block.id, matchedType);
            ctx.hideSlashMenu();
            requestAnimationFrame(() => {
              if (ref.current) {
                ref.current.textContent = '';
                ref.current.innerHTML = '';
                ref.current.focus();
              }
            });
            return;
          }
        }
      }
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
  }, [block.id, block.content, isCode]);

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
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 30 });
  const iconSpanRef = useRef(null);
  
  const icon = block.calloutIcon || '💡';

  const handleIconClick = (e) => {
    const el = e.currentTarget;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPickerPos({ x: Math.max(8, rect.left), y: rect.bottom + 6 });
    }
    setShowPicker(!showPicker);
  };

  return (
    <div className="block-content" style={{ position: 'relative' }}>
      <span className="block-callout-icon" ref={iconSpanRef} onClick={handleIconClick}>
        {renderPageIcon(icon, '20px') || '💡'}
      </span>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Callout"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
      {showPicker && (
        <NotionIconPicker
          position={pickerPos}
          currentIcon={icon}
          onSelect={(icon) => { updateBlockProperty(block.id, 'calloutIcon', icon); }}
          onClose={() => setShowPicker(false)}
        />
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

const UNSPLASH_PRESETS_MINI = [
  { name: 'Forest', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=800' },
  { name: 'Mountain', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800' },
  { name: 'Ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800' },
  { name: 'Space', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=800' },
  { name: 'Minimal', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800' },
  { name: 'Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800' }
];

function MediaBlockPicker({ blockType, onSelect }) {
  const [tab, setTab] = useState('upload');
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const handleUnsplashSearch = (e) => {
    if (e) e.preventDefault();
    if (unsplashQuery.trim()) {
      const q = unsplashQuery.trim().toLowerCase();
      const results = Array.from({ length: 6 }).map((_, i) => ({
        name: `${q.charAt(0).toUpperCase() + q.slice(1)} ${i + 1}`,
        url: `https://images.unsplash.com/featured/800x600/?${encodeURIComponent(q)}&sig=${i + 1}`
      }));
      setUnsplashResults(results);
      setSearchTriggered(true);
    } else {
      setSearchTriggered(false);
      setUnsplashResults([]);
    }
  };

  const getIcon = () => {
    switch (blockType) {
      case 'image': return '🖼';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      default: return '📎';
    }
  };

  const getPlaceholderText = () => {
    switch (blockType) {
      case 'image': return 'Drop image file here';
      case 'video': return 'Drop video file here';
      case 'audio': return 'Drop audio file here';
      default: return 'Drop file here';
    }
  };

  const getSubtext = () => {
    switch (blockType) {
      case 'image': return 'or click to select an image';
      case 'video': return 'or click to select a video';
      case 'audio': return 'or click to select an audio file';
      default: return 'or click to select a file';
    }
  };

  return (
    <div className="nn-media-picker" onClick={e => e.stopPropagation()}>
      <div className="nmp-header">
        <span className="nmp-icon">{getIcon()}</span>
        <span className="nmp-title">Add {blockType.charAt(0).toUpperCase() + blockType.slice(1)}</span>
      </div>
      
      <div className="nip-tabs" style={{ borderBottom: '1px solid #F3F4F6', marginBottom: '12px' }}>
        <button className={`nip-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>Upload</button>
        <button className={`nip-tab${tab === 'link' ? ' active' : ''}`} onClick={() => setTab('link')}>Embed Link</button>
        {blockType === 'image' && (
          <button className={`nip-tab${tab === 'unsplash' ? ' active' : ''}`} onClick={() => setTab('unsplash')}>Unsplash</button>
        )}
      </div>

      <div className="nmp-body">
        {tab === 'upload' && (
          <div style={{ padding: '8px 0' }}>
            <UploadZone
              onSelect={(url, fileName) => onSelect(url, fileName)}
              accept={blockType === 'image' ? 'image/*' : blockType === 'video' ? 'video/*' : blockType === 'audio' ? 'audio/*' : '*'}
              placeholderText={getPlaceholderText()}
              subtext={getSubtext()}
              allowLink={false}
            />
          </div>
        )}
        {tab === 'link' && (
          <div style={{ padding: '8px 0' }}>
            <UploadZone
              onSelect={(url) => onSelect(url)}
              onlyLink={true}
            />
          </div>
        )}
        {tab === 'unsplash' && blockType === 'image' && (
          <div className="ncp-unsplash-container">
            <form onSubmit={handleUnsplashSearch} className="ncp-unsplash-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                type="text"
                placeholder="Search Unsplash..."
                value={unsplashQuery}
                onChange={e => setUnsplashQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>
            
            <div className="ncp-gallery-scroll" style={{ maxHeight: '180px' }}>
              <div className="ncp-grid">
                {(searchTriggered ? unsplashResults : UNSPLASH_PRESETS_MINI).map(p => (
                  <div key={p.url} className="ncp-thumb" style={{ backgroundImage: `url(${p.url})` }} onClick={() => onSelect(p.url)}>
                    <div className="ncp-thumb-overlay">{p.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const ImageBlock = memo(function ImageBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  return (
    <div className="block-content">
      {block.url ? (
        <>
          <img src={block.url} alt="" />
          <div className="image-caption" contentEditable suppressContentEditableWarning
            data-placeholder="Add a caption" onBlur={e => updateBlockProperty(block.id, 'caption', e.target.textContent)}>{block.caption || ''}</div>
        </>
      ) : (
        <MediaBlockPicker blockType="image" onSelect={(url) => updateBlockProperty(block.id, 'url', url)} />
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
  const headingTypes = ['heading1','heading2','heading3','toggle_heading1','toggle_heading2','toggle_heading3'];
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

export const VideoBlock = memo(function VideoBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const getEmbedUrl = (url) => {
    if (!url) return url;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vim = url.match(/vimeo\.com\/(\d+)/);
    if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
    return url;
  };
  return (
    <div className="block-content">
      {block.url ? (
        <div className="block-video">
          <iframe src={getEmbedUrl(block.url)} title="Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '400px', borderRadius: '4px' }} />
        </div>
      ) : (
        <MediaBlockPicker blockType="video" onSelect={(url) => updateBlockProperty(block.id, 'url', url)} />
      )}
    </div>
  );
});

export const AudioBlock = memo(function AudioBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  return (
    <div className="block-content">
      {block.url ? (
        <div className="block-audio">
          <audio controls src={block.url} style={{ width: '100%' }}>Your browser does not support audio.</audio>
        </div>
      ) : (
        <MediaBlockPicker blockType="audio" onSelect={(url) => updateBlockProperty(block.id, 'url', url)} />
      )}
    </div>
  );
});

export const FileBlock = memo(function FileBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  return (
    <div className="block-content">
      {block.url ? (
        <div className="block-file">
          <a href={block.url} target="_blank" rel="noopener noreferrer" className="file-card">
            <span className="file-icon">📎</span>
            <span className="file-name">{block.fileName || block.url.split('/').pop() || 'File'}</span>
          </a>
        </div>
      ) : (
        <MediaBlockPicker
          blockType="file"
          onSelect={(url, fileName) => {
            updateBlockProperty(block.id, 'url', url);
            updateBlockProperty(block.id, 'fileName', fileName || url.split('/').pop());
          }}
        />
      )}
    </div>
  );
});

export const EquationBlock = memo(function EquationBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [editing, setEditing] = useState(!block.expression);
  const inputRef = useRef(null);

  const renderKatex = (expr) => {
    // Simple LaTeX rendering — renders to HTML string
    // For full support, load KaTeX library
    if (!expr) return '<span style="color:#666">Empty equation</span>';
    // Basic fraction, superscript, subscript rendering
    let html = expr
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle"><span style="border-bottom:1px solid #e3e3e3;padding:0 4px">$1</span><span style="padding:0 4px">$2</span></span>')
      .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
      .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
      .replace(/\^(\w)/g, '<sup>$1</sup>')
      .replace(/_(\w)/g, '<sub>$1</sub>')
      .replace(/\\sum/g, '∑')
      .replace(/\\prod/g, '∏')
      .replace(/\\int/g, '∫')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ').replace(/\\pi/g, 'π').replace(/\\theta/g, 'θ')
      .replace(/\\infty/g, '∞').replace(/\\neq/g, '≠').replace(/\\leq/g, '≤').replace(/\\geq/g, '≥')
      .replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\pm/g, '±');
    return html;
  };

  return (
    <div className="block-content">
      {editing ? (
        <div className="equation-editor">
          <input
            ref={inputRef}
            type="text"
            className="equation-input"
            placeholder="Type a LaTeX equation (e.g. E = mc^2)"
            defaultValue={block.expression || ''}
            onBlur={e => { updateBlockProperty(block.id, 'expression', e.target.value); if (e.target.value) setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { updateBlockProperty(block.id, 'expression', e.target.value); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
            autoFocus
          />
        </div>
      ) : (
        <div className="equation-display" onClick={() => setEditing(true)} dangerouslySetInnerHTML={{ __html: renderKatex(block.expression) }} />
      )}
    </div>
  );
});

export const ToggleHeadingBlock = memo(function ToggleHeadingBlock({ block }) {
  const headingLevel = block.type.replace('toggle_heading', '');
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: `Toggle Heading ${headingLevel}` });
  const { updateBlockProperty } = usePageContext();
  const [BR, setBR] = useState(null);
  useEffect(() => { import('./BlockRenderer').then(m => setBR(() => m.default)); }, []);
  const children = block.children || [];
  return (
    <>
      <div className="block-content">
        <span className="toggle-icon" onClick={() => updateBlockProperty(block.id, 'open', !block.open)}>▶</span>
        <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder={`Toggle Heading ${headingLevel}`}
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

export const SubPageBlock = memo(function SubPageBlock({ block }) {
  const { updateBlockProperty, auditData } = usePageContext();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [siblingPages, setSiblingPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customPageId, setCustomPageId] = useState('');
  const [customObjId, setCustomObjId] = useState('');

  const dobjId = auditData?.dobjId;
  const currentDdataId = auditData?.ddataId;
  const objectRouteId = auditData?.objectRouteId || String(dobjId || '');
  const actorId = currentUser?.id || currentUser?.sys_user_id || 1;

  useEffect(() => {
    if (!block.subPageId && dobjId) {
      listNotionPages(dobjId).then(pages => {
        setSiblingPages(pages.filter(p => p.id !== currentDdataId));
      });
    }
  }, [block.subPageId, dobjId, currentDdataId]);

  const handleSelectPage = (id, title) => {
    updateBlockProperty(block.id, 'subPageId', id);
    updateBlockProperty(block.id, 'pageTitle', title);
  };

  const handleCreateNew = async () => {
    if (!dobjId) return;
    setLoading(true);
    const title = prompt("Enter new sub-page title:") || "Untitled Subpage";
    const res = await createNotionNestRecord({
      dobjId,
      title,
      actorId,
    });
    setLoading(false);
    if (res.recordId) {
      updateBlockProperty(block.id, 'subPageId', res.recordId);
      updateBlockProperty(block.id, 'pageTitle', title);
    } else {
      alert("Failed to create sub-page: " + res.error);
    }
  };

  const handleLinkCustom = () => {
    const targetRecId = Number(customPageId);
    if (!targetRecId) return;
    const targetObj = customObjId || objectRouteId;
    updateBlockProperty(block.id, 'subPageId', targetRecId);
    updateBlockProperty(block.id, 'targetObjectId', targetObj);
    updateBlockProperty(block.id, 'pageTitle', block.pageTitle || `Page #${targetRecId}`);
  };

  if (block.subPageId) {
    const targetObj = block.targetObjectId || objectRouteId;
    return (
      <div className="block-content">
        <div className="sub-page-link" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '6px', padding: '4px 8px', borderRadius: '4px' }}
             onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f2f1'}
             onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
             onClick={() => navigate(notionNestPagePath(targetObj, block.subPageId))}
        >
          <span className="sub-page-icon" style={{ fontSize: '18px' }}>📄</span>
          <span className="sub-page-title" style={{ fontWeight: 500, textDecoration: 'underline', color: 'var(--notion-sf-brand, rgb(1, 118, 211))' }}>
            {block.pageTitle || `Page #${block.subPageId}`}
          </span>
          <button 
            type="button"
            className="sub-page-unlink-btn"
            style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#706e6b', cursor: 'pointer', fontSize: '11px' }}
            onClick={(e) => {
              e.stopPropagation();
              updateBlockProperty(block.id, 'subPageId', undefined);
              updateBlockProperty(block.id, 'targetObjectId', undefined);
            }}
          >
            Unlink
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="block-content" style={{ padding: '8px', border: '1px dashed #dddbda', borderRadius: '6px', background: '#fafafa', fontSize: '13px' }}>
      <div style={{ fontWeight: 600, marginBottom: '6px' }}>Link Sub-page</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {siblingPages.length > 0 && (
          <div>
            <span style={{ marginRight: '6px' }}>Select sibling page:</span>
            <select 
              style={{ padding: '2px 4px', borderRadius: '3px', border: '1px solid #dddbda' }}
              onChange={e => {
                const opt = e.target.selectedOptions[0];
                if (opt.value) handleSelectPage(Number(opt.value), opt.text);
              }}
              defaultValue=""
            >
              <option value="" disabled>-- select a page --</option>
              {siblingPages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            style={{ padding: '4px 8px', background: 'var(--notion-sf-brand, rgb(1, 118, 211))', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={handleCreateNew} 
            disabled={loading}
          >
            {loading ? 'Creating...' : '+ Create & Link New Sibling Page'}
          </button>
          <span>or</span>
          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Record ID" 
              value={customPageId} 
              onChange={e => setCustomPageId(e.target.value)}
              style={{ width: '80px', padding: '2px 4px', border: '1px solid #dddbda', borderRadius: '3px' }}
            />
            <input 
              type="text" 
              placeholder="Obj ID (optional)" 
              value={customObjId} 
              onChange={e => setCustomObjId(e.target.value)}
              style={{ width: '100px', padding: '2px 4px', border: '1px solid #dddbda', borderRadius: '3px' }}
            />
            <button 
              type="button" 
              style={{ padding: '4px 8px', background: '#f3f2f1', border: '1px solid #dddbda', borderRadius: '4px', cursor: 'pointer' }}
              onClick={handleLinkCustom}
            >
              Link Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
