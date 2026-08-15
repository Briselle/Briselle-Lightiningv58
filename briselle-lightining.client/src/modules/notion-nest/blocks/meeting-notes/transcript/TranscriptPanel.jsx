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
import { TranscriptStatsBar } from './TranscriptStatsBar';
import { Waveform } from './Waveform';
import { RecordingPill } from './RecordingPill';
import AudioController from '../../../../utility-modules/audio-controller/AudioController.jsx';

export function TranscriptPanel() {
  const {
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
          <RecordingPill />
          <div className="nnr-transcript-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
            {/* Left Edge: Original vs Translated Sub-Tabs */}
            <div className="nnr-transcript-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* BRIS-NN-MNB-T18: the Original/Translated switch only makes
                  sense once a translation exists, so it stays hidden until
                  then. The translated tab is labelled in the target language's
                  own script — "in தமிழ்" rather than "Translated (Tamil)". */}
              {translatedLanguage && (
                <div className="nnr-subtab-toggle">
                  <button
                    type="button"
                    className={`nnr-subtab-btn${transcriptSubTab === 'original' ? ' active' : ''}`}
                    onClick={() => setTranscriptSubTab('original')}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    className={`nnr-subtab-btn${transcriptSubTab === 'translated' ? ' active' : ''}`}
                    onClick={() => setTranscriptSubTab('translated')}
                    lang={LANGUAGE_CODE_MAP[translatedLanguage] || undefined}
                  >
                    in {getNativeLangDisplay(translatedLanguage) || translatedLanguage}
                  </button>
                </div>
              )}

              {/* Translate Action Trigger */}
              <div className="nnr-translate-wrap" ref={translateWrapRef} style={{ position: 'relative' }}>
                {/* BRIS-NN-MNB-T19: the always-visible Translate button is gone —
                    it duplicated the 3-dot menu's translate action. This wrapper
                    stays because it positions the popover, which the menu opens. */}
                {showTranslatePopover && (
                  <div className="nnr-translate-popover">
                    <div className="nnr-translate-popover-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Languages size={14} style={{ color: '#0070d2' }} />
                        <span>Universal Translation</span>
                      </div>
                      <X size={14} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setShowTranslatePopover(false)} />
                    </div>
                    <div className="nnr-translate-field">
                      <label className="nnr-translate-label">From Language</label>
                      <select value={translateFrom} onChange={e => setTranslateFrom(e.target.value)} className="nnr-translate-select">
                        <option value="auto">Auto / Any Language</option>
                        {Object.keys(LANGUAGE_CODE_MAP).map(lang => (
                          <option key={lang} value={lang}>
                            {lang.charAt(0).toUpperCase() + lang.slice(1)} {getNativeLangDisplay(lang) ? `(${getNativeLangDisplay(lang)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="nnr-translate-field">
                      <label className="nnr-translate-label">To Language</label>
                      <select value={translateTo} onChange={e => setTranslateTo(e.target.value)} className="nnr-translate-select">
                        {Object.keys(LANGUAGE_CODE_MAP).map(lang => (
                          <option key={lang} value={lang}>
                            {lang.charAt(0).toUpperCase() + lang.slice(1)} {getNativeLangDisplay(lang) ? `(${getNativeLangDisplay(lang)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="nnr-translate-action-btn"
                      disabled={isTranslating}
                      onClick={() => handleTranslateTranscript(translateFrom, translateTo)}
                    >
                      {isTranslating ? `Translating... (${translationProgress}%)` : 'Translate Now'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Edge: Start Transcribe + Upload + Audio Files + 3-Dot More Menu */}
            <div className="nnr-transcript-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* BRIS-NN-MNB-T14: idle shows the Start button; recording
                  replaces it in place with the live waveform + pause/stop,
                  so there is never a second competing recording control. */}
              {recording ? (
                <div className="nnr-tab-rec-group">
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
              ) : (
                /* BRIS-NN-MNB-T16: split button — primary action starts the
                   default mode; the chevron offers the three modes. Every row
                   begins transcribing immediately on click. */
                <div className="nnr-transcribe-split">
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
                    onClick={() => setShowTranscribeMenu(!showTranscribeMenu)}
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
              )}

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
              {/* BRIS-NN-MNB-T17: the standalone Upload button is gone — the
                  split button's "Transcribe audio file" mode covers it. */}

              {/* Audio files — only rendered when this block actually owns
                  recordings; otherwise just the 3-dot menu remains. */}
              {audioFiles.length > 0 && (
              <div className="nnr-audio-files-wrap" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="nnr-icon-btn"
                  title={`Audio files (${audioFiles.length})`}
                  onClick={() => setShowAudioFilesDropdown(!showAudioFilesDropdown)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#64748b', display: 'flex', alignItems: 'center' }}
                >
                  <FileAudio size={15} />
                </button>
                {showAudioFilesDropdown && (
                  <div className="nnr-audio-files-dropdown" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 9999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '8px', minWidth: '220px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', padding: '4px 8px' }}>Audio Files ({audioFiles.length})</div>
                    {audioFiles.map((af, idx) => (
                      <div
                        key={af.id || idx}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', background: currentPlayingAudioId === af.id ? '#f0f9ff' : 'transparent' }}
                        onClick={() => {
                          playAudioFile(af);
                          setShowAudioFilesDropdown(false);
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{af.fileName || af.name || `Recording #${idx+1}`}</span>
                        <Play size={12} style={{ color: '#0070d2' }} />
                      </div>
                    ))}
                    {audioFiles.length === 0 && (
                      <div style={{ padding: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No audio files uploaded yet.</div>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* 3-Dot More Menu */}
              <div className="nnr-more-menu-wrap" ref={moreMenuWrapRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="nnr-icon-btn"
                  title="More Transcript Actions"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#64748b', display: 'flex', alignItems: 'center' }}
                >
                  <MoreVertical size={15} />
                </button>
                {showMoreMenu && (
                  <div className="nnr-settings-popover mt-more-menu">
                    <div className="nnr-settings-item" onClick={() => { readAloud(activeTranscriptText); setShowMoreMenu(false); }}>
                      <Volume2 size={13} /> Read Aloud
                    </div>
                    <div className="nnr-settings-item" onClick={() => { setShowTimeline(!showTimeline); saveProp('showTimeline', !showTimeline); setShowMoreMenu(false); }}>
                      <Clock size={13} /> {showTimeline ? 'Hide Timestamps' : 'Show Timestamps'}
                    </div>
                    <div className="nnr-settings-item" onClick={() => { copyText(activeTranscriptText); setShowMoreMenu(false); }}>
                      <Copy size={13} /> Copy Transcript
                    </div>
                    <div className="nnr-settings-item" onClick={() => { setShowTranslatePopover(true); setShowMoreMenu(false); }}>
                      <Languages size={13} /> Translate...
                    </div>
                    <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                    <div className="nnr-settings-item" onClick={() => { clearTranscript(); setShowMoreMenu(false); }}>
                      <Trash2 size={13} /> Clear Transcript
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <TranscriptStatsBar />


          {/* BRIS-NN-MNB-T15: the audio tracker belongs to a FILE, not to live
              speech. Hidden on load; it appears only while an audio file is
              actually playing or being transcribed, and never during live
              transcription. Merely having an audioUrl is not enough. */}
          {audioUrl && !recording && (isPlaying || isTranscribingAudioFile || currentPlayingAudioId) && (
            <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <AudioController
                audioUrl={audioUrl}
                audioDuration={audioDuration}
                isPlaying={isPlaying}
                onPlayPause={togglePlayPause}
                onSeek={handleSeek}
                currentTime={currentTime}
                recording={recording}
              />
            </div>
          )}

          {/* Transcript Lines Area */}
          <div className="nnr-transcript-content" style={{ padding: '16px', minHeight: '240px' }}>
            {normalizedTranscriptLines.length > 0 ? (
              /* BRIS-NN-MNB-T09: plain paragraph flow — no cards, no background.
                 BRIS-NN-MNB-T02: the timestamp button reveals the grey prefix. */
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

                {/* BRIS-NN-MNB-T04: live speech streams into the same prose
                    flow with a blinking caret, so it reads as continuous
                    typing rather than a new card per phrase. */}
                {recording && interimText && (
                  <p className="nnr-transcript-para nnr-transcript-interim">
                    {showTimeline && (
                      <span className="nnr-transcript-prefix">{transcriptPrefixOf(liveInterimLine)}</span>
                    )}
                    <span className="nnr-transcript-text">{interimText}</span>
                    <span className="nnr-typing-caret" aria-hidden="true" />
                  </p>
                )}
              </div>
            ) : recording ? (
              /* BRIS-NN-MNB-T12: first words of a session — source label above,
                 greyed live text with a knowledge glyph and typing dots. */
              <div className="nnr-transcript-lines-list">
                <div className="nnr-live-source">
                  <span className="nnr-live-source-dot" aria-hidden="true" />
                  <span>{transcriptUserName}’s audio</span>
                </div>
                <p className="nnr-transcript-para nnr-transcript-interim nnr-live-first">
                  <span className="nnr-transcript-text">{interimText}</span>
                  <span className="nnr-live-glyph" aria-hidden="true"><BookOpen size={13} /></span>
                  <span className="nnr-typing-dots" aria-label="Transcribing">
                    <i /><i /><i />
                  </span>
                </p>
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
