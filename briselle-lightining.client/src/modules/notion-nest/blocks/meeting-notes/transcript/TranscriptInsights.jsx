/* ============================================================
   NotionNest — meeting-notes/transcript/TranscriptInsights.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L3054-L3101

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { ChevronDown, ChevronUp, Pin, Zap } from 'lucide-react';

export function TranscriptInsights() {
  const {
    computedInsights,
    insightsCollapsed,
    pinnedInsights,
    setInsightsCollapsed,
    title,
    togglePinInsight,
  } = useMeetingNotes();
  return (
      <div className="nnr-insights-accordion-wrap" style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: '8px 14px' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setInsightsCollapsed(!insightsCollapsed)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={14} style={{ color: '#0070d2' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Meeting Insights & Metrics</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Pinned Metrics Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {pinnedInsights.map(key => {
                const metric = computedInsights[key];
                if (!metric) return null;
                return (
                  <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', fontSize: '11px', fontWeight: 600 }}>
                    <span>{metric.label}:</span>
                    <span>{metric.value}</span>
                  </span>
                );
              })}
            </div>
            {insightsCollapsed ? <ChevronDown size={14} style={{ color: '#64748b' }} /> : <ChevronUp size={14} style={{ color: '#64748b' }} />}
          </div>
        </div>

        {!insightsCollapsed && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginTop: '12px' }}>
            {Object.entries(computedInsights).map(([key, item]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{item.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{item.value}</div>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); togglePinInsight(key); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: pinnedInsights.includes(key) ? '#0070d2' : '#cbd5e1' }}
                  title={pinnedInsights.includes(key) ? 'Unpin metric' : 'Pin metric to header bar'}
                >
                  <Pin size={13} style={{ fill: pinnedInsights.includes(key) ? '#0070d2' : 'none' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

export default TranscriptInsights;
