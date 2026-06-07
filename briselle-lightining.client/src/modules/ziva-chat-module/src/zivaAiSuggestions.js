/**
 * Related Controls (actions) vs AI Suggestions (values / quick replies) — separate panels.
 */

import {
  OBJECT_MENU_ACTIONS,
  OBJECT_MENU_NAV_ACTIONS,
  getSchemaConfirmSuggestions,
} from './zivaKnowledge.js';
import { buildBaseRelatedControls } from './zivaRelatedControls.js';
import { OBJECT_LIST_SUGGESTIONS } from './zivaWorkflow.js';

/** @typedef {{ id: string, label: string, action?: string, value?: string|number, sendText?: string, command?: string, url?: string }} ZivaChip */

const CREATE_FLOW_VALUE_SUGGESTIONS = {
  pick_count: ['Top 5', 'Top 10', 'Top 15', 'Top 20', 'Custom'],
  custom_count: [],
  confirm_name: ['Yes', 'OK'],
  confirm_schema: null,
  ask_topic: [],
};

export function controlToAiChip(ctrl) {
  if (!ctrl?.label) return null;
  return {
    id: String(ctrl.id || ctrl.action || ctrl.label),
    label: String(ctrl.label).trim(),
    action: ctrl.action ? String(ctrl.action) : undefined,
    value: ctrl.value,
    url: ctrl.url,
  };
}

export function textToAiChip(text) {
  const label = String(text ?? '').trim();
  if (!label) return null;
  const id = `txt_${label.toLowerCase().replace(/\s+/g, '_').slice(0, 40)}`;
  return { id, label, sendText: label };
}

export function buildObjectMenuRelatedControls() {
  const chips = [];
  for (const a of OBJECT_MENU_ACTIONS) {
    chips.push({
      id: a.id,
      label: a.label,
      action: 'start_workflow',
      value: a.workflowMode,
    });
  }
  for (const a of OBJECT_MENU_NAV_ACTIONS) {
    chips.push({
      id: a.id,
      label: a.label,
      action: a.navAction === 'exit_home' ? 'exit_home' : 'exit_previous',
    });
  }
  return chips;
}

/** @deprecated use buildObjectMenuRelatedControls */
export function buildObjectMenuAiSuggestions() {
  return buildObjectMenuRelatedControls();
}

export function buildObjectListExampleAiSuggestions() {
  return OBJECT_LIST_SUGGESTIONS.map((label) => textToAiChip(label)).filter(Boolean);
}

function dedupeChips(chips) {
  const seen = new Set();
  return (chips || []).filter((c) => {
    if (!c?.label) return false;
    const key = `${c.label}:${c.action || ''}:${c.sendText || ''}:${c.command || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sessionFromState(createFlow, createDraft, wizard, workflow) {
  return {
    createFlow: createFlow || null,
    workflowMode: workflow?.mode || null,
    objectPickStep: workflow?.objectPickStep || null,
    fieldPickStep: workflow?.fieldPickStep || null,
    wizardStep: wizard?.step ?? null,
    objectLabel: createDraft?.label || '',
  };
}

function pushTextChips(chips, phrases) {
  for (const p of phrases || []) {
    const t = textToAiChip(p);
    if (t && !chips.some((c) => c.label.toLowerCase() === t.label.toLowerCase())) chips.push(t);
  }
}

/**
 * Workflow / menu action buttons (Related Controls only — must have `action`).
 */
export function buildRelatedControlsForSession(createFlow, createDraft, wizard, workflow) {
  const session = sessionFromState(createFlow, createDraft, wizard, workflow);

  if (wizard?.step === 'object_actions' && !workflow?.mode && !createFlow) {
    return dedupeChips(buildObjectMenuRelatedControls());
  }

  const chips = [];
  for (const c of buildBaseRelatedControls(session)) {
    const chip = controlToAiChip(c);
    if (chip) chips.push(chip);
  }
  return dedupeChips(chips);
}

/**
 * Value / quick-reply chips (AI Suggestions — sendText or add-field command, never workflow actions).
 */
export function buildAiSuggestionsForSession(createFlow, createDraft, wizard, workflow) {
  const chips = [];

  if (createFlow) {
    const preset = CREATE_FLOW_VALUE_SUGGESTIONS[createFlow];
    if (Array.isArray(preset)) pushTextChips(chips, preset);
    if (createFlow === 'confirm_schema') {
      pushTextChips(chips, getSchemaConfirmSuggestions());
    }
  } else if (workflow?.mode) {
    if (workflow.objectPickStep === 'await_query') {
      pushTextChips(chips, OBJECT_LIST_SUGGESTIONS);
    }
    if (workflow.objectPickStep === 'await_confirm') {
      pushTextChips(chips, ['Yes', 'No']);
    }
    if (workflow.fieldPickStep === 'await_confirm') {
      pushTextChips(chips, ['Yes', 'No']);
    }
    if (workflow.mode === 'create_field' && workflow.fieldPickStep === 'confirm_name') {
      pushTextChips(chips, ['Yes', 'No']);
    }
  }

  return dedupeChips(chips);
}

export function buildSessionMessagePanels(createFlow, createDraft, wizard, workflow) {
  return {
    relatedControls: buildRelatedControlsForSession(createFlow, createDraft, wizard, workflow),
    aiSuggestions: buildAiSuggestionsForSession(createFlow, createDraft, wizard, workflow),
  };
}

export function mergeAiSuggestionSources(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const item of list || []) {
      if (!item?.label) continue;
      const key = `${item.label}:${item.action || ''}:${item.sendText || ''}:${item.command || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function mergePanelSources(...lists) {
  return mergeAiSuggestionSources(...lists);
}

export function chipIsRelatedControl(chip) {
  return Boolean(chip?.action);
}

export function splitChipsIntoPanels(chips) {
  const relatedControls = [];
  const aiSuggestions = [];
  for (const chip of chips || []) {
    if (!chip?.label) continue;
    if (chipIsRelatedControl(chip)) relatedControls.push(chip);
    else aiSuggestions.push(chip);
  }
  return {
    relatedControls: dedupeChips(relatedControls),
    aiSuggestions: dedupeChips(aiSuggestions),
  };
}
