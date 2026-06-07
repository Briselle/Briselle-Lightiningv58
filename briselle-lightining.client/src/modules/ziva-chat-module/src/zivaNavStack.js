/**
 * Navigation stack for Exit to previous step / Exit to home.
 */

import { INITIAL_WORKFLOW } from './zivaWorkflow.js';

const INITIAL_WIZARD = { step: 'modules', moduleId: null, objectAction: null };

export function createHomeFrame() {
  return {
    id: 'home',
    wizard: { ...INITIAL_WIZARD },
    workflow: { ...INITIAL_WORKFLOW },
    createFlow: null,
    createDraft: null,
    showWelcome: true,
    relatedControls: [],
    aiSuggestions: [],
    prompt: null,
  };
}

export function createObjectMenuFrame(relatedControls = []) {
  return {
    id: 'object_actions',
    wizard: { step: 'object_actions', moduleId: 'objects', objectAction: null },
    workflow: { ...INITIAL_WORKFLOW },
    createFlow: null,
    createDraft: null,
    showWelcome: false,
    relatedControls: [...(relatedControls || [])],
    aiSuggestions: [],
    prompt: 'object_menu',
  };
}

export function cloneNavFrame(
  state,
  { relatedControls = [], aiSuggestions = [], prompt = null, id = null } = {},
) {
  return {
    id: id || state?.wizard?.step || 'custom',
    wizard: state?.wizard ? { ...state.wizard } : { ...INITIAL_WIZARD },
    workflow: state?.workflow ? { ...state.workflow } : { ...INITIAL_WORKFLOW },
    createFlow: state?.createFlow ?? null,
    createDraft: state?.createDraft ? { ...state.createDraft } : null,
    showWelcome: false,
    relatedControls: [...(relatedControls || [])],
    aiSuggestions: [...(aiSuggestions || [])],
    prompt,
  };
}
