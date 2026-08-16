/* ============================================================
   NotionNest — meeting-notes/transcript/TranscribeControl.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: transcript/TranscriptPanel.jsx#L160-L254

   Task: BRIS-NN-MNB-T29a
   Purpose: The transcribe control — idle split button with its three
            modes, and while running the waveform + timer + pause/stop
            that replace it in the same slot.

   Extracted so it can sit in the tab row instead of inside the
   Transcript tab. That tab is hidden until transcription starts, so a
   control nested within it could never be reached.
   ============================================================ */
import { ChevronDown, FileAudio, Mic, Pause, Play, Square, Upload } from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { Waveform } from './Waveform';

export function TranscribeControl({ variant = 'both' }) {
  const {
    recording, isPaused, micVolume, micVolumeSliderLevel,
    recordingTimer, formatTime, stopRecording,
    pauseRecording, resumeRecording,
    startTranscribe, TRANSCRIBE_MODES,
    showTranscribeMenu, setShowTranscribeMenu,
    audioUploadRef, handleAudioUpload, transcribeWrapRef, closeAllMenus,
    recControlsRef,
  } = useMeetingNotes();

  return (
    <>
        {/* BRIS-NN-MNB-T14: idle shows the Start button; recording
            replaces it in place with the live waveform + pause/stop,
            so there is never a second competing recording control. */}
        {(recording && variant !== 'start') ? (
          /* BRIS-NN-MNB-T73: recControlsRef marks the live controls so the
             floating pill can tell whether they are still on screen. Only
             the 'running' instance carries it — the 'start' instance in
             the tab row renders the idle button, never this group, so
             both can never claim the ref at once. */
          <div
            className="nnr-tab-rec-group"
            ref={variant === 'running' ? recControlsRef : undefined}
          >
            <Waveform level={micVolume} sliderLevel={micVolumeSliderLevel} size="inline" />
            <span className="nnr-rec-time">{formatTime(recordingTimer)}</span>
            <button
              type="button"
              className={`nnr-tab-rec-btn${isPaused ? ' active' : ''}`}
              onClick={() => (isPaused ? resumeRecording() : pauseRecording())}
              aria-label={isPaused ? 'Resume transcribing' : 'Pause transcribing'}
              title={isPaused ? 'Resume transcribing' : 'Pause transcribing'}
            >
              {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
            </button>
            <button
              type="button"
              className="nnr-tab-rec-btn stop"
              onClick={stopRecording}
              aria-label="Stop transcribing"
              title="Stop transcribing"
            >
              <Square size={13} fill="currentColor" />
            </button>
          </div>
        ) : (!recording && variant !== 'running') ? (
          /* BRIS-NN-MNB-T16: split button — primary action starts the
             default mode; the chevron offers the three modes. Every row
             begins transcribing immediately on click. */
          <div className="nnr-transcribe-split" ref={transcribeWrapRef}>
            <button
              type="button"
              className="nnr-transcribe-main"
              onClick={() => startTranscribe(TRANSCRIBE_MODES.LIVE_RECORD)}
            >
              <span>Start transcribing</span>
            </button>
            <button
              type="button"
              className="nnr-transcribe-caret"
              onClick={() => { const next = !showTranscribeMenu; closeAllMenus('transcribe'); setShowTranscribeMenu(next); }}
              aria-haspopup="menu"
              aria-expanded={showTranscribeMenu}
              aria-label="Choose how to transcribe"
            >
              <ChevronDown size={15} />
            </button>

            {showTranscribeMenu && (
              <div className="nnr-transcribe-menu" role="menu">
                <button
                  type="button"
                  className="nnr-transcribe-menu-item"
                  role="menuitem"
                  onClick={() => startTranscribe(TRANSCRIBE_MODES.LIVE_RECORD)}
                >
                  <span className="nnr-transcribe-menu-icons"><Mic size={14} /><FileAudio size={14} /></span>
                  <span>Live + save audio</span>
                  <span className="nnr-transcribe-menu-hint">Default</span>
                </button>
                <button
                  type="button"
                  className="nnr-transcribe-menu-item"
                  role="menuitem"
                  onClick={() => startTranscribe(TRANSCRIBE_MODES.LIVE_ONLY)}
                >
                  <Mic size={14} />
                  <span>Live, transcript only</span>
                </button>
                <button
                  type="button"
                  className="nnr-transcribe-menu-item"
                  role="menuitem"
                  onClick={() => startTranscribe(TRANSCRIBE_MODES.UPLOAD)}
                >
                  <Upload size={14} />
                  <span>Transcribe audio file</span>
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Upload Audio File */}
        <input
          type="file"
          ref={audioUploadRef}
          accept="audio/*,video/*"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleAudioUpload(f);
          }}
        />

    </>
  );
}

export default TranscribeControl;
