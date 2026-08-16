/* ============================================================
   NotionNest — meeting-notes/summary/SummaryProgress.jsx
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T82
   Purpose: The checklist shown in the Summary tab while a summary is
            being produced. One row per step the pipeline actually ran.

   Every row corresponds to real work:
     • 'Saving audio recording'  — the DAM upload promise
     • 'Transcribing'            — recognition stopped
     • 'Reading transcript…'     — transcript + notes collated
     • 'Analyzing…'              — the Groq request, until the first token
     • one row per section       — headings streamed back by the model

   Nothing self-ticks on a timer. If a step is spinning, that work is
   genuinely still outstanding; if it shows a cross, it failed and the
   reason is on the row.

   Styling: styles/NotionNestPage.css. No inline CSS.
   ============================================================ */
import { Check, CornerDownRight, Loader2, X } from 'lucide-react';
import { useMeetingNotes } from '../context/MeetingNotesContext';

export function SummaryProgress() {
  const { summarySteps } = useMeetingNotes();

  if (!summarySteps || !summarySteps.length) return null;

  return (
    <div className="nnr-sumprog" role="status" aria-live="polite">
      {summarySteps.map(step => (
        <div key={step.id} className={`nnr-sumprog-row is-${step.status}`}>
          <span className="nnr-sumprog-icon" aria-hidden="true">
            {step.status === 'done' && <Check size={15} />}
            {step.status === 'active' && <Loader2 size={15} className="nnr-spin-icon" />}
            {step.status === 'failed' && <X size={15} />}
          </span>

          <span className="nnr-sumprog-label">{step.label}</span>

          {step.detail && (
            <span className="nnr-sumprog-detail">
              <CornerDownRight size={13} aria-hidden="true" />
              <span>{step.detail}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default SummaryProgress;
