/* ============================================================
   NotionNest — blocks/shared/focusBlock.js
   Shared focus helper used across all editable block components
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L15
   ============================================================ */

/**
 * Attempts to focus the contenteditable element within a block.
 * Falls back to adjacent blocks if the target block has no editable element.
 * @param {string} blockId - The block ID to focus
 * @param {boolean} atEnd - Whether to place caret at end of content
 * @param {number} direction - Search direction for fallback (-1 = up, 1 = down)
 */
export function focusBlock(blockId, atEnd = false, direction = -1) {
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
        const sel = window.getSelection();
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
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
