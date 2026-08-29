/**
 * Ziva assistant modes (Control / Plan / Learn / Explore).
 */
import { getConversationalFallback } from './zivaKnowledge.js';

export const DEFAULT_ASSISTANT_MODE = 'control';

export const ZIVA_ASSISTANT_MODES = [
  {
    id: 'control',
    label: 'Control',
    description: 'Act across Briselle — create objects, edit fields, run workflows, and navigate.',
    icon: 'fa-infinity',
    default: true,
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Design before you build — outline objects, fields, and steps; confirm before saving.',
    icon: 'fa-list-check',
  },
  {
    id: 'learn',
    label: 'Learn',
    description: 'Ask and understand — explanations, how-tos, and platform guidance without making changes.',
    icon: 'fa-circle-question',
  },
  {
    id: 'explore',
    label: 'Explore',
    description: 'Go deeper — cross-object insights, richer suggestions, and proactive discovery.',
    icon: 'fa-compass',
  },
];

export function getAssistantMode(id) {
  return ZIVA_ASSISTANT_MODES.find((m) => m.id === id) || ZIVA_ASSISTANT_MODES.find((m) => m.default);
}

export function isValidAssistantMode(id) {
  return ZIVA_ASSISTANT_MODES.some((m) => m.id === id);
}

/** Modes that may run comprehensive one-shot create (Plan = draft preview only). */
export function canRunComprehensiveCreate(assistantMode) {
  return assistantMode === 'control' || assistantMode === 'explore' || assistantMode === 'plan';
}

/** Modes that may start object menu workflows from chips / menu text. */
export function canStartMenuWorkflow(assistantMode, workflowMode = null) {
  if (assistantMode === 'control' || assistantMode === 'explore') return true;
  if (assistantMode === 'plan') {
    return workflowMode === 'create_object' || workflowMode == null;
  }
  return false;
}

/** Modes that may persist an object to the database. */
export function canRunCreateObject(assistantMode) {
  return assistantMode === 'control' || assistantMode === 'explore' || assistantMode === 'plan';
}

export function canApplyFieldAttributesInChat(assistantMode) {
  return assistantMode === 'control' || assistantMode === 'explore';
}

/** Plan/Learn block silent auto-save; Control/Explore allow when user asked. */
export function shouldAutoProceedCreate(assistantMode, specAutoProceed) {
  if (assistantMode === 'plan' || assistantMode === 'learn') return false;
  if (assistantMode === 'control') return !!specAutoProceed;
  if (assistantMode === 'explore') return !!specAutoProceed;
  return !!specAutoProceed;
}

export function shouldTryLocalAnswerFirst(assistantMode) {
  return assistantMode === 'learn';
}

export function usesLearnOrchestratePath(assistantMode) {
  return assistantMode === 'learn';
}

export function shouldAttachExploreContext(assistantMode) {
  return assistantMode === 'explore';
}

export function shouldShowPlanChecklist(assistantMode) {
  return assistantMode === 'plan';
}

export function getComposerPlaceholderForMode(assistantMode, defaultPlaceholder) {
  const hints = {
    control: defaultPlaceholder,
    plan: 'Describe what to plan (object, fields, workflow)…',
    learn: 'Ask how something works in Briselle…',
    explore: 'Explore data model ideas, connections, or next steps…',
  };
  return hints[assistantMode] || defaultPlaceholder;
}

export function getModeBlockedMessage(assistantMode, actionKind) {
  const mode = getAssistantMode(assistantMode);
  const label = mode?.label || 'this mode';
  const kinds = {
    comprehensive_create:
      `**${label}** is for planning and Q&A — I won’t auto-create objects here. Switch to **Control** (or use **Explore** for one-shot create with context), or stay in **Plan** and I’ll draft a field list you can review.`,
    menu_workflow:
      `**${label}** doesn’t run platform workflows from the menu. Switch to **Control** or **Explore** to load, edit, or modify objects — or ask me in **Learn** how those actions work.`,
    save_object:
      `**${label}** can’t save objects to the database. Switch to **Control** (or confirm in **Plan** after reviewing your draft).`,
    field_attributes:
      `Field attribute changes need **Control** or **Explore**. **Learn** is for questions only.`,
  };
  return kinds[actionKind] || `That action isn’t available in **${label}**. Try **Control** mode.`;
}

