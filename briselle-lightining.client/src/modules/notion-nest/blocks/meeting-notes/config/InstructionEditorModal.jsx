/* ============================================================
   NotionNest — meeting-notes/config/InstructionEditorModal.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: meeting-notes/config/EditPromptModal.jsx@2026-08-15
                              (bespoke contentEditable editor — deleted)

   Task: BRIS-NN-MNB-T98
   Purpose: Edit an instruction prompt using the REAL NotionNest editor.

   ── Why the previous editor was deleted, not repaired ──────────
   EditPromptModal rendered each block as `contentEditable` AND
   `dangerouslySetInnerHTML={{__html: block.content}}` with no
   `onInput`. React owned that DOM subtree while the browser tried to
   mutate it, state never received a keystroke, and content was read
   back out of the DOM at save time. That is why nothing could be
   typed. Repairing it would have meant finishing a second editor
   alongside the one the platform already has.

   This embeds NotionNestPage itself, so the prompt editor supports
   every block, shortcut and menu the parent page does — because it IS
   the parent page.

   ── The one restriction ────────────────────────────────────────
   `excludedBlockTypes={['meeting_notes']}` (BRIS-NN-T97). A Meeting
   Notes block inside a Meeting Notes prompt would nest the editor in
   itself. The exclusion is enforced in the slash menu, the markdown
   shortcuts and BlockRenderer, so it cannot be reached by typing
   "/meeting", "mt ", or by pasting stored content.

   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, X } from 'lucide-react';
import NotionNestPage from '../../../core/NotionNestPage';
import { blocksToMarkdown, instructionToBlocks } from '../promptSerializer';

/** Excluded types. Module-level so the array identity is stable. */
const EDITOR_EXCLUDED_BLOCKS = ['meeting_notes'];

export function InstructionEditorModal({
  isOpen,
  mode = 'edit',
  instructionKey = '',
  entry = null,
  isSaving = false,
  onSave,
  onReset,
  onClose,
}) {
  const [initialBlocks, setInitialBlocks] = useState(null);
  const [initialTitle, setInitialTitle] = useState(instructionKey);
  const [initialIcon, setInitialIcon] = useState(entry?.icon || '📝');
  const [error, setError] = useState('');

  /* Title and icon arrive through onChange like the blocks do; refs for the
     same reason — re-rendering on every keystroke would remount the page. */
  const titleRef = useRef(instructionKey);
  const iconRef = useRef(entry?.icon || '📝');

  /* Live blocks are held in a ref, not state: NotionNestPage fires
     onChange on every keystroke, and re-rendering this modal on each one
     would remount the editor and lose the caret. */
  const blocksRef = useRef([]);

  /* Rebuild only when a DIFFERENT instruction is opened. Rebuilding on
     every render would hand NotionNestPage new initialBlocks mid-edit and
     reset the document under the user. */
  useEffect(() => {
    if (!isOpen) return;
    const blocks = instructionToBlocks(entry);
    blocksRef.current = blocks;
    setInitialBlocks(blocks);
    titleRef.current = instructionKey;
    iconRef.current = entry?.icon || '📝';
    setInitialTitle(instructionKey);
    setInitialIcon(entry?.icon || '📝');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, instructionKey]);

  const handleChange = useCallback((page) => {
    if (!page) return;
    if (Array.isArray(page.blocks)) blocksRef.current = page.blocks;
    if (typeof page.title === 'string') titleRef.current = page.title;
    if (page.icon) iconRef.current = page.icon;
  }, []);

  const handleSave = useCallback(() => {
    /* A built-in keeps its key: it is the identity the defaults copy is
       matched on, so renaming one would orphan its reset. */
    const typed = (titleRef.current || '').trim();
    const trimmed = entry?.isSystem ? instructionKey : typed;
    if (!trimmed) { setError('Give this instruction a name in the page title.'); return; }

    const promptText = blocksToMarkdown(blocksRef.current);
    if (!promptText.trim()) { setError('The prompt is empty.'); return; }

    onSave?.(instructionKey, {
      name: trimmed,
      icon: iconRef.current,
      blocks: blocksRef.current,
      promptText,
    });
  }, [entry, instructionKey, onSave]);

  if (!isOpen) return null;

  const isSystem = !!entry?.isSystem;

  return (
    <div className="nnr-ie-overlay" role="dialog" aria-modal="true" aria-label="Edit instruction">
      <div className="nnr-ie-modal">
        {/* T103: no name field and no icon selector here. The embedded page
            renders its OWN icon + title with Notion formatting, and that
            title IS the instruction name — which is the point of reusing
            the editor. A second name box above it was both duplicate UI
            and the reason the real title looked "missing": it was there,
            just pushed out of view under a header that repeated it. */}
        <div className="nnr-ie-head">
          <span className="nnr-ie-context">
            {isSystem ? 'Built-in instruction' : 'Custom instruction'}
          </span>
          <button type="button" className="nnr-ie-close" onClick={onClose}
                  aria-label="Close" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* The real editor. Everything the parent page can do, minus the
            Meeting Notes block. */}
        <div className="nnr-ie-body">
          {initialBlocks && (
            <NotionNestPage
              initialBlocks={initialBlocks}
              /* The page title is the instruction name, rendered with the
                 parent page's own big-title formatting. */
              initialTitle={initialTitle}
              /* And the page icon is the instruction icon, so the glyph the
                 dropdown shows is picked with the page's own picker. */
              initialIcon={initialIcon}
              onChange={handleChange}
              showSidebar={false}
              /* T113: keep the icon and the big title — they ARE the
                 instruction's identity — but drop the cover and the
                 comment affordance, which have no meaning for a prompt. */
              showPageCover={false}
              commentsAlwaysOff
              excludedBlockTypes={EDITOR_EXCLUDED_BLOCKS}
            />
          )}
        </div>

        <div className="nnr-ie-foot">
          {error && <span className="nnr-ie-error" role="alert">{error}</span>}

          {isSystem && mode === 'edit' && (
            <button
              type="button"
              className="nnr-ie-btn ghost"
              onClick={() => onReset?.(instructionKey)}
              disabled={isSaving}
              title="Discard edits and restore the shipped prompt"
            >
              <RotateCcw size={13} />
              <span>Reset to default</span>
            </button>
          )}

          <span className="nnr-ie-spacer" />

          <button type="button" className="nnr-ie-btn ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="nnr-ie-btn solid" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstructionEditorModal;
