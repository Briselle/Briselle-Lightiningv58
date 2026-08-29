/**
 * LLM orchestration — answer, navigate, related controls, AI field suggestions.
 */

import {
  buildBaseRelatedControls,
  normalizeRelatedControls,
  normalizeNavigateLinks,
  normalizeAiSuggestions,
} from './zivaRelatedControls.js';
import { buildWorkflowSessionPayload, normalizeWorkflowCommand } from './zivaWorkflow.js';
import {
  applyAssistantModeToOrchestrate,
  getModeAwareFallback,
  normalizePlanSteps,
} from './zivaAssistantModes.js';

export function buildZivaSessionPayload(
  createFlow,
  createDraft,
  wizard,
  workflow = null,
  assistantMode = 'control',
  exploreContext = null,
) {
  return buildWorkflowSessionPayload(
    workflow,
    createFlow,
    createDraft,
    wizard,
    assistantMode,
    exploreContext,
  );
}

export async function fetchZivaOrchestrate(apiBase, { question, session, messages = [], model = 'auto' }) {
  const base = String(apiBase || '/api/ziva').replace(/\/$/, '');
  const url = `${base}/orchestrate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: String(question ?? '').trim(),
      session: session || {},
      messages: messages.slice(-10),
      model: model || 'auto',
    }),
  });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data.error || `Orchestrate failed (${res.status})`);
    err.fallback = data.fallback === true || res.status === 501 || res.status >= 500;
    throw err;
  }
  return normalizeOrchestratePayload(data, session);
}

export function normalizeOrchestratePayload(data, session) {
  const mode = session?.assistantMode || 'control';
  const base = {
    answer: String(data?.answer ?? '').trim(),
    navigate: normalizeNavigateLinks(data?.navigate),
    relatedControls: normalizeRelatedControls(data?.relatedControls, session),
    aiSuggestions: normalizeAiSuggestions(data?.aiSuggestions),
    suggestedReplies: [],
    workflowExitPrompt: data?.workflowExitPrompt || null,
    schemaEditCommand: data?.schemaEditCommand ? String(data.schemaEditCommand).trim() : null,
    fieldAttributeCommands: Array.isArray(data?.fieldAttributeCommands)
      ? data.fieldAttributeCommands.map((x) => String(x ?? '').trim()).filter(Boolean)
      : null,
    workflowCommand: normalizeWorkflowCommand(data?.workflowCommand),
    planSteps: normalizePlanSteps(data?.planSteps),
  };
  return applyAssistantModeToOrchestrate(base, mode);
}

export function fallbackOrchestrate(question, session, localAnswer = '') {
  const mode = session?.assistantMode || 'control';
  const answer =
    localAnswer ||
    getModeAwareFallback(mode, question) ||
    "I'm here to help with objects, fields, and records in Briselle.";
  return applyAssistantModeToOrchestrate(
    {
      answer,
      navigate: [],
      relatedControls: buildBaseRelatedControls(session),
      aiSuggestions: [],
      workflowExitPrompt: null,
      schemaEditCommand: null,
      fieldAttributeCommands: null,
      workflowCommand: null,
      planSteps: null,
    },
    mode,
  );
}
