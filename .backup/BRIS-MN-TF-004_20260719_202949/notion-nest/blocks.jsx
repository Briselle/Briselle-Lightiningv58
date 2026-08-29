/* ============================================================
   NotionNest — blocks.jsx — All block components
   ============================================================ */
import { useRef, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageContext } from './PageContext';
import { NotionIconPicker, NotionCoverPicker, LucideIcon, SVG_ICONS, renderIconSvg, hasPageIcon, renderPageIcon } from './menus';
import { Move, Plus, ExternalLink, AlertTriangle, FileText, Bell, Database, Edit3, Variable, Settings, Trash2, GripVertical, ChevronDown, X, Check, Eye, EyeOff, Mic, Calendar, Users, Lightbulb, Copy, Volume2, MoreHorizontal, StopCircle, List, Clock, UserPlus, MessageSquare, Download, Share2, Play, Pause, Sliders, Upload, Globe, BookOpen, ToggleLeft, Link, ArrowRight, Video, MessageCircle, HelpCircle, Info, Speaker, Megaphone, MegaphoneOff, AudioLines } from 'lucide-react';
import UploadZone from './components/UploadZone';
import { getCaretPosition, setCaretToEnd, getCaretCoordinates, findBlockContainer, flatVisibleBlocks as flatVis, markdownShortcuts, slashMenuSections, isCaretOnFirstLine, isCaretOnLastLine, highlightCode } from './utils';
import { useAuthStore } from '../../stores/authStore';
import { listNotionPages, createNotionNestRecord, notionNestPagePath } from './notionPageStorage';

