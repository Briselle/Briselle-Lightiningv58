/* ============================================================
   Briselle Enterprise Platform — Shared UI
   useDragReorder.ts — reusable drag-to-reorder for rows or list items
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T164

   ── Why a hook and not a component ────────────────────────────
   The lists that need this are <table> rows in some places and <li>
   in others. A component would have to impose one markup shape, so the
   drag behaviour is exposed as prop-spreaders instead and the caller
   keeps ownership of its own DOM.

   ── Why native HTML5 and not a library ───────────────────────
   package.json carries no drag-drop dependency, and three separate
   inline native implementations already exist in this codebase
   (PresetSettingsSection, DisplaySettingsSection, ConfigurableListTemplate).
   This consolidates that pattern rather than adding a fourth copy or a
   new dependency. The reference implementation is
   components/ui/tabletemplates/modal-settings-sections/PresetSettingsSection.tsx:233-254.

   ── Keyboard support is not optional ─────────────────────────
   All three existing implementations are mouse-only, which fails the
   "keyboard friendly" and "accessible" platform rules. Alt+ArrowUp /
   Alt+ArrowDown moves the focused row, so reordering never requires a
   pointer.
   ============================================================ */
import { useCallback, useRef, useState } from 'react';

export interface DragReorderOptions {
  /** How many items are in the list. */
  count: number;
  /**
   * Called with the moved item's old and new index. The caller performs
   * the move and persists it — this hook owns no data, so it cannot get
   * out of step with the source of truth.
   */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Set false to render the same markup with dragging switched off. */
  enabled?: boolean;
}

export interface DragRowProps {
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  'data-dragging': boolean | undefined;
  'data-dragover': boolean | undefined;
}

export interface DragReorderApi {
  /** Spread onto each row/item element. */
  getRowProps: (index: number) => DragRowProps;
  /** Index currently being dragged, or null. */
  draggingIndex: number | null;
  /** Index the pointer is hovering over, or null. */
  overIndex: number | null;
  /** Move programmatically — used by the keyboard path and by tests. */
  move: (fromIndex: number, toIndex: number) => void;
}

/** Pure helper: return a new array with one item moved. Exported for reuse. */
export function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  if (
    fromIndex === toIndex ||
    fromIndex < 0 || toIndex < 0 ||
    fromIndex >= next.length || toIndex >= next.length
  ) {
    return next;
  }
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function useDragReorder({ count, onReorder, enabled = true }: DragReorderOptions): DragReorderApi {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  /* The source index is held in a ref as well as in state. dataTransfer
     is unreadable during dragover in some browsers, and reading state
     inside a native event handler can see a stale value, so the ref is
     what the drop actually trusts. */
  const fromRef = useRef<number | null>(null);

  const move = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (toIndex < 0 || toIndex >= count) return;
    onReorder(fromIndex, toIndex);
  }, [count, onReorder]);

  const getRowProps = useCallback((index: number): DragRowProps => ({
    draggable: enabled,

    onDragStart: (e) => {
      if (!enabled) return;
      fromRef.current = index;
      setDraggingIndex(index);
      /* Some browsers refuse to start a drag without payload. */
      try {
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.effectAllowed = 'move';
      } catch { /* older browsers — the ref above is the real channel */ }
    },

    onDragOver: (e) => {
      if (!enabled || fromRef.current === null) return;
      /* Without preventDefault the drop event never fires at all. */
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch { /* non-fatal */ }
      if (overIndex !== index) setOverIndex(index);
    },

    onDragLeave: () => {
      if (overIndex === index) setOverIndex(null);
    },

    onDrop: (e) => {
      if (!enabled) return;
      e.preventDefault();
      const from = fromRef.current;
      fromRef.current = null;
      setDraggingIndex(null);
      setOverIndex(null);
      if (from === null || from === index) return;
      move(from, index);
    },

    /* Fires even when the drag is abandoned outside a valid target, so
       this is what guarantees the highlight is cleared. */
    onDragEnd: () => {
      fromRef.current = null;
      setDraggingIndex(null);
      setOverIndex(null);
    },

    onKeyDown: (e) => {
      if (!enabled) return;
      /* Alt as the modifier: plain arrows must keep moving focus, and
         Ctrl/Cmd+Arrow is taken by the browser and the OS. */
      if (!e.altKey) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(index, index - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(index, index + 1);
      }
    },

    'data-dragging': draggingIndex === index ? true : undefined,
    'data-dragover': overIndex === index && draggingIndex !== index ? true : undefined,
  }), [enabled, draggingIndex, overIndex, move]);

  return { getRowProps, draggingIndex, overIndex, move };
}

export default useDragReorder;
