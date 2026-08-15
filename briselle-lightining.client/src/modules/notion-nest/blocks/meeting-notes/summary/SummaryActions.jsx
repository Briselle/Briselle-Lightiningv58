/* ============================================================
   NotionNest — meeting-notes/summary/SummaryActions.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L3107-L3119

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { Download } from 'lucide-react';

export function SummaryActions() {
  const {
    downloadLLMLog,
    llmLogs,
  } = useMeetingNotes();
  return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '8px 14px', borderTop: '1px solid #f1f5f9', background: '#fff', fontSize: '11px' }}>
          <span style={{ color: '#64748b' }}>LLM Logs:</span>
          {llmLogs.request && (
            <button type="button" onClick={() => downloadLLMLog('request')} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Download size={11} /> Request Payload
            </button>
          )}
          {llmLogs.response && (
            <button type="button" onClick={() => downloadLLMLog('response')} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Download size={11} /> Response Payload
            </button>
          )}
        </div>
  );
}

export default SummaryActions;
