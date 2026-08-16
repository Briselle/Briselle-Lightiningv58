/* ============================================================
   NotionNest — meeting-notes/config/InstructionsMenu.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (BRIS-NN-MNB-T26 initial version)

   Task: BRIS-NN-MNB-T26 / T27
   Purpose: The single Summary-instructions menu, rendered by both the
            slider-menu flyout and the footer selector.

   Per row: icon, name, Default badge, edit, and a more menu offering
   "Set as default" and "Remove from my menu".

   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { useState, useRef, useEffect } from 'react';
import {
  Check, Edit3, MoreHorizontal, Plus, Sparkles, Users, Signpost,
  Headphones, Presentation, FileText, Pin, MinusCircle,
} from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';

/* One glyph per preset so rows are identifiable at a glance. */
const PRESET_ICONS = {
  Auto: Sparkles,
  Meeting: Users,
  Interview: Signpost,
  Call: Headphones,
  'Stand-up': Users,
  Workshop: Presentation,
};

/** Icons a custom instruction can be given. */
export const CUSTOM_ICON_CHOICES = {
  FileText, Users, Signpost, Headphones, Presentation, Sparkles,
};

export function InstructionsMenu({ onDone }) {
  const {
    INSTRUCTION_PRESETS,
    selectedInstruction,
    saveProp,
    setSelectedInstruction,
    openEditPromptModal,
    handleAddCustomInstruction,
    customInstructions,
    defaultInstruction,
    setDefaultInstruction,
    hiddenInstructions,
    setHiddenInstructions,
    instructionIcons,
  } = useMeetingNotes();

  const [moreFor, setMoreFor] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!moreFor) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setMoreFor(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [moreFor]);

  const hidden = hiddenInstructions || [];
  const presets = (INSTRUCTION_PRESETS || ['Auto']).filter(i => !hidden.includes(i));
  const customs = (customInstructions || []).filter(i => !hidden.includes(i));
  const activeDefault = defaultInstruction || 'Auto';

  const select = (inst) => {
    setSelectedInstruction?.(inst);
    saveProp('selectedInstruction', inst);
    onDone?.();
  };

  const edit = (e, inst) => {
    e.stopPropagation();
    setMoreFor(null);
    onDone?.();
    openEditPromptModal(inst);
  };

  const setDefault = (e, inst) => {
    e.stopPropagation();
    setDefaultInstruction?.(inst);
    saveProp('defaultInstruction', inst);
    setMoreFor(null);
  };

  /* "Remove from my menu" hides the row for this block. It does not delete
     the underlying prompt, so the choice stays reversible. */
  const removeFromMenu = (e, inst) => {
    e.stopPropagation();
    const next = [...hidden, inst];
    setHiddenInstructions?.(next);
    saveProp('hiddenInstructions', next);
    if (selectedInstruction === inst) {
      setSelectedInstruction?.(activeDefault);
      saveProp('selectedInstruction', activeDefault);
    }
    setMoreFor(null);
  };

  const Row = ({ inst, isCustom }) => {
    const named = instructionIcons?.[inst];
    const Icon = (named && CUSTOM_ICON_CHOICES[named])
      || PRESET_ICONS[inst]
      || FileText;
    const isSelected = (selectedInstruction || activeDefault) === inst;
    const isDefault = activeDefault === inst;

    return (
      <div
        className={`nnr-instr-row${isSelected ? ' active' : ''}`}
        onClick={() => select(inst)}
      >
        <Icon size={15} className="nnr-instr-icon" />
        <span className="nnr-instr-label" title={inst}>{inst}</span>

        {isDefault && <span className="nnr-instr-default">Default</span>}
        {isSelected && !isDefault && <Check size={13} className="nnr-instr-check" />}

        <span className="nnr-instr-actions">
          {/* BRIS-NN-MNB-T99: every instruction is editable, Auto included.
              Its prompt is a row in the platform_config document like any
              other, and a built-in can be reset from inside the editor, so
              there is nothing to protect it from. */}
          <button
            type="button"
            className="nnr-flyout-action"
            onClick={(e) => edit(e, inst)}
            aria-label={`Edit ${inst}`}
            title="Edit instructions"
          >
            <Edit3 size={13} />
          </button>
          <button
            type="button"
            className="nnr-flyout-action"
            onClick={(e) => { e.stopPropagation(); setMoreFor(moreFor === inst ? null : inst); }}
            aria-haspopup="menu"
            aria-expanded={moreFor === inst}
            aria-label={`More options for ${inst}`}
            title="More options"
          >
            <MoreHorizontal size={13} />
          </button>
        </span>

        {moreFor === inst && (
          <div className="nnr-instr-more" role="menu">
            <button type="button" role="menuitem" className="nnr-instr-more-item"
                    onClick={(e) => setDefault(e, inst)}>
              <Pin size={14} />
              <span>Set as default</span>
            </button>
            <button type="button" role="menuitem" className="nnr-instr-more-item"
                    onClick={(e) => removeFromMenu(e, inst)}>
              <MinusCircle size={14} />
              <span>Remove from my menu</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="nnr-instr-menu" ref={rootRef}>
      <div className="nnr-instr-heading">Summary instructions</div>

      {presets.map(inst => <Row key={inst} inst={inst} />)}
      {customs.map(inst => <Row key={inst} inst={inst} isCustom />)}

      <div
        className="nnr-instr-row nnr-instr-add"
        onClick={() => { onDone?.(); handleAddCustomInstruction(); }}
      >
        <Plus size={15} className="nnr-instr-add-icon" />
        <span>Add custom instructions</span>
      </div>
    </div>
  );
}

export default InstructionsMenu;
