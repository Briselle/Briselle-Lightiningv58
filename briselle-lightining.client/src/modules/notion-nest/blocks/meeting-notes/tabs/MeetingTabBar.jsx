/* ============================================================
   NotionNest — meeting-notes/tabs/MeetingTabBar.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L2572-L2726

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { TranscribeControl } from '../transcript/TranscribeControl';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { AudioLines, Check, Clock, Edit3, FileAudio, Headphones, ListTodo, Mic, Pause, Play, Plus, RefreshCw, Settings, Shield, Sliders, Sparkles, Square, Trash2, UserPlus, Users, Volume2 } from 'lucide-react';

export function MeetingTabBar() {
  const {
    removeAudioFiles,
    playSelectedAudioFiles,
    closeAllMenus,
    audioFilesWrapRef,
    setSelectedAudioFileIds,
    selectedAudioFileIds,
    removeAudioFile,
    formatTime,
    currentPlayingAudioId,
    playAudioFile,
    setShowAudioFilesDropdown,
    showAudioFilesDropdown,
    audioFiles,
    transcriptStarted,
    renderSettingsPopover,
    stopRecording,
    recording,
    resumeRecording,
    pauseRecording,
    isPaused,
    micVolumeSliderLevel,
    micVolume,
    block,
    consentMode,
    displayTranscriptLines,
    handleGenerateSummary,
    isGeneratingSummary,
    mode,
    notesContent,
    openAddPromptModal,
    participants,
    processing,
    saveProp,
    selectedInstruction,
    selectedWizardInstruction,
    setConsentMode,
    setDynamicConfirmModalConfig,
    setSelectedWizardInstruction,
    setShowParticipantsPanel,
    setShowSettingsPopover,
    setShowZivaApiSettingsModal,
    setViewMode,
    settingsWrapRef,
    showParticipantsPanel,
    showSettingsPopover,
    summary,
    title,
    transcription,
    viewMode,
  } = useMeetingNotes();
  return (
      <div className="nnr-tab-header nnr-notion-tab-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
        <div className="nnr-tab-group-left" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(summary || block.summary) && (
            <button
              type="button"
              className={`nnr-tab-btn-pill${viewMode === 'summary' ? ' active' : ''}`}
              onClick={() => setViewMode('summary')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === 'summary' ? '#ffffff' : 'transparent', color: viewMode === 'summary' ? '#0f172a' : '#64748b', fontWeight: viewMode === 'summary' ? 600 : 500, fontSize: '13px', cursor: 'pointer', boxShadow: viewMode === 'summary' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              <ListTodo size={14} />
              <span>Summary</span>
            </button>
          )}
          <button
            type="button"
            className={`nnr-tab-btn-pill${viewMode === 'notes' ? ' active' : ''}`}
            onClick={() => setViewMode('notes')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === 'notes' ? '#ffffff' : 'transparent', color: viewMode === 'notes' ? '#0f172a' : '#64748b', fontWeight: viewMode === 'notes' ? 600 : 500, fontSize: '13px', cursor: 'pointer', boxShadow: viewMode === 'notes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <Edit3 size={14} />
            <span>Notes</span>
          </button>
          {/* BRIS-NN-MNB-T29b: the Transcript tab appears only once
              transcription has been started, or a transcript already exists.
              A fresh block therefore shows just Notes plus Start. */}
          {(transcriptStarted || displayTranscriptLines.length > 0 || transcription) && (
            <button
              type="button"
              className={`nnr-tab-btn-pill${viewMode === 'transcript' ? ' active' : ''}`}
              onClick={() => setViewMode('transcript')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === 'transcript' ? '#ffffff' : 'transparent', color: viewMode === 'transcript' ? '#0f172a' : '#64748b', fontWeight: viewMode === 'transcript' ? 600 : 500, fontSize: '13px', cursor: 'pointer', boxShadow: viewMode === 'transcript' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              {/* T36: mic with signal lines, not a plain waveform */}
              <span className="nnr-tab-mic">
                <AudioLines size={15} />
                <Mic size={11} className="nnr-tab-mic-overlay" fill="currentColor" />
              </span>
              <span>Transcript</span>
            </button>
          )}
        </div>

        {/* BRIS-NN-MNB-T14: the live waveform + pause/stop now replace the
            Start Transcribe button in the transcript toolbar, so the running
            state lives in one place instead of two. See TranscriptPanel. */}

        <div className="nnr-tab-group-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Auto Consent vs Get Consent Myself Interchangeable Tag Badge */}
          {consentMode && (
            <div
              className="nnr-header-consent-badge"
              title={consentMode === 'manual' ? 'Click to change consent mode (Currently: Get Consent Myself)' : 'Click to change consent mode (Currently: Auto Consent)'}
              onClick={() => {
                setDynamicConfirmModalConfig({
                  title: 'Change Recording Consent Mode',
                  message: `Are you sure you want to switch consent mode to ${consentMode === 'manual' ? 'Auto Consent' : 'Get Consent Myself'}? This updates how meeting participants are notified.`,
                  icon: <Shield size={20} />,
                  confirmText: 'Switch Consent Mode',
                  cancelText: 'Cancel',
                  variant: 'info',
                  onConfirm: () => {
                    const newMode = consentMode === 'manual' ? 'auto' : 'manual';
                    setConsentMode(newMode);
                    saveProp('consentMode', newMode);
                  }
                });
              }}
            >
              {/* BRIS-NN-MNB-M04: compact single-line tag — styling lives in
                  NotionNestPage.css so it can't wrap or drift out of scale. */}
              {consentMode === 'manual' ? <UserPlus size={12} /> : <Shield size={12} />}
              <span>{consentMode === 'manual' ? 'Get Consent Myself' : 'Auto Consent'}</span>
            </div>
          )}

          {/* BRIS-NN-MNB-M05: icon-only summary action. The label lives in the
              tooltip so the tab row stays compact; wording flips to
              "Regenerate" once a summary already exists. */}
          {(displayTranscriptLines.length > 0 || transcription || notesContent) && (
            <button
              type="button"
              className="nnr-summary-icon-btn"
              disabled={isGeneratingSummary || processing}
              onClick={() => handleGenerateSummary()}
              aria-label={block.summary ? 'Regenerate summary' : 'Generate summary'}
              title={block.summary
                ? 'Regenerate AI summary from transcript and notes'
                : 'Generate AI summary from transcript and notes'}
            >
              {isGeneratingSummary || processing
                ? <Sparkles size={14} className="nnr-spin-icon" />
                : block.summary ? <RefreshCw size={14} /> : <Sparkles size={14} />}
            </button>
          )}

          {/* BRIS-NN-MNB-T41: once the Transcript tab exists, transcription can
              be restarted from the slider menu's Resume submenu, so the button
              is redundant. It stays visible while recording, because Pause and
              Stop live in the same control. */}
          {(recording || !(transcriptStarted || displayTranscriptLines.length > 0 || transcription)) && (
            <TranscribeControl variant="start" />
          )}

          {/* Multi-Participant Avatar Stack */}
          {/* BRIS-NN-MNB-T28: participants moved inline into the title,
              next to the @date. See header/MeetingHeader.jsx. */}
              {/* Audio files — only rendered when this block actually owns
                  recordings; otherwise just the 3-dot menu remains. */}
              {audioFiles.length > 0 && (
              <div className="nnr-audio-files-wrap" ref={audioFilesWrapRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="nnr-icon-btn"
                  title={`Audio files (${audioFiles.length})`}
                  onClick={() => { const next = !showAudioFilesDropdown; closeAllMenus('audioFiles'); setShowAudioFilesDropdown(next); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#64748b', display: 'flex', alignItems: 'center' }}
                >
                  <FileAudio size={15} />
                  {audioFiles.length > 0 && (
                    <span className="nnr-af-badge">{audioFiles.length}</span>
                  )}
                </button>
                {showAudioFilesDropdown && (
                  <div className="nnr-audio-files-dropdown">
                    {/* BRIS-NN-MNB-T49: select-all, per-file play/delete, and
                        duration / size / timestamp revealed on hover. */}
                    <div className="nnr-af-head">
                      <label className="nnr-af-selectall">
                        <input
                          type="checkbox"
                          checked={audioFiles.length > 0 && selectedAudioFileIds.length === audioFiles.length}
                          ref={el => { if (el) el.indeterminate = selectedAudioFileIds.length > 0 && selectedAudioFileIds.length < audioFiles.length; }}
                          onChange={e => setSelectedAudioFileIds(
                            e.target.checked ? audioFiles.map(a => a.id) : []
                          )}
                        />
                        {/* BRIS-NN-MNB-T54: (selected/total) while selecting,
                            plain (total) otherwise. */}
                        <span>
                          Audio files ({selectedAudioFileIds.length > 0
                            ? `${selectedAudioFileIds.length}/${audioFiles.length}`
                            : audioFiles.length})
                        </span>
                      </label>

                      {/* BRIS-NN-MNB-T55: mass play / mass delete replace the
                          count text once a selection exists. */}
                      {selectedAudioFileIds.length > 0 && (
                        <span className="nnr-af-mass">
                          <button
                            type="button"
                            className="nnr-af-btn"
                            onClick={() => playSelectedAudioFiles()}
                            aria-label={`Play ${selectedAudioFileIds.length} selected files`}
                            title="Play selected"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            type="button"
                            className="nnr-af-btn danger"
                            onClick={() => {
                              removeAudioFiles(selectedAudioFileIds);
                            }}
                            aria-label={`Delete ${selectedAudioFileIds.length} selected files`}
                            title="Delete selected"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      )}
                    </div>

                    {audioFiles.map((af, idx) => {
                      const checked = selectedAudioFileIds.includes(af.id);
                      const playing = currentPlayingAudioId === af.id;
                      const bytes = af.size != null ? Number(af.size)
                        : (typeof af.data === 'string' ? Math.round(af.data.length * 0.75) : null);
                      const kb = bytes != null ? Math.max(1, Math.round(bytes / 1024)) : null;
                      const when = af.timestamp ? new Date(af.timestamp).toLocaleString() : '';
                      const meta = [
                        af.duration != null ? formatTime(af.duration) : null,
                        kb ? (kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB') : null,
                        when,
                      ].filter(Boolean).join(' · ');
                      return (
                        <div key={af.id || idx} className={'nnr-af-row' + (playing ? ' playing' : '')}>
                          <label className="nnr-af-pick">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setSelectedAudioFileIds(
                                checked
                                  ? selectedAudioFileIds.filter(id => id !== af.id)
                                  : [...selectedAudioFileIds, af.id]
                              )}
                            />
                          </label>

                          <span className="nnr-af-name" title={af.name}>{af.name}</span>

                          <span className="nnr-af-actions">
                            <button
                              type="button"
                              className="nnr-af-btn"
                              onClick={() => playAudioFile(af)}
                              aria-label={'Play ' + af.name}
                              title="Play"
                            >
                              <Play size={13} />
                            </button>
                            <button
                              type="button"
                              className="nnr-af-btn danger"
                              onClick={() => removeAudioFile(af.id)}
                              aria-label={'Delete ' + af.name}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </span>

                          {/* revealed on hover; kept in the DOM so it is
                              available to screen readers at all times */}
                          <span className="nnr-af-meta">{meta || 'No metadata'}</span>
                        </div>
                      );
                    })}

                    {audioFiles.length === 0 && (
                      <div className="nnr-af-empty">No audio files yet</div>
                    )}
                  </div>
                )}
              </div>
              )}



          {/* Settings / Sliders Icon */}
          <div className="nnr-settings-wrap" ref={settingsWrapRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="nnr-icon-btn"
              onClick={() => { const next = !showSettingsPopover; closeAllMenus('settings'); setShowSettingsPopover(next); }}
              title="Settings & Presets"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#64748b' }}
            >
              <Sliders size={16} />
            </button>
            {/* BRIS-NN-MNB-M07: render the full slider menu owned by the Base
                (Resume/Pause, Retry summary, Language, Instructions, Consent,
                Delete transcript, Copy link, Move to, Delete, Connect Calendar,
                feedback, Learn more). A 5-item Instructions stub used to render
                here instead, which is why none of those options appeared. */}
            {showSettingsPopover && renderSettingsPopover()}
          </div>
        </div>
      </div>
  );
}

export default MeetingTabBar;
