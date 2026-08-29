/**
 * Ziva multi-workflow engine: Objects menu (L1/L2) + create/load/edit object & field flows.
 */

import {
  parseCreateObjectIntent,
  OBJECT_MENU_ACTIONS,
  OBJECT_MENU_NAV_ACTIONS,
  OBJECT_MENU_SUGGESTION_LABELS,
} from './zivaKnowledge.js';
import { formatObjectListChatMarkdown } from './zivaFetchObjectList.js';

export const OBJECT_LIST_SUGGESTIONS = ['Top 5', 'Top 10', 'Top 15', 'Top 20'];

export const INITIAL_WORKFLOW = {
  mode: null,
  objectPickStep: null,
  fieldPickStep: null,
  objectCandidates: [],
  selectedObject: null,
  fieldCandidates: [],
  selectedField: null,
  fieldTopic: '',
  fieldLabel: '',
  fieldDataType: '',
};

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function parseObjectListLimitChoice(text) {
  const n = norm(text);
  const m = n.match(/\b(?:top|get|list|show)\s*(\d{1,2})\b/);
  if (m) {
    const v = parseInt(m[1], 10);
    if (v >= 1 && v <= 60) return v;
  }
  const onlyNum = n.match(/^(\d{1,2})$/);
  if (onlyNum) {
    const v = parseInt(onlyNum[1], 10);
    if (v >= 1 && v <= 60) return v;
  }
  return null;
}

export function parseYesNo(text) {
  const n = norm(text);
  if (['yes', 'y', 'yeah', 'yep', 'correct', 'confirm', 'ok', 'okay'].includes(n)) return true;
  if (['no', 'n', 'nope', 'wrong', 'not', 'cancel'].includes(n)) return false;
  return null;
}

