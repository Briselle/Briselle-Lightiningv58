/**
 * Plan-mode step checklist shown under bot messages.
 */
export default function ZivaPlanChecklist({ steps, onToggleStep }) {
  if (!Array.isArray(steps) || !steps.length) return null;

  return (
    <div className="ziva-plan-checklist" role="list" aria-label="Plan steps">
      <div className="ziva-plan-checklist-title">Plan</div>
      <ul className="ziva-plan-checklist-list">
        {steps.map((step, idx) => {
          const id = step.id || `step-${idx}`;
          const done = !!step.done;
          const label = String(step.label ?? step.text ?? `Step ${idx + 1}`).trim();
          return (
            <li key={id} className={`ziva-plan-step${done ? ' ziva-plan-step--done' : ''}`}>
              <label className="ziva-plan-step-label">
                <input
                  type="checkbox"
                  className="ziva-plan-step-check"
                  checked={done}
                  onChange={() => onToggleStep?.(id)}
                  aria-label={`Mark step done: ${label}`}
                />
                <span className="ziva-plan-step-text">{label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="ziva-plan-checklist-hint">
        Review the draft above. Switch to <strong>Control</strong> or say <strong>Create</strong> when you are ready to
        save.
      </p>
    </div>
  );
}
