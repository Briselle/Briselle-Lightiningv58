/* ============================================================
   NotionNest — blocks/CodeBlock.jsx
   Code editor block with syntax highlighting, language selector,
   and more-options dropdown
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L695
   ============================================================ */
import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { usePageContext } from '../core/PageContext';
import { LucideIcon } from '../menus/menus';
import { highlightCode } from '../core/utils';

export const CodeBlock = memo(function CodeBlock({ block }) {
  const { updateBlockProperty, duplicateBlock, deleteBlock, createBlockLevelComment } = usePageContext();
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreSearch, setMoreSearch] = useState('');
  const [wrapCode, setWrapCode] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(block.caption || '');
  const langRef = useRef(null);
  const moreRef = useRef(null);
  const searchRef = useRef(null);
  const moreSearchRef = useRef(null);
  const editorRef = useRef(null);
  const contentRef = useRef(block.content || '');

  const currentLang = (block.language || 'javascript').toLowerCase();
  const codeContent = block.content || '';

  const detectLanguage = useCallback((text) => {
    const t = text.trim();
    if (/(<\!DOCTYPE|<html|<div|<span|<body|<head|<\/div>|<\/span>)/i.test(t)) return 'html';
    if (/^\s*def\s+\w+|^\s*import\s+\w+|^\s*from\s+\w+\s+import|^\s*print\(|^\s*if\s+__name__/.test(t)) return 'python';
    if (/^\s*\.[\w-]+\s*\{|^\s*#[\w-]+\s*\{|^\s*[\w-]+\s*:\s*[^;]+;|^\s*@media\s+|^\s*@import\s+/.test(t)) return 'css';
    if (/(SELECT\s+|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)/i.test(t)) return 'sql';
    if (/^\s*#include\s*[<"]|^\s*void\s+\w+\s*\(|^\s*int\s+main\s*\(/.test(t)) return 'c';
    if (/^\s*#include\s*[<"]|^\s*using\s+namespace|^\s*std::|^\s*cout\s*<<|^\s*cin\s*>>/.test(t)) return 'cpp';
    if (/(public\s+static\s+void\s+main|public\s+class\s+|private\s+|protected\s+|import\s+java\.)/.test(t)) return 'java';
    if (/(^\s*func\s+|^\s*package\s+\w+|^\s*fmt\.|:=)/.test(t)) return 'go';
    if (/(^\s*fn\s+|^\s*let\s+mut\s+|^\s*impl\s+|^\s*pub\s+|^\s*use\s+|^\s*mod\s+)/.test(t)) return 'rust';
    if (/(<\?php|echo\s+|\$[a-zA-Z]|->)/.test(t)) return 'php';
    if (/^\s*puts\s+|^\s*require\s+|^\s*def\s+\w+|^\s*class\s+\w+|^\s*end\s*$|^\s*module\s+/.test(t)) return 'ruby';
    if (/(console\.log|document\.|window\.|addEventListener|getElementById|=>\s*\{|\.then\(|var\s+\w+|let\s+\w+|const\s+\w+|function\s+\w+|\.prototype\.)/i.test(t)) return 'javascript';
    if (/\{\s*\n?\s*["']?\w+["']?\s*:/.test(t) && /[}\]]/.test(t)) return 'json';
    return '';
  }, []);

  const saveContent = useCallback((text) => {
    contentRef.current = text;
    updateBlockProperty(block.id, 'content', text);
  }, [block.id, updateBlockProperty]);

  useEffect(() => {
    if (isEditing && editorRef.current && editorRef.current.textContent !== codeContent) {
      editorRef.current.textContent = codeContent;
    }
  }, [isEditing, codeContent]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeContent.replace(/<[^>]*>/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [codeContent]);

  const handleLangSelect = useCallback((langValue) => {
    updateBlockProperty(block.id, 'language', langValue);
    setLangOpen(false);
    setLangSearch('');
  }, [block.id, updateBlockProperty]);

  const handleFormatCode = useCallback(() => {
    const text = codeContent.replace(/<[^>]*>/g, '');
    const formatted = text.replace(/\t/g, '  ').replace(/\s+$/gm, '');
    saveContent(formatted);
  }, [codeContent, saveContent]);

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || '';
      saveContent(text);
    }
  }, [saveContent]);

  const handleEditorKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode('  '));
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, []);

  const handleEditorPaste = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const text = e.clipboardData.getData('text/plain');
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    requestAnimationFrame(() => {
      if (editorRef.current) {
        const content = editorRef.current.textContent || '';
        saveContent(content);
        if (!block.language) {
          const detected = detectLanguage(content);
          if (detected) {
            updateBlockProperty(block.id, 'language', detected);
          }
        }
      }
    });
  }, [block.id, block.language, saveContent, detectLanguage, updateBlockProperty]);

  const handleFocus = useCallback(() => setIsEditing(true), []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editorRef.current) {
      const text = editorRef.current.textContent || '';
      saveContent(text);
    }
  }, [saveContent]);

  const handleCaptionChange = useCallback((e) => {
    setCaption(e.target.value);
    updateBlockProperty(block.id, 'caption', e.target.value);
  }, [block.id, updateBlockProperty]);

  const handleToggleCaption = useCallback(() => {
    const newShowCaption = !block.showCaption;
    updateBlockProperty(block.id, 'showCaption', newShowCaption);
    if (!newShowCaption) {
      setCaption('');
      updateBlockProperty(block.id, 'caption', '');
    }
  }, [block.id, block.showCaption, updateBlockProperty]);

  useEffect(() => {
    if (langOpen && searchRef.current) searchRef.current.focus();
    if (moreOpen && moreSearchRef.current) moreSearchRef.current.focus();
  }, [langOpen, moreOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const highlightedHtml = highlightCode(codeContent, currentLang);

  const moreMenuItems = [
    { label: 'Format code', icon: 'Code', action: handleFormatCode, isTopAction: true },
    { label: 'Wrap code', icon: 'AlignLeft', action: () => setWrapCode(v => !v), check: wrapCode, isTopAction: true },
    { label: 'Copy code', icon: 'Copy', action: handleCopy, isTopAction: true },
    { label: block.showCaption ? 'Remove caption' : 'Add caption', icon: 'Type', action: handleToggleCaption, isTopAction: true },
    { type: 'separator' },
    { label: 'Copy link to block', icon: 'Link', action: () => { }, shortcut: 'Alt+\u2191+L' },
    { label: 'Duplicate', icon: 'Copy', action: () => { duplicateBlock(block.id); setMoreOpen(false); }, shortcut: 'Ctrl+D' },
    { label: 'Delete', icon: 'Trash2', action: () => { deleteBlock(block.id); setMoreOpen(false); }, danger: true, shortcut: 'Del' },
    { type: 'separator' },
    { label: 'Comments', icon: 'MessageSquare', action: () => { createBlockLevelComment(block.id, false); setMoreOpen(false); }, shortcut: 'Ctrl+\u2191+M' },
  ];

  const filteredMoreItems = moreMenuItems.filter(item => {
    if (item.type === 'separator') return true;
    if (!moreSearch) return true;
    return item.label.toLowerCase().includes(moreSearch.toLowerCase());
  });

  return (
    <div className="block-content">
      <div className="block-code">
        <div className="block-code-header">
          <div className="code-lang-selector" ref={langRef}>
            <button className="code-lang-btn" onClick={() => setLangOpen(v => !v)}>
              <span className="code-lang-label">{currentLang}</span>
              <LucideIcon name="ChevronDown" style={{ width: 12, height: 12, opacity: 0.6 }} />
            </button>
            {langOpen && (
              <div className="code-lang-dropdown">
                <div className="code-lang-search-wrap">
                  <input
                    ref={searchRef}
                    className="code-lang-search"
                    placeholder="Search for a language..."
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setLangOpen(false); setLangSearch(''); }
                    }}
                  />
                </div>
                <div className="code-lang-list">
                  <CODE_LANG_LIST
                    search={langSearch}
                    current={currentLang}
                    onSelect={handleLangSelect}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="code-header-actions">
            <button className="code-action-btn" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy to clipboard'}>
              <LucideIcon name={copied ? 'Check' : 'Copy'} style={{ width: 14, height: 14 }} />
            </button>
            <div className="code-more-wrap" ref={moreRef}>
              <button className="code-action-btn" onClick={() => setMoreOpen(v => !v)} title="More options">
                <LucideIcon name="MoreHorizontal" style={{ width: 14, height: 14 }} />
              </button>
              {moreOpen && (
                <div className="code-more-dropdown">
                  <div className="code-more-search-wrap">
                    <input
                      ref={moreSearchRef}
                      className="code-more-search"
                      placeholder="Search actions..."
                      value={moreSearch}
                      onChange={(e) => setMoreSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { setMoreOpen(false); setMoreSearch(''); }
                      }}
                    />
                  </div>
                  <div className="code-more-list">
                    {filteredMoreItems.map((item, idx) => {
                      if (item.type === 'separator') {
                        return <div key={`sep-${idx}`} className="code-more-separator" />;
                      }
                      return (
                        <button
                          key={item.label}
                          className={`code-more-item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`}
                          onClick={() => {
                            if (!item.disabled) {
                              item.action();
                              if (!item.check && item.action !== handleCopy) setMoreOpen(false);
                            }
                          }}
                          disabled={item.disabled}
                        >
                          <span className="code-more-icon">
                            <LucideIcon name={item.icon} style={{ width: 14, height: 14 }} />
                          </span>
                          <span className="code-more-label">{item.label}</span>
                          {item.shortcut && <span className="code-more-shortcut">{item.shortcut}</span>}
                          {item.check !== undefined && <span className="code-more-check">{item.check ? '\u2713' : ''}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="block-code-body">
          {isEditing ? (
            <pre
              ref={editorRef}
              className="block-code-content code-editing"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write code..."
              onInput={handleEditorInput}
              onKeyDown={handleEditorKeyDown}
              onPaste={handleEditorPaste}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ whiteSpace: wrapCode ? 'pre-wrap' : 'pre', overflowX: wrapCode ? 'hidden' : 'auto' }}
            />
          ) : (
            <pre
              ref={editorRef}
              className="block-code-content code-display"
              onClick={handleFocus}
              style={{ whiteSpace: wrapCode ? 'pre-wrap' : 'pre', overflowX: wrapCode ? 'hidden' : 'auto', cursor: 'text' }}
              dangerouslySetInnerHTML={{ __html: highlightedHtml || '<span class="hl-plain">Write code...</span>' }}
            />
          )}
        </div>
        {block.showCaption && (
          <div className="code-caption">
            <input
              className="code-caption-input"
              placeholder="Caption"
              value={caption}
              onChange={handleCaptionChange}
            />
          </div>
        )}
      </div>
    </div>
  );
});

/* ---- Internal: Code language list ---- */
function CODE_LANG_LIST({ search, current, onSelect }) {
  const [langs, setLangs] = useState([]);

  useEffect(() => {
    import('../core/utils').then(m => setLangs(m.CODE_LANGUAGES || [])).catch(() => { });
  }, []);

  const filtered = langs.filter(l =>
    l.label.toLowerCase().includes(search.toLowerCase()) ||
    l.value.toLowerCase().includes(search.toLowerCase())
  );

  const categories = {};
  filtered.forEach(lang => {
    const cat = lang.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(lang);
  });

  return (
    <>
      {Object.entries(categories).map(([category, items]) => (
        <div key={category} className="code-lang-category">
          <div className="code-lang-category-label">{category}</div>
          {items.map(lang => (
            <button
              key={lang.value}
              className={`code-lang-item${lang.value === current ? ' active' : ''}`}
              onClick={() => onSelect(lang.value)}
            >
              <span className="code-lang-dot" style={{ background: lang.color }} />
              <span className="code-lang-name">{lang.label}</span>
              {lang.value === current && <span className="code-lang-check">{'\u2713'}</span>}
            </button>
          ))}
        </div>
      ))}
      {filtered.length === 0 && <div className="code-lang-empty">No languages found</div>}
    </>
  );
}
