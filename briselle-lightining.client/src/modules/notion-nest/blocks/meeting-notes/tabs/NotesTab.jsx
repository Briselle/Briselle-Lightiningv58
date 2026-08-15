/* ============================================================
   NotionNest — meeting-notes/tabs/NotesTab.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L3037-L3048

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';

export function NotesTab() {
  const {
    BR,
    block,
  } = useMeetingNotes();
  return (
        <div className="nnr-tab-content nnr-notes-tab" style={{ padding: '16px', minHeight: '260px' }}>
          <div className="blocks-container">
            {BR && (block.notesBlocks || []).map((b, i) => (
              <BR key={b.id} block={b} blocksArray={block.notesBlocks || []} blockIndex={i} />
            ))}
            {(!block.notesBlocks || block.notesBlocks.length === 0) && (
              <div style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', padding: '12px 4px' }}>
                Type '/' for commands or start typing meeting notes...
              </div>
            )}
          </div>
        </div>
  );
}

export default NotesTab;
