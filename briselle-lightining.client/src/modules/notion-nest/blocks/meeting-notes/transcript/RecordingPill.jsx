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

   BRIS-NN-MNB-T73 (Last Modified 2026-08-16): the pill is a FALLBACK, not
   a permanent overlay. It used to show for the whole recording, competing
   with the identical inline controls in the toolbar a few pixels away.
   It now appears only once those inline controls have scrolled out of
   view — i.e. only when it is the user's only way to stop recording.

   Styling lives in styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { Square, X } from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { useIsOffscreen } from '../hooks/useIsOffscreen';
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
    recControlsRef,
  } = useMeetingNotes();

  /* Hooks run unconditionally — the early return below must not sit
     above them. The `recording` flag disables the observer instead.

     T89: minVisible 1 — the pill appears the moment the inline controls
     are even partly clipped, rather than waiting for them to leave the
     viewport completely. Stop is the control at stake, so arriving early
     is strictly better than arriving late. */
  const controlsOffscreen = useIsOffscreen(recControlsRef, recording, { minVisible: 1 });

  if (!recording || !controlsOffscreen) return null;

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
