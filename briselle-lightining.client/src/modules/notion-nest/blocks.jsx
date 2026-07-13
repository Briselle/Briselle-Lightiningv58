/* ============================================================
   NotionNest — blocks.jsx — All block components
   ============================================================ */
import { useRef, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageContext } from './PageContext';
import { NotionIconPicker, NotionCoverPicker, LucideIcon, SVG_ICONS, renderIconSvg, hasPageIcon, renderPageIcon } from './menus';
import { Move } from 'lucide-react';
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
    { label: 'Copy link to block', icon: 'Link', action: () => {}, shortcut: 'Alt+\u2191+L' },
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
    import('./utils').then(m => setLangs(m.CODE_LANGUAGES || [])).catch(() => {});
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </div>
              <div className="bm-edit-icon" onClick={(e) => { e.stopPropagation(); openModal(); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </div>
              <div className="bm-edit-icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span>Add a web bookmark</span>
          </div>
        </div>
      )}

      {showModal && (
        <div className="bookmark-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="bookmark-modal">
            <button className="bookmark-modal-close" onClick={() => setShowModal(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
  const rows      = block.rows      || [['','',''],['','',''],['','','']];
  const lockCols  = block.lockCols  || false;
  const lockTable = block.lockTable || false;

  const [selCells, setSelCells] = useState(new Set());
  const [selStart, setSelStart] = useState(null);
  const [cellDrag, setCellDrag] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCol, setHoveredCol] = useState(null);

  const wrapRef  = useRef(null);
  const tableRef = useRef(null);

  const colCount = rows[0]?.length || 0;

  const updCell  = (ri, ci, val) => { if (lockTable) return; const nr=rows.map(r=>[...r]); nr[ri][ci]=val; updateBlockProperty(block.id,'rows',nr); };
  const addRow   = () => { if (lockTable) return; updateBlockProperty(block.id,'rows',[...rows.map(r=>[...r]),new Array(colCount).fill('')]); };
  const addCol   = () => { if (lockTable||lockCols) return; updateBlockProperty(block.id,'rows',rows.map(r=>[...r,''])); };
  const insRowAt = (ri,dir) => { if (lockTable) return; const nr=[...rows]; nr.splice(dir==='below'?ri+1:ri,0,new Array(colCount).fill('')); updateBlockProperty(block.id,'rows',nr); };
  const insColAt = (ci,dir) => { if (lockTable||lockCols) return; const nr=rows.map(r=>{const c=[...r];c.splice(dir==='right'?ci+1:ci,0,'');return c;}); updateBlockProperty(block.id,'rows',nr); };
  const delRow   = (ri) => { if (lockTable||rows.length<=1) return; updateBlockProperty(block.id,'rows',rows.filter((_,i)=>i!==ri)); };
  const delCol   = (ci) => { if (lockTable||colCount<=1)   return; updateBlockProperty(block.id,'rows',rows.map(r=>r.filter((_,i)=>i!==ci))); };
  const clearRow = (ri) => { if (lockTable) return; const nr=rows.map((r,i)=>i===ri?r.map(()=>''):[...r]); updateBlockProperty(block.id,'rows',nr); };
  const clearCol = (ci) => { if (lockTable) return; const nr=rows.map(r=>{const c=[...r];c[ci]='';return c;}); updateBlockProperty(block.id,'rows',nr); };
  const dupCol   = (ci) => { if (lockTable) return; const nr=rows.map(r=>{const c=[...r];c.splice(ci+1,0,c[ci]);return c;}); updateBlockProperty(block.id,'rows',nr); };

  const hasHeader   = block.hasHeader === true;
  const hasTotalRow = block.hasTotalRow === true;
  const colBorders  = block.colBorders !== false;
  const rowBorders  = block.rowBorders !== false;
  const striped     = block.striped === true;

  const openCellMenu = (e, ri, ci) => {
    e.preventDefault(); e.stopPropagation();
    const items = [
      { label:'Color',           action:()=>{} },
      { divider:true },
      { label:'Enable Header Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasHeader', !(b?.hasHeader === true)); }, isToggle: true, checked: hasHeader },
      { label:'Enable Total Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasTotalRow', !(b?.hasTotalRow === true)); }, isToggle: true, checked: hasTotalRow },
      { label:'Enable Row Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'rowBorders', !(b?.rowBorders !== false)); }, isToggle: true, checked: rowBorders },
      { label:'Enable Column Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'colBorders', !(b?.colBorders !== false)); }, isToggle: true, checked: colBorders },
      { label:'Enable Stripe Rows', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'striped', !(b?.striped === true)); }, isToggle: true, checked: striped },
      { divider:true },
      { label:'Insert above',    action:()=>insRowAt(ri,'above'), disabled:lockTable },
      { label:'Insert below',    action:()=>insRowAt(ri,'below'), disabled:lockTable },
      { label:'Insert left',     action:()=>insColAt(ci,'left'),  disabled:lockTable||lockCols },
      { label:'Insert right',    action:()=>insColAt(ci,'right'), disabled:lockTable||lockCols },
      { divider:true },
      { label:'Duplicate',       action:()=>dupCol(ci), shortcut:'Ctrl+D', disabled:lockTable||lockCols },
      { label:'Clear contents',  action:()=>{clearRow(ri);clearCol(ci);}, disabled:lockTable },
      { label:'Delete',          action:()=>delRow(ri), danger:true, disabled:lockTable||rows.length<=1 },
    ];
    showContextMenu(e.clientX, e.clientY, items, { ri, ci, selCells }, 'table-cell', block.id);
  };

  const openRowMenu = (e, ri) => {
    e.preventDefault(); e.stopPropagation();
    const s = new Set();
    rows[ri]?.forEach((_, ci) => s.add(`${ri},${ci}`));
    setSelCells(s);

    const items = [
      { label:'Color',          action:()=>{} },
      { divider:true },
      { label:'Enable Header Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasHeader', !(b?.hasHeader === true)); }, isToggle: true, checked: hasHeader },
      { label:'Enable Total Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasTotalRow', !(b?.hasTotalRow === true)); }, isToggle: true, checked: hasTotalRow },
      { label:'Enable Row Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'rowBorders', !(b?.rowBorders !== false)); }, isToggle: true, checked: rowBorders },
      { label:'Enable Column Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'colBorders', !(b?.colBorders !== false)); }, isToggle: true, checked: colBorders },
      { label:'Enable Stripe Rows', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'striped', !(b?.striped === true)); }, isToggle: true, checked: striped },
      { divider:true },
      { label:'Insert above',   action:()=>insRowAt(ri,'above'), disabled:lockTable },
      { label:'Insert below',   action:()=>insRowAt(ri,'below'), disabled:lockTable },
      { divider:true },
      { label:'Duplicate',      action:()=>{ const nr=[...rows.map(r=>[...r])]; nr.splice(ri+1,0,[...rows[ri]]); updateBlockProperty(block.id,'rows',nr); }, shortcut:'Ctrl+D', disabled:lockTable },
      { label:'Clear contents', action:()=>clearRow(ri), disabled:lockTable },
      { label:'Delete',         action:()=>delRow(ri), danger:true, disabled:lockTable||rows.length<=1 },
    ];
    showContextMenu(e.clientX, e.clientY, items, { ri, selCells: s }, 'table-row', block.id);
  };

  const openColMenu = (e, ci) => {
    e.preventDefault(); e.stopPropagation();
    const s = new Set();
    rows.forEach((_, ri) => s.add(`${ri},${ci}`));
    setSelCells(s);

    const items = [
      { label:'Color',          action:()=>{} },
      { divider:true },
      { label:'Enable Header Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasHeader', !(b?.hasHeader === true)); }, isToggle: true, checked: hasHeader },
      { label:'Enable Total Row', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'hasTotalRow', !(b?.hasTotalRow === true)); }, isToggle: true, checked: hasTotalRow },
      { label:'Enable Row Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'rowBorders', !(b?.rowBorders !== false)); }, isToggle: true, checked: rowBorders },
      { label:'Enable Column Borders', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'colBorders', !(b?.colBorders !== false)); }, isToggle: true, checked: colBorders },
      { label:'Enable Stripe Rows', action: () => { const b = getBlockById(block.id); updateBlockProperty(block.id, 'striped', !(b?.striped === true)); }, isToggle: true, checked: striped },
      { divider:true },
      { label:'Insert left',    action:()=>insColAt(ci,'left'),  disabled:lockTable||lockCols },
      { label:'Insert right',   action:()=>insColAt(ci,'right'), disabled:lockTable||lockCols },
      { divider:true },
      { label:'Duplicate',      action:()=>dupCol(ci), shortcut:'Ctrl+D', disabled:lockTable||lockCols },
      { label:'Clear contents', action:()=>clearCol(ci), disabled:lockTable },
      { label:'Delete',         action:()=>delCol(ci), danger:true, disabled:lockTable||colCount<=1 },
    ];
    showContextMenu(e.clientX, e.clientY, items, { ci, selCells: s }, 'table-col', block.id);
  };

  const onCellDown = (e, ri, ci) => {
    if (e.button !== 0) return;
    const key = `${ri},${ci}`;
    if (e.shiftKey && selStart) {
      const [sr,sc] = selStart.split(',').map(Number);
      const s = new Set();
      for (let r=Math.min(sr,ri);r<=Math.max(sr,ri);r++) for (let c=Math.min(sc,ci);c<=Math.max(sc,ci);c++) s.add(`${r},${c}`);
      setSelCells(s);
    } else { setSelCells(new Set([key])); setSelStart(key); }
    setCellDrag(true);
  };

  const onCellEnter = (ri, ci) => {
    if (!cellDrag || !selStart) return;
    const [sr,sc] = selStart.split(',').map(Number);
    const s = new Set();
    for (let r=Math.min(sr,ri);r<=Math.max(sr,ri);r++) for (let c=Math.min(sc,ci);c<=Math.max(sc,ci);c++) s.add(`${r},${c}`);
    setSelCells(s);
  };

  useEffect(() => { const up=()=>setCellDrag(false); window.addEventListener('mouseup',up); return ()=>window.removeEventListener('mouseup',up); }, []);
  useEffect(() => { const d=(e)=>{if(!wrapRef.current?.contains(e.target)){setSelCells(new Set());setSelStart(null);}}; document.addEventListener('mousedown',d,true); return ()=>document.removeEventListener('mousedown',d,true); }, []);

  const tableCls   = ['nn-table',!colBorders&&'nn-no-col-borders',!rowBorders&&'nn-no-row-borders',striped&&'nn-striped'].filter(Boolean).join(' ');

  const renderCell = (cellVal, ri, ci, isHead, isTotal = false) => {
    const Tag   = isHead ? 'th' : 'td';
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
        onMouseDown={e=>onCellDown(e,ri,ci)}
        onMouseEnter={() => {
          onCellEnter(ri,ci);
          setHoveredRow(ri);
          setHoveredCol(ci);
        }}
        onMouseLeave={() => {
          setHoveredRow(null);
          setHoveredCol(null);
        }}
        onContextMenu={e=>openCellMenu(e,ri,ci)}
        contentEditable={!lockTable}
        suppressContentEditableWarning
        onBlur={e=>updCell(ri,ci,e.target.textContent)}
        onFocus={() => {
          setSelCells(new Set([`${ri},${ci}`]));
          setSelStart(`${ri},${ci}`);
        }}
      >
        <span 
          style={{ display: 'inline-block', width: '100%', minHeight: '1.2em', outline: 'none', color: colorInfo.textColor }}
          dangerouslySetInnerHTML={{__html:cellVal}}
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
                {[0,1,2,3,4,5].map(i=><span key={i} className="nn-bh-dot"/>)}
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
                {[0,1,2,3,4,5].map(i=><span key={i} className="nn-bh-dot"/>)}
              </span>
            </div>
          </div>
        )}
      </Tag>
    );
  };

  const bodyRows = hasHeader ? rows.slice(1) : rows;
  const headRow  = hasHeader ? rows[0] : null;

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
                <tr>{headRow.map((c,ci)=>renderCell(c,0,ci,true))}</tr>
              </thead>
            )}
            <tbody>
              {mainBodyRows.map((row,relRi)=>{
                const ri = hasHeader ? relRi+1 : relRi;
                return (<tr key={ri}>{row.map((c,ci)=>renderCell(c,ri,ci,false))}</tr>);
              })}
            </tbody>
            {totalRow && (
              <tfoot>
                <tr className="nn-tr-total">
                  {totalRow.map((c,ci)=>renderCell(c,rows.length-1,ci,false,true))}
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

export const ColumnsBlock = memo(function ColumnsBlock({ block }) {
  const { updateBlockProperty, insertColumn, deleteColumn, moveColumn, showContextMenu, moveBlockToColumn } = usePageContext();
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
    const total = startWidths.reduce((a,b)=>a+b, 0);
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
      const leftMin  = totalFlex * 0.1;
      const rightMin = totalFlex * 0.1;
      newWidths[resizing.idx]     = Math.max(leftMin,  resizing.startWidths[resizing.idx]     + delta);
      newWidths[resizing.idx + 1] = Math.max(rightMin, resizing.startWidths[resizing.idx + 1] - delta);
      const newTotal = newWidths.reduce((a,b)=>a+b, 0);
      const scale    = totalFlex / newTotal;
      updateBlockProperty(block.id, 'colWidths', newWidths.map(w => +(w * scale).toFixed(3)));
    };
    const onUp = () => setResizing(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizing, block.id, updateBlockProperty]);

  const openColMenu = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    const items = [
      { label: 'Delete column', action: () => deleteColumn(block.id, col.id), danger: true },
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
          {columns.length > 1 && <div className="nn-col-toolbar-btn nn-col-delete-btn" onClick={() => deleteColumn(block.id, col.id)} title="Delete column">−</div>}
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
  const headingTypes = ['heading1','heading2','heading3','heading4','heading5','toggle_heading1','toggle_heading2','toggle_heading3','toggle_heading4','toggle_heading5'];
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

export const ButtonBlock = memo(function ButtonBlock({ block }) {
  const { updateBlockProperty, showContextMenu } = usePageContext();
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(block.buttonUrl || '');
  const textRef = useRef(null);
  const urlInputRef = useRef(null);

  const buttonText = block.content || 'Button';
  const buttonUrl = block.buttonUrl || '';
  const buttonStyle = block.buttonStyle || 'primary';
  const openInNewTab = block.openInNewTab !== false;

  const handleTextInput = () => {
    const val = textRef.current?.textContent?.trim();
    if (val) updateBlockProperty(block.id, 'content', val);
  };

  const handleSaveUrl = () => {
    const val = urlInput.trim();
    if (val) {
      updateBlockProperty(block.id, 'buttonUrl', val.startsWith('http') ? val : `https://${val}`);
    }
    setEditingUrl(false);
  };

  const handleClick = (e) => {
    if (!buttonUrl) {
      setEditingUrl(true);
      return;
    }
    e.preventDefault();
    window.open(buttonUrl, openInNewTab ? '_blank' : '_self', 'noopener');
  };

  const styleClass = `block-button-${buttonStyle}`;

  return (
    <div className="block-content block-button-wrapper">
      {editingUrl ? (
        <div className="block-button-url-edit">
          <input
            ref={urlInputRef}
            type="text"
            className="block-button-url-input"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveUrl(); } }}
            autoFocus
          />
          <button className="block-button-url-save" onClick={handleSaveUrl}>Save</button>
          <button className="block-button-url-cancel" onClick={() => setEditingUrl(false)}>Cancel</button>
        </div>
      ) : (
        <button
          className={`block-button ${styleClass}`}
          onClick={handleClick}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e.clientX, e.clientY, [], null, 'block', block.id);
          }}
        >
          <span
            ref={textRef}
            contentEditable
            suppressContentEditableWarning
            className="block-button-text"
            onBlur={handleTextInput}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            data-placeholder="Button text"
          >
            {buttonText}
          </span>
        </button>
      )}
    </div>
  );
});
