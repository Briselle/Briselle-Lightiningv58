/* ============================================================
   NotionNest — blocks/shared/useEditable.js
   Shared contenteditable hook used by text-based block components
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L57
   ============================================================ */
import { useRef, useCallback, useEffect } from 'react';
import { usePageContext } from '../../core/PageContext';
import { getCaretPosition, markdownShortcuts, slashMenuSections, isCaretOnFirstLine, isCaretOnLastLine, getCaretCoordinates } from '../../core/utils';
import { focusBlock } from './focusBlock';

/**
 * Hook that provides contenteditable behavior for block components.
 * Handles input, keyboard shortcuts, slash commands, markdown shortcuts,
 * block merging, splitting, navigation, and more.
 *
 * @param {object} block - The block data object
 * @param {object} opts - Options: { placeholder, isCode }
 * @returns {{ ref, handleInput, handleKeyDown, handleFocus, placeholder }}
 */
export function useEditable(block, opts = {}) {
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