export function parsePickIndex(text, max) {
  const n = norm(text);
  const num = n.match(/^#?(\d{1,2})$/);
  if (num) {
    const i = parseInt(num[1], 10);
    if (i >= 1 && i <= max) return i - 1;
  }
  return null;
}

export function matchCandidateByName(text, candidates) {
  const q = norm(text);
  if (!q) return null;
  const exact = candidates.find((c) => norm(c.displayName) === q || norm(c.systemName) === q);
  if (exact) return exact;
  const partial = candidates.filter(
    (c) => norm(c.displayName).includes(q) || norm(c.systemName || '').includes(q),
  );
  if (partial.length === 1) return partial[0];
  return null;
}

/** Level 2 Objects menu choice from chip or typed text. */
export function parseObjectMenuChoice(text) {
  const n = norm(text);
  if (!n) return null;

  if (n.includes('exit to home')) return { nav: 'exit_home' };
  if (n.includes('exit to previous') || n.includes('exit to objects')) return { nav: 'exit_previous' };

  for (const a of OBJECT_MENU_NAV_ACTIONS) {
    if (n === norm(a.label)) return { nav: a.navAction };
  }
  for (const a of OBJECT_MENU_ACTIONS) {
    if (n === norm(a.label)) return { mode: a.workflowMode };
  }

  if (n.includes('load an object') || n.includes('load object')) return { mode: 'load_object' };
  if (n.includes('edit an object') || (n.includes('edit') && n.includes('object') && !n.includes('field'))) {
    return { mode: 'modify_object' };
  }
  if (n.includes('create new field') || (n.includes('new field') && !n.includes('object'))) {
    return { mode: 'create_field' };
  }
  if (n.includes('edit a field') || (n.includes('edit') && n.includes('field'))) {
    return { mode: 'modify_field' };
  }
  if (parseCreateObjectIntent(text).start || n.includes('create new object') || n === 'create object') {
    return { mode: 'create_object' };
  }
  if (n === 'objects') return { nav: 'open_objects' };
  return null;
}

/** @deprecated use parseObjectMenuChoice at object_actions */
export function parseWorkflowIntent(text) {
  const menu = parseObjectMenuChoice(text);
  if (menu?.mode) return { mode: menu.mode };
  return null;
}

export function workflowNeedsObjectPick(workflow) {
  const m = workflow?.mode;
  return m === 'load_object' || m === 'modify_object' || m === 'create_field' || m === 'modify_field';
}

export function getWorkflowSuggestionChips(workflow, createFlow, wizard) {
  if (createFlow) return null;

  if (workflow?.mode) {
    if (workflow.objectPickStep === 'await_query') return [...OBJECT_LIST_SUGGESTIONS];
    if (workflow.objectPickStep === 'await_confirm') return ['Yes', 'No'];
    if (workflow.fieldPickStep === 'await_confirm') return ['Yes', 'No'];
    if (workflow.objectPickStep === 'ready' && workflow.mode === 'load_object') {
      return ['Open Object', 'Exit to Objects menu', 'Exit to home'];
    }
    if (workflow.objectPickStep === 'ready' && workflow.mode === 'modify_object') {
      return ['Edit Object', 'Rename Object', 'Delete Object', 'Exit to Objects menu', 'Exit to home'];
    }
    if (workflow.objectPickStep === 'ready' && workflow.mode === 'modify_field' && workflow.fieldPickStep === 'ready') {
      return ['Edit field', 'Rename field', 'Delete field', 'Exit to Objects menu', 'Exit to home'];
    }
    if (workflow.mode === 'create_field' && workflow.fieldPickStep === 'confirm_name') {
      return ['Yes', 'No'];
    }
    return null;
  }

  if (wizard?.step === 'object_actions') {
    return [...OBJECT_MENU_SUGGESTION_LABELS];
  }

  return null;
}

export function buildWorkflowSessionPayload(
  workflow,
  createFlow,
  createDraft,
  wizard,
  assistantMode = 'control',
  exploreContext = null,
) {
  const lines = Array.isArray(createDraft?.fieldSpecLines) ? createDraft.fieldSpecLines : [];
  return {
    workflowMode: workflow?.mode || null,
    objectPickStep: workflow?.objectPickStep || null,
    fieldPickStep: workflow?.fieldPickStep || null,
    selectedObject: workflow?.selectedObject || null,
    selectedField: workflow?.selectedField || null,
    objectCandidateCount: workflow?.objectCandidates?.length ?? 0,
    fieldCandidateCount: workflow?.fieldCandidates?.length ?? 0,
    createFlow: createFlow || null,
    wizardStep: wizard?.step ?? null,
    wizardModuleId: wizard?.moduleId ?? null,
    objectMenuAction: wizard?.objectAction ?? null,
    objectLabel: createDraft?.label ?? workflow?.selectedObject?.displayName ?? null,
    objectApiName: createDraft?.apiName ?? workflow?.selectedObject?.systemName ?? null,
    topic: createDraft?.topic ?? workflow?.fieldTopic ?? null,
    pendingFieldCount: createDraft?.pendingFieldCount ?? null,
    fieldLineCount: lines.length,
    fieldLines: lines.slice(0, 50).map((l, i) => `${i + 1}. ${l}`),
    fieldAttrsByLabel: createDraft?.fieldAttrsByLabel ?? null,
    fieldLabelDraft: workflow?.fieldLabel || null,
    fieldDataTypeDraft: workflow?.fieldDataType || null,
    assistantMode: assistantMode || 'control',
    exploreContext: exploreContext || null,
  };
}

export function objectPickIntro(mode) {
  const intros = {
    load_object:
      '**Load an object** — type the object name, or choose **Top 5**, **Top 10**, **Top 15**, or **Top 20** to list objects.',
    modify_object:
      '**Edit an object** — type the object name, or choose **Top 5**, **Top 10**, **Top 15**, or **Top 20** to list objects.',
    create_field:
      '**Create new field** — which object is this for? Type the name, or choose **Top 5 / 10 / 15 / 20**.',
    modify_field:
      '**Modify a field** — which object owns the field? Type the name, or choose **Top 5 / 10 / 15 / 20**.',
  };
  return intros[mode] || 'Which object should we use?';
}

export function formatObjectPickListMessage(rows, limit) {
  const body = formatObjectListChatMarkdown(rows, limit);
  return `${body}\n\nReply with the **number** (1–${rows.length}) or the **exact object name** to select one.`;
}

export function formatObjectConfirmMessage(obj) {
  return `Is **${obj.displayName}**${obj.systemName ? ` (\`${obj.systemName}\`)` : ''} the correct object? Reply **Yes** or **No**.`;
}

export function formatFieldPickListMessage(fields) {
  if (!fields.length) return 'This object has no custom fields to pick yet. You can add fields from the object detail page.';
  const lines = fields.map((f, i) => `${i + 1}. **${f.label}** (\`${f.apiName}\`) — ${f.dataType || 'Text'}`);
  return `**Fields on this object** (pick one):\n\n${lines.join('\n')}\n\nReply with the **number** or **field name**.`;
}

export function formatFieldConfirmMessage(field) {
  return `Is **${field.label}** (\`${field.apiName}\`) the correct field? Reply **Yes** or **No**.`;
}

export function loadObjectReadyMessage(obj) {
  return `**${obj.displayName}** is loaded. Tap **Open Object** to view it, or return to the **Objects** menu.`;
}

export function modifyObjectActionsMessage(obj) {
  return `Object **${obj.displayName}** is selected.\n\n• **Edit Object** · **Rename Object** · **Delete Object**\n• **Exit to Objects menu** · **Exit to home**`;
}

export function modifyFieldActionsMessage(field, obj) {
  return `Field **${field.label}** on **${obj.displayName}** is ready.\n\n• **Edit field** · **Rename field** · **Delete field**\n• **Exit to Objects menu** · **Exit to home**`;
}

export function createFieldTopicPrompt(obj) {
  return `Let’s create a new field on **${obj.displayName}**.\n\nIn plain language, what is the field about? (Example: “member policy number”.)`;
}

export function createFieldConfirmPrompt(label, dataType) {
  return `Please confirm:\n\n• **Label:** ${label}\n• **Type:** ${dataType}\n\nReply **Yes** to continue or type corrections (e.g. \`Status (Picklist)\`).`;
}

export function normalizeWorkflowCommand(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const start = String(raw.start ?? raw.mode ?? '').trim();
  if (
    ['create_object', 'load_object', 'modify_object', 'create_field', 'modify_field'].includes(start)
  ) {
    return { type: 'start', mode: start };
  }
  const limit = Number(raw.listObjects ?? raw.limit ?? raw.value);
  if (Number.isFinite(limit) && limit >= 1) return { type: 'list_objects', limit };
  return null;
}
