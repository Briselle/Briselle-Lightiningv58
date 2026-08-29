/* ============================================================
   NotionNest — meeting-notes/tabs/NotesTab.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-17
   Previous Version Back URL: meeting-notes/tabs/NotesTab.jsx@2026-08-15
                              (bare BlockRenderer list — not editable)

   Task: BRIS-NN-MNB-R02..R06 / T110
   Purpose: The Notes tab, using the real NotionNest editor.

   ── Why the notes could not be typed into ──────────────────────
   This tab rendered BlockRenderer directly over `block.notesBlocks`:

       {BR && (block.notesBlocks || []).map(b => <BR block={b} … />)}

   BlockRenderer reads and writes through usePageContext() — the PARENT
   page's store. Those note blocks are nested inside a meeting block's
   own property, so they are not in the page's block tree at all:
   getBlockById() could never find them and every keystroke was written
   to nothing. The blocks rendered, and edits evaporated.

   Embedding NotionNestPage fixes it at the root, because the page
   brings its OWN PageProvider — a store that actually contains these
   blocks. It is the same reuse the instruction editor uses, and it
   gives the Notes tab every block, slash command and shortcut the
   parent page has.

   ── The one restriction ────────────────────────────────────────
   excludedBlockTypes={['meeting_notes']} (BRIS-NN-T97): a Meeting Notes
   block inside a meeting block's own notes would nest the block in
   itself.

   Persistence: notesBlocks is whitelisted in
   core/notionNestPageDefaults.ts — without that entry the sanitize pass
   strips it on every save.

   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import NotionNestPage from '../../../core/NotionNestPage';

/** Module-level so the array identity is stable across renders. */
const NOTES_EXCLUDED_BLOCKS = ['meeting_notes'];

/** Writing on every keystroke would deep-clone the whole page each time. */
const SAVE_DEBOUNCE_MS = 600;

export function NotesTab() {
  const { block, saveProp } = useMeetingNotes();

  /* Captured ONCE per block. Handing NotionNestPage fresh initialBlocks
     mid-edit would reset the document under the user, so this must not
     track block.notesBlocks as it changes. */
  const initialBlocks = useMemo(
    () => (Array.isArray(block.notesBlocks) && block.notesBlocks.length
      ? block.notesBlocks
      : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [block.id]
  );

  const timerRef = useRef(null);
  const pendingRef = useRef(null);

  const flush = useCallback(() => {
    if (pendingRef.current) {
      saveProp('notesBlocks', pendingRef.current);
      pendingRef.current = null;
    }
  }, [saveProp]);

  const handleChange = useCallback((page) => {
    if (!page || !Array.isArray(page.blocks)) return;
    pendingRef.current = page.blocks;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }, [flush]);

  /* Never lose the last edit to the debounce window on unmount — leaving
     the tab or the page must commit what is already typed. */
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    flush();
  }, [flush]);

  return (
    <div className="nnr-tab-content nnr-notes-tab">
      {/* T112: body only. The page header carries cover, icon, title and the
          Add cover / Add icon / Add comment actions — none of which belong
          inside a block that already has its own title and header. */}
      <NotionNestPage
        initialBlocks={initialBlocks}
        onChange={handleChange}
        showSidebar={false}
        showPageHeader={false}
        commentsAlwaysOff
        excludedBlockTypes={NOTES_EXCLUDED_BLOCKS}
      />
    </div>
  );
}

export default NotesTab;
