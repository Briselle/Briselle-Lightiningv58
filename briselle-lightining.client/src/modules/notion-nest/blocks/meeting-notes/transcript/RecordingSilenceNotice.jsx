/* ============================================================
   NotionNest — meeting-notes/transcript/RecordingSilenceNotice.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T90
   Purpose: "Still there?" — the idle prompt shown while recording is
            running but nothing has been transcribed for a while.

   Why it exists: a recording left running on an empty room burns
   microphone time, storage and the user's attention budget. The prompt
   offers the two things worth doing at that moment — go look at the
   note, or stop — and dismisses without doing either.

   Silence is measured in the Base (SILENCE_NOTICE_MS) from real
   transcription activity: the last committed line or interim result.
   This component only renders what that state says.

   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { FileAudio, X } from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';

export function RecordingSilenceNotice() {
  const {
    showSilenceNotice,
    dismissSilenceNotice,
    goToMeetingNote,
    stopRecording,
  } = useMeetingNotes();

  if (!showSilenceNotice) return null;

  return (
    <div className="nnr-idle-notice" role="alertdialog" aria-labelledby="nnr-idle-title">
      <div className="nnr-idle-head">
        <span className="nnr-idle-icon" aria-hidden="true">
          <FileAudio size={18} />
        </span>
        <span className="nnr-idle-title" id="nnr-idle-title">Still there?</span>
        <button
          type="button"
          className="nnr-idle-close"
          onClick={dismissSilenceNotice}
          aria-label="Dismiss"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      <p className="nnr-idle-body">
        Ziva AI is recording your audio but hasn&rsquo;t heard from you in a while.
      </p>

      <div className="nnr-idle-actions">
        <button type="button" className="nnr-idle-btn ghost" onClick={goToMeetingNote}>
          Go to meeting note
        </button>
        <button type="button" className="nnr-idle-btn solid" onClick={stopRecording}>
          Stop
        </button>
      </div>
    </div>
  );
}

export default RecordingSilenceNotice;
