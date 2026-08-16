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
import { CUSTOM_ICON_CHOICES } from './InstructionsMenu';

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
  const [name, setName] = useState(instructionKey);
  const [icon, setIcon] = useState(entry?.icon || 'FileText');
  const [initialBlocks, setInitialBlocks] = useState(null);
  const [error, setError] = useState('');

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
    setName(instructionKey);
    setIcon(entry?.icon || 'FileText');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, instructionKey]);

  const handleChange = useCallback((page) => {
    if (page && Array.isArray(page.blocks)) blocksRef.current = page.blocks;
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = (name || '').trim();
    if (!trimmed) { setError('Give this instruction a name.'); return; }

    const promptText = blocksToMarkdown(blocksRef.current);
    if (!promptText.trim()) { setError('The prompt is empty.'); return; }

    onSave?.(instructionKey, {
      name: trimmed,
      icon,
      blocks: blocksRef.current,
      promptText,
    });
  }, [name, icon, instructionKey, onSave]);

  if (!isOpen) return null;

  const isSystem = !!entry?.isSystem;

  return (
    <div className="nnr-ie-overlay" role="dialog" aria-modal="true" aria-label="Edit instruction">
      <div className="nnr-ie-modal">
        <div className="nnr-ie-head">
          <div className="nnr-ie-identity">
            <select
              className="nnr-ie-icon-select"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              aria-label="Instruction icon"
              title="Instruction icon"
            >
              {Object.keys(CUSTOM_ICON_CHOICES).map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>

            <input
              className="nnr-ie-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Instruction name"
              aria-label="Instruction name"
              /* A shipped preset's key is its seed identity — renaming it
                 would orphan the reset-to-default mapping. */
              disabled={isSystem}
              title={isSystem ? 'Built-in instructions cannot be renamed' : undefined}
            />
            {isSystem && <span className="nnr-ie-badge">Built-in</span>}
          </div>

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
              initialTitle=""
              onChange={handleChange}
              showSidebar={false}
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
