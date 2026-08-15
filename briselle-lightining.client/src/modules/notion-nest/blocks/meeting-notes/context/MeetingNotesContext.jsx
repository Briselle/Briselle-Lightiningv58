/* ============================================================
   NotionNest — meeting-notes/context/MeetingNotesContext.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: (new file — extracted from
   blocks/MeetingNotesBlock.jsx during BRIS-NN-MNB-R01)

   Task: BRIS-NN-MNB-R01
   Purpose: Single contract between MeetingNotesBlockBase (which owns
            all state) and the presentational sub-files. Avoids drilling
            330 values through props.

   Note on re-renders: the provider value is a fresh object each render,
   so consumers re-render whenever the Base re-renders. That is exactly
   the behaviour of the original single-component file, so this refactor
   is render-neutral by design. Memoising children is a separate,
   opt-in optimisation and deliberately NOT bundled into this move.
   ============================================================ */
import { createContext, useContext } from 'react';

export const MeetingNotesContext = createContext(null);

/**
 * Access the MeetingNotesBlock shared state/actions.
 * Throws early with a clear message if used outside the provider —
 * a silent null here would surface as a confusing destructuring error.
 */
export function useMeetingNotes() {
  const ctx = useContext(MeetingNotesContext);
  if (ctx === null) {
    throw new Error('useMeetingNotes() must be used inside <MeetingNotesContext.Provider>');
  }
  return ctx;
}

export default MeetingNotesContext;
