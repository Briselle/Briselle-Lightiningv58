/* ============================================================
   NotionNest — meeting-notes/tabs/SummaryTab.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L3001-L3030

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { Loader2, Sparkles } from 'lucide-react';

export function SummaryTab() {
  const {
    block,
    handleGenerateSummary,
    isGeneratingSummary,
    renderMd,
    summary,
  } = useMeetingNotes();
  return (
        <div className="nnr-tab-content nnr-summary-tab" style={{ minHeight: '260px' }}>
          {isGeneratingSummary && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
              <Loader2 size={32} className="nnr-spin-icon" style={{ color: '#0070d2', marginBottom: '16px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Generating AI Structured Summary...</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0' }}>Analyzing meeting notes and transcript using Ziva AI Architect</p>
            </div>
          )}

          {!isGeneratingSummary && (summary || block.summary) && (
            <div className="nnr-summary-content" style={{ padding: '20px', lineHeight: 1.6, color: '#1e293b' }}>
              <div className="mt-rich-text" dangerouslySetInnerHTML={{ __html: renderMd(summary || block.summary) }} />
            </div>
          )}

          {!isGeneratingSummary && !(summary || block.summary) && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Sparkles size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', margin: 0 }}>No summary generated yet.</p>
              <button
                type="button"
                onClick={() => handleGenerateSummary()}
                style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', background: '#0070d2', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >
                <Sparkles size={14} />
                <span>Generate Summary Now</span>
              </button>
            </div>
          )}
        </div>
  );
}

export default SummaryTab;
