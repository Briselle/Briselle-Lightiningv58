/* ============================================================
   NotionNest — core/useCrossBlockSelection.js
   Created At: 2026-08-17 | Last Modified: 2026-08-17
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-T120 (Option A)
   Purpose: Let a drag select text across block boundaries.

   ── Division of labour ─────────────────────────────────────────
   While a drag stays inside ONE block the browser is already doing
   the right thing, so this hook stays out of the way entirely. Only
   when the pointer crosses into a different block — the case the
   browser refuses to handle, because each block is its own editing
   host — does it take over: it builds a Range spanning both, paints
   it with the CSS Custom Highlight API, and clears the native
   selection so the two do not fight.

   That keeps single-block behaviour byte-identical, which matters:
   caret placement, double-click-to-word and shift-click all still
   belong to the browser.

   ── Scope ──────────────────────────────────────────────────────
   Bound to one page root. The Notes tab embeds a second NotionNestPage
   inside the first, and each must only answer for its own subtree —
   the same containment rule as ownsEvent() in T118.
   ============================================================ */
import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  caretFromPoint, buildRange, spansBlocks, blockIdOf,
  paintHighlight, clearHighlight,
} from './crossBlockSelection';

/** Movement below this is a click, not a drag. */
const DRAG_THRESHOLD_PX = 4;

export function useCrossBlockSelection(rootRef) {
  const anchorRef = useRef(null);      // {node, offset}
  const pressedRef = useRef(false);
  const startPtRef = useRef({ x: 0, y: 0 });
  const rangeRef = useRef(null);       // the live cross-block Range
  const activeRef = useRef(false);

  const clear = useCallback(() => {
    if (!activeRef.current && !rangeRef.current) return;
    activeRef.current = false;
    rangeRef.current = null;
    clearHighlight();
  }, []);

  /** The active cross-block range, or null. Read by the copy handler. */
  const getRange = useCallback(() => (activeRef.current ? rangeRef.current : null), []);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (!root.contains(e.target)) return;
      /* Controls and menus keep their own behaviour. */
      if (e.target.closest('button, input, select, textarea, .block-controls, .block-handle, .slash-menu, .context-menu, .inline-toolbar')) {
        return;
      }
      /* A shift-click extends whatever exists; leave it to the browser
         and to the block-range logic in BlockRenderer. */
      if (e.shiftKey) return;

      clear();
      const caret = caretFromPoint(e.clientX, e.clientY);
      anchorRef.current = caret && blockIdOf(caret.node) ? caret : null;
      pressedRef.current = !!anchorRef.current;
      startPtRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!pressedRef.current || !anchorRef.current) return;

      const dx = Math.abs(e.clientX - startPtRef.current.x);
      const dy = Math.abs(e.clientY - startPtRef.current.y);
      if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) return;

      const focus = caretFromPoint(e.clientX, e.clientY);
      if (!focus || !blockIdOf(focus.node)) return;
      /* Never reach outside this page — the outer page and the embedded
         notes page must not select into each other. */
      if (!root.contains(focus.node.nodeType === Node.ELEMENT_NODE ? focus.node : focus.node.parentElement)) {
        return;
      }

      const range = buildRange(anchorRef.current, focus);

      if (!range || !spansBlocks(range)) {
        /* Still inside one block — hand it back to the browser. */
        if (activeRef.current) clear();
        return;
      }

      /* Crossed a boundary. The native selection cannot represent this,
         so replace it with our own and stop it flickering underneath. */
      activeRef.current = true;
      rangeRef.current = range;
      paintHighlight(range);

      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) sel.removeAllRanges();
      /* A focused contenteditable would keep drawing its caret inside a
         selection it does not own. */
      if (document.activeElement && root.contains(document.activeElement)
        && document.activeElement.isContentEditable) {
        document.activeElement.blur();
      }
    };

    const onMouseUp = () => {
      pressedRef.current = false;
      /* The range stays painted after release — that is what makes it a
         selection rather than a gesture. */
    };

    const onKeyDown = (e) => {
      if (!activeRef.current) return;
      if (e.key === 'Escape') { clear(); return; }
      /* Any caret movement or typing ends it. Editing across the range
         is step 3 of the plan; until then it must not look editable. */
      if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') clear();
    };

    root.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      root.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
      clearHighlight();
    };
  }, [rootRef, clear]);

  /* Stable identity: the copy listener is registered on a different
     dependency set, so it captures this object from an earlier render.
     A fresh object each time would still work — getRange and clear are
     themselves stable — but relying on that is the kind of subtlety that
     breaks silently later. */
  return useMemo(() => ({ getRange, clear }), [getRange, clear]);
}

export default useCrossBlockSelection;
