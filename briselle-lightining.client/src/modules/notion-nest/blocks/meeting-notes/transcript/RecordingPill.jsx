/* ============================================================
   NotionNest — meeting-notes/transcript/RecordingPill.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T08/T11
   Purpose: Floating recording indicator shown while transcribing.
            Collapsed  -> waveform + elapsed time + stop
            Hovered    -> meeting title + live status + close

   Equalizer contract (BRIS-NN-MNB-T08):
     bar HEIGHT  <- micVolume (0..1), the live input level
     bar COUNT   <- micVolumeSliderLevel, the mic volume adjuster
   Styling lives in styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { Square, X } from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { Waveform } from './Waveform';

export function RecordingPill() {
  const {
    recording,
    recordingTimer,
    formatTime,
    stopRecording,
    micVolume,
    micVolumeSliderLevel,
    title,
  } = useMeetingNotes();

  if (!recording) return null;

  return (
    <div className="nnr-rec-pill" role="status" aria-live="polite">
      {/* Revealed on hover */}
      <div className="nnr-rec-pill-detail">
        <div className="nnr-rec-pill-title" title={title}>{title || 'Untitled meeting'}</div>
        <div className="nnr-rec-pill-status">You’re transcribing…</div>
      </div>

      <div className="nnr-rec-pill-row">
        <Waveform level={micVolume} sliderLevel={micVolumeSliderLevel} size="pill" />

        <span className="nnr-rec-time">{formatTime(recordingTimer)}</span>

        <button
          type="button"
          className="nnr-rec-stop"
          onClick={stopRecording}
          aria-label="Stop transcribing"
          title="Stop transcribing"
        >
          <Square size={12} fill="currentColor" />
        </button>
      </div>

      <button
        type="button"
        className="nnr-rec-pill-close"
        onClick={stopRecording}
        aria-label="Stop and close"
        title="Stop and close"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default RecordingPill;
