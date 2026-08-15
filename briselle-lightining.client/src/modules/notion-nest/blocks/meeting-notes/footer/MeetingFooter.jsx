/* ============================================================
   NotionNest — meeting-notes/footer/MeetingFooter.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T22
   Purpose: Block footer — instructions selector, scrolling consent
            notice, read-aloud and copy.

   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Volume2, Copy, Check } from 'lucide-react';
import { InstructionsMenu } from '../config/InstructionsMenu';
import { useMeetingNotes } from '../context/MeetingNotesContext';

const CONSENT_NOTICE =
  'By starting, you confirm everyone being transcribed has given consent.';

export function MeetingFooter() {
  const {
    selectedInstruction,
    setSelectedInstruction,
    INSTRUCTION_PRESETS,
    saveProp,
    openAddPromptModal,
    readAloud,
    copyText,
    activeTranscriptText,
  } = useMeetingNotes();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);

  /* Dismiss the instructions dropdown on outside click. mousedown so a
     click on a row still runs its handler before the menu closes. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (preset) => {
    setSelectedInstruction?.(preset);
    saveProp('selectedInstruction', preset);
    setOpen(false);
  };

  const handleCopy = () => {
    copyText?.(activeTranscriptText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="nnr-meeting-footer">
      {/* Instructions selector */}
      <div className="nnr-footer-instructions" ref={wrapRef}>
        <span className="nnr-footer-label">Instructions:</span>
        <button
          type="button"
          className="nnr-footer-select"
          onClick={() => setOpen(!open)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span>{selectedInstruction || 'Auto'}</span>
          <ChevronDown size={14} />
        </button>

        {/* BRIS-NN-MNB-T26: renders the SAME InstructionsMenu as the slider
            menu, so edit / more / add and the per-item icons are identical
            in both places. This used to be a separate, simpler list. */}
        {open && (
          <div className="nnr-footer-menu nnr-settings-flyout" role="menu">
            <InstructionsMenu onDone={() => setOpen(false)} />
          </div>
        )}
      </div>

      <span className="nnr-footer-divider" aria-hidden="true" />

      {/* Consent notice — scrolls because the strip is narrower than the
          sentence. Pauses on hover so it stays readable. */}
      <div className="nnr-footer-ticker" title={CONSENT_NOTICE}>
        <span className="nnr-footer-ticker-text">{CONSENT_NOTICE}</span>
      </div>

      <div className="nnr-footer-actions">
        <button
          type="button"
          className="nnr-footer-icon-btn"
          onClick={() => readAloud?.(activeTranscriptText)}
          aria-label="Read transcript aloud"
          title="Read aloud"
        >
          <Volume2 size={15} />
        </button>
        <button
          type="button"
          className="nnr-footer-icon-btn"
          onClick={handleCopy}
          aria-label="Copy transcript"
          title={copied ? 'Copied' : 'Copy transcript'}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

export default MeetingFooter;
