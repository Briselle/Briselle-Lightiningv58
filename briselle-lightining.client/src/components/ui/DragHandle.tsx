/* ============================================================
   Briselle Enterprise Platform — Shared UI
   DragHandle.tsx — the grip cell for a reorderable row
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T164

   Pairs with useDragReorder. Kept separate so the visual affordance is
   defined once instead of per list, and so the keyboard hint lives in
   one place.
   ============================================================ */
import { GripVertical } from 'lucide-react';
import './BriselleControls.css';

export interface DragHandleProps {
  /** 1-based position, rendered beside the grip. */
  position?: number;
  /** Shown in the tooltip so the keyboard route is discoverable. */
  label?: string;
  disabled?: boolean;
}

export function DragHandle({ position, label = 'Reorder', disabled = false }: DragHandleProps) {
  return (
    <span
      className={`bui-drag-handle${disabled ? ' is-disabled' : ''}`}
      /* tabIndex on the ROW, not here — the row is what useDragReorder's
         onKeyDown is attached to, and two focus stops per row would make
         keyboard traversal twice as long for no gain. */
      aria-hidden="true"
      title={disabled ? undefined : `${label} — drag, or focus the row and press Alt+↑ / Alt+↓`}
    >
      <GripVertical size={14} />
      {position !== undefined && <span className="bui-drag-position">{position}</span>}
    </span>
  );
}

export default DragHandle;
