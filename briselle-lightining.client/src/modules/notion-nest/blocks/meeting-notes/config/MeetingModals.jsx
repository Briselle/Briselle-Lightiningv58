/* ============================================================
   NotionNest — meeting-notes/config/MeetingModals.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L3127-L3198

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { Info, Loader2 } from 'lucide-react';
import { EditPromptModal } from './EditPromptModal';
import ZivaApiSettingsModal from '../../../../ziva-chat-module/src/components/ZivaApiSettingsModal.jsx';

export function MeetingModals() {
  const {
    customInstructions,
    dynamicConfirmModalConfig,
    isTranslating,
    mode,
    saveProp,
    selectedInstruction,
    setCustomInstructions,
    setDynamicConfirmModalConfig,
    setSelectedInstruction,
    setShowZivaApiSettingsModal,
    setUnifiedModalOpen,
    showZivaApiSettingsModal,
    title,
    translateTo,
    translationProgress,
    unifiedModalInstruction,
    unifiedModalMode,
    unifiedModalOpen,
    unifiedModalPrompt,
  } = useMeetingNotes();
  return (
    <>
    {/* TASK-MN-EDITOR-003: Unified NotionNest Instruction Editor Modal */}
    {unifiedModalOpen && (
      <EditPromptModal
        isOpen={unifiedModalOpen}
        mode={unifiedModalMode}
        instructionName={unifiedModalInstruction}
        initialPrompt={unifiedModalPrompt}
        onClose={() => setUnifiedModalOpen(false)}
        onSave={(name, prompt) => {
          if (unifiedModalMode === 'add') {
            const updated = [...customInstructions, { name, prompt }];
            setCustomInstructions(updated);
            setSelectedInstruction(name);
            saveProp('customInstructions', updated);
            saveProp('selectedInstruction', name);
          } else {
            const updated = customInstructions.map(ci => ci.name === name ? { ...ci, prompt } : ci);
            setCustomInstructions(updated);
            saveProp('customInstructions', updated);
          }
          setUnifiedModalOpen(false);
        }}
      />
    )}

    {/* Central Ziva AI API Key Configuration & Routing Modal */}
    {showZivaApiSettingsModal && (
      <ZivaApiSettingsModal
        isOpen={showZivaApiSettingsModal}
        onClose={() => setShowZivaApiSettingsModal(false)}
      />
    )}

    {/* Platform Standard Warning / Confirm Modal */}
    {dynamicConfirmModalConfig && (
      <div className="nnr-modal-overlay" onClick={() => setDynamicConfirmModalConfig(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="nnr-custom-inst-modal" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '420px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: dynamicConfirmModalConfig.variant === 'warning' ? '#f59e0b' : '#3b82f6' }}>
              {dynamicConfirmModalConfig.icon || <Info size={24} />}
            </div>
            <strong style={{ fontSize: '16px', color: '#0f172a' }}>{dynamicConfirmModalConfig.title}</strong>
          </div>
          <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
            {dynamicConfirmModalConfig.message}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            {dynamicConfirmModalConfig.cancelText && (
              <button type="button" onClick={() => setDynamicConfirmModalConfig(null)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {dynamicConfirmModalConfig.cancelText}
              </button>
            )}
            <button type="button" onClick={() => { dynamicConfirmModalConfig.onConfirm?.(); setDynamicConfirmModalConfig(null); }} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0070d2', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              {dynamicConfirmModalConfig.confirmText || 'OK'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Universal Translation Floating Progress Bar */}
    {isTranslating && (
      <div className="nnr-translation-progress-bar" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '280px' }}>
        <Loader2 size={18} className="nnr-spin-icon" style={{ color: '#0070d2' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Translating to {translateTo}... ({translationProgress}%)</div>
          <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${translationProgress}%`, background: '#0070d2', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default MeetingModals;
