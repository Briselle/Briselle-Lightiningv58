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
import { useState, useRef } from 'react';
import {
  Check, Edit3, Plus, Sparkles, Users, Signpost,
  Headphones, Presentation, FileText, Pin, MinusCircle, Search,
} from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
/* T106: the SAME renderer the page header uses, so whatever the editor's
   icon picker stores renders identically here. The picker emits forms like
   `svg:cpu:blue`, `initials:AB:green`, a URL, a lucide name or a bare emoji —
   reimplementing that parsing was what broke this three times. */
import { renderPageIcon, hasPageIcon } from '../../../menus/menus';

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
    openEditPromptModal,
    handleAddCustomInstruction,
    customInstructions,
    defaultInstruction,
    setDefaultInstruction,
    hiddenInstructions,
    setHiddenInstructions,
    instructionIcons,
    activePromptDoc,
    promptLibraryMissing,
    promptLoadError,
    retryPromptLoad,
  } = useMeetingNotes();

  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const hidden = hiddenInstructions || [];
  const presets = (INSTRUCTION_PRESETS || ['Auto']).filter(i => !hidden.includes(i));
  const customs = (customInstructions || []).filter(i => !hidden.includes(i));
  const activeDefault = defaultInstruction || 'Auto';

  /* T104: one write, not two. setSelectedInstruction IS a saveProp wrapper
     since T93, so calling both fired the same mutation twice — harmless but
     it made the path harder to reason about while this was being chased.

     The console line stays until the selection is confirmed working end to
     end: if a click still does not stick, this says whether the handler ran
     at all, which is the one thing static reading could not settle. */
  const select = (inst) => {
    // eslint-disable-next-line no-console
    console.debug('[Instructions] select', inst, '(was', selectedInstruction, ')');
    saveProp('selectedInstruction', inst);
    onDone?.();
  };

  const edit = (e, inst) => {
    e.stopPropagation();
    onDone?.();
    openEditPromptModal(inst);
  };

  const setDefault = (e, inst) => {
    e.stopPropagation();
    setDefaultInstruction?.(inst);
    saveProp('defaultInstruction', inst);
  };

  /* "Remove from my menu" hides the row for this block. It does not delete
     the underlying prompt, so the choice stays reversible. */
  const removeFromMenu = (e, inst) => {
    e.stopPropagation();
    const next = [...hidden, inst];
    setHiddenInstructions?.(next);
    saveProp('hiddenInstructions', next);
    if (selectedInstruction === inst) {
      saveProp('selectedInstruction', activeDefault);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T105 — renderRow is a FUNCTION, not a nested component.

     This was `const Row = ({inst}) => ...` declared inside the render.
     React compares component types by identity, so a Row created on each
     render is a NEW type every time — the whole list is unmounted and
     remounted on every re-render of this menu.

     A click needs mousedown AND mouseup on the SAME element. When the row
     under the pointer is replaced between the two, no click event is ever
     produced, and the handler simply never runs. The Edit and More
     buttons kept working because a button that is pressed and released
     without an intervening re-render still completes normally — which is
     exactly why editing worked while selecting did not.

     Returning JSX from a plain function keeps the same DOM elements
     across renders, so the click completes.
     ══════════════════════════════════════════════════════════════ */
  const renderRow = (inst) => {
    /* T106: the icon chosen in the editor wins, rendered by renderPageIcon.
       T105 tried to detect "is this a glyph?" and fell back whenever it was
       not — which suppressed every icon the picker produces, since those are
       descriptors like `svg:cpu:blue` rather than characters. (The
       ":cpu:bTechnical Discussion" overlap was that descriptor clipped to
       16px, showing its middle.) The page renderer understands every form. */
    const docIcon = activePromptDoc?.instructions?.[inst]?.icon;
    const hasDocIcon = hasPageIcon(docIcon);
    const named = instructionIcons?.[inst];
    const Icon = (named && CUSTOM_ICON_CHOICES[named]) || PRESET_ICONS[inst] || FileText;
    const isSelected = (selectedInstruction || activeDefault) === inst;
    const isDefault = activeDefault === inst;

    return (
      <div
        key={inst}
        className={`nnr-instr-row${isSelected ? ' active' : ''}`}
        role="menuitemradio"
        aria-checked={isSelected}
        tabIndex={0}
        onClick={() => select(inst)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(inst); } }}
      >
        {hasDocIcon
          ? <span className="nnr-instr-icon nnr-instr-pageicon" aria-hidden="true">{renderPageIcon(docIcon, '16px')}</span>
          : <Icon size={15} className="nnr-instr-icon" />}
        <span className="nnr-instr-label" title={inst}>{inst}</span>

        {isDefault && <span className="nnr-instr-default">Default</span>}
        {isSelected && !isDefault && <Check size={13} className="nnr-instr-check" />}

        {/* T106: inline actions. The 3-dot popover was absolutely positioned
            inside .nnr-instr-scroll, whose overflow clips it — so its menu
            was unreachable. Two icon buttons need no popover at all, and
            nothing can clip them. */}
        <span className="nnr-instr-actions">
          {/* BRIS-NN-MNB-T99: every instruction is editable, Auto included. */}
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
            className={`nnr-flyout-action${isDefault ? ' is-on' : ''}`}
            onClick={(e) => setDefault(e, inst)}
            aria-label={`Set ${inst} as default`}
            aria-pressed={isDefault}
            title={isDefault ? 'This is the default' : 'Set as default'}
          >
            <Pin size={13} />
          </button>
          <button
            type="button"
            className="nnr-flyout-action"
            onClick={(e) => removeFromMenu(e, inst)}
            aria-label={`Remove ${inst} from this menu`}
            title="Remove from my menu"
          >
            <MinusCircle size={13} />
          </button>
        </span>

      </div>
    );
  };

  /* BRIS-NN-MNB-T101: 12 presets plus customs is past the point of
     scanning by eye, and the list no longer fits a popover. */
  const q = query.trim().toLowerCase();
  const match = (inst) => !q || inst.toLowerCase().includes(q);
  const shownPresets = presets.filter(match);
  const shownCustoms = customs.filter(match);
  const nothingMatches = q && !shownPresets.length && !shownCustoms.length;

  return (
    <div className="nnr-instr-menu" ref={rootRef}>
      <div className="nnr-instr-heading">Summary instructions</div>

      <div className="nnr-instr-search">
        <Search size={13} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search instructions"
          aria-label="Search instructions"
          /* The row click must not be pre-empted by the popover's
             dismiss-on-mousedown listener. */
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>

      {/* T102: the library lives only in the database. If the migration has
          not been run there is nothing to offer, and saying so beats an
          empty menu with no explanation. */}
      {/* T144: a dropped request costs this menu, not the page. */}
      {promptLoadError && (
        <div className="nnr-instr-empty">
          {promptLoadError}{' '}
          <button type="button" className="nnr-instr-retry" onClick={retryPromptLoad}>
            Retry
          </button>
        </div>
      )}

      {promptLibraryMissing && !promptLoadError && (
        <div className="nnr-instr-empty">
          Prompt library not installed. Run
          {' '}<code>database/019_add_ai_prompts_config_type.sql</code> in Supabase.
        </div>
      )}

      <div className="nnr-instr-scroll">
        {shownPresets.map(renderRow)}
        {shownCustoms.map(renderRow)}
        {nothingMatches && (
          <div className="nnr-instr-empty">No instruction matches “{query}”.</div>
        )}
      </div>

      {/* Outside the scroll region: as the last row of an unscrollable
          list this was unreachable, which is why it looked missing. */}
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
