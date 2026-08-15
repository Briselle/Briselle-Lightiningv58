/* ============================================================
   NotionNest — meeting-notes/header/ParticipantsPanel.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L2730-L2763

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { X } from 'lucide-react';

export function ParticipantsPanel() {
  const {
    addParticipant,
    newParticipantEmail,
    newParticipantName,
    participants,
    removeParticipant,
    setNewParticipantEmail,
    setNewParticipantName,
  } = useMeetingNotes();
  return (
        <div className="mt-participants-panel" style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Participants ({participants.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {participants.map(p => (
              <div key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '16px', background: '#fff', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                <span>{p.name || p.email}</span>
                <X size={12} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => removeParticipant(p.id)} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Participant Name"
              value={newParticipantName}
              onChange={e => setNewParticipantName(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <input
              type="text"
              placeholder="Email (optional)"
              value={newParticipantEmail}
              onChange={e => setNewParticipantEmail(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <button
              type="button"
              onClick={addParticipant}
              style={{ padding: '4px 10px', borderRadius: '4px', background: '#0070d2', color: '#fff', border: 'none', fontSize: '12px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        </div>
  );
}

export default ParticipantsPanel;
