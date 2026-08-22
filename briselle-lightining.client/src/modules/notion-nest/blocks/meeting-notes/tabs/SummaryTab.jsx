/* ============================================================
   NotionNest — meeting-notes/tabs/SummaryTab.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L3001-L3030

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { Loader2, Sparkles } from 'lucide-react';
import { SummaryProgress } from '../summary/SummaryProgress';
import { normaliseHeadingLevels } from '../promptSerializer';

export function SummaryTab() {
  const {
    block,
    handleGenerateSummary,
    isGeneratingSummary,
    renderMd,
    summary,
    summarySteps,
  } = useMeetingNotes();

  /* BRIS-NN-MNB-T82: the checklist reports which stage the pipeline has
     actually reached. The old centred spinner said nothing at all, so a
     slow model looked identical to a stalled one. The spinner is kept as
     the fallback for a run that has not registered any step yet. */
  const hasSteps = !!(summarySteps && summarySteps.length);

  /* BRIS-NN-MNB-T85: the checklist is scaffolding — once the summary is
     on screen it has served its purpose and only pushes the content
     down, so it is hidden on success.

     A FAILED run is the exception: there is no summary to show, and the
     failed row carries the only explanation of why (which provider was
     tried, what it returned). Hiding it there would leave the user with
     a bare "No summary generated yet" and no reason. */
  const hasFailure = !!(summarySteps || []).some(s => s.status === 'failed');
  const showProgress = hasSteps && (isGeneratingSummary || hasFailure);

  /* T88: minHeight moved to .nnr-tab-content.nnr-summary-tab, alongside the
     tab's top padding, so the spacing above the summary is decided in one
     place instead of three. */
  return (
        <div className="nnr-tab-content nnr-summary-tab">
          {showProgress && <SummaryProgress />}

          {/* T86: the last accent blue in this tab, replaced with the row's
              neutral ink so the summary view matches the tab header. */}
          {isGeneratingSummary && !hasSteps && (
            <div className="nnr-summary-booting">
              <Loader2 size={28} className="nnr-spin-icon" />
              <p className="nnr-summary-booting-title">Generating AI structured summary…</p>
              <p className="nnr-summary-booting-sub">Analyzing meeting notes and transcript using Ziva AI</p>
            </div>
          )}

          {/* The previous summary is deliberately NOT rendered while a new
              one is being produced: the checklist takes its place and the
              finished text replaces it in one step, so a stale summary is
              never on screen next to progress for its replacement. */}
          {!isGeneratingSummary && (summary || block.summary) && (
            <div className="nnr-summary-content">
              {/* T124: normalise heading depth first. The model picks its
                  own level — one summary opens with ##, the next with ### —
                  and the two then render at different sizes. */}
              <div
                className="mt-rich-text"
                dangerouslySetInnerHTML={{ __html: renderMd(normaliseHeadingLevels(summary || block.summary)) }}
              />
            </div>
          )}

          {!isGeneratingSummary && !(summary || block.summary) && (
            <div className="nnr-summary-empty">
              <Sparkles size={30} className="nnr-summary-empty-icon" />
              <p className="nnr-summary-empty-title">No summary generated yet.</p>
              <button
                type="button"
                className="nnr-summary-empty-btn"
                onClick={() => handleGenerateSummary()}
              >
                <Sparkles size={14} />
                <span>Generate summary now</span>
              </button>
            </div>
          )}
        </div>
  );
}

export default SummaryTab;
