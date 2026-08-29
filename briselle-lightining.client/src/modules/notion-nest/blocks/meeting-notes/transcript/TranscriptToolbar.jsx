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
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { TranscribeControl } from './TranscribeControl';
import { MeetingAudioPlayer } from './MeetingAudioPlayer';

export function TranscriptToolbar() {
  const {
    /* T134: the translate popover and its language selects moved to the
       footer, so none of that state is read here any more. */
    translatedLanguage,
    showTranslatePopover,
    recording,
  } = useMeetingNotes();

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-MNB-T87 — do not render an empty strip.

     This row is mounted on EVERY tab so recording and playback controls
     stay reachable. But it only ever holds three things: the
     Original/Translated switch (needs a translation), the translate
     popover (needs to be open), and the live recording controls (need a
     recording). With none of them present it still rendered its own
     padding, background and bottom border — a blank ~40px band between
     the tab row and the tab content, which is the empty space visible
     under the header on the Summary tab.

     The `.nnr-transcript-toolbar:empty` rule elsewhere in the CSS was an
     attempt at this, but :empty only matches an element with no child
     nodes at all, and this one always had its two wrapper divs.
     ══════════════════════════════════════════════════════════════════ */
  const hasToolbarContent = !!translatedLanguage || !!showTranslatePopover || !!recording;

  return (
    <>
      {hasToolbarContent && (
      <div className="nnr-transcript-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
        {/* Left Edge: Original vs Translated Sub-Tabs */}
        <div className="nnr-transcript-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* BRIS-NN-MNB-T18: the Original/Translated switch only makes
              sense once a translation exists, so it stays hidden until
              then. The translated tab is labelled in the target language's
              own script — "in தமிழ்" rather than "Translated (Tamil)". */}
          {/* BRIS-NN-MNB-T111: the Original / “In <native>” switch moved to
              the top-centre of the transcript area, above the text it
              applies to. See transcript/TranscriptPanel.jsx. */}

          {/* BRIS-NN-MNB-T134: the From/To popover moved to the footer, where
              the Translate button that opens it actually lives. Anchored here
              it appeared at the far left of this strip, rows away from the
              button — and this strip only renders when it has other content,
              so the popover could open with no visible anchor at all.
              See footer/MeetingFooter.jsx. */}
        </div>

        {/* Right Edge: Start Transcribe + Upload + Audio Files + 3-Dot More Menu */}
        <div className="nnr-transcript-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* BRIS-NN-MNB-T43: the live controls (equalizer, pause, stop)
              render here rather than in the tab row, so they only exist
              while the Transcript tab is showing and never crowd the
              Summary tab. The idle Start button stays in the tab row,
              since that has to be reachable before this tab exists. */}
          <TranscribeControl variant="running" />
          {/* BRIS-NN-MNB-T70: the player moved out of this cramped flex
              row onto its own row below, so the FULL variant has space
              for its two lines. It renders nothing when the queue is
              empty, so the row costs nothing when idle. */}
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
      )}

      {/* Outside the guard: the player owns its own row and decides for
          itself whether it has a track to show. */}
      <MeetingAudioPlayer />
    </>
  );
}

export default TranscriptToolbar;
