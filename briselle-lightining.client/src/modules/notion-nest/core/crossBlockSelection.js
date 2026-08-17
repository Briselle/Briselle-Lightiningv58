/* ============================================================
   NotionNest — core/crossBlockSelection.js
   Created At: 2026-08-17 | Last Modified: 2026-08-17
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-T120
   Purpose: Pure helpers for selecting text ACROSS block boundaries.

   ── The constraint being worked around ─────────────────────────
   Every block renders its own `contentEditable` div, so each is a
   separate editing host. A browser will not carry ONE USER SELECTION
   across two editing hosts — it collapses the range at the boundary.
   That is a DOM rule, not something an event handler can prevent, and
   it is why a drag stops at the end of the first block.

   ── The part browsers DO allow ─────────────────────────────────
   The restriction applies to the *user* selection. A programmatic
   `Range` may start in one editing host and end in another quite
   legally. So the model here is a single Range, and painting it is
   handed to the CSS Custom Highlight API — the browser draws it
   natively, with no overlay elements to position, no getClientRects
   maths, and nothing to recompute on scroll or resize.

   Copy then comes almost free: range.toString() is the exact plain
   text and cloneContents() the exact markup, sliced by the browser at
   the same offsets the user sees highlighted.

   No React here — these are testable functions.
   ============================================================ */

/** Is the CSS Custom Highlight API usable in this browser? */
export function supportsHighlightApi() {
  return typeof CSS !== 'undefined'
    && typeof CSS.highlights !== 'undefined'
    && typeof Highlight !== 'undefined';
}

/**
 * Caret position under a viewport point.
 * caretRangeFromPoint (Chrome/Safari) and caretPositionFromPoint
 * (Firefox) are the two halves of an unfinished standard; both exist in
 * the wild and neither is universal.
 * @returns {{node: Node, offset: number}|null}
 */
export function caretFromPoint(x, y) {
  if (typeof document === 'undefined') return null;

  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    return r ? { node: r.startContainer, offset: r.startOffset } : null;
  }
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  return null;
}

/** The block element a node lives in, or null. */
export function blockElementOf(node) {
  if (!node) return null;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return el ? el.closest('[data-block-id]') : null;
}

/** The block id a node lives in, or null. */
export function blockIdOf(node) {
  return blockElementOf(node)?.getAttribute('data-block-id') || null;
}

/**
 * Document order of two nodes.
 * @returns {number} negative if a precedes b, positive if it follows, 0 if same
 */
export function compareNodes(a, b) {
  if (a === b) return 0;
  const pos = a.compareDocumentPosition(b);
  if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

/**
 * Build a Range between two caret positions, in document order.
 * Returns null when either end is missing or they are the same point.
 */
export function buildRange(anchor, focus) {
  if (!anchor?.node || !focus?.node) return null;

  let start = anchor;
  let end = focus;

  const order = compareNodes(anchor.node, focus.node);
  if (order > 0 || (order === 0 && anchor.offset > focus.offset)) {
    start = focus;
    end = anchor;
  }

  try {
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range.collapsed ? null : range;
  } catch (e) {
    /* Offsets can go stale between a mousemove and a re-render. */
    return null;
  }
}

/** Does this range cross a block boundary? */
export function spansBlocks(range) {
  if (!range) return false;
  const a = blockIdOf(range.startContainer);
  const b = blockIdOf(range.endContainer);
  return !!a && !!b && a !== b;
}

const HIGHLIGHT_NAME = 'nn-cross-selection';

/** Paint a range. Silently does nothing where the API is unavailable. */
export function paintHighlight(range) {
  if (!supportsHighlightApi()) return false;
  try {
    if (!range) { CSS.highlights.delete(HIGHLIGHT_NAME); return false; }
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearHighlight() {
  if (!supportsHighlightApi()) return;
  try { CSS.highlights.delete(HIGHLIGHT_NAME); } catch (e) { /* nothing to clear */ }
}

/**
 * Serialise a range for the clipboard.
 * The browser slices at exactly the highlighted offsets, so what is
 * copied is what is on screen — no manual block splitting.
 */
export function serialiseRange(range) {
  if (!range) return { text: '', html: '' };

  const text = range.toString();

  let html = '';
  try {
    const holder = document.createElement('div');
    holder.appendChild(range.cloneContents());
    /* Editing scaffolding must not travel to another application. */
    holder.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    holder.querySelectorAll('.block-controls, .block-handle, .block-plus, .comment-annotations')
      .forEach(el => el.remove());
    html = holder.innerHTML;
  } catch (e) {
    html = '';
  }

  return { text, html };
}
