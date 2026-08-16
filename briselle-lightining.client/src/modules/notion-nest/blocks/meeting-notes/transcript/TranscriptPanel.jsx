/* ============================================================
   NotionNest — meeting-notes/transcript/TranscriptPanel.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L2770-L2994

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { AudioLines, BookOpen, ChevronDown, Clock, Copy, FileAudio, Headphones, Languages, List, Mic, MicOff, MoreVertical, Pause, Play, Square, Trash2, Upload, Volume2, X } from 'lucide-react';
import { LANGUAGE_CODE_MAP, getNativeLangDisplay } from '../constants';
import { TranscribeControl } from './TranscribeControl';
import { TranscriptStatsBar } from './TranscriptStatsBar';
import { Waveform } from './Waveform';

export function TranscriptPanel() {
  const {
    captureAudio,
    moreMenuWrapRef,
    setShowTranscribeMenu,
    showTranscribeMenu,
    TRANSCRIBE_MODES,
    startTranscribe,
    isTranscribingAudioFile,
    resumeRecording,
    pauseRecording,
    isPaused,
    micVolumeSliderLevel,
    micVolume,
    normalizedTranscriptLines,
    liveInterimLine,
    interimText,
    transcriptUserName,
    transcriptPrefixOf,
    activeTranscriptText,
    audioDuration,
    audioFiles,
    audioUploadRef,
    audioUrl,
    clearTranscript,
    copyText,
    currentPlayingAudioId,
    currentTime,
    displayTranscriptLines,
    formatTime,
    handleAudioUpload,
    handleSeek,
    handleTranslateTranscript,
    isPlaying,
    isTranslating,
    playAudioFile,
    readAloud,
    recording,
    recordingTimer,
    saveProp,
    setShowAudioFilesDropdown,
    setShowMoreMenu,
    setShowTimeline,
    setShowTranslatePopover,
    setTranscriptSubTab,
    setTranslateFrom,
    setTranslateTo,
    showAudioFilesDropdown,
    showMoreMenu,
    showTimeline,
    showTranslatePopover,
    startRecording,
    stopRecording,
    title,
    togglePlayPause,
    transcriptSubTab,
    translateFrom,
    translateTo,
    translateWrapRef,
    translatedLanguage,
    translationProgress,
  } = useMeetingNotes();
  return (
        <div className="nnr-tab-content nnr-transcript-tab">
          {/* BRIS-NN-MNB-T89: RecordingPill moved to the Base, inside
              RecordingOverlays. Mounted here it existed only while the
              Transcript tab was open — the one tab where the inline
              controls are already visible and the pill is least needed. */}
          {/* BRIS-NN-MNB-T66: the controls strip moved to the Base so it
              renders under the tab row on every tab, not just this one.
              See transcript/TranscriptToolbar.jsx. */}

          <TranscriptStatsBar />


          {/* BRIS-NN-MNB-T70: the second AudioController render that used to
              sit here has been removed. It passed audioUrl / onPlayPause /
              audioDuration / recording, but the component's props are
              src / onPlay / onPause / duration — so it never received a
              `src` and its <audio> element never rendered at all. It was
              not a redundant player, it was a player that could not play.

              There is now exactly one playback surface:
              transcript/MeetingAudioPlayer.jsx, mounted by TranscriptToolbar. */}

          {/* Transcript Lines Area */}
          <div className="nnr-transcript-content" style={{ padding: '16px', minHeight: '240px' }}>
            {(normalizedTranscriptLines.length > 0 || recording) ? (
              /* BRIS-NN-MNB-T35: one continuous stream. The source header,
                 glyph and dots belong to the RECORDING state, not to the
                 "no lines yet" state — previously they lived only in the
                 empty branch and vanished the moment the first line
                 committed. Committed lines stay the source of truth;
                 interim is purely a trailing view. */
              <div className="nnr-transcript-lines-list">
                {normalizedTranscriptLines.map((line, idx) => (
                  <p key={line.id || idx} className="nnr-transcript-para">
                    {showTimeline && (
                      <span className="nnr-transcript-prefix">{transcriptPrefixOf(line)}</span>
                    )}
                    <span className="nnr-transcript-text">{line.content}</span>
                    {transcriptSubTab === 'translated' && line.originalContent && (
                      <span className="nnr-transcript-original"> — {line.originalContent}</span>
                    )}
                  </p>
                ))}

                {/* Trailing live view: grey until confirmed, then it becomes a
                    committed black line above and this resets. */}
                {/* BRIS-NN-MNB-T63: the source ring + speaker name sit
                    directly above the live line, so they always appear with
                    the glyph rather than once at the top of the list. */}
                {recording && (
                  <div className="nnr-live-source">
                    <span className="nnr-live-source-dot" aria-hidden="true" />
                    <span>{transcriptUserName}</span>
                    <span className="nnr-live-source-state">
                      {captureAudio ? '(Audio Recording)' : '(Transcript only)'}
                    </span>
                  </div>
                )}

                {recording && (
                  <p className="nnr-transcript-para nnr-transcript-interim nnr-live-first">
                    {showTimeline && interimText && (
                      <span className="nnr-transcript-prefix">{transcriptPrefixOf(liveInterimLine)}</span>
                    )}
                    <span className="nnr-transcript-text">{interimText}</span>
                    <span className="nnr-live-glyph" aria-hidden="true"><BookOpen size={13} /></span>
                    <span className="nnr-typing-dots" aria-label="Transcribing">
                      <i /><i /><i />
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <AudioLines size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', margin: 0 }}>No transcript lines recorded yet.</p>
                <p style={{ fontSize: '13px', margin: '4px 0 0', color: '#cbd5e1' }}>Click "Start Transcribe" or upload an audio file to begin.</p>
              </div>
            )}
          </div>
        </div>
  );
}

export default TranscriptPanel;
