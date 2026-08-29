/* ============================================================
   NotionNest — meeting-notes/hooks/useDismissOnOutside.js
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T42
   Purpose: One dismiss-on-outside-click behaviour for every popover in
            the meeting block, instead of each one reimplementing it.

   Uses mousedown rather than click: a document-level click handler can
   close the menu before the row's own onClick runs, so the action
   silently never fires. mousedown ordering avoids that.
   ============================================================ */
import { useEffect } from 'react';

/**
 * @param {boolean}  open    whether the popover is currently shown
 * @param {object}   ref     ref on the element that should NOT dismiss
 * @param {Function} close   called when a click lands outside
 */
export function useDismissOnOutside(open, ref, close) {
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      const el = ref?.current;
      if (el && !el.contains(e.target)) close();
    };
    /* Escape is the keyboard equivalent — a menu you can only close with
       the mouse is a trap for keyboard users. */
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, ref, close]);
}

export default useDismissOnOutside;
