/* ============================================================
   NotionNest — blocks/LinkEmbedBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L2404
   ============================================================ */
import { useRef, useEffect, useState, memo } from 'react';
import { usePageContext } from '../core/PageContext';

export const LinkEmbedBlock = memo(function LinkEmbedBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const url = block.content || '';

  useEffect(() => {
    if (url && !preview) {
      setLoading(true);
      fetchOGData(url).then(res => {
        if (res) setPreview(res);
        setLoading(false);
      });
    }
  }, [url]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputRef.current?.textContent?.trim();
      if (val) updateBlockProperty(block.id, 'content', val);
    }
  };

  const handleBlur = () => {
    const val = inputRef.current?.textContent?.trim();
    if (val && val !== url) {
      updateBlockProperty(block.id, 'content', val);
      setPreview(null);
    }
  };

  if (url && preview) {
    return (
      <div className="block-content">
        <div className="link-embed-preview" onClick={() => window.open(url, '_blank', 'noopener')}>
          {preview.favicon && <img className="link-embed-favicon" src={preview.favicon} alt="" onError={e => e.target.style.display = 'none'} />}
          <div className="link-embed-info">
            <span className="link-embed-title">{preview.title || url}</span>
            <span className="link-embed-url">{new URL(url).hostname}</span>
          </div>
          <button className="link-embed-edit" onClick={(e) => { e.stopPropagation(); updateBlockProperty(block.id, 'content', ''); setPreview(null); }} title="Edit URL" />
        </div>
      </div>
    );
  }

  return (
    <div className="block-content">
      <div className="link-embed-input">
        <span className="link-embed-icon">🔗</span>
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          className="link-embed-editable"
          data-placeholder="Paste a link..."
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onInput={(e) => {
            if (loading) return;
            const val = e.currentTarget.textContent?.trim();
            if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
              setLoading(true);
              fetchOGData(val).then(res => {
                if (res) {
                  updateBlockProperty(block.id, 'content', val);
                  setPreview(res);
                }
                setLoading(false);
              });
            }
          }}
        />
        {loading && <span className="link-embed-loading">...</span>}
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────
   Meeting Notes Block — AI meeting notes with recording
   ───────────────────────────────────────────── */