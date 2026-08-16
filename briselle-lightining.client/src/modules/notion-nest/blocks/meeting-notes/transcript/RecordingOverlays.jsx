/* ============================================================
   NotionNest — meeting-notes/transcript/RecordingOverlays.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T89 / T90
   Purpose: The floating recording surfaces, in one bottom-centre stack.

   Mounted by MeetingNotesBlockBase, NOT by TranscriptPanel.

   T89: RecordingPill used to live inside TranscriptPanel, so it only
   existed while the Transcript tab was open — the one moment it is
   least needed, since the inline controls are on that tab too. A
   recording is a block-level state, not a tab-level one: leaving the
   Transcript tab must not take away the only visible Stop button.

   T90: the stack is also what positions the idle notice directly above
   the pill. Stacking them in one flex column means neither has to know
   the other's height, and nothing has to be re-measured when the pill
   expands on hover.

   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { RecordingPill } from './RecordingPill';
import { RecordingSilenceNotice } from './RecordingSilenceNotice';

export function RecordingOverlays() {
  return (
    /* The stack itself never intercepts clicks; its children re-enable
       pointer events, so the empty column cannot block the page. */
    <div className="nnr-rec-stack">
      <RecordingSilenceNotice />
      <RecordingPill />
    </div>
  );
}

export default RecordingOverlays;
