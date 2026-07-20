/* ============================================================
   NotionNest — blocks/BookmarkBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L1181
   ============================================================ */
import { useRef, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { usePageContext } from '../core/PageContext';

export const BookmarkBlock = memo(function BookmarkBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState(block.url || '');
  const [isVisual, setIsVisual] = useState(true);
  const inputRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const allImages = useMemo(() => block.image ? block.image.split('|').filter(Boolean) : [], [block.image]);

  useEffect(() => {
    setCurrentSlide(0);
    if (allImages.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % allImages.length), 1000);
    return () => clearInterval(timer);
  }, [block.image]);

  useEffect(() => {
    if (!showModal) return;
    const escHandler = (e) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', escHandler);
    if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
    return () => window.removeEventListener('keydown', escHandler);
  }, [showModal]);

  const openModal = useCallback(() => {
    setUrlInput(block.url || '');
    setIsVisual(block.isVisualBookmark !== false);
    setShowModal(true);
  }, [block.url, block.isVisualBookmark]);

  const getUrlMetadata = useCallback(async (url, blockId) => {
    const getMeta = (doc, selector, attr = 'content') => {
      const el = doc.querySelector(selector);
      return el ? el.getAttribute(attr) || '' : '';
    };
    const getFavicon = (doc, baseUrl) => {
      const icon = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      if (icon) {
        const href = icon.getAttribute('href');
        if (href) {
          if (href.startsWith('http')) return href;
          try { return new URL(href, baseUrl).href; } catch { }
        }
      }
      return '';
    };

    let mlApplied = false;
    let mlImageRejected = false;

    const applyData = (data, source) => {
      if (!data || (!data.title && (!data.images || data.images.length === 0))) return;
      const imageField = data.images && data.images.length > 0
        ? (data.images.length === 1 ? data.images[0] : data.images.join('|'))
        : null;
      updateBlockProperty(blockId, 'bookmarkTitle', data.title || url);
      updateBlockProperty(blockId, 'description', data.description || '');
      if (imageField !== null) updateBlockProperty(blockId, 'image', imageField);
      updateBlockProperty(blockId, 'favicon', data.favicon || '');
      console.log(`[Bookmark] ${source} data applied`, { title: data.title, desc: data.description, image: imageField });
    };

    let sourcesApplied = 0;

    const tryMicrolink = async () => {
      const doFetch = async (force) => {
        try {
          const mlRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}${force ? '&force=true' : ''}`, { signal: AbortSignal.timeout(15000) });
          if (mlRes.ok) {
            const mlJson = await mlRes.json();
            if (mlJson?.status === 'success' && mlJson?.data && mlJson.data.title) {
              const d = mlJson.data;
              const img = d.image;
              const imgUrl = (img && typeof img === 'object' ? img.url : img) || '';
              const logo = d.logo;
              const logoUrl = (logo && typeof logo === 'object' ? logo.url : logo) || '';
              let mlImageValid = true;
              if (img && typeof img === 'object' && img.width != null && img.height != null) {
                if (img.width <= 1 || img.height <= 1) mlImageValid = false;
              } else if (imgUrl && /fls-eu\.amazon|pixel|1x1/i.test(imgUrl)) {
                mlImageValid = false;
              }
              if (mlImageValid && imgUrl) {
                sourcesApplied++;
                mlApplied = true;
                applyData({ title: d.title || '', description: d.description || '', images: [imgUrl], favicon: logoUrl || '' }, force ? 'microlink-force' : 'microlink');
                return true;
              }
            }
          }
        } catch (e) { /* retry without force below */ }
        return false;
      };
      if (await doFetch(true)) return true;
      return await doFetch(false);
    };

    const tryMetadataParty = async () => {
      try {
        const mpRes = await fetch('https://api.metadata.party/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(10000),
        });
        if (mpRes.ok) {
          const mpJson = await mpRes.json();
          const mpImg = mpJson.images && mpJson.images.length > 0 ? mpJson.images[0] : '';
          if ((mpJson.title || mpImg) && !mlApplied) {
            sourcesApplied++;
            mlApplied = true;
            applyData({ title: mpJson.title || '', description: mpJson.description || '', images: mpImg ? [mpImg] : [], favicon: mpJson.favicon || '' }, 'metadata-party');
            return true;
          }
        }
      } catch (e) { console.warn('[Bookmark] metadata.party failed', e); }
      return false;
    };

    const tryHtmlProxy = async () => {
      try {
        const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
        if (res.ok) {
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          if (doc) {
            let image = getMeta(doc, 'meta[property="og:image"]') || getMeta(doc, 'meta[name="twitter:image"]') || '';
            if (!image) { const el = doc.querySelector('link[rel="image_src"]'); if (el) image = el.getAttribute('href') || ''; }
            if (!image) { const el = doc.querySelector('[data-old-hires]'); if (el) image = el.getAttribute('data-old-hires') || ''; }
            const title = getMeta(doc, 'meta[property="og:title"]') || getMeta(doc, 'meta[name="twitter:title"]') || getMeta(doc, 'meta[name="title"]') || doc.title || '';
            if ((title || image) && !mlApplied) {
              sourcesApplied++;
              applyData({ title, description: getMeta(doc, 'meta[property="og:description"]') || getMeta(doc, 'meta[name="description"]') || getMeta(doc, 'meta[name="twitter:description"]') || '', images: image ? [image] : [], favicon: getFavicon(doc, url) }, 'html-proxy');
            }
          }
        }
      } catch (e) { console.warn('[Bookmark] HTML proxy failed', e); }
    };

    await tryMicrolink();
    if (!mlApplied) await tryMetadataParty();
    if (!mlApplied) await tryHtmlProxy();

    if (sourcesApplied === 0) {
      console.warn('[Bookmark] all metadata sources failed for', url);
    }

    setLoading(false);
    setShowModal(false);
  }, [updateBlockProperty]);

  const handleSubmit = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const url = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
    updateBlockProperty(block.id, 'url', url);
    updateBlockProperty(block.id, 'bookmarkTitle', url);
    updateBlockProperty(block.id, 'isVisualBookmark', isVisual);
    setShowModal(false);
    if (isVisual) {
      getUrlMetadata(url, block.id);
    }
  }, [urlInput, isVisual, getUrlMetadata, block.id, updateBlockProperty]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') setShowModal(false);
  }, [handleSubmit]);

  const getHostname = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
  const getDisplayTitle = (u) => {
    if (block.bookmarkTitle && block.bookmarkTitle !== u) return block.bookmarkTitle;
    try {
      const hostname = new URL(u).hostname;
      return hostname.replace(/^www\./, '');
    } catch { return u; }
  };

  return (
    <div className="block-content">
      {block.url ? (
        block.isVisualBookmark === false ? (
          <div className="bookmark-link-card-wrapper">
            <div className="bm-card-actions bm-card-actions-link">
              <div className="bm-toggle-icon" onClick={(e) => { e.stopPropagation(); updateBlockProperty(block.id, 'isVisualBookmark', true); }} title="Switch to visual view">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </div>
              <div className="bm-edit-icon" onClick={(e) => { e.stopPropagation(); openModal(); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
              </div>
            </div>
            <a className="bookmark-link-card" href={block.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img className="bm-favicon" src={block.favicon || `https://www.google.com/s2/favicons?domain=${getHostname(block.url)}&sz=32`} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
              <span className="bm-link-title">{getDisplayTitle(block.url)}</span>
              <span className="bm-link-url">{block.url}</span>
            </a>
          </div>
        ) : (
          <a className="bookmark-visual-card" href={block.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <div className="bm-card-actions">
              <div className="bm-toggle-icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateBlockProperty(block.id, 'isVisualBookmark', false); }} title="Switch to link view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              </div>
              <div className="bm-edit-icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
              </div>
            </div>
            <div className="bm-info">
              <div className="bm-title">{block.bookmarkTitle || block.url}</div>
              <div className="bm-desc">{block.description || ''}</div>
              <div className="bm-url-row">
                <img className="bm-favicon" src={block.favicon || `https://www.google.com/s2/favicons?domain=${getHostname(block.url)}&sz=32`} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                <div className="bm-url">{block.url}</div>
              </div>
            </div>
            <div className="bm-image">
              {allImages.length > 0 ? (
                <div className="bm-image-inner bm-image-slider">
                  <img src={allImages[currentSlide]} alt="" referrerPolicy="no-referrer" />
                  {allImages.length > 1 && (
                    <div className="bm-slider-dots">
                      {allImages.map((_, i) => (
                        <span key={i} className={`bm-dot ${i === currentSlide ? 'active' : ''}`} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bm-image-inner bm-image-fallback">
                  <img className="bm-fallback-favicon" src={block.favicon || `https://www.google.com/s2/favicons?domain=${getHostname(block.url)}&sz=32`} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>
          </a>
        )
      ) : (
        <div style={{ width: '100%' }}>
          <div className="bookmark-placeholder" onClick={openModal}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
            </span>
            <span>Add a web bookmark</span>
          </div>
        </div>
      )}

      {showModal && (
        <div className="bookmark-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="bookmark-modal">
            <button className="bookmark-modal-close" onClick={() => setShowModal(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="bookmark-modal-input-wrap">
              <input
                ref={inputRef}
                type="text"
                className="bookmark-modal-input"
                placeholder="Paste in https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
            </div>
            <button
              className="bookmark-modal-btn"
              onClick={handleSubmit}
              disabled={loading || !urlInput.trim()}
            >
              {loading ? 'Creating...' : 'Create bookmark'}
            </button>
            <div className="bookmark-modal-checkbox-wrap">
              <label className="bookmark-modal-checkbox-label">
                <input
                  type="checkbox"
                  className="bookmark-modal-checkbox"
                  checked={isVisual}
                  onChange={(e) => setIsVisual(e.target.checked)}
                  disabled={loading}
                />
                Create a visual bookmark
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
