import { fetchDobjObjectListForChat, fetchObjectFieldsForChat } from './zivaFetchObjectList.js';
import { looksLikeFieldAttributeMessage } from './zivaFieldAttributes.js';
import {
  parseObjectListLimitChoice,
  parseYesNo,
  parsePickIndex,
  matchCandidateByName,
  formatObjectPickListMessage,
  formatObjectConfirmMessage,
  formatFieldPickListMessage,
  formatFieldConfirmMessage,
  modifyObjectActionsMessage,
  modifyFieldActionsMessage,
  loadObjectReadyMessage,
  createFieldTopicPrompt,
  createFieldConfirmPrompt,
  workflowNeedsObjectPick,
  objectPickIntro,
  INITIAL_WORKFLOW,
} from './zivaWorkflow.js';

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function parseFieldTypeFromText(text) {
  const m = String(text ?? '').match(/\(([^)]+)\)\s*$/);
  if (m) return m[1].trim();
  const n = norm(text);
  if (n.includes('picklist')) return 'Picklist';
  if (n.includes('number')) return 'Number';
  if (n.includes('date')) return 'Date';
  if (n.includes('checkbox') || n.includes('boolean')) return 'Checkbox';
  if (n.includes('textarea')) return 'TextArea';
  return 'Text';
}

async function loadObjectList(limit, query) {
  return fetchDobjObjectListForChat(limit, query);
}

/**
 * Handle user text while workflow.mode is set (non–create-object flows use object/field pickers).
 * @returns {Promise<boolean>} true if consumed
 */