/* ---- Shared: focus helper ---- */
function focusBlock(blockId, atEnd = false, direction = -1) {
  let attempts = 0;
  const focusTarget = () => {
    let el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`);
    if (!el) {
      if (attempts < 10) {
        attempts++;
        requestAnimationFrame(focusTarget);
        return;
      }
      const blocksInDom = Array.from(document.querySelectorAll('.block'));
      const targetBlockIdx = blocksInDom.findIndex(b => b.getAttribute('data-block-id') === blockId);
      if (targetBlockIdx !== -1) {
        let scanIdx = targetBlockIdx + direction;
        while (scanIdx >= 0 && scanIdx < blocksInDom.length) {
          const nextEl = blocksInDom[scanIdx].querySelector('[contenteditable]');
          if (nextEl) {
            el = nextEl;
            break;
          }
          scanIdx += direction;
        }
      }
    }
    if (el) {
      el.focus();
      if (atEnd) {
        setCaretToEnd(el);
      } else {
        const sel = window.getSelection();
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(true); // Collapses to start
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  };
  requestAnimationFrame(focusTarget);
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
    if (e.key === 'Enter' && !e.shiftKey && block.type === 'paragraph' && ref.current) {
      const text = ref.current.textContent;
      const enterPatterns = [
        { pattern: /^\d+\.?$/, type: 'numbered_list' },
        { pattern: /^-$/, type: 'bulleted_list' },
        { pattern: /^\*$/, type: 'bulleted_list' },
        { pattern: /^\[\]?$/, type: 'todo' },
        { pattern: /^"$/, type: 'quote' },
        { pattern: /^>$/, type: 'toggle' },
        { pattern: /^h1$/, type: 'heading1' },
        { pattern: /^h2$/, type: 'heading2' },
        { pattern: /^h3$/, type: 'heading3' },
        { pattern: /^h4$/, type: 'heading4' },
        { pattern: /^h5$/, type: 'heading5' },
        { pattern: /^h1t$/, type: 'toggle_heading1' },
        { pattern: /^h2t$/, type: 'toggle_heading2' },
        { pattern: /^h3t$/, type: 'toggle_heading3' },
        { pattern: /^h4t$/, type: 'toggle_heading4' },
        { pattern: /^h5t$/, type: 'toggle_heading5' },
        { pattern: /^tl$/, type: 'toggle' },
        { pattern: /^<>$/, type: 'code' },
        { pattern: /^tbl$/, type: 'table' },
        { pattern: /^cl$/, type: 'callout' },
        { pattern: /^img$/, type: 'image' },
        { pattern: /^vid$/, type: 'video' },
        { pattern: /^fl$/, type: 'file' },
        { pattern: /^au$/, type: 'audio' },
        { pattern: /^wbm$/, type: 'bookmark' },
        { pattern: /^tab$/, type: 'tabs' },
        { pattern: /^tc$/, type: 'toc' },
        { pattern: /^pg$/, type: 'sub_page' },
        { pattern: /^txt$/, type: 'paragraph' },
        { pattern: /^col2$/, type: 'columns2' },
        { pattern: /^col3$/, type: 'columns3' },
        { pattern: /^col4$/, type: 'columns4' },
        { pattern: /^col5$/, type: 'columns5' },
        { pattern: /^btn$/, type: 'button' },
        { pattern: /^mt$/, type: 'meeting_notes' },
        { pattern: /^eq$/, type: 'equation' },
        { pattern: /^le$/, type: 'link_preview' },
      ];
      for (const shortcut of enterPatterns) {
        if (shortcut.pattern.test(text)) {
          e.preventDefault();
          ctx.changeBlockType(block.id, shortcut.type);
          requestAnimationFrame(() => {
            const el = document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`);
            if (el) { el.textContent = ''; el.innerHTML = ''; el.focus(); }
          });
          return;
        }
      }
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && ref.current) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        if (anchorNode && focusNode) {
          const anchorBlock = anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode.closest('.block') : anchorNode.parentElement?.closest('.block');
          const focusBlockEl = focusNode.nodeType === Node.ELEMENT_NODE ? focusNode.closest('.block') : focusNode.parentElement?.closest('.block');

          if (anchorBlock && focusBlockEl && anchorBlock !== focusBlockEl) {
            e.preventDefault();
            const id1 = anchorBlock.getAttribute('data-block-id');
            const id2 = focusBlockEl.getAttribute('data-block-id');
            if (id1 && id2) {
              ctx.deleteAndMergeBlocks(id1, id2);
              return;
            }
          }
        }
      }
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
      if (e.key === 'd') { e.preventDefault(); ctx.duplicateBlock(block.id); return; }
    }

    if (e.key === 'Tab' && !isCode) {
      e.preventDefault();
      const caretOffset = ref.current ? getCaretPosition(ref.current) : 0;
      if (e.shiftKey) {
        ctx.outdentBlock(block.id, caretOffset);
      } else {
        ctx.indentBlock(block.id, caretOffset);
      }
      return;
    }

    if (isCode && e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }

    if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && !isCode) {
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
              if (matchedType !== 'tabs' && matchedType !== 'columns' && matchedType !== 'table') {
                const el = document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`);
                if (el) {
                  el.textContent = '';
                  el.innerHTML = '';
                  el.focus();
                }
              } else {
                let el;
                if (matchedType === 'tabs') {
                  el = document.querySelector(`[data-block-id="${block.id}"] .tab-content [contenteditable]`);
                } else if (matchedType === 'columns') {
                  el = document.querySelector(`[data-block-id="${block.id}"] .nn-column [contenteditable]`);
                } else if (matchedType === 'table') {
                  el = document.querySelector(`[data-block-id="${block.id}"] .nn-tc[contenteditable]`);
                } else {
                  el = document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`);
                }
                if (el) {
                  el.focus();
                }
              }
            });
            return;
          }
        }
      }

      if (e.key === 'Enter') {
        const isQuoteOrCallout = ['quote', 'callout'].includes(block.type);
        if (isQuoteOrCallout) {
          const currentText = ref.current ? ref.current.textContent || '' : '';
          if (currentText.trim().length === 0) {
            e.preventDefault();
            ctx.changeBlockType(block.id, 'paragraph');
            return;
          }

          const html = ref.current ? ref.current.innerHTML || '' : '';
          const trimmedHtml = html.trim();
          const endsWithBr =
            trimmedHtml.endsWith('<div><br></div><div><br></div>') ||
            trimmedHtml.endsWith('<p><br></p><p><br></p>') ||
            trimmedHtml.endsWith('<br><br>') ||
            trimmedHtml.endsWith('<br><br><br>');

          if (endsWithBr) {
            e.preventDefault();
            let cleanedHtml = trimmedHtml
              .replace(/(?:<div><br><\/div>)+$/, '')
              .replace(/(?:<p><br><\/p>)+$/, '')
              .replace(/(?:<br\s*\/?>|&nbsp;)+$/, '');
            ctx.updateBlockContent(block.id, cleanedHtml);
            if (ref.current) ref.current.innerHTML = cleanedHtml;

            const nb = ctx.addBlock('paragraph', block.id, '');
            if (nb) focusBlock(nb.id);
            return;
          }

          // Let the browser handle line break natively
          return;
        }

        // Prevent browser native splitting/insertion for lists, paragraphs, etc.
        e.preventDefault();

        const isListOrQuoteType = ['bulleted_list', 'numbered_list', 'todo', 'toggle'].includes(block.type);
        const currentText = ref.current ? ref.current.textContent || '' : '';

        if (isListOrQuoteType && currentText.trim().length === 0) {
          ctx.changeBlockType(block.id, 'paragraph');
          return;
        }

        const selection = window.getSelection();
        let contentBefore = '';
        let contentAfter = '';
        if (selection && selection.rangeCount > 0 && ref.current) {
          const range = selection.getRangeAt(0);

          const preRange = range.cloneRange();
          preRange.selectNodeContents(ref.current);
          preRange.setEnd(range.startContainer, range.startOffset);
          const divBefore = document.createElement('div');
          divBefore.appendChild(preRange.cloneContents());
          contentBefore = divBefore.innerHTML;

          const postRange = range.cloneRange();
          postRange.selectNodeContents(ref.current);
          postRange.setStart(range.endContainer, range.endOffset);
          const divAfter = document.createElement('div');
          divAfter.appendChild(postRange.cloneContents());
          contentAfter = divAfter.innerHTML;

          ctx.updateBlockContent(block.id, contentBefore);
          ref.current.innerHTML = contentBefore;
        }

        const isToggleType = block.type === 'toggle' || block.type.startsWith('toggle_heading');
        const afterText = contentAfter.replace(/<[^>]*>/g, '').trim();
        const isAtEnd = afterText.length === 0;

        const forceChild = isToggleType && isAtEnd && block.open;
        const nextType = isListOrQuoteType ? block.type : 'paragraph';

        const nb = ctx.addBlock(nextType, block.id, contentAfter, forceChild);
        if (nb) focusBlock(nb.id);
        return;
      }
    }

    if (e.key === 'Backspace' && ref.current) {
      const caretPos = getCaretPosition(ref.current);
      const text = ref.current.textContent || '';
      if (caretPos === 0) {
        const isEmpty = text.trim().length === 0;
        if (isEmpty) {
          const all = ctx.flatVisibleBlocks();
          const idx = all.findIndex(b => b.id === block.id);
          const prev = idx > 0 ? all[idx - 1] : null;
          if (prev) {
            e.preventDefault();
            ctx.deleteBlock(block.id);
            focusBlock(prev.id, true, -1);
          }
          return;
        }

        const all = ctx.flatVisibleBlocks();
        const idx = all.findIndex(b => b.id === block.id);
        const prev = idx > 0 ? all[idx - 1] : null;
        if (prev) {
          e.preventDefault();
          const prevEl = document.querySelector(`[data-block-id="${prev.id}"] [contenteditable]`);
          if (prevEl) {
            const prevContent = prevEl.innerHTML || '';
            const currentContent = ref.current.innerHTML || '';
            const mergedContent = prevContent + currentContent;
            const prevTextLen = prevEl.textContent.length;
            ctx.updateBlockContent(prev.id, mergedContent);
            ctx.deleteBlock(block.id);

            let attempts = 0;
            const focusMerge = () => {
              const el = document.querySelector(`[data-block-id="${prev.id}"] [contenteditable]`);
              if (el) {
                if (el.innerHTML !== mergedContent) {
                  el.innerHTML = mergedContent;
                }
                el.focus();
                let charCount = 0;
                let set = false;
                function traverse(node) {
                  if (node.nodeType === Node.TEXT_NODE) {
                    const nextCount = charCount + node.length;
                    if (prevTextLen >= charCount && prevTextLen <= nextCount) {
                      const sel = window.getSelection();
                      const r = document.createRange();
                      r.setStart(node, prevTextLen - charCount);
                      r.collapse(true);
                      sel.removeAllRanges();
                      sel.addRange(r);
                      set = true;
                      return true;
                    }
                    charCount = nextCount;
                  } else {
                    for (let i = 0; i < node.childNodes.length; i++) {
                      if (traverse(node.childNodes[i])) return true;
                    }
                  }
                  return false;
                }
                traverse(el);
                if (!set) {
                  const sel = window.getSelection();
                  const r = document.createRange();
                  r.selectNodeContents(el);
                  r.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(r);
                }
              } else if (attempts < 10) {
                attempts++;
                requestAnimationFrame(focusMerge);
              }
            };
            requestAnimationFrame(focusMerge);
          }
        }
        return;
      }
    }

    if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && ref.current) {
      const isAtEnd = getCaretPosition(ref.current) >= (ref.current.textContent || '').length;
      const isAtStart = getCaretPosition(ref.current) === 0;

      if ((e.key === 'ArrowDown' && isAtEnd) || (e.key === 'ArrowUp' && isAtStart)) {
        e.preventDefault();
        window.getSelection().removeAllRanges();
        ref.current.blur();

        const all = ctx.flatVisibleBlocks();
        const idx = all.findIndex(b => b.id === block.id);
        if (idx !== -1) {
          let nextIds = [block.id];
          if (e.key === 'ArrowDown' && idx < all.length - 1) {
            nextIds.push(all[idx + 1].id);
          } else if (e.key === 'ArrowUp' && idx > 0) {
            nextIds.push(all[idx - 1].id);
          }
          ctx.setSelectedBlockIds(nextIds);
          ctx.setSelectionStartId(block.id);
        }
        return;
      }
    }

    if (e.key === 'ArrowUp' && !e.shiftKey && ref.current && isCaretOnFirstLine(ref.current)) {
      const all = ctx.flatVisibleBlocks();
      const idx = all.findIndex(b => b.id === block.id);
      if (idx > 0) { e.preventDefault(); focusBlock(all[idx - 1].id, true, -1); }
    }
    if (e.key === 'ArrowDown' && !e.shiftKey && ref.current && isCaretOnLastLine(ref.current)) {
      const all = ctx.flatVisibleBlocks();
      const idx = all.findIndex(b => b.id === block.id);
      if (idx < all.length - 1) { e.preventDefault(); focusBlock(all[idx + 1].id, false, 1); }
    }
    if (e.key === 'ArrowLeft' && !e.shiftKey && ref.current && getCaretPosition(ref.current) === 0) {
      const all = ctx.flatVisibleBlocks();
      const idx = all.findIndex(b => b.id === block.id);
      if (idx > 0) { e.preventDefault(); focusBlock(all[idx - 1].id, true, -1); }
    }
    if (e.key === 'ArrowRight' && !e.shiftKey && ref.current && getCaretPosition(ref.current) >= ref.current.textContent.length) {
      const all = ctx.flatVisibleBlocks();
      const idx = all.findIndex(b => b.id === block.id);
      if (idx < all.length - 1) { e.preventDefault(); focusBlock(all[idx + 1].id, false, 1); }
    }
  }, [block, isCode, ctx]);

  const handleFocus = useCallback(() => ctx.setActiveBlockId(block.id), [block.id]);

  useEffect(() => {
    if (!ref.current) return;
    if (isCode) {
      if (ref.current.textContent !== (block.content || '')) {
        ref.current.textContent = block.content || '';
      }
    } else {
      const currentHTML = ref.current.innerHTML || '';
      const targetHTML = block.content || '';
      if (currentHTML !== targetHTML) {
        // If both are functionally empty, do not overwrite to prevent selection loss
        const isCurrentEmpty = currentHTML === '' || currentHTML === '<br>' || currentHTML === '<br/>';
        const isTargetEmpty = targetHTML === '';
        if (!(isCurrentEmpty && isTargetEmpty)) {
          ref.current.innerHTML = targetHTML;
        }
      }
    }
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
  const { updateBlockProperty, addBlock } = usePageContext();
  // Use dynamic import to avoid circular dep
  const [BR, setBR] = useState(null);
  useEffect(() => { import('./BlockRenderer').then(m => setBR(() => m.default)); }, []);
  const children = block.children || [];
  return (
    <>
      <div className="block-content" onClick={() => ref.current?.focus()} style={{ cursor: 'text' }}>
        <span
          className="toggle-icon"
          onClick={(e) => {
            e.stopPropagation();
            updateBlockProperty(block.id, 'open', !block.open);
          }}
          style={{ cursor: 'pointer', userSelect: 'none', marginRight: '4px' }}
        >
          ▶
        </span>
        <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Toggle"
          onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
      </div>
      {block.open && (
        <div className="block-toggle-children" style={{ paddingLeft: '24px' }}>
          <div className="blocks-container">
            {BR && children.map((child, i) => <BR key={child.id} block={child} blocksArray={children} blockIndex={i} />)}
            {children.length === 0 && (
              <div
                className="toggle-empty-placeholder"
                style={{
                  color: '#aaa',
                  fontSize: '0.9em',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => {
                  const nb = addBlock('paragraph', block.id);
                  if (nb) focusBlock(nb.id);
                }}
              >
                + Empty toggle. Click to add a block inside
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

export const QuoteBlock = memo(function QuoteBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Quote' });
  const { showContextMenu } = usePageContext();

  const handleMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      showContextMenu(e.clientX, e.clientY, [], rect, 'block', block.id, 'color-artifacts');
    }
  };

  return (
    <div className="block-content" onMouseDown={handleMouseDown}>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Quote"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} />
    </div>
  );
});

export const CalloutBlock = memo(function CalloutBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Callout' });
  const { updateBlockProperty, activeMediaPickerId, setActiveMediaPickerId } = usePageContext();
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 30 });
  const iconSpanRef = useRef(null);

  const icon = block.calloutIcon || '💡';
  const showPicker = activeMediaPickerId === `callout-${block.id}`;
  const setShowPicker = (val) => {
    setActiveMediaPickerId(val ? `callout-${block.id}` : null);
  };

  const handleIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPicker(!showPicker);
  };

  useEffect(() => {
    if (!showPicker) return;
    const updatePosition = () => {
      if (iconSpanRef.current) {
        const rect = iconSpanRef.current.getBoundingClientRect();
        const leftVal = Math.min(rect.left, window.innerWidth - 360);
        const finalLeft = Math.max(10, leftVal);
        const finalTop = rect.bottom + 6;
        setPickerPos({ x: finalLeft, y: finalTop });
      }
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showPicker]);

  return (
    <div className="block-content" style={{ position: 'relative' }}>
      <span className="block-callout-icon" ref={iconSpanRef} onMouseDown={handleIconClick} style={{ cursor: 'pointer' }}>
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
    if (/(<!DOCTYPE|<html|<div|<span|<body|<head|<\/div>|<\/span>)/i.test(t)) return 'html';
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

function CODE_LANG_LIST({ search, current, onSelect }) {
  const [langs, setLangs] = useState([]);

  useEffect(() => {
    import('./utils').then(m => setLangs(m.CODE_LANGUAGES || [])).catch(() => { });
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



function MediaBlockPicker({ blockId, blockType, onSelect }) {
  const { activeMediaPickerId, setActiveMediaPickerId } = usePageContext();
  const [coords, setCoords] = useState({ left: 0, top: 46 });
  const wrapperRef = useRef(null);

  const showPicker = activeMediaPickerId === blockId;
  const setShowPicker = (val) => {
    setActiveMediaPickerId(val ? blockId : null);
  };

  useEffect(() => {
    if (!showPicker) return;
    const updatePosition = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const leftVal = Math.min(rect.left, window.innerWidth - 420);
        const finalLeft = Math.max(10, leftVal);
        const finalTop = rect.bottom + 6;
        setCoords({ left: finalLeft, top: finalTop });
      }
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showPicker]);

  const getIcon = () => {
    switch (blockType) {
      case 'image': return <LucideIcon name="Image" className="w-5 h-5 text-gray-500" />;
      case 'video': return <LucideIcon name="Video" className="w-5 h-5 text-gray-500" />;
      case 'audio': return <LucideIcon name="Music" className="w-5 h-5 text-gray-500" />;
      default: return <LucideIcon name="Paperclip" className="w-5 h-5 text-gray-500" />;
    }
  };

  const getLabel = () => {
    switch (blockType) {
      case 'image': return 'Add an image';
      case 'video': return 'Add a video';
      case 'audio': return 'Add music / audio';
      default: return 'Add a file';
    }
  };

  return (
    <div className="media-block-placeholder-wrapper" ref={wrapperRef} style={{ position: 'relative', width: '100%' }} onMouseDown={e => e.stopPropagation()}>
      <div
        className="media-placeholder-card"
        onClick={() => setShowPicker(!showPicker)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: '#f4f6f9',
          border: '1px dashed #dddbda',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#4f5052',
          transition: 'all 0.2s ease',
          fontSize: '14px',
          fontWeight: '500'
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = '#eef1f6';
          e.currentTarget.style.borderColor = '#0176d3';
          e.currentTarget.style.color = '#0176d3';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = '#f4f6f9';
          e.currentTarget.style.borderColor = '#dddbda';
          e.currentTarget.style.color = '#4f5052';
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getIcon()}</span>
        <span>{getLabel()}</span>
      </div>

      {showPicker && (
        <NotionCoverPicker
          position={{ x: coords.left, y: coords.top }}
          onSelect={(url, name) => {
            onSelect(url, name);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
          blockType={blockType}
        />
      )}
    </div>
  );
}

export const ImageBlock = memo(function ImageBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="block-content"
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {block.url ? (
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
          {hovered && (
            <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
              <button
                onClick={() => updateBlockProperty(block.id, 'url', '')}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #d8dde6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                Change / Remove
              </button>
            </div>
          )}
          <img src={block.url} alt="" style={{ maxWidth: '100%', borderRadius: '4px' }} />
          <div className="image-caption" contentEditable suppressContentEditableWarning
            data-placeholder="Add a caption" onBlur={e => updateBlockProperty(block.id, 'caption', e.target.textContent)}>{block.caption || ''}</div>
        </div>
      ) : (
        <MediaBlockPicker blockId={block.id} blockType="image" onSelect={(url) => updateBlockProperty(block.id, 'url', url)} />
      )}
    </div>
  );
});

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

export const ColumnsBlock = memo(function ColumnsBlock({ block }) {
  const { updateBlockProperty, insertColumn, deleteColumn, moveColumn, showContextMenu, moveBlockToColumn, setDeleteConfirm } = usePageContext();
  const [BR, setBR] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [colReorderId, setColReorderId] = useState(null);
  const [activeDropPos, setActiveDropPos] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => { import('./BlockRenderer').then(m => setBR(() => m.default)); }, []);

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

export const VideoBlock = memo(function VideoBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [hovered, setHovered] = useState(false);

  const getEmbedUrl = (url) => {
    if (!url) return url;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vim = url.match(/vimeo\.com\/(\d+)/);
    if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
    return url;
  };

  const isEmbed = block.url && (block.url.includes('youtube.com') || block.url.includes('youtu.be') || block.url.includes('vimeo.com') || block.url.includes('embed'));

  return (
    <div
      className="block-content"
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {block.url ? (
        <div style={{ position: 'relative', width: '100%' }}>
          {hovered && (
            <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
              <button
                onClick={() => updateBlockProperty(block.id, 'url', '')}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #d8dde6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                Change / Remove
              </button>
            </div>
          )}
          {isEmbed ? (
            <iframe src={getEmbedUrl(block.url)} title="Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '400px', borderRadius: '4px' }} />
          ) : (
            <video src={block.url} controls style={{ width: '100%', maxHeight: '400px', borderRadius: '4px', background: '#000' }} />
          )}
        </div>
      ) : (
        <MediaBlockPicker blockId={block.id} blockType="video" onSelect={(url) => updateBlockProperty(block.id, 'url', url)} />
      )}
    </div>
  );
});

export const AudioBlock = memo(function AudioBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="block-content"
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {block.url ? (
        <div style={{ position: 'relative', width: '100%' }}>
          {hovered && (
            <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
              <button
                onClick={() => updateBlockProperty(block.id, 'url', '')}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #d8dde6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                Change / Remove
              </button>
            </div>
          )}
          <div style={{ background: '#f3f4f6', padding: '24px 16px', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <LucideIcon name="Music" className="w-8 h-8 text-gray-400" />
            <audio controls src={block.url} style={{ width: '100%' }}>Your browser does not support audio.</audio>
          </div>
        </div>
      ) : (
        <MediaBlockPicker blockId={block.id} blockType="audio" onSelect={(url) => updateBlockProperty(block.id, 'url', url)} />
      )}
    </div>
  );
});

export const FileBlock = memo(function FileBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="block-content"
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {block.url ? (
        <div style={{ position: 'relative', width: '100%' }}>
          {hovered && (
            <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
              <button
                onClick={() => {
                  updateBlockProperty(block.id, 'url', '');
                  updateBlockProperty(block.id, 'fileName', '');
                }}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #d8dde6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                Change / Remove
              </button>
            </div>
          )}
          <div className="block-file">
            <a href={block.url} target="_blank" rel="noopener noreferrer" className="file-card">
              <LucideIcon name="Paperclip" className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
              <span className="file-name">{block.fileName || block.url.split('/').pop() || 'File'}</span>
            </a>
          </div>
        </div>
      ) : (
        <MediaBlockPicker
          blockId={block.id}
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
  const { updateBlockProperty, addBlock } = usePageContext();
  const [BR, setBR] = useState(null);
  useEffect(() => { import('./BlockRenderer').then(m => setBR(() => m.default)); }, []);
  const children = block.children || [];
  return (
    <>
      <div className="block-content" onClick={() => ref.current?.focus()} style={{ cursor: 'text' }}>
        <span
          className="toggle-icon"
          onClick={(e) => {
            e.stopPropagation();
            updateBlockProperty(block.id, 'open', !block.open);
          }}
          style={{ cursor: 'pointer', userSelect: 'none', marginRight: '4px' }}
        >
          ▶
        </span>
        <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder={`Toggle Heading ${headingLevel}`}
          onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
      </div>
      {block.open && (
        <div className="block-toggle-children" style={{ paddingLeft: '24px' }}>
          <div className="blocks-container">
            {BR && children.map((child, i) => <BR key={child.id} block={child} blocksArray={children} blockIndex={i} />)}
            {children.length === 0 && (
              <div
                className="toggle-empty-placeholder"
                style={{
                  color: '#aaa',
                  fontSize: '0.9em',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => {
                  const nb = addBlock('paragraph', block.id);
                  if (nb) focusBlock(nb.id);
                }}
              >
                + Empty toggle. Click to add a block inside
              </div>
            )}
          </div>
        </div>
      )}
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

const OG_TIMEOUT = 8000;

async function fetchOGData(url) {
  try {
    const resp = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&force=true`, { signal: AbortSignal.timeout(OG_TIMEOUT) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.data) return null;
    return {
      title: data.data.title || '',
      description: data.data.description || '',
      favicon: data.data.logo?.url || data.data.favicon?.url || '',
    };
  } catch { return null; }
}

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
export const MeetingNotesBlock = memo(function MeetingNotesBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [timer, setTimer] = useState(0);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  const [viewMode, setViewMode] = useState('transcript');
  const [currentSpeaker, setCurrentSpeaker] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [aiNotesCollapsed, setAiNotesCollapsed] = useState(false);
  const [transcriptCollapsed, setTranscriptCollapsed] = useState(true);
  const [editingAiNotes, setEditingAiNotes] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const [showInstructionsSubmenu, setShowInstructionsSubmenu] = useState(false);
  const [customInstructions, setCustomInstructions] = useState([]);
  const [showBulbInfo, setShowBulbInfo] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [editingLineId, setEditingLineId] = useState(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [showAudioSourceMenu, setShowAudioSourceMenu] = useState(false);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [showOutputDeviceMenu, setShowOutputDeviceMenu] = useState(false);
  const dateInputRef = useRef(null);
  const timerRef = useRef(null);
  const downloadWrapRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const playbackTimerRef = useRef(null);
  const aiInsightsAutoRef = useRef(false);
  const recStartTimeRef = useRef(0);
  const settingsWrapRef = useRef(null);
  const bulbWrapRef = useRef(null);
  const audioUploadRef = useRef(null);
  const audioSourceWrapRef = useRef(null);
  const outputDeviceWrapRef = useRef(null);
  const wakeWordRef = useRef(null);

  const title = block.title || 'Meeting';
  const date = block.date || new Date().toISOString().split('T')[0];
  const participants = block.participants || [];
  const mode = block.mode || 'auto';
  const includeSummary = block.includeSummary !== false;
  const includeBullets = block.includeBullets !== false;
  const includeActionItems = block.includeActionItems !== false;
  const includeFollowUp = block.includeFollowUp !== false;
  const summary = block.summary || '';
  const bulletPoints = block.bulletPoints || [];
  const transcription = block.transcription || '';
  const transcriptLines = block.transcriptLines || [];
  const aiInsights = block.aiInsights || [];
  const notesContent = block.content || '';
  const finalNotes = block.finalNotes || '';
  const hasAudio = !!block.audioData;
  const consentEnabled = block.consentEnabled !== false;
  const audioSource = block.audioSource || 'both';
  const selectedOutputDevice = block.selectedOutputDevice || 'default';
  const selectedLanguage = block.selectedLanguage || 'English (US)';
  const selectedInstruction = block.selectedInstruction || 'Auto';

  const saveProp = useCallback((key, val) => updateBlockProperty(block.id, key, val), [block.id, updateBlockProperty]);

  const formatTime = (s) => {
    if (isNaN(s) || s === null || s === undefined) return '00:00';
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = Math.floor(s % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFullTimestamp = (date) => {
    var d = date || new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    var offsetMin = -d.getTimezoneOffset();
    var sign = offsetMin >= 0 ? '+' : '-';
    var absOff = Math.abs(offsetMin);
    var offH = Math.floor(absOff / 60);
    var offM = absOff % 60;
    var tzStr = offM > 0 ? 'UTC' + sign + offH + '.' + offM : 'UTC' + sign + offH;
    return '[' + yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi + ':' + ss + ' ' + tzStr + ']';
  };

  /* ── Refs to avoid stale closures in recognition callbacks ── */
  const transcriptionRef = useRef(block.transcription || '');
  const transcriptLinesRef = useRef(block.transcriptLines || []);
  const contentRef = useRef(block.content || '');
  const modeRef = useRef(mode);
  const recordingRef = useRef(false);
  const speakerRef = useRef('');
  var startRecRef = useRef(null);
  var stopRecRef = useRef(null);

  transcriptionRef.current = block.transcription || '';
  transcriptLinesRef.current = block.transcriptLines || [];
  contentRef.current = block.content || '';
  modeRef.current = mode;
  recordingRef.current = recording;
  speakerRef.current = currentSpeaker;

  /* ── Speech Recognition + MediaRecorder ── */
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser. Use Chrome or Edge.'); return; }

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
    recog.onresult = (event) => {
      let final = '';
      let interim = '';
      var stopCmd = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          var transcript = event.results[i][0].transcript;
          var lower = transcript.toLowerCase();
          if (lower.indexOf('ziva stop') !== -1 || lower.indexOf('ziva stop recording') !== -1) {
            stopCmd = true;
          } else {
            final += transcript + ' ';
          }
        } else interim += event.results[i][0].transcript;
      }
      if (stopCmd && stopRecRef.current) { stopRecRef.current(); return; }
      if (final) {
        const elapsed = Date.now() - recStartTimeRef.current;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const ts = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
        const speaker = speakerRef.current || 'Unknown';
        const lineContent = final.trim();
        const line = `\n${ts} ${speaker}: ${lineContent}`;
        const newTrans = (transcriptionRef.current || '') + line;
        transcriptionRef.current = newTrans.trim();
        saveProp('transcription', newTrans.trim());

        var newTimestamp = formatFullTimestamp();
        const newLineObj = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          timestamp: newTimestamp,
          source: 'Auto Transcribing',
          content: `${speaker}: ${lineContent}`
        };
        const newLines = [...transcriptLinesRef.current, newLineObj];
        transcriptLinesRef.current = newLines;
        saveProp('transcriptLines', newLines);

        if (modeRef.current === 'auto') {
          const newContent = (contentRef.current || '') + line;
          contentRef.current = newContent.trim();
          saveProp('content', newContent.trim());
        }
      }
      setInterimText(interim);
    };
    recog.onerror = function () { stopRecording(); };
    recog.onend = function () { if (recordingRef.current) recog.start(); };
    recog.start();
    setRecognition(recog);
    setRecording(true);
    recordingRef.current = true;
    recStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - recStartTimeRef.current) / 1000)), 1000);
  }, [saveProp]);

  const stopRecording = useCallback(() => {
    if (recognition) { recognition.stop(); setRecognition(null); }
    if (wakeWordRef.current) { try { wakeWordRef.current.stop(); } catch (e) { } wakeWordRef.current = null; }
    clearInterval(timerRef.current);
    setRecording(false);
    recordingRef.current = false;
    setInterimText('');
    setIsPaused(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();

      // Save audio data to block properties
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        saveProp('audioData', base64Data);
        saveProp('audioDuration', timer);
        setAudioUrl(URL.createObjectURL(audioBlob));
        setAudioDuration(timer);
      };
      reader.readAsDataURL(audioBlob);
    }

    // Final save of transcript data
    saveProp('transcription', transcriptionRef.current);
    saveProp('transcriptLines', transcriptLinesRef.current);

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
  }, [recognition, timer, saveProp]);

  /* ── Keep refs updated for wake word detection ── */
  startRecRef.current = startRecording;
  stopRecRef.current = stopRecording;

  const pauseRecording = useCallback(() => {
    recordingRef.current = false;
    if (recognition) { recognition.stop(); setRecognition(null); }
    clearInterval(timerRef.current);
    setIsPaused(true);
  }, [recognition]);

  const resumeRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recog = new SR();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';
      recog.onresult = (event) => {
          let final = '';
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
            else interim += event.results[i][0].transcript;
          }
          if (final) {
            const elapsed = Date.now() - recStartTimeRef.current;
            const mins = Math.floor(elapsed / 60000);
            const secs = Math.floor((elapsed % 60000) / 1000);
            const ts = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
            const speaker = speakerRef.current || 'Unknown';
            const lineContent = final.trim();
            const line = `\n${ts} ${speaker}: ${lineContent}`;
            const newTrans = (transcriptionRef.current || '') + line;
            transcriptionRef.current = newTrans.trim();
            saveProp('transcription', newTrans.trim());

            const tzOffset = (new Date()).getTimezoneOffset() * 60000;
            const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
            const newLineObj = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
              timestamp: localISOTime,
              source: 'Auto Transcribing',
              content: `${speaker}: ${lineContent}`
            };
            const newLines = [...transcriptLinesRef.current, newLineObj];
            transcriptLinesRef.current = newLines;
            saveProp('transcriptLines', newLines);

            if (modeRef.current === 'auto') {
              const newContent = (contentRef.current || '') + line;
              contentRef.current = newContent.trim();
              saveProp('content', newContent.trim());
            }
          }
          setInterimText(interim);
        };
        recog.onerror = () => { };
        recog.onend = () => { if (recordingRef.current) recog.start(); };
        recog.start();
        setRecognition(recog);
      }
      recordingRef.current = true;
      setRecording(true);
      timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - recStartTimeRef.current) / 1000)), 1000);
      setIsPaused(false);
  }, [saveProp]);

  const addManualLine = useCallback(() => {
    var newTimestamp = formatFullTimestamp();
    var newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newLineObj = {
      id: newId,
      timestamp: newTimestamp,
      source: 'Manual Transcribing',
      content: ''
    };
    const newLines = [...(block.transcriptLines || []), newLineObj];
    saveProp('transcriptLines', newLines);
    setEditingLineId(newId);
  }, [block.transcriptLines, saveProp]);

  const updateManualLine = useCallback((id, newContent) => {
    const lines = block.transcriptLines || [];
    const newLines = lines.map(line =>
      line.id === id ? { ...line, content: newContent } : line
    );
    saveProp('transcriptLines', newLines);
  }, [block.transcriptLines, saveProp]);

  const handleAudioUpload = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      saveProp('audioData', ev.target.result);
      saveProp('audioDuration', 0);
      setAudioUrl(ev.target.result);
    };
    reader.readAsDataURL(file);
  }, [saveProp]);

  const clearAllLines = useCallback(() => {
    saveProp('transcriptLines', []);
    saveProp('transcription', '');
    saveProp('content', '');
    setShowConfirmClear(false);
  }, [saveProp]);

  const toggleRecording = () => {
    if (recording && isPaused) {
      resumeRecording();
    } else if (recording) {
      pauseRecording();
    } else {
      startRecording();
    }
  };

  /* ── Audio Playback ── */
  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
      setAudioDuration(audioRef.current.duration || timer);
      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentPlaybackTime(audioRef.current.currentTime);
          if (audioRef.current.ended) { setIsPlaying(false); clearInterval(playbackTimerRef.current); }
        }
      }, 200);
    }
  }, [audioUrl, timer]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      clearInterval(playbackTimerRef.current);
    }
  }, []);

  const seekAudio = useCallback((e) => {
    if (audioRef.current && audioUrl) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audioRef.current.currentTime = pct * (audioRef.current.duration || timer);
    }
  }, [audioUrl, timer]);

  /* ── Speaker change during recording ── */
  const handleSpeakerChange = (e) => {
    setCurrentSpeaker(e.target.value);
  };

  /* ── Text-to-Speech ── */
  const readAloud = (text) => {
    if (!window.speechSynthesis) return;
    if (isReadingAloud) { window.speechSynthesis.cancel(); setIsReadingAloud(false); return; }
    const content = text || notesContent || finalNotes;
    if (!content || !content.trim()) return;
    const u = new SpeechSynthesisUtterance(content);
    u.lang = 'en-US'; u.rate = 1;
    u.onend = () => setIsReadingAloud(false);
    u.onerror = () => setIsReadingAloud(false);
    setIsReadingAloud(true);
    window.speechSynthesis.speak(u);
  };

  /* ── Copy ── */
  const copyText = (text) => { if (text) navigator.clipboard.writeText(text); };

  /* ── Generate AI summary (local fallback) ── */
  const generateSummary = useCallback(() => {
    const text = notesContent || transcription;
    if (!text.trim()) return;
    const words = text.split(/\s+/);
    saveProp('summary', words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : ''));
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    saveProp('bulletPoints', sentences.slice(0, 5).map(s => s.trim()));
    saveProp('aiInsights', [
      { icon: 'Lightbulb', text: `${words.length} words transcribed` },
      { icon: 'Clock', text: `Recording time: ${formatTime(timer)}` },
    ]);
  }, [notesContent, transcription, timer, saveProp]);

  /* ── Local notes processor (generates proper structured meeting document) ── */
  const processNotesLocally = useCallback(() => {
    const text = notesContent || transcription;
    if (!text.trim()) return '';

    const wordCount = text.split(/\s+/).length;
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];

    /* Generate summary */
    let genSummary = '';
    if (includeSummary) {
      const words = text.split(/\s+/);
      genSummary = words.slice(0, 60).join(' ') + (words.length > 60 ? '...' : '');
      saveProp('summary', genSummary);
    }

    /* Generate bullet points */
    let genBullets = [];
    if (includeBullets) {
      genBullets = sentences.slice(0, 8).map(s => s.trim().replace(/^[-•*]\s*/, ''));
      saveProp('bulletPoints', genBullets);
    }

    /* Find topic-like segments from transcript lines with timestamps */
    const lines = text.split('\n').filter(l => l.trim());
    const topicLines = lines.filter(l => /\[(\d{2}:\d{2})\]/.test(l)).slice(0, 12);
    const attendees = participants.length > 0
      ? participants.map(p => `* ${p.name}${p.email ? ` - ${p.email}` : ''}`).join('\n')
      : '* (No attendees recorded)';

    /* ---------- Build the full document ---------- */
    const doc = [];

    doc.push(`# Meeting Notes\n`);
    doc.push(`**Meeting Title:** ${title}`);
    doc.push(`**Date:** ${date}`);
    doc.push(`**Duration:** ${formatTime(timer)}`);

    if (participants.length > 0) {
      doc.push(`**Facilitator:** ${participants[0]?.name || 'N/A'}`);
    }

    doc.push(``);
    doc.push(`## Attendees`);
    doc.push(attendees);
    doc.push(``);

    doc.push(`---`);
    doc.push(``);

    if (genSummary) {
      doc.push(`## Summary`);
      doc.push(``);
      doc.push(genSummary);
      doc.push(``);
    }

    if (genBullets.length > 0) {
      doc.push(`## Key Points`);
      doc.push(``);
      genBullets.forEach(b => doc.push(`* ${b}`));
      doc.push(``);
    }

    doc.push(`## Discussion`);
    doc.push(``);
    /* Group transcript lines into pseudo-topics if possible */
    if (topicLines.length > 0) {
      doc.push(`The meeting covered the following topics based on the live transcription:`);
      doc.push(``);
      topicLines.forEach(line => doc.push(`> ${line}`));
      doc.push(``);
    } else {
      doc.push(`The full transcription of the meeting is provided in the section below.`);
      doc.push(``);
    }

    if (includeActionItems && genBullets.length > 0) {
      doc.push(`## Action Items`);
      doc.push(``);
      doc.push(`| # | Action | Owner | Due Date | Status |`);
      doc.push(`|---|--------|-------|----------|--------|`);
      genBullets.slice(0, 5).forEach((b, i) => {
        doc.push(`| ${i + 1} | ${b} | TBD | TBD | Open |`);
      });
      doc.push(``);
    }

    if (includeFollowUp) {
      doc.push(`## Track Follow Up`);
      doc.push(``);
      /* Scan text for date/meeting follow-up clues */
      const followUpMatch = text.match(/(?:next\s+meeting|follow[\s-]*up|schedule|reschedule|meet\s+again|next\s+time|coming\s+week)\s*(?::\s*)?([^.\n]*)/gi);
      if (followUpMatch && followUpMatch.length > 0) {
        doc.push(`The following follow-up items were identified from the conversation:`);
        doc.push(``);
        followUpMatch.slice(0, 5).forEach(m => doc.push(`- ${m.trim()}`));
      } else {
        doc.push(`No follow-up meetings or next steps were explicitly mentioned during the session.`);
      }
      doc.push(``);
      doc.push(`> **Reminder:** Schedule a follow-up meeting if action items require further discussion.`);
      doc.push(``);
    }

    doc.push(`## Full Transcription (Live Captured)`);
    doc.push(``);
    doc.push(text);
    doc.push(``);

    doc.push(`---`);
    doc.push(`*AI-generated meeting notes processed locally (Ziva AI server unavailable).*`);

    const processed = doc.join('\n');
    saveProp('finalNotes', processed);
    saveProp('aiInsights', [
      { icon: 'Lightbulb', text: `${wordCount} words transcribed` },
      { icon: 'Clock', text: `Recording time: ${formatTime(timer)}` },
      { icon: 'Users', text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` },
    ]);
    return processed;
  }, [notesContent, transcription, includeBullets, includeSummary, includeActionItems, includeFollowUp, title, date, timer, participants, saveProp, block.summary]);

  /* ── Split AI response into notes body + transcription ── */
  const splitFinalNotes = (text) => {
    if (!text) return { body: '', transcription: '' };
    const idx = text.search(/## Full Transcription/i);
    if (idx === -1) return { body: text, transcription: '' };
    return {
      body: text.slice(0, idx).trim(),
      transcription: text.slice(idx).replace(/## Full Transcription[^\n]*\n?/i, '').trim(),
    };
  };

  const { body: notesBody, transcription: extractedTrans } = splitFinalNotes(finalNotes || notesContent);
  const displayTranscription = extractedTrans || transcription || notesContent || '';

  /* ── Check which AI sections exist in notes body ── */
  const hasSummarySection = notesBody && /^## Summary/m.test(notesBody);
  const hasKeyPointsSection = notesBody && /^## Key Points/m.test(notesBody);
  const hasActionItemsSection = notesBody && /^## Action Items/m.test(notesBody);
  const hasFollowUpSection = notesBody && /^## Track Follow Up/m.test(notesBody);

  /* ── Export functions ── */
  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Filter notes body: keep only sections matching enabled toggles ── */
  const filterNotesByToggles = useCallback((raw) => {
    if (!raw) return '';
    const sections = raw.split(/(?=^## )/m);
    const toggleMap = {
      '## Summary': includeSummary,
      '## Key Points': includeBullets,
      '## Action Items': includeActionItems,
      '## Track Follow Up': includeFollowUp,
    };
    return sections.filter(sec => {
      const header = sec.match(/^## [^\n]+/m);
      if (!header) return true;
      return toggleMap[header[0]] !== false;
    }).join('').trim();
  }, [includeSummary, includeBullets, includeActionItems, includeFollowUp]);

  /* ── Share notes via Web Share API (only enabled toggles) ── */
  const shareNotes = useCallback(() => {
    const filtered = filterNotesByToggles(notesBody);
    const text = filtered + '\n\n---\n\n## Full Transcription (Live Captured)\n\n' + (displayTranscription || '(No transcription)');
    if (navigator.share) {
      navigator.share({ title: `${title} - Meeting Notes`, text }).catch(() => { });
    } else {
      navigator.clipboard.writeText(text).catch(() => { });
    }
  }, [filterNotesByToggles, notesBody, displayTranscription, title]);

  const exportTxt = () => {
    const filtered = filterNotesByToggles(notesBody);
    const txt = (filtered || notesBody || 'No content') + '\n\n---\n\n## Full Transcription (Live Captured)\n\n' + (displayTranscription || '(No transcription)');
    downloadFile(txt, `${title.replace(/\s+/g, '_')}_Meeting_Notes.txt`, 'text/plain');
  };

  const exportJson = () => {
    const filtered = filterNotesByToggles(notesBody);
    const data = {
      title, date, participants,
      summary: includeSummary ? summary : undefined,
      bulletPoints: includeBullets ? bulletPoints : undefined,
      transcription: displayTranscription,
      aiNotesBody: filtered || notesBody,
      fullDocument: filterNotesByToggles(finalNotes || notesContent),
      recordingDuration: formatTime(timer),
      aiInsights,
    };
    downloadFile(JSON.stringify(data, null, 2), `${title.replace(/\s+/g, '_')}_Meeting_Notes.json`, 'application/json');
  };

  const exportCsv = () => {
    const rows = [['#', 'Action', 'Owner', 'Due Date', 'Status']];
    const items = (includeActionItems ? bulletPoints : []).slice(0, 20);
    items.forEach((item, i) => {
      rows.push([i + 1, item, 'TBD', 'TBD', 'Open']);
    });
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `${title.replace(/\s+/g, '_')}_Action_Items.csv`, 'text/csv');
  };

  const exportDocx = () => {
    const filtered = filterNotesByToggles(notesBody);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} - Meeting Notes</title></head><body>
      <h1>${title}</h1>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Attendees:</strong></p>
      <ul>${participants.map(p => `<li>${p.name}${p.email ? ` - ${p.email}` : ''}</li>`).join('')}</ul>
      <hr>
      <h2>AI Generated Meeting Notes</h2>
      <pre style="white-space:pre-wrap;font-family:monospace;font-size:12px">${(filtered || notesBody).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      <hr>
      <h2>Full Transcription</h2>
      <pre style="white-space:pre-wrap;font-family:monospace;font-size:12px">${displayTranscription.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </body></html>`;
    downloadFile(html, `${title.replace(/\s+/g, '_')}_Meeting_Notes.doc`, 'application/msword');
  };

  /* ── Finish Taking Notes (via Ziva AI, falls back to local) ── */
  const finishTakingNotes = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    if (recording) stopRecording();

    const text = notesContent || transcription;
    if (!text.trim()) { setProcessing(false); return; }

    try {
      const apiBase = window._zivaApiBase || '/api/ziva';
      const attendeeList = participants.map(p => `- ${p.name}`).join('\n');
      const question = `Generate comprehensive meeting notes from the following raw transcription. Format with these sections:

## Meeting Information
Title: ${title}
Date: ${date}
Attendees:
${attendeeList || '- (none)'}

${includeSummary ? '## Summary\n(Write a 2-3 paragraph summary of the key discussion points)\n' : ''}
${includeBullets ? '## Key Points\n(List the most important takeaways as bullet points)\n' : ''}
${includeActionItems ? `## Action Items
| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
(List action items as a table)
` : ''}
${includeFollowUp ? `## Track Follow Up
(Check if a follow-up meeting was discussed, when it is scheduled, and what topics remain open. If no follow-up is mentioned, state that clearly.)
` : ''}

## Agenda & Discussion
(Organize the discussion into logical topics with headings and bullet points under each)

## Full Transcription
(Include the raw transcript at the bottom for reference)

Raw transcription:
${text}`;
      const res = await fetch(`${apiBase}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          session: { assistantMode: 'learn' },
          messages: [],
          model: 'auto',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const answer = data.answer || data.content || '';
        if (answer) {
          saveProp('finalNotes', answer);
          if (includeSummary && !block.summary) {
            const words = text.split(/\s+/);
            saveProp('summary', words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : ''));
          }
          if (includeBullets) {
            const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
            saveProp('bulletPoints', sentences.slice(0, 10).map(s => s.trim()));
          }
          saveProp('aiInsights', [
            { icon: 'Lightbulb', text: `${text.split(/\s+/).length} words transcribed` },
            { icon: 'Clock', text: `Recording time: ${formatTime(timer)}` },
            { icon: 'Users', text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` },
          ]);
          setViewMode('final_notes');
          setProcessing(false);
          return;
        }
      }
    } catch { }
    processNotesLocally();
    setViewMode('final_notes');
    setProcessing(false);
  }, [notesContent, transcription, title, date, participants, includeSummary, includeBullets, includeActionItems, includeFollowUp, timer, saveProp, recording, stopRecording, processing, processNotesLocally]);

  /* ── Participants ── */
  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    saveProp('participants', [...participants, { id: Date.now().toString(), name: newParticipantName.trim(), email: newParticipantEmail.trim() }]);
    setNewParticipantName(''); setNewParticipantEmail('');
  };
  const removeParticipant = (id) => saveProp('participants', participants.filter(p => p.id !== id));

  /* ── Simple markdown → HTML renderer ── */
  const renderMd = useCallback((md) => {
    if (!md) return '';
    const es = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = es(md);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^---+\s*$/gm, '<hr>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    /* Tables */
    html = html.replace(/^\|(.+)\|$/gm, (m) => {
      const cells = m.slice(1, -1).split('|').map(c => c.trim());
      const isSep = cells.every(c => /^-+$/.test(c));
      if (isSep) return '<tr class="mt-tbl-sep">';
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    });
    html = html.replace(/((?:<tr[^>]*>.*?<\/tr>\s*)+)/g, '<table>$1</table>');
    html = html.replace(/<tr class="mt-tbl-sep"><\/tr>/g, '');

    /* Lists */
    html = html.replace(/^[-*•] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

    /* Line breaks */
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<br><\/p>/g, '</p>');
    html = html.replace(/<p><br>/g, '<p>');
    html = html.replace(/<\/?p>(?:\s*<(?:table|ul|ol|h[12]|hr|blockquote))/g, (m) => m.includes('</p>') ? m.replace('</p>', '') : m.replace('<p>', ''));
    html = html.replace(/(<\/(?:table|ul|ol|h[12]|hr|blockquote)>\s*)<\/?p>/g, '$1');
    return html;
  }, []);

  /* ── Auto-populate AI Insights when content is ready ── */
  useEffect(() => {
    const text = notesContent || transcription;
    if (text.trim() && !aiInsightsAutoRef.current && !aiInsights.length) {
      aiInsightsAutoRef.current = true;
      saveProp('aiInsights', [
        { icon: 'Lightbulb', text: `${text.split(/\s+/).length} words transcribed` },
        { icon: 'Clock', text: `Recording time: ${formatTime(timer)}` },
        { icon: 'Users', text: `${participants.length} participant${participants.length !== 1 ? 's' : ''}` },
      ]);
    }
  }, [notesContent, transcription, timer, participants.length, aiInsights.length, saveProp]);

  /* ── Load audio from block properties on mount ── */
  useEffect(() => {
    if (block.audioData && !audioUrl) {
      setAudioUrl(block.audioData);
      if (block.audioDuration) {
        setAudioDuration(block.audioDuration);
      }
    }
  }, [block.audioData, block.audioDuration]);

  /* ── Update audio duration when audio loads ── */
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      const handleLoadedMetadata = () => {
        if (audioRef.current) {
          setAudioDuration(audioRef.current.duration);
        }
      };

      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
      };
    }
  }, [audioUrl]);

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(playbackTimerRef.current);
    if (recognition) recognition.stop();
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
  }, [recognition]);

  /* ── Download menu auto-close: 5s timeout + click-outside ── */
  useEffect(() => {
    if (!showDownloadMenu) return;
    const timer = setTimeout(() => setShowDownloadMenu(false), 5000);
    const handleClickOutside = (e) => {
      if (downloadWrapRef.current && !downloadWrapRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

  /* ── Settings popover auto-close: click-outside ── */
  useEffect(() => {
    if (!showSettingsPopover) return;
    const handleClickOutside = (e) => {
      if (settingsWrapRef.current && !settingsWrapRef.current.contains(e.target)) {
        setShowSettingsPopover(false);
        setShowLanguageSubmenu(false);
        setShowInstructionsSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsPopover]);

  /* ── Bulb info auto-close: click-outside ── */
  useEffect(() => {
    if (!showBulbInfo) return;
    const handleClickOutside = (e) => {
      if (bulbWrapRef.current && !bulbWrapRef.current.contains(e.target)) {
        setShowBulbInfo(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBulbInfo]);

  /* ── Audio source menu auto-close: click-outside ── */
  useEffect(() => {
    if (!showAudioSourceMenu) return;
    var handleClickOutside = function (e) {
      if (audioSourceWrapRef.current && !audioSourceWrapRef.current.contains(e.target)) {
        setShowAudioSourceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return function () { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showAudioSourceMenu]);

  /* ── Output device menu auto-close: click-outside ── */
  useEffect(() => {
    if (!showOutputDeviceMenu) return;
    var handleClickOutside = function (e) {
      if (outputDeviceWrapRef.current && !outputDeviceWrapRef.current.contains(e.target)) {
        setShowOutputDeviceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return function () { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showOutputDeviceMenu]);

  /* ── Enumerate audio output devices (lazy: only when user opens dropdown) ── */
  function enumerateOutputDevices() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      return navigator.mediaDevices.enumerateDevices();
    }).then(function (devices) {
      var outputs = devices.filter(function (d) { return d.kind === 'audiooutput'; });
      if (outputs.length > 0) setAudioOutputDevices(outputs);
    })['catch'](function () { });
  }

  const LANGUAGES = [
    'English (US)', 'English (India)', 'English (UK)', 'Indian Languages',
    'Tamil', 'Hindi', 'Kannada', 'Telugu', 'Malayalam', 'Urdu',
    'Traditional Chinese', 'Simplified Chinese', 'German', 'Russian',
    'Dutch', 'Japanese', 'Spanish', 'French', 'Hebrew', 'Portuguese',
    'Indonesian', 'Vietnamese', 'Thai'
  ];

  const INSTRUCTION_PRESETS = ['Auto', 'Meeting', 'Candidate Interview', 'Customer Call', 'Stand-Up'];

  function renderCustomInstructions() {
    var items = [];
    for (var idx = 0; idx < customInstructions.length; idx++) {
      var ci = customInstructions[idx];
      items.push(renderCustomInstructionItem(ci, idx));
    }
    return items;
  }

  function handleAddCustomInstruction() {
    var name = prompt('Custom instruction name:');
    if (name) {
      setCustomInstructions(customInstructions.concat([name]));
      saveProp('selectedInstruction', name);
      setShowInstructionsSubmenu(false);
    }
  }

  function handleAudioFileChange(e) {
    var f = e.target.files && e.target.files[0];
    if (f) { handleAudioUpload(f); }
    e.target.value = '';
  }

  function renderCustomInstructionItem(ci, i) {
    var handleSelect = function () { saveProp('selectedInstruction', ci); setShowInstructionsSubmenu(false); };
    var handleEdit = function (e) { e.stopPropagation(); var name = prompt('Edit name:', ci); if (name) { var upd = customInstructions.slice(); upd[i] = name; setCustomInstructions(upd); if (selectedInstruction === ci) saveProp('selectedInstruction', name); } };
    var handleDelete = function (e) { e.stopPropagation(); var upd = customInstructions.filter(function (_, idx) { return idx !== i; }); setCustomInstructions(upd); if (selectedInstruction === ci) saveProp('selectedInstruction', 'Auto'); };
    return (
      <div key={i} className={'nnr-settings-subitem' + (selectedInstruction === ci ? ' active' : '')} onClick={handleSelect}>
        {ci}
        {selectedInstruction === ci && <Check size={12} />}
        <span className="nnr-settings-subitem-actions">
          <span className="nnr-icon-btn-sm" onClick={handleEdit}><Edit3 size={12} /></span>
          <span className="nnr-icon-btn-sm" onClick={handleDelete}><Trash2 size={12} /></span>
        </span>
      </div>
    );
  }

  const renderSettingsPopover = () => (
    <div className="nnr-settings-popover">
      {/* Upload Audio */}
      <div className="nnr-settings-item" onClick={() => { audioUploadRef.current?.click(); setShowSettingsPopover(false); }}>
        <Upload size={14} />
        <span>Upload Audio</span>
      </div>

      {/* Language submenu */}
      <div className="nnr-settings-item" onClick={() => setShowLanguageSubmenu(!showLanguageSubmenu)}>
        <Globe size={14} />
        <span>Language</span>
        <span className="nnr-settings-item-right">
          <span className="nnr-settings-selected">{selectedLanguage}</span>
          <ChevronDown size={12} />
        </span>
      </div>
      {showLanguageSubmenu && (
        <div className="nnr-settings-submenu">
          {LANGUAGES.map(lang => (
            <div key={lang} className={`nnr-settings-subitem${selectedLanguage === lang ? ' active' : ''}`} onClick={() => { saveProp('selectedLanguage', lang); setShowLanguageSubmenu(false); }}>
              {lang}
              {selectedLanguage === lang && <Check size={12} />}
            </div>
          ))}
        </div>
      )}

      {/* Instructions submenu */}
      <div className="nnr-settings-item" onClick={() => setShowInstructionsSubmenu(!showInstructionsSubmenu)}>
        <BookOpen size={14} />
        <span>Instructions</span>
        <span className="nnr-settings-item-right">
          <span className="nnr-settings-selected">{selectedInstruction}</span>
          <ChevronDown size={12} />
        </span>
      </div>
      {showInstructionsSubmenu && (
        <div className="nnr-settings-submenu">
          {INSTRUCTION_PRESETS.map(inst => (
            <div key={inst} className={`nnr-settings-subitem${selectedInstruction === inst ? ' active' : ''}`} onClick={() => { saveProp('selectedInstruction', inst); setShowInstructionsSubmenu(false); }}>
              {inst}
              {selectedInstruction === inst && <Check size={12} />}
              <span className="nnr-settings-subitem-actions">
                <Edit3 size={12} />
                <MoreHorizontal size={12} />
              </span>
            </div>
          ))}
          <div className="nnr-settings-subitem nnr-settings-subitem-add" onClick={handleAddCustomInstruction}>
            <Plus size={14} /> Add custom instruction
          </div>
          {renderCustomInstructions()}
        </div>
      )}

      {/* Consent section */}
      <div className="nnr-settings-item">
        <Volume2 size={14} />
        <span>Auto Play Consent</span>
        <span className="nnr-settings-item-right">
          <label className="nnr-toggle-switch">
            <input type="checkbox" checked={consentEnabled} onChange={e => saveProp('consentEnabled', e.target.checked)} />
            <span className="nnr-toggle-slider"></span>
          </label>
        </span>
      </div>
      <div className="nnr-settings-item nnr-settings-item-sub">
        <span>Play consent message</span>
      </div>
      <div className="nnr-settings-item nnr-settings-item-sub">
        <Info size={14} />
        <span>Learn more</span>
      </div>

      <div className="nnr-settings-divider" />

      {/* Copy link to block */}
      <div className="nnr-settings-item" onClick={() => { navigator.clipboard.writeText(window.location.href); setShowSettingsPopover(false); }}>
        <Link size={14} />
        <span>Copy link to block</span>
      </div>

      {/* Move to */}
      <div className="nnr-settings-item">
        <ArrowRight size={14} />
        <span>Move to</span>
      </div>

      {/* Delete */}
      <div className="nnr-settings-item">
        <Trash2 size={14} />
        <span>Delete</span>
      </div>

      <div className="nnr-settings-divider" />

      {/* Connect Calendar */}
      <div className="nnr-settings-item">
        <Calendar size={14} />
        <span>Connect Calendar</span>
      </div>

      {/* Demo Ziva AI Meeting Notes */}
      <div className="nnr-settings-item">
        <Video size={14} />
        <span>Demo Ziva AI Meeting Notes</span>
      </div>

      <div className="nnr-settings-divider" />

      {/* Give us Feedback */}
      <div className="nnr-settings-item">
        <MessageCircle size={14} />
        <span>Give us Feedback</span>
      </div>

      {/* Learn more */}
      <div className="nnr-settings-item">
        <HelpCircle size={14} />
        <span>Learn more</span>
      </div>
    </div>
  );

  return (
    <div className="block-content">
      <div className="mt-container">
        {/* ═══ Header ═══ */}
        <div className="mt-header">
          <div className="mt-header-left">
            <div className="mt-date-wrap" onClick={() => dateInputRef.current?.showPicker?.() || setShowDatePicker(true)} title="Change date">
              <Calendar size={14} />
              <span className="mt-date-text">{date}</span>
              <input ref={dateInputRef} type="date" value={date} onChange={e => saveProp('date', e.target.value)} className="mt-date-input" />
            </div>
            <input className="mt-title-input" type="text" value={title} onChange={e => saveProp('title', e.target.value)} placeholder="Meeting title" />
          </div>
          <div className="mt-header-right">
            <div className="mt-icon-btn mt-people-btn" onClick={() => setShowParticipantsPanel(!showParticipantsPanel)} title={`${participants.length} participant${participants.length !== 1 ? 's' : ''}`}>
              <Users size={14} />
              {participants.length > 0 && <span className="mt-badge">{participants.length}</span>}
              <span className="mt-add-people"><UserPlus size={10} /></span>
            </div>
            <div className="nnr-bulb-wrap" ref={bulbWrapRef}>
              <div className="mt-icon-btn" onClick={() => setShowBulbInfo(!showBulbInfo)} title="Info">
                <Lightbulb size={14} />
              </div>
              {showBulbInfo && (
                <div className="nnr-bulb-popover">
                  <div className="nnr-bulb-content">
                    <p>For complete summaries during video calls, use NotionNest app to capture microphone and system audio. Browser captures microphone only.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-icon-btn" onClick={() => setShowMoreMenu(!showMoreMenu)} title="More">
              <MoreHorizontal size={14} />
            </div>
            <div className="mt-icon-btn" title="Settings">
              <Settings size={14} />
            </div>
          </div>
        </div>

        {/* ═══ Participants Panel ═══ */}
        {showParticipantsPanel && (
          <div className="mt-participants-panel">
            {participants.map(p => (
              <div key={p.id} className="mt-participant-row">
                <div className="mt-avatar">{p.name.charAt(0).toUpperCase()}</div>
                <div className="mt-participant-detail">
                  <span className="mt-participant-name">{p.name}</span>
                  {p.email && <span className="mt-participant-email">{p.email}</span>}
                </div>
                <div className="mt-participant-remove" onClick={() => removeParticipant(p.id)}><X size={12} /></div>
              </div>
            ))}
            <div className="mt-participant-add-row">
              <input type="text" placeholder="Name" value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} className="mt-participant-input" />
              <input type="text" placeholder="Email" value={newParticipantEmail} onChange={e => setNewParticipantEmail(e.target.value)} className="mt-participant-input" />
              <button className="mt-participant-add-btn" onClick={addParticipant}><Plus size={14} /></button>
            </div>
          </div>
        )}

        {/* ═══ Notion.so-style Unified Recording UI ═══ */}
        <div className="nnr-unified">
          {/* ─── Tab Header ─── */}
          <div className="nnr-tab-header">
            <div
              className={`nnr-tab-btn${viewMode === 'transcript' ? ' active' : ''}`}
              onClick={() => setViewMode('transcript')}
            >
              <Mic size={14} /> Transcript
            </div>
            {(transcription || finalNotes || notesBody) && (
              <div
                className={`nnr-tab-btn${viewMode === 'final_notes' ? ' active' : ''}`}
                onClick={() => setViewMode('final_notes')}
              >
                <FileText size={14} /> Final Notes
              </div>
            )}
          </div>

          {/* ─── Transcript Tab ─── */}
          {viewMode === 'transcript' && (
            <div className="nnr-tab-content">
              {/* Single horizontal row: Auto/Manual | Animation/Audio | Controls */}
              <div className="nnr-transcript-row">
                {/* Left: Auto/Manual toggle (always visible) */}
                <div className="nnr-transcript-left">
                  <div className="nnr-mode-toggle">
                    <span
                      className={`nnr-mode-option${mode === 'auto' ? ' active' : ''}`}
                      onClick={() => saveProp('mode', 'auto')}
                    >
                      Auto
                    </span>
                    <span
                      className={`nnr-mode-option${mode === 'manual' ? ' active' : ''}`}
                      onClick={() => saveProp('mode', 'manual')}
                    >
                      Manual
                    </span>
                    {mode === 'manual' && (
                      <div
                        className="nnr-add-manual-compact"
                        onClick={addManualLine}
                        title="Add Manual Transcript"
                      >
                        <Plus size={14} />
                        <span className="nnr-add-manual-label">Add Manual Transcript</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center: Waveform (recording) OR Audio playback (stopped) */}
                <div className="nnr-transcript-center">
                  {/* During recording: waveform animation */}
                  {recording && (
                    <div className="nnr-waveform">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div
                          key={i}
                          className={`nnr-wave-dot${i % 5 === 0 ? ' nnr-wave-bar-el' : ''}`}
                          style={{ animationDelay: `${i * 0.06}s` }}
                        />
                      ))}
                    </div>
                  )}

                  {/* After recording: audio playback controls */}
                  {!recording && transcription && (audioUrl || block.audioData) && (
                    <div className="nnr-audio-controls">
                      <audio
                        ref={audioRef}
                        src={audioUrl || block.audioData}
                        preload="auto"
                        onLoadedMetadata={() => {
                          if (audioRef.current) {
                            setAudioDuration(audioRef.current.duration);
                          }
                        }}
                      />
                      <button className="nnr-play-btn-sm" onClick={isPlaying ? pauseAudio : playAudio}>
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                      <span className="nnr-audio-time">
                        {formatTime(Math.floor(currentPlaybackTime))} / {formatTime(audioDuration || block.audioDuration || timer)}
                      </span>
                    </div>
                  )}

                  {/* Idle state text relocated to transcript content area (T2) */}
                </div>

                {/* Right: Sliders + Icons (always) / Start or Pause+Stop */}
                <div className="nnr-transcript-right">
                  {/* Sliders */}
                  <div className="nnr-settings-wrap" ref={settingsWrapRef}>
                    <div className="nnr-icon-btn" title="Recording settings" onClick={() => setShowSettingsPopover(!showSettingsPopover)}>
                      <Sliders size={14} />
                    </div>
                    {showSettingsPopover && renderSettingsPopover()}
                  </div>

                  {/* Delete icon - only when transcript content exists */}
                  {(transcription || transcriptLines.length > 0 || notesContent) && (
                    <div className="nnr-icon-btn" title="Clear all" onClick={() => setShowConfirmClear(true)}>
                      <Trash2 size={14} />
                    </div>
                  )}

                  {/* Copy icon */}
                  <div className="nnr-icon-btn" title="Copy transcript" onClick={() => copyText(displayTranscription)}>
                    <Copy size={14} />
                  </div>

                  {/* Read aloud toggle */}
                  <div className={'nnr-icon-btn' + (isReadingAloud ? ' nnr-icon-btn-active' : '')} title={isReadingAloud ? 'Stop reading aloud' : 'Read aloud'} onClick={() => readAloud(displayTranscription)}>
                    {isReadingAloud ? <MegaphoneOff size={14} /> : <Megaphone size={14} />}
                  </div>

                  {/* Speaker output device selector */}
                  <div className="nnr-output-device-wrap" ref={outputDeviceWrapRef}>
                    <div className="nnr-icon-btn" title="Select playback speaker" onClick={() => { if (!showOutputDeviceMenu) enumerateOutputDevices(); setShowOutputDeviceMenu(!showOutputDeviceMenu); }}>
                      <Speaker size={14} />
                    </div>
                    {showOutputDeviceMenu && (
                      <div className="nnr-output-device-menu">
                        {audioOutputDevices.length === 0 && (
                          <div className="nnr-output-device-item">Default</div>
                        )}
                        {audioOutputDevices.map((device) => (
                          <div key={device.deviceId} className={'nnr-output-device-item' + (selectedOutputDevice === device.deviceId ? ' active' : '')} onClick={() => { saveProp('selectedOutputDevice', device.deviceId); setShowOutputDeviceMenu(false); }}>
                            {device.label || 'Speaker ' + (audioOutputDevices.indexOf(device) + 1)}
                            {selectedOutputDevice === device.deviceId && <Check size={12} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="nnr-icons-divider" />

                  {/* Mic source selection (locked to All Sources in Meeting mode) */}
                  <div className="nnr-audio-source-wrap" ref={audioSourceWrapRef}>
                    <div className="nnr-icon-btn" title={'Audio source: ' + audioSource + (selectedInstruction === 'Meeting' ? ' (locked for Meeting)' : '')} onClick={() => { if (selectedInstruction !== 'Meeting') setShowAudioSourceMenu(!showAudioSourceMenu); }}>
                      <Mic size={14} />
                    </div>
                    {selectedInstruction !== 'Meeting' && showAudioSourceMenu && (
                      <div className="nnr-audio-source-menu">
                        <div className={'nnr-audio-source-item' + (audioSource === 'mic' ? ' active' : '')} onClick={() => { saveProp('audioSource', 'mic'); setShowAudioSourceMenu(false); }}>
                          <Mic size={12} /> Mic {audioSource === 'mic' && <Check size={12} />}
                        </div>
                        <div className={'nnr-audio-source-item' + (audioSource === 'system' ? ' active' : '')} onClick={() => { saveProp('audioSource', 'system'); setShowAudioSourceMenu(false); }}>
                          <Volume2 size={12} /> System Audio {audioSource === 'system' && <Check size={12} />}
                        </div>
                        <div className={'nnr-audio-source-item' + (audioSource === 'both' ? ' active' : '')} onClick={() => { saveProp('audioSource', 'both'); setShowAudioSourceMenu(false); }}>
                          <Mic size={12} /><Volume2 size={12} /> All Sources {audioSource === 'both' && <Check size={12} />}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="nnr-icons-divider" />

                  {/* Start transcribing or Pause/Stop */}
                  {!recording ? (
                    <div
                      className={`nnr-icon-btn nnr-start-record-btn${mode === 'manual' ? ' nnr-start-pill-disabled' : ''}`}
                      title="Start transcribing"
                      onClick={mode === 'manual' ? null : startRecording}
                    >
                      <AudioLines size={16} />
                    </div>
                  ) : (
                    <>
                      <span className="nnr-action-text" onClick={toggleRecording}>
                        {isPaused ? 'Resume' : 'Pause'}
                      </span>
                      <span className="nnr-action-text nnr-stop" onClick={stopRecording}>
                        Stop
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Transcript content area (below the controls row) — always rendered */}
              <div className="nnr-transcript-content">
                {/* Idle placeholder: shown only when no content exists */}
                {!recording && transcriptLines.length === 0 && !displayTranscription && !notesContent && (
                  <div className="nnr-transcript-text nnr-transcript-empty">
                    <span className="nnr-idle-text">Click <AudioLines size={14} style={{ color: '#2383e2', display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }} /> to begin</span>
                  </div>
                )}
                {transcriptLines && transcriptLines.length > 0 ? (
                  <div className="nnr-transcript-text">
                    {transcriptLines.map(function (line, idx) {
                      var isManualSource = line.source && (line.source.indexOf('Manual') !== -1);
                      var canEdit = mode === 'manual' && isManualSource;
                      var lineNum = String(idx + 1).padStart(3, '0');
                      var cssClass = 'nnr-line-content';
                      if (canEdit) cssClass = cssClass;
                      else cssClass = cssClass + ' nnr-line-content-greyed';
                      return (
                        <div key={line.id} className="nnr-transcript-line">
                          <span className="nnr-line-number">{lineNum}</span>
                          <span className="nnr-line-meta">{line.timestamp} | {line.source} | </span>
                          <span
                            className={cssClass}
                            contentEditable={canEdit}
                            suppressContentEditableWarning={true}
                            onBlur={function (e) { var txt = e.currentTarget.textContent; updateManualLine(line.id, txt); setEditingLineId(null); }}
                            onFocus={function () { setEditingLineId(line.id); }}
                          >{line.content}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="nnr-transcript-text">
                    {displayTranscription || notesContent}
                  </div>
                )}
                {interimText && <div className="nnr-transcript-interim-wrap"><span className="nnr-interim">{interimText}<span className="nnr-interim-cursor">|</span></span></div>}
              </div>

              {/* Clear confirmation modal (reused pattern) */}
              {showConfirmClear && (
                <div className="confirm-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="confirm-modal">
                    <h3>Clear all transcript?</h3>
                    <p>This will delete all recorded lines and transcription. This action cannot be undone.</p>
                    <div className="confirm-modal-actions">
                      <button className="confirm-btn-cancel" onClick={() => setShowConfirmClear(false)}>
                        Cancel
                      </button>
                      <button className="confirm-btn-delete" onClick={clearAllLines}>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden audio file input for Upload Audio */}
              <input type="file" ref={audioUploadRef} accept="audio/*" style={{ display: 'none' }} onChange={handleAudioFileChange} />

              {/* Consent card (only shown when not in Manual mode after stop) */}
              {transcription && !recording && mode !== 'manual' && (
                <div className="nnr-consent-card">
                  <div className="nnr-consent-title">Choose how you notify others</div>
                  <div className="nnr-consent-buttons">
                    <button className="nnr-consent-btn" onClick={() => saveProp('consentMode', 'manual')}>
                      <UserPlus size={12} /> Get consent myself
                    </button>
                    <button className="nnr-consent-btn" onClick={() => saveProp('consentMode', 'auto')}>
                      <Volume2 size={12} /> Automatically play audio
                    </button>
                  </div>
                  {block.consentMode && (
                    <div className="nnr-consent-status">
                      Consent mode: {block.consentMode === 'manual' ? 'Manual consent required' : 'Automatic audio playback'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── Final Notes Tab ─── */}
          {viewMode === 'final_notes' && (
            <div className="nnr-tab-content">
              {/* Processing state with progress bar */}
              {processing && (
                <div className="nnr-processing-state">
                  <div className="nnr-progress-bar">
                    <div className="nnr-progress-fill"></div>
                  </div>
                  <p className="nnr-processing-text">Generating meeting notes with Ziva AI...</p>
                </div>
              )}

              {/* Final notes content */}
              {!processing && (finalNotes || notesBody) && (
                <div className="nnr-final-notes-content">
                  {/* Header row: Toggle buttons (left) + Download dropdown (right) */}
                  <div className="nnr-final-header-row">
                    <div className="nnr-toggle-group">
                      {hasSummarySection && (
                        <label className={`nnr-toggle-chip${includeSummary ? ' active' : ''}`} onClick={() => saveProp('includeSummary', !includeSummary)}>Summary</label>
                      )}
                      {hasKeyPointsSection && (
                        <label className={`nnr-toggle-chip${includeBullets ? ' active' : ''}`} onClick={() => saveProp('includeBullets', !includeBullets)}>Key Points</label>
                      )}
                      {hasActionItemsSection && (
                        <label className={`nnr-toggle-chip${includeActionItems ? ' active' : ''}`} onClick={() => saveProp('includeActionItems', !includeActionItems)}>Actions</label>
                      )}
                      {hasFollowUpSection && (
                        <label className={`nnr-toggle-chip${includeFollowUp ? ' active' : ''}`} onClick={() => saveProp('includeFollowUp', !includeFollowUp)}>Follow Up</label>
                      )}
                    </div>

                    {/* Download icon with pop-over */}
                    <div className="nnr-download-wrap" ref={downloadWrapRef}>
                      <button className="nnr-download-icon-btn" onClick={() => setShowDownloadMenu(!showDownloadMenu)} title="Download">
                        <Download size={16} />
                      </button>
                      {showDownloadMenu && (
                        <div className="nnr-download-dropdown">
                          <div className="nnr-download-item" onClick={() => { exportTxt(); setShowDownloadMenu(false); }}>TXT</div>
                          <div className="nnr-download-item" onClick={() => { exportDocx(); setShowDownloadMenu(false); }}>DOCX</div>
                          <div className="nnr-download-item" onClick={() => { exportCsv(); setShowDownloadMenu(false); }}>CSV</div>
                          <div className="nnr-download-item" onClick={() => { exportJson(); setShowDownloadMenu(false); }}>JSON</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Insights */}
                  {aiInsights.length > 0 && (
                    <div className="nnr-insights-section">
                      <h4>AI Insights</h4>
                      <div className="mt-insights-row">
                        {aiInsights.map((ins, i) => (
                          <div key={i} className="mt-insight-card">
                            {ins.icon === 'Lightbulb' && <Lightbulb size={14} />}
                            {ins.icon === 'Clock' && <Clock size={14} />}
                            {ins.icon === 'Users' && <Users size={14} />}
                            <span>{ins.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated notes */}
                  <div className="nnr-generated-notes">
                    <div className="mt-rich-text" dangerouslySetInnerHTML={{ __html: renderMd(notesBody || finalNotes) }} />
                  </div>

                  {/* Transcript section — references same content as Transcript tab */}
                  {(displayTranscription || transcriptLines.length > 0) && (
                    <div className="nnr-final-transcript-section">
                      <h4>Transcript</h4>
                      <div className="nnr-final-meta-row">
                        <span className="nnr-final-meta-item">Date: {date}</span>
                        <span className="nnr-final-meta-item">Duration: {formatTime(timer)}</span>
                        <span className="nnr-final-meta-item">Source: {mode === 'auto' ? 'Auto Recording' : 'Manual Entry'}</span>
                      </div>
                      <div className="nnr-final-transcript-body">
                        {transcriptLines.length > 0 ? transcriptLines.map(function (line, idx) {
                          var lineNum = String(idx + 1).padStart(3, '0');
                          return <div key={line.id} className="nnr-transcript-line"><span className="nnr-line-number">{lineNum}</span><span className="nnr-line-meta">{line.timestamp} | {line.source} | </span><span className="nnr-line-content">{line.content}</span></div>;
                        }) : (displayTranscription)}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="nnr-final-actions">
                    <button className="nnr-act-btn" onClick={() => copyText(finalNotes || notesBody)} title="Copy">
                      <Copy size={14} /> Copy
                    </button>
                    <button className={'nnr-act-btn' + (isReadingAloud ? ' nnr-act-btn-active' : '')} onClick={() => readAloud(finalNotes || notesBody)} title={isReadingAloud ? 'Stop reading aloud' : 'Read aloud'}>
                      {isReadingAloud ? <MegaphoneOff size={14} /> : <Megaphone size={14} />} {isReadingAloud ? 'Stop' : 'Read aloud'}
                    </button>
                    <button className="nnr-act-btn" onClick={shareNotes} title="Share">
                      <Share2 size={14} /> Share
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!processing && !finalNotes && !notesBody && (
                <div className="nnr-empty-state">
                  <p>Final notes will be generated after recording stops.</p>
                  <button className="nnr-generate-btn" onClick={finishTakingNotes} disabled={processing}>
                    {processing ? 'Generating...' : <><Check size={13} /> Generate Final Notes</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ More Menu ═══ */}
        {showMoreMenu && (
          <div className="mt-more-menu">
            <div className="mt-more-item" onClick={() => { copyText(notesContent); setShowMoreMenu(false); }}><Copy size={12} /> Copy notes</div>
            <div className="mt-more-item" onClick={() => { readAloud(notesContent); setShowMoreMenu(false); }}><Volume2 size={12} /> Read aloud</div>
            <div className="mt-more-item" onClick={() => { generateSummary(); setShowMoreMenu(false); }}><MessageSquare size={12} /> Generate summary</div>
            <div className="mt-more-item" onClick={() => { saveProp('includeSummary', !includeSummary); setShowMoreMenu(false); }}><List size={12} /> {includeSummary ? 'Hide' : 'Show'} summary</div>
            <div className="mt-more-item" onClick={() => { saveProp('includeBullets', !includeBullets); setShowMoreMenu(false); }}><List size={12} /> {includeBullets ? 'Hide' : 'Show'} bullets</div>
            <div className="mt-more-item" onClick={() => { saveProp('mode', mode === 'auto' ? 'manual' : 'auto'); setShowMoreMenu(false); }}><Mic size={12} /> Switch to {mode === 'auto' ? 'manual' : 'auto'}</div>
            <div className="mt-more-item" onClick={() => { setViewMode('transcript'); setShowMoreMenu(false); }}><FileText size={12} /> View transcript</div>
          </div>
        )}
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────
   Button Block — Full Notion-style action button
   ───────────────────────────────────────────── */
const ACTION_DEFS = {
  insertBlock: { label: 'Insert block', icon: 'Plus', color: '#2383e2' },
  openUrl: { label: 'Open URL', icon: 'ExternalLink', color: '#0f7b6c' },
  showConfirmation: { label: 'Show confirmation', icon: 'AlertTriangle', color: '#d9730d' },
  openPage: { label: 'Open page', icon: 'FileText', color: '#9065b0' },
  sendNotification: { label: 'Send notification', icon: 'Bell', color: '#eb5757' },
  addToDatabase: { label: 'Add pages to', icon: 'Database', color: '#2383e2' },
  editDatabase: { label: 'Edit pages in', icon: 'Edit3', color: '#dfab01' },
  form: { label: 'Form', icon: 'Variable', color: '#c14c8a' },
  defineVariables: { label: 'Define variables', icon: 'Variable', color: '#706e6b' },
};

function genId() { return Math.random().toString(36).slice(2, 10); }

function defaultActionConfig(type) {
  const cfgs = {
    insertBlock: { blockType: 'paragraph', content: '' },
    openUrl: { url: '', newTab: true },
    showConfirmation: { title: 'Are you sure?', confirmText: 'Continue', cancelText: 'Cancel' },
    openPage: { pageId: '', pageTitle: '' },
    sendNotification: { title: '', message: '', type: 'info' },
    addToDatabase: { databaseId: '', databaseName: '', values: [] },
    editDatabase: { databaseId: '', databaseName: '', filter: '', updates: [] },
    form: { fields: [], submitLabel: 'Submit' },
    defineVariables: { variables: [] },
  };
  return cfgs[type] || {};
}

function createAction(type) {
  return { id: genId(), type, enabled: true, label: ACTION_DEFS[type]?.label || type, config: defaultActionConfig(type) };
}

/* ── Action config editor sub-components ── */
function ActionConfigInsertBlock({ config, onChange, blockTypes }) {
  return (
    <div className="btn-act-config">
      <label>Block type</label>
      <select value={config.blockType || 'paragraph'} onChange={e => onChange({ ...config, blockType: e.target.value })}>
        {blockTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <label>Initial content</label>
      <input type="text" value={config.content || ''} onChange={e => onChange({ ...config, content: e.target.value })} placeholder="Optional" />
    </div>
  );
}

function ActionConfigOpenUrl({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>URL</label>
      <input type="text" value={config.url || ''} onChange={e => onChange({ ...config, url: e.target.value })} placeholder="https://..." />
      <label className="btn-act-row">
        <input type="checkbox" checked={config.newTab !== false} onChange={e => onChange({ ...config, newTab: e.target.checked })} />
        Open in new tab
      </label>
    </div>
  );
}

function ActionConfigConfirmation({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>Title</label>
      <input type="text" value={config.title || ''} onChange={e => onChange({ ...config, title: e.target.value })} />
      <label>Confirm button</label>
      <input type="text" value={config.confirmText || 'Continue'} onChange={e => onChange({ ...config, confirmText: e.target.value })} />
      <label>Cancel button</label>
      <input type="text" value={config.cancelText || 'Cancel'} onChange={e => onChange({ ...config, cancelText: e.target.value })} />
    </div>
  );
}

function ActionConfigOpenPage({ config, onChange, notionPages }) {
  const [search, setSearch] = useState('');
  const filtered = notionPages.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="btn-act-config">
      <label>Search page</label>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to search..." />
      {config.pageTitle && <div className="btn-act-selected">Selected: {config.pageTitle}</div>}
      {search && <div className="btn-act-page-list">
        {filtered.slice(0, 10).map(p => (
          <div key={p.id} className="btn-act-page-item" onClick={() => onChange({ pageId: p.id, pageTitle: p.title })}>
            {p.title || 'Untitled'}
          </div>
        ))}
        {filtered.length === 0 && <div className="btn-act-empty">No pages found</div>}
      </div>}
    </div>
  );
}

function ActionConfigNotification({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>Title</label>
      <input type="text" value={config.title || ''} onChange={e => onChange({ ...config, title: e.target.value })} />
      <label>Message</label>
      <input type="text" value={config.message || ''} onChange={e => onChange({ ...config, message: e.target.value })} />
      <label>Type</label>
      <select value={config.type || 'info'} onChange={e => onChange({ ...config, type: e.target.value })}>
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
      </select>
    </div>
  );
}

function ActionConfigDatabase({ config, onChange, label }) {
  return (
    <div className="btn-act-config">
      <label>Database</label>
      <input type="text" value={config.databaseName || ''} onChange={e => onChange({ ...config, databaseName: e.target.value, databaseId: e.target.value })} placeholder="Database name or ID" />
      <p className="btn-act-hint">Enter the database name or ID. Database integration coming soon.</p>
    </div>
  );
}

function ActionConfigForm({ config, onChange }) {
  const addField = () => {
    const fields = [...(config.fields || []), { id: genId(), label: '', type: 'text', required: false }];
    onChange({ ...config, fields });
  };
  const updField = (idx, updates) => {
    const fields = [...(config.fields || [])];
    fields[idx] = { ...fields[idx], ...updates };
    onChange({ ...config, fields });
  };
  const delField = (idx) => {
    const fields = (config.fields || []).filter((_, i) => i !== idx);
    onChange({ ...config, fields });
  };
  return (
    <div className="btn-act-config">
      <label>Submit label</label>
      <input type="text" value={config.submitLabel || 'Submit'} onChange={e => onChange({ ...config, submitLabel: e.target.value })} />
      <label>Fields</label>
      {(config.fields || []).map((f, i) => (
        <div key={f.id} className="btn-act-field-row">
          <input type="text" value={f.label} onChange={e => updField(i, { label: e.target.value })} placeholder="Field label" />
          <select value={f.type} onChange={e => updField(i, { type: e.target.value })}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="email">Email</option>
            <option value="textarea">Textarea</option>
            <option value="select">Select</option>
          </select>
          <label className="btn-act-chk"><input type="checkbox" checked={f.required} onChange={e => updField(i, { required: e.target.checked })} />Req</label>
          <div className="btn-act-field-del" onClick={() => delField(i)}><Trash2 size={12} /></div>
        </div>
      ))}
      <div className="btn-act-add-field" onClick={addField}><Plus size={12} /> Add field</div>
    </div>
  );
}

function ActionConfigVariables({ config, onChange }) {
  const addVar = () => {
    const variables = [...(config.variables || []), { id: genId(), name: '', value: '' }];
    onChange({ ...config, variables });
  };
  const updVar = (idx, updates) => {
    const variables = [...(config.variables || [])];
    variables[idx] = { ...variables[idx], ...updates };
    onChange({ ...config, variables });
  };
  const delVar = (idx) => {
    const variables = (config.variables || []).filter((_, i) => i !== idx);
    onChange({ ...config, variables });
  };
  return (
    <div className="btn-act-config">
      {(config.variables || []).map((v, i) => (
        <div key={v.id} className="btn-act-field-row">
          <input type="text" value={v.name} onChange={e => updVar(i, { name: e.target.value })} placeholder="Variable name" />
          <input type="text" value={v.value} onChange={e => updVar(i, { value: e.target.value })} placeholder="Value" />
          <div className="btn-act-field-del" onClick={() => delVar(i)}><Trash2 size={12} /></div>
        </div>
      ))}
      <div className="btn-act-add-field" onClick={addVar}><Plus size={12} /> Add variable</div>
    </div>
  );
}

function ActionConfigEditor({ action, onChange, onDelete, notionPages, blockTypes }) {
  const [open, setOpen] = useState(false);
  const cfg = action.config || {};
  const def = ACTION_DEFS[action.type];

  const renderConfig = () => {
    const props = { config: cfg, onChange: (c) => onChange({ ...action, config: c }), notionPages, blockTypes, label: def?.label || '' };
    switch (action.type) {
      case 'insertBlock': return <ActionConfigInsertBlock {...props} />;
      case 'openUrl': return <ActionConfigOpenUrl {...props} />;
      case 'showConfirmation': return <ActionConfigConfirmation {...props} />;
      case 'openPage': return <ActionConfigOpenPage {...props} />;
      case 'sendNotification': return <ActionConfigNotification {...props} />;
      case 'addToDatabase': return <ActionConfigDatabase {...props} />;
      case 'editDatabase': return <ActionConfigDatabase {...props} />;
      case 'form': return <ActionConfigForm {...props} />;
      case 'defineVariables': return <ActionConfigVariables {...props} />;
      default: return null;
    }
  };

  return (
    <div className={`btn-act-item${open ? ' btn-act-open' : ''}`}>
      <div className="btn-act-header" onClick={() => setOpen(!open)}>
        <GripVertical size={14} className="btn-act-grip" />
        <span className={`btn-act-dot`} style={{ background: def?.color || '#999' }} />
        <span className="btn-act-type">{action.label || def?.label}</span>
        <label className="btn-act-toggle" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={action.enabled !== false} onChange={e => onChange({ ...action, enabled: e.target.checked })} />
        </label>
        <div className="btn-act-del" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={13} /></div>
        <ChevronDown size={14} className={`btn-act-chevron${open ? ' rotated' : ''}`} />
      </div>
      {open && renderConfig()}
    </div>
  );
}

/* ── Action execution engine ── */
function executeActions(actions, ctx) {
  const { block, addBlock, updateBlockProperty, setDeleteConfirm } = ctx;
  const run = async (index) => {
    if (index >= actions.length) return;
    const action = actions[index];
    if (!action.enabled) { run(index + 1); return; }
    const cfg = action.config || {};
    try {
      switch (action.type) {
        case 'insertBlock': {
          addBlock(cfg.blockType || 'paragraph', block.id, cfg.content || '');
          run(index + 1);
          break;
        }
        case 'openUrl': {
          if (cfg.url) window.open(cfg.url, cfg.newTab !== false ? '_blank' : '_self', 'noopener');
          run(index + 1);
          break;
        }
        case 'showConfirmation': {
          setDeleteConfirm({
            type: 'action',
            blockId: block.id,
            title: cfg.title || 'Are you sure?',
            message: '',
            cancelText: cfg.cancelText || 'Cancel',
            confirmText: cfg.confirmText || 'Continue',
            onConfirm: () => { setDeleteConfirm(null); run(index + 1); },
            onCancel: () => setDeleteConfirm(null)
          });
          break;
        }
        case 'openPage': {
          if (cfg.pageId) {
            const navigate = ctx.navigateRef?.current;
            if (navigate) navigate(`/notion/${cfg.pageId}`);
          }
          run(index + 1);
          break;
        }
        case 'sendNotification': {
          if (cfg.message) {
            const notify = ctx.notifyRef?.current;
            if (notify) notify(cfg.message, cfg.type || 'info', cfg.title);
          }
          run(index + 1);
          break;
        }
        case 'addToDatabase':
        case 'editDatabase': {
          // Placeholder - will be integrated with database system
          run(index + 1);
          break;
        }
        case 'form': {
          // For now, just proceed
          run(index + 1);
          break;
        }
        case 'defineVariables': {
          const variables = cfg.variables || [];
          if (variables.length > 0 && ctx.setVariablesRef?.current) {
            ctx.setVariablesRef.current(variables);
          }
          run(index + 1);
          break;
        }
        default: run(index + 1);
      }
    } catch {
      run(index + 1);
    }
  };
  run(0);
}

export const ButtonBlock = memo(function ButtonBlock({ block }) {
  const { updateBlockProperty, showContextMenu, addBlock, insertBlocks, setDeleteConfirm } = usePageContext();
  const [editing, setEditing] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [tab, setTab] = useState('setup'); // 'setup' | 'actions'
  const textRef = useRef(null);
  const iconBtnRef = useRef(null);
  const [iconPickerPos, setIconPickerPos] = useState({ x: 0, y: 0 });

  const label = block.content || 'Button';
  const buttonIcon = block.buttonIcon || '';
  const buttonStyle = block.buttonStyle || 'primary';
  const actions = block.actions || [];

  const saveProp = useCallback((key, val) => updateBlockProperty(block.id, key, val), [block.id, updateBlockProperty]);
  const setIcon = useCallback((icon) => { saveProp('buttonIcon', icon); setIconPickerOpen(false); }, [saveProp]);
  const setStyle = useCallback((s) => { saveProp('buttonStyle', s); setStylePickerOpen(false); }, [saveProp]);
  const setActions = useCallback((acts) => saveProp('actions', acts), [saveProp]);

  const handleLabelInput = () => {
    const val = textRef.current?.textContent?.trim();
    if (val) saveProp('content', val);
  };

  const handleClick = (e) => {
    if (editing) return;
    if (actions.length === 0) {
      setEditing(true);
      return;
    }
    const navigateRef = { current: (path) => { /* navigation will be provided */ } };
    executeActions(actions, {
      block, addBlock, updateBlockProperty, setDeleteConfirm,
      navigateRef, notifyRef: { current: null }, setVariablesRef: { current: null }
    });
  };

  const STYLES = ['primary', 'secondary', 'outline', 'text'];
  const NOTION_PAGES = [];
  const BLOCK_TYPES = ['paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'todo', 'bulleted_list', 'numbered_list', 'toggle', 'callout', 'quote', 'code', 'divider', 'image', 'video', 'file', 'bookmark', 'equation'];

  /* ── Editing panel ── */
  if (editing) {
    const STYLE_LABELS = { primary: 'Primary (default)', secondary: 'Secondary', outline: 'Outline', text: 'Text' };
    const actionTypes = Object.keys(ACTION_DEFS);

    const addAction = (type) => {
      setActions([...actions, createAction(type)]);
    };

    const updAction = (idx, upd) => {
      const copy = [...actions];
      copy[idx] = upd;
      setActions(copy);
    };

    const delAction = (idx) => {
      setActions(actions.filter((_, i) => i !== idx));
    };

    const moveAction = (idx, dir) => {
      const copy = [...actions];
      const target = idx + dir;
      if (target < 0 || target >= copy.length) return;
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      setActions(copy);
    };

    return (
      <div className="block-content">
        <div className="btn-edit-panel">
          <div className="btn-edit-header">
            <span className="btn-edit-title">Button configuration</span>
            <div className="btn-edit-close" onClick={() => setEditing(false)}><X size={16} /></div>
          </div>

          {/* ── Tab bar ── */}
          <div className="btn-edit-tabs">
            <div className={`btn-edit-tab${tab === 'setup' ? ' active' : ''}`} onClick={() => setTab('setup')}>Setup</div>
            <div className={`btn-edit-tab${tab === 'actions' ? ' active' : ''}`} onClick={() => setTab('actions')}>Actions ({actions.length})</div>
          </div>

          {/* ── Setup tab ── */}
          {tab === 'setup' && <div className="btn-edit-setup">
            {/* Button preview */}
            <div className="btn-edit-section">
              <div className="btn-edit-section-title">Preview</div>
              <button className={`block-button block-button-${buttonStyle}`} style={{ pointerEvents: 'none' }}>
                {buttonIcon && <span className="btn-label-icon">{renderPageIcon(buttonIcon, '16px')}</span>}
                <span className="block-button-text">{label || 'Button'}</span>
              </button>
            </div>

            {/* Icon */}
            <div className="btn-edit-section">
              <div className="btn-edit-section-title">Icon</div>
              <div className="btn-edit-icon-row">
                <div ref={iconBtnRef} className="btn-edit-icon-btn" onClick={() => {
                  if (iconBtnRef.current) {
                    const r = iconBtnRef.current.getBoundingClientRect();
                    setIconPickerPos({ x: r.left, y: r.bottom + 4 });
                  }
                  setIconPickerOpen(true);
                }}>
                  {buttonIcon ? renderPageIcon(buttonIcon, '18px') : <Plus size={16} />}
                </div>
                {buttonIcon && <div className="btn-edit-icon-remove" onClick={() => setIcon('')}><X size={12} /></div>}
              </div>
              {iconPickerOpen && (
                <NotionIconPicker
                  position={iconPickerPos}
                  currentIcon={buttonIcon || ''}
                  onSelect={setIcon}
                  onClose={() => setIconPickerOpen(false)}
                />
              )}
            </div>

            {/* Label */}
            <div className="btn-edit-section">
              <div className="btn-edit-section-title">Label</div>
              <input className="btn-edit-input" type="text" defaultValue={label} onChange={e => saveProp('content', e.target.value)} placeholder="Button" />
            </div>

            {/* Style */}
            <div className="btn-edit-section">
              <div className="btn-edit-section-title">Style</div>
              <div className="btn-edit-style-row">
                {STYLES.map(s => (
                  <div key={s} className={`btn-edit-style-opt${buttonStyle === s ? ' active' : ''}`} onClick={() => setStyle(s)}>
                    <div className={`btn-edit-style-sample block-button-${s}`}>Aa</div>
                    <span>{STYLE_LABELS[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>}

          {/* ── Actions tab ── */}
          {tab === 'actions' && <div className="btn-edit-actions">
            <div className="btn-edit-section-title">When button is clicked, do:</div>
            {actions.length === 0 && <div className="btn-act-empty-state">No actions yet. Add an action below.</div>}
            {actions.map((act, i) => (
              <ActionConfigEditor
                key={act.id}
                action={act}
                onChange={(upd) => updAction(i, upd)}
                onDelete={() => delAction(i)}
                notionPages={NOTION_PAGES}
                blockTypes={BLOCK_TYPES}
              />
            ))}
            <div className="btn-act-add-menu">
              <div className="btn-act-add-trigger" onClick={() => {
                // Show action type dropdown
                const firstType = actionTypes[0];
                if (firstType) addAction(firstType);
              }}><Plus size={14} /> Add action</div>
              <div className="btn-act-type-list">
                {actionTypes.map(type => {
                  const def = ACTION_DEFS[type];
                  return (
                    <div key={type} className="btn-act-type-item" onClick={() => addAction(type)}>
                      <span className="btn-act-dot" style={{ background: def.color }} />
                      <span>{def.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>}
        </div>
      </div>
    );
  }

  /* ── View mode ── */
  return (
    <div className="block-content block-button-wrapper">
      <button
        className={`block-button block-button-${buttonStyle}`}
        onClick={handleClick}
        onDoubleClick={() => setEditing(true)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          showContextMenu(e.clientX, e.clientY, [], null, 'block', block.id);
        }}
      >
        {buttonIcon && <span className="btn-label-icon">{renderPageIcon(buttonIcon, '16px')}</span>}
        <span
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          className="block-button-text"
          onBlur={handleLabelInput}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          data-placeholder="Button text"
        >
          {label}
        </span>
      </button>
      {actions.length > 0 && <div className="block-button-actions-badge" title={`${actions.filter(a => a.enabled !== false).length} action(s) configured`}>
        <Settings size={12} />
      </div>}
    </div>
  );
});