/** Mode-aware fallback when Groq / orchestrate is unavailable. */
export function getModeAwareFallback(assistantMode, userText = '') {
  const mode = assistantMode || DEFAULT_ASSISTANT_MODE;
  const generic = getConversationalFallback(userText);

  if (mode === 'learn') {
    return (
      `**Learn mode** — I explain Briselle concepts without changing your org.\n\n` +
      `Ask about objects, fields, records, or attributes. For hands-on work, switch to **Control**.\n\n` +
      (generic.includes('Ziva') ? '' : generic)
    );
  }
  if (mode === 'plan') {
    return (
      `**Plan mode** — I’ll outline objects, fields, and steps before anything is saved.\n\n` +
      `Describe what you want to build (e.g. “Plan a Sales object with these columns…”). I’ll show a checklist and a draft field list; say **Create** when ready.\n\n` +
      `_AI backend unavailable — using offline guidance._`
    );
  }
  if (mode === 'explore') {
    return (
      `**Explore mode** — I connect ideas across your object registry and suggest next steps.\n\n` +
      `Try “What objects do we have?” or “Suggest fields for a donor program.”\n\n` +
      `_AI backend unavailable — limited context without the Ziva server._`
    );
  }
  return generic;
}

export function buildAssistantModePromptBlock(assistantMode) {
  const mode = getAssistantMode(assistantMode);
  const blocks = {
    control: `ASSISTANT MODE: **Control** (default agent)
- Full Briselle copilot: start workflows, create/edit objects and fields, list objects, navigate, apply schema and attribute commands.
- When the user gives enough detail, proceed confidently (including one-shot create with explicit columns).
- Use relatedControls for workflow actions; use aiSuggestions for quick replies and field ideas.`,

    plan: `ASSISTANT MODE: **Plan**
- Like Cursor Plan: help the user **design** before executing — propose object names, field lists, workflows, and trade-offs.
- Return "planSteps": [{"id":"s1","label":"…","done":false}, ...] with 3–8 concrete steps for the user's goal.
- Do NOT imply you already saved or created unless the user explicitly confirmed (Create / Yes / Create it).
- Prefer numbered steps, options, and clear "next you can say…" guidance. You MAY set workflowCommand.start to create_object to build an in-chat draft preview, but never create_it until user confirms.
- Do not auto-save; offer a plan and ask what to adjust.`,

    learn: `ASSISTANT MODE: **Learn** (like Cursor Ask)
- Read-only / educational: explain Briselle concepts (objects, fields, records, attributes, workflows).
- Return ONLY {"answer":"markdown"} — no workflowCommand, navigate, relatedControls, aiSuggestions, schemaEditCommand, or fieldAttributeCommands.
- Do NOT start workflows or offer action buttons unless the user explicitly asks how to perform an action (then explain steps, do not execute).`,

    explore: `ASSISTANT MODE: **Explore** (advanced)
- Use session.exploreContext (object registry + field snapshots) for cross-object insights.
- Go beyond a single task: relate objects, suggest field sets, domains, naming, and follow-up ideas.
- You may start workflows when intent is clear, and offer richer aiSuggestions. Be proactive but accurate.`,
  };
  return blocks[mode?.id] || blocks.control;
}

/** Normalize plan steps from orchestrator. */
export function normalizePlanSteps(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s, i) => {
      if (s == null) return null;
      if (typeof s === 'string') {
        const label = s.trim();
        return label ? { id: `step-${i + 1}`, label, done: false } : null;
      }
      const label = String(s.label ?? s.text ?? '').trim();
      if (!label) return null;
      return {
        id: String(s.id ?? `step-${i + 1}`),
        label,
        done: !!(s.done === true || s.done === 1),
      };
    })
    .filter(Boolean);
}

/** Strip action fields for Learn (and partially Plan) responses. */
export function applyAssistantModeToOrchestrate(data, assistantMode) {
  if (!data || typeof data !== 'object') return data;
  const mode = assistantMode || DEFAULT_ASSISTANT_MODE;

  if (mode === 'learn') {
    return {
      ...data,
      navigate: [],
      relatedControls: [],
      aiSuggestions: [],
      workflowCommand: null,
      schemaEditCommand: null,
      fieldAttributeCommands: null,
      workflowExitPrompt: null,
      planSteps: null,
    };
  }

  if (mode === 'plan') {
    return {
      ...data,
      planSteps: normalizePlanSteps(data.planSteps),
    };
  }

  return {
    ...data,
    planSteps: normalizePlanSteps(data.planSteps),
  };
}