export async function processWorkflowUserMessage(text, workflow, handlers) {
  const { appendBot, setWorkflow, navigate, refreshSuggestions } = handlers;
  const trimmed = String(text ?? '').trim();
  if (!workflow?.mode || workflow.mode === 'create_object') return false;

  const n = norm(trimmed);

  if (n.includes('exit to home') || n === 'exit to home') {
    handlers.exitToHome?.();
    return true;
  }
  if (n.includes('exit to previous') || n === 'exit to objects menu') {
    handlers.exitToPrevious?.();
    return true;
  }
  if (n.includes('exit to objects') || n === 'exit' || n === 'exit workflow') {
    handlers.exitToObjectMenu?.();
    return true;
  }
  if (n.includes('open object') && workflow.objectPickStep === 'ready' && workflow.mode === 'load_object') {
    const obj = workflow.selectedObject;
    if (obj?.sysId != null) {
      navigate(`/objects/${obj.sysId}`);
      handlers.setOpen(false);
    }
    return true;
  }

  if (workflowNeedsObjectPick(workflow) && workflow.objectPickStep !== 'ready') {
    if (workflow.objectPickStep === 'await_query') {
      const limit = parseObjectListLimitChoice(trimmed);
      if (limit) {
        const result = await loadObjectList(limit, '');
        if (result.error) {
          appendBot(`Could not load objects: **${result.error}**`);
          return true;
        }
        if (!result.rows.length) {
          appendBot(`No objects found (top ${limit}). Try another size or type a name.`);
          return true;
        }
        const next = {
          ...workflow,
          objectPickStep: 'await_pick',
          objectCandidates: result.rows,
        };
        setWorkflow(next);
        appendBot(formatObjectPickListMessage(result.rows, limit));
        refreshSuggestions();
        return true;
      }
      const search = await loadObjectList(10, trimmed);
      if (search.error) {
        appendBot(`Could not search objects: **${search.error}**`);
        return true;
      }
      if (!search.rows.length) {
        appendBot(`No object matched **${trimmed}**. Try **Top 5**–**Top 20** or a different name.`);
        return true;
      }
      if (search.rows.length === 1) {
        const obj = search.rows[0];
        setWorkflow({
          ...workflow,
          objectPickStep: 'await_confirm',
          objectCandidates: search.rows,
          selectedObject: obj,
        });
        appendBot(formatObjectConfirmMessage(obj));
        refreshSuggestions();
        return true;
      }
      setWorkflow({
        ...workflow,
        objectPickStep: 'await_pick',
        objectCandidates: search.rows,
      });
      appendBot(formatObjectPickListMessage(search.rows, search.rows.length));
      refreshSuggestions();
      return true;
    }

    if (workflow.objectPickStep === 'await_pick') {
      const candidates = workflow.objectCandidates || [];
      let picked = null;
      const idx = parsePickIndex(trimmed, candidates.length);
      if (idx != null) picked = candidates[idx];
      else picked = matchCandidateByName(trimmed, candidates);
      if (!picked) {
        appendBot(`Pick **1**–**${candidates.length}** from the list, or type the exact object name.`);
        return true;
      }
      setWorkflow({
        ...workflow,
        objectPickStep: 'await_confirm',
        selectedObject: picked,
      });
      appendBot(formatObjectConfirmMessage(picked));
      refreshSuggestions();
      return true;
    }

    if (workflow.objectPickStep === 'await_confirm') {
      const yn = parseYesNo(trimmed);
      if (yn === false) {
        setWorkflow({
          ...workflow,
          objectPickStep: 'await_query',
          objectCandidates: [],
          selectedObject: null,
        });
        appendBot('No problem — type another object name or choose **Top 5 / 10 / 15 / 20**.');
        refreshSuggestions();
        return true;
      }
      if (yn !== true) {
        appendBot('Reply **Yes** or **No** to confirm the object.');
        return true;
      }
      const obj = workflow.selectedObject;
      if (!obj) {
        setWorkflow({ ...workflow, objectPickStep: 'await_query' });
        appendBot('Let’s pick the object again — type a name or choose a list size.');
        return true;
      }
      if (workflow.mode === 'load_object') {
        setWorkflow({ ...workflow, objectPickStep: 'ready' });
        appendBot(loadObjectReadyMessage(obj), {
          navigate: obj.sysId != null ? [{ label: 'Open Object', url: `/objects/${obj.sysId}` }] : [],
        });
        refreshSuggestions();
        return true;
      }
      if (workflow.mode === 'modify_object') {
        setWorkflow({ ...workflow, objectPickStep: 'ready' });
        appendBot(modifyObjectActionsMessage(obj));
        refreshSuggestions();
        return true;
      }
      if (workflow.mode === 'create_field') {
        const nextW = {
          ...workflow,
          objectPickStep: 'ready',
          fieldPickStep: 'ask_topic',
        };
        setWorkflow(nextW);
        appendBot(createFieldTopicPrompt(obj));
        refreshSuggestions();
        return true;
      }
      if (workflow.mode === 'modify_field') {
        appendBot('Loading fields for this object…', { typingComplete: true });
        const { fields, error } = await fetchObjectFieldsForChat(obj.sysId);
        if (error) {
          appendBot(`Could not load fields: **${error}**`);
          return true;
        }
        setWorkflow({
          ...workflow,
          objectPickStep: 'ready',
          fieldPickStep: 'await_pick',
          fieldCandidates: fields,
        });
        appendBot(formatFieldPickListMessage(fields));
        refreshSuggestions();
        return true;
      }
    }
  }

  if (workflow.mode === 'load_object' && workflow.objectPickStep === 'ready') {
    const obj = workflow.selectedObject;
    if (n.includes('open')) {
      if (obj?.sysId != null) navigate(`/objects/${obj.sysId}`);
      handlers.setOpen(false);
      return true;
    }
    await handlers.pushOrchestrateReply?.(trimmed);
    return true;
  }

  if (workflow.mode === 'modify_object' && workflow.objectPickStep === 'ready') {
    const obj = workflow.selectedObject;
    if (/^edit\b/.test(n) || n.includes('edit object')) {
      if (obj?.sysId != null) navigate(`/objects/${obj.sysId}`);
      handlers.setOpen(false);
      return true;
    }
    if (/^rename\b/.test(n) || n.includes('rename object') || n === 'rename object') {
      appendBot(`To rename **${obj?.displayName}**, open the object and edit **Name** / **API Name**, or tell me the new name here.`);
      return true;
    }
    if (/^delete\b/.test(n) || n.includes('delete object') || n.includes('remove object') || n === 'delete object') {
      appendBot(
        `To delete **${obj?.displayName}**, open **Objects**, select the row, and use **Delete** in row actions. I can open the list for you.`,
        { navigate: [{ label: 'Objects', url: '/objects' }] },
      );
      return true;
    }
    await handlers.pushOrchestrateReply(trimmed);
    return true;
  }

  if (workflow.mode === 'create_field' && workflow.objectPickStep === 'ready') {
    const obj = workflow.selectedObject;
    if (workflow.fieldPickStep === 'ask_topic') {
      const labelGuess = trimmed
        .split(/\s+/)
        .slice(0, 4)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const typeGuess = parseFieldTypeFromText(trimmed);
      setWorkflow({
        ...workflow,
        fieldTopic: trimmed,
        fieldLabel: labelGuess || 'New Field',
        fieldDataType: typeGuess,
        fieldPickStep: 'confirm_name',
      });
      appendBot(
        createFieldConfirmPrompt(labelGuess || 'New Field', typeGuess) +
          '\n\nReply **Yes**, or type e.g. `Policy Number (Text)` or `Status (Picklist)`.',
      );
      refreshSuggestions();
      return true;
    }
    if (workflow.fieldPickStep === 'confirm_name') {
      const yn = parseYesNo(trimmed);
      if (yn === true) {
        appendBot(
          `Field **${workflow.fieldLabel}** (${workflow.fieldDataType}) noted for **${obj?.displayName}**. Open the object to add it in the field designer.`,
          { navigate: obj?.sysId != null ? [{ label: 'Open object', url: `/objects/${obj.sysId}` }] : [] },
        );
        handlers.exitToObjectMenu?.();
        return true;
      }
      const paren = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (paren) {
        const label = paren[1].trim();
        const dt = paren[2].trim();
        setWorkflow({ ...workflow, fieldLabel: label, fieldDataType: dt });
        appendBot(createFieldConfirmPrompt(label, dt) + '\n\nReply **Yes** to confirm.');
        return true;
      }
      setWorkflow({ ...workflow, fieldLabel: trimmed, fieldDataType: workflow.fieldDataType || 'Text' });
      appendBot(createFieldConfirmPrompt(trimmed, workflow.fieldDataType || 'Text'));
      return true;
    }
  }

  if (workflow.mode === 'modify_field' && workflow.objectPickStep === 'ready') {
    if (workflow.fieldPickStep === 'await_pick') {
      if (handlers.tryApplyFieldAttributes && looksLikeFieldAttributeMessage(trimmed)) {
        const applied = await handlers.tryApplyFieldAttributes(trimmed);
        if (applied) return true;
      }
      const candidates = workflow.fieldCandidates || [];
      let picked = null;
      const idx = parsePickIndex(trimmed, candidates.length);
      if (idx != null) picked = candidates[idx];
      else {
        const q = norm(trimmed);
        const partial = candidates.filter(
          (f) => norm(f.label).includes(q) || norm(f.apiName).includes(q),
        );
        if (partial.length === 1) picked = partial[0];
      }
      if (!picked) {
        appendBot(`Choose **1**–**${candidates.length}** or type the field name.`);
        return true;
      }
      setWorkflow({
        ...workflow,
        fieldPickStep: 'await_confirm',
        selectedField: picked,
      });
      appendBot(formatFieldConfirmMessage(picked));
      refreshSuggestions();
      return true;
    }
    if (workflow.fieldPickStep === 'await_confirm') {
      const yn = parseYesNo(trimmed);
      if (yn === false) {
        setWorkflow({
          ...workflow,
          fieldPickStep: 'await_pick',
          selectedField: null,
        });
        appendBot(formatFieldPickListMessage(workflow.fieldCandidates || []));
        refreshSuggestions();
        return true;
      }
      if (yn !== true) {
        appendBot('Reply **Yes** or **No**.');
        return true;
      }
      setWorkflow({ ...workflow, fieldPickStep: 'ready' });
      appendBot(modifyFieldActionsMessage(workflow.selectedField, workflow.selectedObject));
      refreshSuggestions();
      return true;
    }
    if (workflow.fieldPickStep === 'ready') {
      if (handlers.tryApplyFieldAttributes && looksLikeFieldAttributeMessage(trimmed)) {
        const applied = await handlers.tryApplyFieldAttributes(trimmed);
        if (applied) return true;
      }
      const obj = workflow.selectedObject;
      const field = workflow.selectedField;
      if (/^edit\b/.test(n)) {
        if (obj?.sysId != null) navigate(`/objects/${obj.sysId}`);
        handlers.setOpen(false);
        return true;
      }
      if (/^rename\b/.test(n)) {
        appendBot(`Rename **${field?.label}** from the object field panel on **${obj?.displayName}**.`);
        return true;
      }
      if (/^delete\b/.test(n)) {
        appendBot(`Delete **${field?.label}** from the object detail → Fields section.`);
        return true;
      }
    }
  }

  return false;
}

export function startWorkflowMode(mode, setWorkflow, appendBot, refreshSuggestions) {
  if (mode === 'create_object') return false;
  const next = {
    ...INITIAL_WORKFLOW,
    mode,
    objectPickStep: 'await_query',
  };
  setWorkflow(next);
  appendBot(objectPickIntro(mode));
  refreshSuggestions();
  return true;
}
