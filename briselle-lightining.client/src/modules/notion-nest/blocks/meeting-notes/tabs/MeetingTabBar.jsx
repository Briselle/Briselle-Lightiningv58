/* ============================================================
   NotionNest — meeting-notes/tabs/MeetingTabBar.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L2572-L2726

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { Waveform } from '../transcript/Waveform';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { AudioLines, Check, Edit3, ListTodo, Plus, Settings, Shield, Sliders, Sparkles, UserPlus, Users , RefreshCw , Pause , Play , Square } from 'lucide-react';

export function MeetingTabBar() {
  const {
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
          <button
            type="button"
            className={`nnr-tab-btn-pill${viewMode === 'transcript' ? ' active' : ''}`}
            onClick={() => setViewMode('transcript')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === 'transcript' ? '#ffffff' : 'transparent', color: viewMode === 'transcript' ? '#0f172a' : '#64748b', fontWeight: viewMode === 'transcript' ? 600 : 500, fontSize: '13px', cursor: 'pointer', boxShadow: viewMode === 'transcript' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <AudioLines size={14} />
            <span>Transcript</span>
          </button>
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

          {/* Multi-Participant Avatar Stack */}
          <div
            className="mt-avatar-group nnr-tab-avatar-group"
            onClick={() => setShowParticipantsPanel(!showParticipantsPanel)}
            title="Meeting Participants"
            style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
          >
            {participants.slice(0, 3).map((p, i) => (
              <div key={p.id} className="mt-avatar-circle" style={{ zIndex: 3 - i, width: '24px', height: '24px', borderRadius: '50%', background: '#0070d2', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: i > 0 ? '-6px' : '0', border: '2px solid #fff' }}>
                {p.name ? p.name.charAt(0).toUpperCase() : <Users size={11} />}
              </div>
            ))}
            {participants.length > 3 && (
              <div className="mt-avatar-circle mt-avatar-overflow" style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#64748b', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '-6px', border: '2px solid #fff' }}>
                +{participants.length - 3}
              </div>
            )}
            <div className="mt-avatar-circle mt-avatar-add" title="Add participant" style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px', border: '1px dashed #cbd5e1' }}>
              <UserPlus size={12} />
            </div>
          </div>

          {/* Settings / Sliders Icon */}
          <div className="nnr-settings-wrap" ref={settingsWrapRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="nnr-icon-btn"
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
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
