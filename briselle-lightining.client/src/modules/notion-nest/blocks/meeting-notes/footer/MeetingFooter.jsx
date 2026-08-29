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
import { ChevronDown, Volume2, Copy, Check, Eraser, Clock, Languages, X } from 'lucide-react';
import { InstructionsMenu } from '../config/InstructionsMenu';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { LANGUAGE_CODE_MAP, getNativeLangDisplay } from '../constants';

const CONSENT_NOTICE =
  'By starting, you confirm everyone being transcribed has given consent.';

export function MeetingFooter() {
  const {
    setShowTranslatePopover,
    showTranslatePopover,
    translateWrapRef,
    translateFrom, setTranslateFrom,
    translateTo, setTranslateTo,
    isTranslating, translationProgress,
    handleTranslateTranscript,
    setShowTimeline,
    showTimeline,
    clearTranscript,
    selectedInstruction,
    INSTRUCTION_PRESETS,
    saveProp,
    openAddPromptModal,
    readAloud,
    copyText,
    copyActiveTab,
    activeTranscriptText,
  } = useMeetingNotes();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);

  useDismissOnOutside(open, wrapRef, () => setOpen(false));

  const choose = (preset) => {
    /* T104: single write — setSelectedInstruction is itself a saveProp
       wrapper, so calling both fired the same mutation twice. */
    saveProp('selectedInstruction', preset);
    setOpen(false);
  };

  /* BRIS-NN-MNB-T116: copies the ACTIVE tab, with formatting. This always
     sent the transcript as plain text, whichever tab was open. */
  const handleCopy = async () => {
    const ok = await copyActiveTab?.();
    if (ok === false) return;
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
          <div className="nnr-footer-menu nnr-settings-flyout nnr-instr-flyout" role="menu">
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

      {/* BRIS-NN-MNB-T38: order is Speak → Clear → Timestamps → Copy.
          Clear and Timestamps moved here from the 3-dot menu, which has
          been removed now that everything in it lives in the footer. */}
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
        {/* BRIS-NN-MNB-T48: Translate sits right after Read aloud */}
        {/* BRIS-NN-MNB-T134: the From/To popover is anchored to THIS button —
            the one the user presses — instead of a wrapper in the transcript
            toolbar rows above. */}
        <div className="nnr-footer-translate-wrap" ref={translateWrapRef}>
          <button
            type="button"
            className="nnr-footer-icon-btn"
            onClick={() => setShowTranslatePopover?.(!showTranslatePopover)}
            aria-haspopup="dialog"
            aria-expanded={!!showTranslatePopover}
            aria-label="Translate transcript"
            title="Translate transcript"
          >
            <Languages size={15} />
          </button>

          {showTranslatePopover && (
            <div className="nnr-translate-popover">
              <div className="nnr-translate-popover-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Languages size={14} style={{ color: '#0070d2' }} />
                  <span>Universal Translation</span>
                </div>
                <X size={14} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setShowTranslatePopover(false)} />
              </div>
              <div className="nnr-translate-field">
                <label className="nnr-translate-label">From Language</label>
                <select value={translateFrom} onChange={e => setTranslateFrom(e.target.value)} className="nnr-translate-select">
                  <option value="auto">Auto / Any Language</option>
                  {Object.keys(LANGUAGE_CODE_MAP).map(lang => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)} {getNativeLangDisplay(lang) ? `(${getNativeLangDisplay(lang)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nnr-translate-field">
                <label className="nnr-translate-label">To Language</label>
                <select value={translateTo} onChange={e => setTranslateTo(e.target.value)} className="nnr-translate-select">
                  {Object.keys(LANGUAGE_CODE_MAP).map(lang => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)} {getNativeLangDisplay(lang) ? `(${getNativeLangDisplay(lang)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="nnr-translate-action-btn"
                disabled={isTranslating}
                onClick={() => handleTranslateTranscript(translateFrom, translateTo)}
              >
                {isTranslating ? `Translating... (${translationProgress}%)` : 'Translate Now'}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="nnr-footer-icon-btn"
          onClick={() => clearTranscript?.()}
          aria-label="Clear transcript"
          title="Clear transcript"
        >
          <Eraser size={15} />
        </button>
        <button
          type="button"
          className={`nnr-footer-icon-btn${showTimeline ? ' active' : ''}`}
          onClick={() => { setShowTimeline(!showTimeline); saveProp('showTimeline', !showTimeline); }}
          aria-pressed={showTimeline}
          aria-label={showTimeline ? 'Hide timestamps' : 'Show timestamps'}
          title={showTimeline ? 'Hide timestamps' : 'Show timestamps'}
        >
          <Clock size={15} />
        </button>
        <button
          type="button"
          className="nnr-footer-icon-btn"
          onClick={handleCopy}
          aria-label="Copy this tab"
          title={copied ? 'Copied' : 'Copy this tab'}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

export default MeetingFooter;
