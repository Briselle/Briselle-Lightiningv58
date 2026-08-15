/* ============================================================
   NotionNest — meeting-notes/config/EditPromptModal.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L3210-L3585

   Task: BRIS-NN-MNB-R06
   Purpose: Add/edit instruction-prompt modal. Self-contained; props only.
   ============================================================ */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BookOpen, Check, List, RefreshCw } from 'lucide-react';
import { DEFAULT_INSTRUCTION_PROMPTS } from '../constants';

export function EditPromptModal({ isOpen, mode = 'edit', instructionName = '', initialPrompt = '', onSave, onClose }) {
  const [name, setName] = useState(instructionName);
  const [blocks, setBlocks] = useState([]);
  const [slashMenuState, setSlashMenuState] = useState({ open: false, blockId: null, x: 0, y: 0 });
  const blockRefsMap = useRef({});
  const containerRef = useRef(null);

  /* ── Parse markdown prompt text into blocks ── */
  const parsePromptToBlocks = useCallback((text) => {
    if (!text || !text.trim()) return [{ id: 'epm_' + Date.now(), type: 'paragraph', content: '' }];
    const lines = text.split('\n');
    const result = [];
    let counter = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const id = 'epm_' + Date.now() + '_' + (++counter);
      if (/^### /.test(line)) {
        result.push({ id, type: 'heading3', content: line.replace(/^### /, '') });
      } else if (/^## /.test(line)) {
        result.push({ id, type: 'heading2', content: line.replace(/^## /, '') });
      } else if (/^# /.test(line)) {
        result.push({ id, type: 'heading1', content: line.replace(/^# /, '') });
      } else if (/^[-*•] \[[ x]\] /.test(line)) {
        const checked = /^[-*•] \[x\] /i.test(line);
        result.push({ id, type: 'todo', content: line.replace(/^[-*•] \[[ x]\] /i, ''), checked });
      } else if (/^[-*•] /.test(line)) {
        result.push({ id, type: 'bulleted_list', content: line.replace(/^[-*•] /, '') });
      } else if (/^\d+\. /.test(line)) {
        result.push({ id, type: 'numbered_list', content: line.replace(/^\d+\. /, '') });
      } else if (/^---+\s*$/.test(line)) {
        result.push({ id, type: 'divider', content: '' });
      } else if (/^> /.test(line)) {
        result.push({ id, type: 'quote', content: line.replace(/^> /, '') });
      } else if (line.trim() === '') {
        /* Skip empty lines — they are natural paragraph separators */
        continue;
      } else {
        result.push({ id, type: 'paragraph', content: line });
      }
    }
    if (result.length === 0) result.push({ id: 'epm_' + Date.now(), type: 'paragraph', content: '' });
    return result;
  }, []);

  /* ── Convert blocks back to markdown prompt text ── */
  const blocksToText = useCallback((blockList) => {
    return blockList.map(b => {
      /* Read latest content from DOM contentEditable */
      const el = blockRefsMap.current[b.id];
      const content = el ? el.textContent || '' : b.content || '';
      switch (b.type) {
        case 'heading1': return `# ${content}`;
        case 'heading2': return `## ${content}`;
        case 'heading3': return `### ${content}`;
        case 'bulleted_list': return `- ${content}`;
        case 'numbered_list': return `- ${content}`;
        case 'todo': return `- [${b.checked ? 'x' : ' '}] ${content}`;
        case 'divider': return '---';
        case 'quote': return `> ${content}`;
        default: return content;
      }
    }).join('\n');
  }, []);

  /* ── Initialize blocks when modal opens ── */
  useEffect(() => {
    setName(instructionName);
    if (isOpen) {
      setBlocks(parsePromptToBlocks(initialPrompt));
    }
  }, [instructionName, initialPrompt, isOpen, parsePromptToBlocks]);

  if (!isOpen) return null;

  const addBlockAfter = (afterId, type = 'paragraph') => {
    const newId = 'epm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const newBlock = { id: newId, type, content: '' };
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId);
      const updated = [...prev];
      updated.splice(idx + 1, 0, newBlock);
      return updated;
    });
    /* Focus the new block after render */
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = blockRefsMap.current[newId];
        if (el) el.focus();
      }, 50);
    });
  };

  const deleteBlockById = (blockId) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev; /* Keep at least one block */
      return prev.filter(b => b.id !== blockId);
    });
  };

  const changeBlockType = (blockId, newType) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type: newType } : b));
    setSlashMenuState({ open: false, blockId: null, x: 0, y: 0 });
  };

  const toggleTodo = (blockId) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b));
  };

  const handleBlockKeyDown = (e, block, idx) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlockAfter(block.id);
    }
    if (e.key === 'Backspace') {
      const el = blockRefsMap.current[block.id];
      const text = el ? el.textContent : '';
      if (!text && blocks.length > 1) {
        e.preventDefault();
        deleteBlockById(block.id);
        /* Focus previous block */
        if (idx > 0) {
          const prevId = blocks[idx - 1].id;
          requestAnimationFrame(() => {
            const prev = blockRefsMap.current[prevId];
            if (prev) {
              prev.focus();
              const sel = window.getSelection();
              const r = document.createRange();
              r.selectNodeContents(prev);
              r.collapse(false);
              sel.removeAllRanges();
              sel.addRange(r);
            }
          });
        }
      }
    }
    if (e.key === '/' && (!e.target.textContent || e.target.textContent === '')) {
      e.preventDefault();
      const rect = e.target.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      setSlashMenuState({
        open: true,
        blockId: block.id,
        x: rect.left - containerRect.left,
        y: rect.bottom - containerRect.top + 4
      });
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  };

  const handleSave = () => {
    if (mode === 'add' && !name.trim()) return;
    const text = blocksToText(blocks);
    onSave(mode === 'add' ? name.trim() : instructionName, text);
    onClose();
  };

  const handleReset = () => {
    const defaultPrompt = DEFAULT_INSTRUCTION_PROMPTS[name] || DEFAULT_INSTRUCTION_PROMPTS['Auto'];
    setBlocks(parsePromptToBlocks(defaultPrompt));
  };

  const pageTitle = mode === 'add' ? 'Add Custom Instruction' : `${instructionName} Instructions`;

  /* ── Slash menu block type options ── */
  const SLASH_TYPES = [
    { type: 'paragraph', label: 'Text', icon: '¶' },
    { type: 'heading1', label: 'Heading 1', icon: 'H1' },
    { type: 'heading2', label: 'Heading 2', icon: 'H2' },
    { type: 'heading3', label: 'Heading 3', icon: 'H3' },
    { type: 'bulleted_list', label: 'Bullet List', icon: '•' },
    { type: 'numbered_list', label: 'Numbered List', icon: '1.' },
    { type: 'todo', label: 'To-do', icon: '☐' },
    { type: 'quote', label: 'Quote', icon: '❝' },
    { type: 'divider', label: 'Divider', icon: '—' },
  ];

  /* ── Render a single block ── */
  const renderBlock = (block, idx) => {
    const blockTypeClasses = {
      paragraph: 'epm-block-paragraph',
      heading1: 'epm-block-heading1',
      heading2: 'epm-block-heading2',
      heading3: 'epm-block-heading3',
      bulleted_list: 'epm-block-bullet',
      numbered_list: 'epm-block-numbered',
      todo: 'epm-block-todo',
      quote: 'epm-block-quote',
      divider: 'epm-block-divider',
    };

    return (
      <div key={block.id} className={`epm-block ${blockTypeClasses[block.type] || ''}`} data-block-id={block.id}>
        {/* Block controls — + button and type indicator */}
        <div className="epm-block-controls">
          <div
            className="epm-block-plus"
            onClick={() => addBlockAfter(block.id)}
            title="Add block below"
          >+</div>
          <div
            className="epm-block-handle"
            title="Click to delete block"
            onClick={() => deleteBlockById(block.id)}
          >⠿</div>
        </div>

        {/* Block content */}
        <div className="epm-block-content-wrap">
          {block.type === 'divider' ? (
            <hr className="epm-divider-line" />
          ) : block.type === 'todo' ? (
            <div className="epm-todo-row">
              <input
                type="checkbox"
                checked={!!block.checked}
                onChange={() => toggleTodo(block.id)}
                className="epm-todo-checkbox"
              />
              <div
                ref={el => { blockRefsMap.current[block.id] = el; }}
                className={`epm-block-editable ${block.checked ? 'epm-todo-checked' : ''}`}
                contentEditable
                suppressContentEditableWarning
                onKeyDown={(e) => handleBlockKeyDown(e, block, idx)}
                data-placeholder="To-do"
                dangerouslySetInnerHTML={{ __html: block.content || '' }}
              />
            </div>
          ) : block.type === 'bulleted_list' ? (
            <div className="epm-bullet-row">
              <span className="epm-bullet-dot">•</span>
              <div
                ref={el => { blockRefsMap.current[block.id] = el; }}
                className="epm-block-editable"
                contentEditable
                suppressContentEditableWarning
                onKeyDown={(e) => handleBlockKeyDown(e, block, idx)}
                data-placeholder="List item"
                dangerouslySetInnerHTML={{ __html: block.content || '' }}
              />
            </div>
          ) : block.type === 'numbered_list' ? (
            <div className="epm-bullet-row">
              <span className="epm-numbered-index">{idx + 1}.</span>
              <div
                ref={el => { blockRefsMap.current[block.id] = el; }}
                className="epm-block-editable"
                contentEditable
                suppressContentEditableWarning
                onKeyDown={(e) => handleBlockKeyDown(e, block, idx)}
                data-placeholder="List item"
                dangerouslySetInnerHTML={{ __html: block.content || '' }}
              />
            </div>
          ) : block.type === 'quote' ? (
            <div className="epm-quote-row">
              <div
                ref={el => { blockRefsMap.current[block.id] = el; }}
                className="epm-block-editable epm-block-quote-text"
                contentEditable
                suppressContentEditableWarning
                onKeyDown={(e) => handleBlockKeyDown(e, block, idx)}
                data-placeholder="Quote"
                dangerouslySetInnerHTML={{ __html: block.content || '' }}
              />
            </div>
          ) : (
            <div
              ref={el => { blockRefsMap.current[block.id] = el; }}
              className="epm-block-editable"
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => handleBlockKeyDown(e, block, idx)}
              data-placeholder={block.type.startsWith('heading') ? 'Heading' : 'Type / for commands...'}
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="nnr-notion-page-modal-overlay" onClick={onClose}>
      <div className="nnr-notion-page-modal-container epm-container" onClick={e => e.stopPropagation()} ref={containerRef}>
        {/* Banner - Notion.so light blue style */}
        <div className="nnr-notion-page-banner" style={{ background: '#e8f4fd', borderBottom: '1px solid #bee3f8' }}>
          <div className="nnr-notion-page-banner-icon">
            <BookOpen size={16} style={{ color: '#2b6cb0' }} />
          </div>
          <div className="nnr-notion-page-banner-text" style={{ color: '#2c5282' }}>
            This page contains AI Meeting Notes Summary Instructions. Edit blocks below to customize your AI summary prompt.
          </div>
        </div>

        {/* Cover area */}
        <div className="nnr-notion-page-cover">
          <div className="nnr-notion-page-cover-gradient" />
        </div>

        {/* Page content */}
        <div className="nnr-notion-page-content">
          <div className="nnr-notion-page-header">
            {mode === 'add' && (
              <input
                type="text"
                className="nnr-notion-page-title-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Instruction Name"
              />
            )}
            {mode === 'edit' && (
              <h1 className="nnr-notion-page-title">{pageTitle}</h1>
            )}
          </div>

          {/* NotionNest-style block editor canvas */}
          <div className="epm-blocks-canvas">
            {blocks.map((block, idx) => renderBlock(block, idx))}
          </div>

          {/* Slash menu popup */}
          {slashMenuState.open && (
            <div
              className="epm-slash-menu"
              style={{ left: slashMenuState.x, top: slashMenuState.y }}
              onMouseDown={e => e.preventDefault()}
            >
              <div className="epm-slash-menu-title">Turn into</div>
              {SLASH_TYPES.map(opt => (
                <div
                  key={opt.type}
                  className="epm-slash-menu-item"
                  onClick={() => changeBlockType(slashMenuState.blockId, opt.type)}
                >
                  <span className="epm-slash-icon">{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="nnr-notion-page-footer">
          {mode === 'edit' && (
            <button type="button" className="nnr-notion-page-btn-secondary" onClick={handleReset}>
              <RefreshCw size={13} />
              <span>Reset to Default</span>
            </button>
          )}
          {mode === 'add' && <div />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="nnr-notion-page-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="nnr-notion-page-btn-primary" onClick={handleSave}>
              <Check size={14} />
              <span>{mode === 'add' ? 'Add Instruction' : 'Save Prompt'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditPromptModal;
