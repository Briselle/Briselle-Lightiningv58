/* ============================================================
   NotionNest — meeting-notes/transcript/TranscriptToolbar.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: transcript/TranscriptPanel.jsx#L86-L181

   Task: BRIS-NN-MNB-T66
   Purpose: The controls strip — sub-tabs, translate popover, live
            recording controls and the audio player.

   Mounted by MeetingNotesBlockBase directly under the tab row rather
   than inside the Transcript tab, so playback and recording controls
   stay visible from Summary and Notes as well.
   ============================================================ */
import { Languages, X } from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { LANGUAGE_CODE_MAP, getNativeLangDisplay } from '../constants';
import { TranscribeControl } from './TranscribeControl';
import { AudioPlayerBar } from './AudioPlayerBar';

export function TranscriptToolbar() {
  const {
    transcriptSubTab, setTranscriptSubTab, translatedLanguage,
    translateWrapRef, showTranslatePopover, setShowTranslatePopover,
    translateFrom, setTranslateFrom, translateTo, setTranslateTo,
    isTranslating, translationProgress, handleTranslateTranscript,
  } = useMeetingNotes();

  return (
      <div className="nnr-transcript-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
        {/* Left Edge: Original vs Translated Sub-Tabs */}
        <div className="nnr-transcript-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* BRIS-NN-MNB-T18: the Original/Translated switch only makes
              sense once a translation exists, so it stays hidden until
              then. The translated tab is labelled in the target language's
              own script — "in தமிழ்" rather than "Translated (Tamil)". */}
          {translatedLanguage && (
            <div className="nnr-subtab-toggle">
              <button
                type="button"
                className={`nnr-subtab-btn${transcriptSubTab === 'original' ? ' active' : ''}`}
                onClick={() => setTranscriptSubTab('original')}
              >
                Original
              </button>
              <button
                type="button"
                className={`nnr-subtab-btn${transcriptSubTab === 'translated' ? ' active' : ''}`}
                onClick={() => setTranscriptSubTab('translated')}
                lang={LANGUAGE_CODE_MAP[translatedLanguage] || undefined}
              >
                in {getNativeLangDisplay(translatedLanguage) || translatedLanguage}
              </button>
            </div>
          )}

          {/* Translate Action Trigger */}
          <div className="nnr-translate-wrap" ref={translateWrapRef} style={{ position: 'relative' }}>
            {/* BRIS-NN-MNB-T19: the always-visible Translate button is gone —
                it duplicated the 3-dot menu's translate action. This wrapper
                stays because it positions the popover, which the menu opens. */}
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
        </div>

        {/* Right Edge: Start Transcribe + Upload + Audio Files + 3-Dot More Menu */}
        <div className="nnr-transcript-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* BRIS-NN-MNB-T43: the live controls (equalizer, pause, stop)
              render here rather than in the tab row, so they only exist
              while the Transcript tab is showing and never crowd the
              Summary tab. The idle Start button stays in the tab row,
              since that has to be reachable before this tab exists. */}
          <TranscribeControl variant="running" />
          <AudioPlayerBar />
          {/* BRIS-NN-MNB-T17: the standalone Upload button is gone — the
              split button's "Transcribe audio file" mode covers it. */}

          {/* BRIS-NN-MNB-T44: audio files moved to the tab row, before
              the slider icon. See tabs/MeetingTabBar.jsx. */}

          {/* BRIS-NN-MNB-T38: the 3-dot menu is gone. Read aloud and
              Copy already existed in the footer; Clear transcript and
              Timestamps moved there too, and Translate moved to the
              slider menu. Nothing here was unique. */}
        </div>
      </div>

  );
}

export default TranscriptToolbar;
