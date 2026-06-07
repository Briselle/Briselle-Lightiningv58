import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BRISHELLE_MODULES,
  OBJECT_MENU_ACTIONS,
  OBJECT_MENU_NAV_ACTIONS,
  OBJECT_FIELD_ACTIONS,
  RECORD_MENU_ACTIONS,
  detectDomainKeyFromMessage,
  getAnswerForMessage,
  getSuggestedQuestions,
  getSchemaConfirmSuggestions,
  shouldShowContactForm,
  parseTopNFieldChoice,
  formatFriendlyFieldPlan,
  buildContextualFieldSpecLines,
  detectContextProfile,
  parseSchemaFieldRevision,
  getConversationalFallback,
  parseCreateObjectIntent,
  isCreateObjectAffirmation,
  hasReadyCreateDraft,
  SCHEMA_FIELD_EDIT_HELP,
  getSuggestedFieldAddCommands,
  zivaSpecDisplayLabel,
  buildNotesAddChip,
  normalizeFieldSpecLine,
} from './zivaKnowledge.js';
import {
  looksLikeFieldAttributeMessage,
  applyFieldAttributesToDraft,
  parseFieldAttributeInstructions,
  formatFieldAttrsForPreview,
  FIELD_ATTRIBUTE_EDIT_HELP,
} from './zivaFieldAttributes.js';
import { applyFieldAttributeUpdatesOnObject } from '../../objects/ObjectRelated/zivaUpdateObjectFieldAttributes';
import { fetchFieldSpecsFromGroq } from './zivaGroqFields.js';
import {
  fetchZivaOrchestrate,
  buildZivaSessionPayload,
  fallbackOrchestrate,
} from './zivaLlmOrchestrate.js';
import { buildBaseRelatedControls } from './zivaRelatedControls.js';
import { fetchDobjObjectListForChat, formatObjectListChatMarkdown } from './zivaFetchObjectList.js';
import {
  INITIAL_WORKFLOW,
  parseObjectMenuChoice,
  getWorkflowSuggestionChips,
  objectPickIntro,
} from './zivaWorkflow.js';
import { processWorkflowUserMessage, startWorkflowMode } from './zivaProcessWorkflowMessage.js';
import {
  buildAiSuggestionsForSession,
  buildObjectMenuRelatedControls,
  buildRelatedControlsForSession,
  buildSessionMessagePanels,
  controlToAiChip,
  mergeAiSuggestionSources,
  mergePanelSources,
  splitChipsIntoPanels,
  textToAiChip,
} from './zivaAiSuggestions.js';
import { createHomeFrame, createObjectMenuFrame, cloneNavFrame } from './zivaNavStack.js';
import { parseMultiCommandPlan } from './zivaMultiCommand.js';
import { parseComprehensiveCreateObjectRequest } from './zivaComprehensiveCreate.js';
import { resolveModelForRequest } from './zivaModels.js';
import ZivaModelPicker from './ZivaModelPicker.jsx';
import ZivaModePicker from './ZivaModePicker.jsx';
import {
  DEFAULT_ASSISTANT_MODE,
  shouldAutoProceedCreate,
  shouldTryLocalAnswerFirst,
  getComposerPlaceholderForMode,
  isValidAssistantMode,
  canRunComprehensiveCreate,
  canStartMenuWorkflow,
  canRunCreateObject,
  canApplyFieldAttributesInChat,
  getModeBlockedMessage,
  shouldAttachExploreContext,
  shouldShowPlanChecklist,
} from './zivaAssistantModes.js';
import { buildExploreContextForSession } from './zivaExploreContext.js';
import ZivaPlanChecklist from './components/ZivaPlanChecklist.jsx';
import { resolveZivaApiBaseUrl } from './zivaServiceConfig.js';
import SimpleZivaContactForm from './SimpleZivaContactForm.jsx';
import { mergeZivaConfig } from './defaultConfig.js';
import { createObjectFromZivaChat, suggestObjectLabelFromTopic } from '../../objects/ObjectRelated/zivaObjectCreateFromChat';
import { toUserDefinedApiName } from '../../objects/FieldRelated/fieldDataTypeModel';
import './ZivaChat.css';

const TYPEWRITER_SPEED_MS = 8;
const TYPEWRITER_CHUNK = 2;

const INITIAL_WIZARD = { step: 'modules', moduleId: null, objectAction: null };

const INITIAL_CREATE_DRAFT = {
  topic: '',
  label: '',
  apiName: '',
  domainKey: 'generic',
  pendingFieldCount: null,
  fieldSpecLines: null,
  fieldRequired: null,
  fieldAttrsByLabel: null,
  fieldPresetLabel: '',
};

function normReply(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Groq field plan for object create; local ranking only if API unavailable. */
async function resolveFieldSpecsForObject(apiUrl, draftSnap, count, model = 'auto') {
  try {
    const r = await fetchFieldSpecsFromGroq(apiUrl, {
      topic: draftSnap.topic,
      objectLabel: draftSnap.label,
      count,
      model,
    });
    return { specLines: r.fields, fieldPresetLabel: r.presetLabel, source: 'groq' };
  } catch (e) {
    const specLines = buildContextualFieldSpecLines(draftSnap.topic, draftSnap.label, count);
    const fieldPresetLabel = detectContextProfile(`${draftSnap.topic ?? ''} ${draftSnap.label ?? ''}`).presetLabel;
    return { specLines, fieldPresetLabel, source: 'fallback' };
  }
}

function TypewriterText({ text, speed = TYPEWRITER_SPEED_MS, chunkSize = TYPEWRITER_CHUNK, onComplete }) {
  const [visibleLength, setVisibleLength] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const doneRef = useRef(false);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!text || visibleLength >= text.length) {
      if (visibleLength >= text.length && !doneRef.current && onCompleteRef.current) {
        doneRef.current = true;
        onCompleteRef.current();
      }
      return;
    }
    const id = setTimeout(() => {
      setVisibleLength((prev) => Math.min(prev + chunkSize, text.length));
    }, speed);
    return () => clearTimeout(id);
  }, [text, visibleLength, speed, chunkSize]);

  const display = text ? text.slice(0, visibleLength) : '';
  const isComplete = visibleLength >= (text?.length ?? 0);
  return (
    <>
      {display}
      {!isComplete && (
        <span className="ziva-typewriter-cursor" aria-hidden="true">
          |
        </span>
      )}
    </>
  );
}

function buildSuggestionContext(wizard, domainContextKey) {
  return {
    domainKey: domainContextKey || undefined,
    moduleId: wizard.moduleId || undefined,
    wizardStep: wizard.step,
  };
}

/** Wizard-step chips; null → use general getSuggestedQuestions. */
function getFlowSuggestionChips(createFlow, workflow, wizard) {
  const wfChips = getWorkflowSuggestionChips(workflow, createFlow, wizard);
  if (wfChips) return wfChips;
  if (createFlow === 'pick_count') return ['Top 10', 'Top 15', 'Top 20', 'Custom'];
  if (createFlow === 'custom_count') return [];
  if (createFlow === 'confirm_name') return ['Yes', 'OK'];
  if (createFlow === 'confirm_schema') return getSchemaConfirmSuggestions();
  if (createFlow === 'ask_topic') return [];
  return null;
}

function PanelSectionHeader({ title, hint }) {
  return (
    <p className="ziva-panel-header">
      <span className="ziva-panel-header-title">{title}</span>
      {hint ? <span className="ziva-panel-header-hint">({hint})</span> : null}
    </p>
  );
}

function looksOffTopicDuringFlow(text, flow) {
  const n = normReply(text);
  if (!flow || flow === 'confirm_schema') return false;
  if (flow === 'pick_count' || flow === 'custom_count') {
    return !parseTopNFieldChoice(text) && /^(what|how|why|explain|tell me|can you)\b/.test(n);
  }
  if (flow === 'confirm_name') {
    return !['yes', 'ok', 'y'].includes(n) && /^(what|how|why|explain|tell me)\b/.test(n);
  }
  if (flow === 'ask_topic') {
    return /^(what|how|why|explain|tell me|define)\b/.test(n) && !/\b(for|track|object|about)\b/.test(n);
  }
  return false;
}

/**
 * Floating Ziva assistant – Briselle platform modules, Objects/Records flows, field ideas.
 */
export default function ZivaChat({ config: userConfig, contactFormComponent: ContactFormOverride }) {
  const cfg = mergeZivaConfig(userConfig);
  const navigate = useNavigate();
  const openLogin = cfg.auth?.openLogin;
  const openSignup = cfg.auth?.openSignup;

  const ZIVA_CHAT_CACHE_KEY = cfg.storageKey;
  const ZIVA_CHAT_CACHE_TTL_MS = cfg.cacheTtlMs;

  function loadChatCache() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(ZIVA_CHAT_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.messages)) return null;
      const age = Date.now() - (data.savedAt || 0);
      if (age > ZIVA_CHAT_CACHE_TTL_MS) return null;
      return data;
    } catch {
      return null;
    }
  }

  function saveChatCache(messages, wizard, domainContextKey, createFlow, createDraft, workflow, assistantMode) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(
        ZIVA_CHAT_CACHE_KEY,
        JSON.stringify({
          messages,
          wizard,
          domainContextKey: domainContextKey || null,
          createFlow: createFlow || null,
          createDraft: createDraft || INITIAL_CREATE_DRAFT,
          workflow: workflow || INITIAL_WORKFLOW,
          assistantMode: assistantMode || DEFAULT_ASSISTANT_MODE,
          savedAt: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }
  }

  const [open, setOpen] = useState(false);
  const [wizard, setWizard] = useState(() => {
    const cache = loadChatCache();
    if (cache?.wizard && typeof cache.wizard === 'object') {
      return { ...INITIAL_WIZARD, ...cache.wizard };
    }
    return { ...INITIAL_WIZARD };
  });
  const [domainContextKey, setDomainContextKey] = useState(() => loadChatCache()?.domainContextKey || null);
  const [createFlow, setCreateFlow] = useState(() => loadChatCache()?.createFlow || null);
  const [createDraft, setCreateDraft] = useState(() => {
    const c = loadChatCache()?.createDraft;
    return c && typeof c === 'object' ? { ...INITIAL_CREATE_DRAFT, ...c } : { ...INITIAL_CREATE_DRAFT };
  });
  const [workflow, setWorkflow] = useState(() => {
    const c = loadChatCache()?.workflow;
    return c && typeof c === 'object' ? { ...INITIAL_WORKFLOW, ...c } : { ...INITIAL_WORKFLOW };
  });
  const [assistantMode, setAssistantMode] = useState(() => {
    const cached = loadChatCache()?.assistantMode;
    return isValidAssistantMode(cached) ? cached : DEFAULT_ASSISTANT_MODE;
  });
  const createDraftRef = useRef(createDraft);
  createDraftRef.current = createDraft;
  const workflowRef = useRef(workflow);
  workflowRef.current = workflow;

  const flowStateRef = useRef({ createFlow, createDraft, wizard, domainContextKey, workflow, assistantMode });
  flowStateRef.current = { createFlow, createDraft, wizard, domainContextKey, workflow, assistantMode };
  const exploreContextRef = useRef(null);

  useEffect(() => {
    if (assistantMode !== 'explore') {
      exploreContextRef.current = null;
      return undefined;
    }
    let cancelled = false;
    buildExploreContextForSession().then((ctx) => {
      if (!cancelled) exploreContextRef.current = ctx;
    });
    return () => {
      cancelled = true;
    };
  }, [assistantMode]);

  const [messages, setMessages] = useState(() => {
    const cache = loadChatCache();
    if (!cache || !cache.messages || !cache.messages.length) return [];
    return cache.messages.map((m) => (m.from === 'bot' ? { ...m, typingComplete: true } : m));
  });
  const [input, setInput] = useState('');
  const [schemaAddSuggestions, setSchemaAddSuggestions] = useState([]);
  const [footerAiSuggestions, setFooterAiSuggestions] = useState([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const navStackRef = useRef([createHomeFrame()]);
  const sendMessageRef = useRef(null);
  const runCreateObjectRef = useRef(null);
  const runComprehensiveCreateFlowRef = useRef(null);
  const messagesRef = useRef([]);
  const schemaAddInitRef = useRef(false);
  const excludedAddSpecsRef = useRef(new Set());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeModel = resolveModelForRequest(selectedModel);

  const syncFooterAiSuggestions = useCallback(
    (extraLists = []) => {
      const s = flowStateRef.current;
      const base = buildAiSuggestionsForSession(s.createFlow, s.createDraft, s.wizard, s.workflow);
      const addChips = schemaAddSuggestions.map((item) => ({
        id: `schema_${item.spec}`,
        label: item.label,
        command: item.command,
        spec: item.spec,
      }));
      const lists = Array.isArray(extraLists) ? extraLists : [extraLists];
      setFooterAiSuggestions(mergeAiSuggestionSources(...lists, base, addChips));
    },
    [schemaAddSuggestions],
  );

  const patchLastBotRelatedControls = useCallback((overrideControls = null) => {
    const s = flowStateRef.current;
    const relatedControls =
      overrideControls ||
      buildRelatedControlsForSession(s.createFlow, s.createDraft, s.wizard, s.workflow);
    setMessages((prev) => {
      let lastBot = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].from === 'bot') {
          lastBot = i;
          break;
        }
      }
      if (lastBot < 0) return prev;
      return prev.map((m, i) => (i === lastBot ? { ...m, relatedControls } : m));
    });
  }, []);

  const patchLastBotPanels = useCallback(
    (override = null) => {
      const s = flowStateRef.current;
      const panels =
        override ||
        buildSessionMessagePanels(s.createFlow, s.createDraft, s.wizard, s.workflow);
      patchLastBotRelatedControls(panels.relatedControls);
      syncFooterAiSuggestions(panels.aiSuggestions);
    },
    [patchLastBotRelatedControls, syncFooterAiSuggestions],
  );

  const patchLastBotAiSuggestions = useCallback(
    (overrideChips) => {
      patchLastBotRelatedControls();
      syncFooterAiSuggestions(overrideChips || []);
    },
    [patchLastBotRelatedControls, syncFooterAiSuggestions],
  );

  const seedSchemaAddSuggestions = useCallback((draft) => {
    const lines = draft?.fieldSpecLines;
    if (!Array.isArray(lines) || lines.length === 0 || lines.length >= 60) {
      setSchemaAddSuggestions([]);
      return;
    }
    const notesChip = buildNotesAddChip(lines);
    const slotCount = notesChip ? 2 : 3;
    const autoChips = getSuggestedFieldAddCommands(draft.topic, draft.label, lines, slotCount, [
      ...excludedAddSpecsRef.current,
      ...(notesChip ? [notesChip.label] : []),
    ]);
    const chips = notesChip
      ? [notesChip, ...autoChips.filter((c) => c.label.toLowerCase() !== 'notes')].slice(0, 3)
      : autoChips;
    chips.forEach((c) => excludedAddSpecsRef.current.add(c.label.toLowerCase()));
    setSchemaAddSuggestions(chips);
  }, []);

  const replaceClickedSchemaAddChip = useCallback((clickedItem, draft, fieldLines) => {
    setSchemaAddSuggestions((prev) => {
      const remaining = prev.filter((p) => p.spec !== clickedItem.spec);
      const excludeList = [
        ...excludedAddSpecsRef.current,
        ...(fieldLines || []).map((l) => zivaSpecDisplayLabel(l).toLowerCase()),
        ...remaining.map((p) => p.label.toLowerCase()),
      ];
      const replacements = getSuggestedFieldAddCommands(
        draft.topic,
        draft.label,
        fieldLines,
        1,
        excludeList,
      );
      replacements.forEach((r) => excludedAddSpecsRef.current.add(r.label.toLowerCase()));
      return [...remaining, ...replacements].slice(0, 3);
    });
  }, []);

  useEffect(() => {
    if (createFlow !== 'confirm_schema') {
      schemaAddInitRef.current = false;
      excludedAddSpecsRef.current.clear();
      setSchemaAddSuggestions([]);
      return;
    }
    if (schemaAddInitRef.current) return;
    const lines = createDraft?.fieldSpecLines;
    if (!Array.isArray(lines) || lines.length === 0) return;
    schemaAddInitRef.current = true;
    seedSchemaAddSuggestions(createDraft);
  }, [createFlow, createDraft, createDraft?.fieldSpecLines, seedSchemaAddSuggestions]);

  useEffect(() => {
    messagesRef.current = messages;
    saveChatCache(messages, wizard, domainContextKey, createFlow, createDraft, workflow, assistantMode);
  }, [messages, wizard, domainContextKey, createFlow, createDraft, workflow, assistantMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    syncFooterAiSuggestions();
    patchLastBotRelatedControls();
  }, [
    createFlow,
    createDraft,
    wizard,
    workflow,
    schemaAddSuggestions,
    syncFooterAiSuggestions,
    patchLastBotRelatedControls,
  ]);

  const apiUrl = resolveZivaApiBaseUrl(cfg);
  const UNAVAILABLE_MSG = cfg.strings.apiUnavailablePrefix;

  const syncWorkflow = useCallback((next) => {
    setWorkflow(next);
    flowStateRef.current = { ...flowStateRef.current, workflow: next };
    workflowRef.current = next;
  }, []);

  const refreshSuggestions = patchLastBotPanels;

  const appendBot = useCallback(
    (text, extra = {}) => {
      const { createFlow: flow, createDraft: draft, wizard: wiz, workflow: wf } = flowStateRef.current;
      const panels = buildSessionMessagePanels(flow, draft, wiz, wf);
      const relatedControls = extra.relatedControls ?? panels.relatedControls;
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text,
          typingComplete: false,
          navigate: extra.navigate ?? [],
          ...extra,
          relatedControls,
        },
      ]);
      if (extra.aiSuggestions !== undefined) {
        syncFooterAiSuggestions(extra.aiSuggestions);
      } else {
        syncFooterAiSuggestions();
      }
    },
    [syncFooterAiSuggestions],
  );

  const showObjectListInChat = useCallback(
    async (limit) => {
      const n = Number(limit) || 10;
      appendBot('Loading objects from the registry…', { typingComplete: true });
      const result = await fetchDobjObjectListForChat(n);
      if (result.error) {
        appendBot(`Could not load the object list: **${result.error}**`);
        return;
      }
      appendBot(formatObjectListChatMarkdown(result.rows, n), {
        navigate: [{ label: 'Open all objects', url: '/objects' }],
      });
    },
    [appendBot],
  );

  const applyAiSuggestionsFromOrchestrate = useCallback((items, draft) => {
    if (!Array.isArray(items) || !items.length) return;
    const lines = draft?.fieldSpecLines || [];
    const mapped = items
      .map((it) => {
        const spec = normalizeFieldSpecLine(it.spec || String(it.command || '').replace(/^add\s+/i, ''));
        if (!spec) return null;
        return { command: `add ${spec}`, label: it.label || zivaSpecDisplayLabel(spec), spec };
      })
      .filter(Boolean);
    if (!mapped.length) return;
    mapped.forEach((c) => excludedAddSpecsRef.current.add(c.label.toLowerCase()));
    setSchemaAddSuggestions(mapped.slice(0, 3));
  }, []);

  const appendFieldAttributeRevision = useCallback((rev, draftSnap, userNote) => {
    if (rev.kind !== 'revise') return false;
    const nextDraft = {
      ...draftSnap,
      fieldAttrsByLabel: rev.fieldAttrsByLabel ?? draftSnap.fieldAttrsByLabel,
      fieldRequired: rev.required ?? draftSnap.fieldRequired,
    };
    setCreateDraft(nextDraft);
    createDraftRef.current = nextDraft;
    const preview = formatFriendlyFieldPlan(
      nextDraft.domainKey,
      nextDraft.pendingFieldCount,
      nextDraft.label,
      nextDraft.fieldSpecLines,
      nextDraft.topic,
      nextDraft.fieldPresetLabel,
    );
    const attrPreview = formatFieldAttrsForPreview(nextDraft.fieldSpecLines, nextDraft.fieldAttrsByLabel);
    setMessages((prev) => {
      const next = userNote ? [...prev, { from: 'user', text: userNote }] : [...prev];
      return [
        ...next,
        {
          from: 'bot',
          text: `${rev.summary}\n\n${preview}${attrPreview}\n\n${SCHEMA_FIELD_EDIT_HELP}`,
          typingComplete: false,
          relatedControls: buildRelatedControlsForSession(
            createFlow,
            nextDraft,
            wizard,
            workflowRef.current,
          ),
          navigate: [],
        },
      ];
    });
    return true;
  }, [createFlow, wizard]);

  const appendSchemaRevision = useCallback((rev, draftSnap, userNote) => {
    if (rev.kind !== 'revise') return false;
    const nextDraft = {
      ...draftSnap,
      fieldSpecLines: rev.lines,
      fieldRequired: rev.required,
      fieldAttrsByLabel: rev.fieldAttrsByLabel ?? draftSnap.fieldAttrsByLabel,
    };
    setCreateDraft(nextDraft);
    createDraftRef.current = nextDraft;
    const preview = formatFriendlyFieldPlan(
      nextDraft.domainKey,
      nextDraft.pendingFieldCount,
      nextDraft.label,
      rev.lines,
      nextDraft.topic,
      nextDraft.fieldPresetLabel
    );
    setMessages((prev) => {
      const next = userNote ? [...prev, { from: 'user', text: userNote }] : [...prev];
      return [
        ...next,
        {
          from: 'bot',
          text: `Updated: ${rev.summary}\n\n${preview}\n\n${SCHEMA_FIELD_EDIT_HELP}`,
          typingComplete: false,
          relatedControls: buildRelatedControlsForSession(
            createFlow,
            nextDraft,
            wizard,
            workflowRef.current,
          ),
          navigate: [],
        },
      ];
    });
    return true;
  }, [createFlow, wizard]);

  const tryApplyFieldAttributeMessage = useCallback(
    async (trimmed) => {
      if (!looksLikeFieldAttributeMessage(trimmed)) return false;
      const attrMode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;
      if (!canApplyFieldAttributesInChat(attrMode)) {
        appendBot(getModeBlockedMessage(attrMode, 'field_attributes'));
        return true;
      }
      const snap = flowStateRef.current;
      const draft = snap.createDraft;

      if (snap.createFlow === 'confirm_schema' && Array.isArray(draft?.fieldSpecLines) && draft.fieldSpecLines.length) {
        const rev = applyFieldAttributesToDraft(
          trimmed,
          draft.fieldSpecLines,
          draft.fieldAttrsByLabel,
          draft.fieldRequired,
        );
        if (rev.kind === 'revise') {
          appendFieldAttributeRevision(rev, draft, null);
          return true;
        }
        if (rev.kind === 'help') {
          setMessages((prev) => [...prev, { from: 'bot', text: rev.summary, typingComplete: false }]);
          return true;
        }
      }

      const wf = snap.workflow;
      const sysId = wf?.selectedObject?.sysId;
      if (wf?.mode === 'modify_field' && sysId != null && wf.objectPickStep === 'ready' && wf.fieldPickStep !== 'await_confirm') {
        const { items } = parseFieldAttributeInstructions(trimmed);
        if (!items.length) return false;
        appendBot('Saving field attributes…', { typingComplete: true });
        const res = await applyFieldAttributeUpdatesOnObject(sysId, items);
        if (!res.ok) {
          appendBot(`Couldn’t update attributes: **${res.error || 'unknown error'}**\n\n${FIELD_ATTRIBUTE_EDIT_HELP}`);
          return true;
        }
        appendBot(res.summary, {
          navigate: [{ label: 'Open object', url: `/objects/${sysId}` }],
        });
        return true;
      }

      return false;
    },
    [appendFieldAttributeRevision, appendBot],
  );

  const applyOrchestrateFieldAttributeCommands = useCallback(
    async (commands, draft, flow, workflowSnap) => {
      if (!Array.isArray(commands) || !commands.length) return false;
      const joined = commands.join(', ');
      if (flow === 'confirm_schema' && draft?.fieldSpecLines?.length) {
        const rev = applyFieldAttributesToDraft(
          joined,
          draft.fieldSpecLines,
          draft.fieldAttrsByLabel,
          draft.fieldRequired,
        );
        if (rev.kind === 'revise') {
          appendFieldAttributeRevision(rev, draft, joined);
          return true;
        }
      }
      const sysId = workflowSnap?.selectedObject?.sysId;
      if (workflowSnap?.mode === 'modify_field' && sysId != null) {
        const items = commands.flatMap((cmd) => parseFieldAttributeInstructions(cmd).items);
        if (!items.length) return false;
        const res = await applyFieldAttributeUpdatesOnObject(sysId, items);
        if (res.ok) {
          appendBot(res.summary, { navigate: [{ label: 'Open object', url: `/objects/${sysId}` }] });
          return true;
        }
      }
      return false;
    },
    [appendFieldAttributeRevision, appendBot],
  );

  const applySchemaFieldAdd = useCallback(
    (clickedItem) => {
      const draft = createDraftRef.current;
      const lines = draft?.fieldSpecLines;
      if (!Array.isArray(lines) || !lines.length || !clickedItem?.command) return;
      excludedAddSpecsRef.current.add(clickedItem.label.toLowerCase());
      const rev = parseSchemaFieldRevision(clickedItem.command, lines, draft.fieldRequired);
      if (rev.kind === 'help' || rev.kind === 'empty') {
        setMessages((prev) => [...prev, { from: 'bot', text: rev.summary, typingComplete: false }]);
        replaceClickedSchemaAddChip(clickedItem, draft, lines);
        return;
      }
      if (rev.kind === 'revise') {
        appendSchemaRevision(rev, draft, clickedItem.command);
        replaceClickedSchemaAddChip(clickedItem, draft, rev.lines);
      }
    },
    [appendSchemaRevision, replaceClickedSchemaAddChip]
  );

  const panelsForNavFrame = useCallback((frame) => {
    const relatedControls = frame?.relatedControls?.length
      ? frame.relatedControls
      : buildRelatedControlsForSession(
          frame?.createFlow,
          frame?.createDraft,
          frame?.wizard,
          frame?.workflow,
        );
    const aiSuggestions = frame?.aiSuggestions?.length
      ? frame.aiSuggestions
      : buildAiSuggestionsForSession(
          frame?.createFlow,
          frame?.createDraft,
          frame?.wizard,
          frame?.workflow,
        );
    return { relatedControls, aiSuggestions };
  }, []);

  const restorePanelsForFrame = useCallback(
    (frame, promptIfEmpty) => {
      const panels = panelsForNavFrame(frame);
      const hasBot = messagesRef.current.some((m) => m.from === 'bot');
      if (!hasBot && promptIfEmpty) {
        appendBot(promptIfEmpty, { relatedControls: panels.relatedControls });
        syncFooterAiSuggestions(panels.aiSuggestions);
      } else {
        patchLastBotRelatedControls(panels.relatedControls);
        syncFooterAiSuggestions(panels.aiSuggestions);
      }
    },
    [appendBot, panelsForNavFrame, patchLastBotRelatedControls, syncFooterAiSuggestions],
  );

  const pushNavFrame = useCallback(() => {
    const s = flowStateRef.current;
    const panels = buildSessionMessagePanels(s.createFlow, s.createDraft, s.wizard, s.workflow);
    navStackRef.current.push(
      cloneNavFrame(s, {
        relatedControls: panels.relatedControls,
        aiSuggestions: panels.aiSuggestions,
        id: s.wizard?.step || 'custom',
      }),
    );
  }, []);

  const enterObjectMenu = useCallback(() => {
    pushNavFrame();
    const wiz = { step: 'object_actions', moduleId: 'objects', objectAction: null };
    setWizard(wiz);
    flowStateRef.current = { ...flowStateRef.current, wizard: wiz };
    syncWorkflow({ ...INITIAL_WORKFLOW });
    setCreateFlow(null);
  }, [pushNavFrame, syncWorkflow]);

  const restoreNavFrame = useCallback(
    (frame) => {
      if (!frame) return;
      setWizard(frame.wizard || { ...INITIAL_WIZARD });
      syncWorkflow(frame.workflow || { ...INITIAL_WORKFLOW });
      setCreateFlow(frame.createFlow ?? null);
      if (frame.createDraft) setCreateDraft({ ...INITIAL_CREATE_DRAFT, ...frame.createDraft });
      flowStateRef.current = {
        ...flowStateRef.current,
        wizard: frame.wizard || { ...INITIAL_WIZARD },
        workflow: frame.workflow || { ...INITIAL_WORKFLOW },
        createFlow: frame.createFlow ?? null,
      };
    },
    [syncWorkflow],
  );

  const exitToHome = useCallback(() => {
    navStackRef.current = [createHomeFrame()];
    syncWorkflow({ ...INITIAL_WORKFLOW });
    setCreateFlow(null);
    setCreateDraft({ ...INITIAL_CREATE_DRAFT });
    schemaAddInitRef.current = false;
    excludedAddSpecsRef.current.clear();
    setSchemaAddSuggestions([]);
    setWizard({ ...INITIAL_WIZARD });
    setMessages([]);
    setFooterAiSuggestions([]);
    flowStateRef.current = {
      createFlow: null,
      createDraft: { ...INITIAL_CREATE_DRAFT },
      wizard: { ...INITIAL_WIZARD },
      workflow: { ...INITIAL_WORKFLOW },
      domainContextKey: flowStateRef.current.domainContextKey,
    };
  }, [syncWorkflow]);

  const exitToPrevious = useCallback(() => {
    if (navStackRef.current.length <= 1) {
      exitToHome();
      return;
    }
    navStackRef.current.pop();
    const frame = navStackRef.current[navStackRef.current.length - 1];
    restoreNavFrame(frame);
    if (frame.showWelcome || frame.id === 'home' || frame.id === 'modules') {
      setMessages([]);
      return;
    }
    const prompt =
      frame.id === 'object_actions' || frame.prompt === 'object_menu'
        ? cfg.strings.objectActionPrompt
        : null;
    restorePanelsForFrame(frame, prompt);
  }, [cfg.strings.objectActionPrompt, exitToHome, restorePanelsForFrame, restoreNavFrame]);

  const exitToObjectMenu = useCallback(() => {
    syncWorkflow({ ...INITIAL_WORKFLOW });
    setCreateFlow(null);
    setCreateDraft({ ...INITIAL_CREATE_DRAFT });
    schemaAddInitRef.current = false;
    excludedAddSpecsRef.current.clear();
    setSchemaAddSuggestions([]);
    const menuFrame = createObjectMenuFrame(buildObjectMenuRelatedControls());
    const idx = navStackRef.current.findIndex((f) => f.id === 'object_actions');
    if (idx >= 0) {
      navStackRef.current = navStackRef.current.slice(0, idx + 1);
    } else {
      navStackRef.current.push(menuFrame);
    }
    restoreNavFrame(menuFrame);
    restorePanelsForFrame(menuFrame, cfg.strings.objectActionPrompt);
  }, [cfg.strings.objectActionPrompt, restorePanelsForFrame, restoreNavFrame, syncWorkflow]);

  const runObjectMenuAction = useCallback(
    (action) => {
      if (!action) return;
      const menuMode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;
      const wfMode = action.workflowMode;
      if (wfMode && !canStartMenuWorkflow(menuMode, wfMode)) {
        appendBot(getModeBlockedMessage(menuMode, 'menu_workflow'));
        return;
      }
      if (action.navAction === 'exit_home') {
        exitToHome();
        return;
      }
      if (action.navAction === 'exit_previous') {
        exitToPrevious();
        return;
      }
      const mode = action.workflowMode;
      if (!mode) return;

      const wiz = { step: 'object_actions', moduleId: 'objects', objectAction: action.id || mode };
      setWizard(wiz);
      flowStateRef.current = { ...flowStateRef.current, wizard: wiz };

      if (mode === 'create_object') {
        syncWorkflow({ ...INITIAL_WORKFLOW });
        setCreateFlow('ask_topic');
        setCreateDraft({ ...INITIAL_CREATE_DRAFT });
        appendBot(
          'Let’s create a new object together.\n\nIn plain language, what is it about? (Example: “tracking health insurance claims for members or student performance.”)',
        );
        refreshSuggestions();
        return;
      }

      pushNavFrame();
      setCreateFlow(null);
      startWorkflowMode(mode, syncWorkflow, appendBot, patchLastBotAiSuggestions);
    },
    [appendBot, exitToHome, exitToPrevious, patchLastBotAiSuggestions, pushNavFrame, syncWorkflow],
  );

  const makeWorkflowHandlers = useCallback(
    (pushOrchestrate) => ({
      appendBot,
      setWorkflow: syncWorkflow,
      navigate,
      setOpen,
      refreshSuggestions,
      initialWorkflow: INITIAL_WORKFLOW,
      pushOrchestrateReply: pushOrchestrate,
      tryApplyFieldAttributes: tryApplyFieldAttributeMessage,
      exitToObjectMenu,
      exitToHome,
      exitToPrevious,
    }),
    [
      appendBot,
      syncWorkflow,
      navigate,
      refreshSuggestions,
      exitToObjectMenu,
      exitToHome,
      exitToPrevious,
      tryApplyFieldAttributeMessage,
    ],
  );

  const applyWorkflowCommand = useCallback(
    (cmd, orchestrateAnswer) => {
      if (!cmd) return false;
      const wfGateMode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;
      if (cmd.type === 'start' && !canStartMenuWorkflow(wfGateMode, cmd.mode)) {
        appendBot(getModeBlockedMessage(wfGateMode, 'menu_workflow'));
        return true;
      }
      if (cmd.type === 'start') {
        const action =
          OBJECT_MENU_ACTIONS.find((a) => a.workflowMode === cmd.mode) || {
            workflowMode: cmd.mode,
            id: cmd.mode,
          };
        if (orchestrateAnswer && cmd.mode !== 'create_object') {
          enterObjectMenu();
          const next = { ...INITIAL_WORKFLOW, mode: cmd.mode, objectPickStep: 'await_query' };
          syncWorkflow(next);
          appendBot(orchestrateAnswer);
          refreshSuggestions();
          return true;
        }
        runObjectMenuAction(action);
        return true;
      }
      return false;
    },
    [appendBot, enterObjectMenu, refreshSuggestions, runObjectMenuAction, syncWorkflow],
  );

  const orchestrateToPanels = useCallback((data) => {
    const rawControls = (data?.relatedControls || []).map(controlToAiChip).filter(Boolean);
    const splitLlm = splitChipsIntoPanels(rawControls);
    const fromControls = splitLlm.relatedControls;
    const fromAi = (data?.aiSuggestions || [])
      .map((it) => {
        const label = String(it?.label ?? '').trim();
        const command = String(it?.command ?? '').trim();
        if (!label && !command) return null;
        if (command.toLowerCase().startsWith('add ')) {
          return { id: `add_${label}`, label: label || command, command };
        }
        return textToAiChip(label || command);
      })
      .filter(Boolean);
    const s = flowStateRef.current;
    const fallback = buildSessionMessagePanels(
      s.createFlow,
      s.createDraft,
      s.wizard,
      s.workflow,
    );
    return {
      relatedControls: mergePanelSources(fromControls, fallback.relatedControls),
      aiSuggestions: mergePanelSources(fromAi, splitLlm.aiSuggestions, fallback.aiSuggestions),
    };
  }, []);

  const pushOrchestrateReply = useCallback(
    async (trimmed) => {
      if (await tryApplyFieldAttributeMessage(trimmed)) return;

      const snap = flowStateRef.current;
      const mode = snap.assistantMode || DEFAULT_ASSISTANT_MODE;

      const explicitCreate = parseComprehensiveCreateObjectRequest(trimmed);
      if (explicitCreate?.fieldSpecLines?.length) {
        if (!canRunComprehensiveCreate(mode)) {
          appendBot(getModeBlockedMessage(mode, 'comprehensive_create'));
          return;
        }
        await runComprehensiveCreateFlowRef.current?.(explicitCreate, trimmed);
        return;
      }

      if (hasReadyCreateDraft(snap.createDraft) && isCreateObjectAffirmation(trimmed)) {
        if (!canRunCreateObject(mode)) {
          appendBot(getModeBlockedMessage(mode, 'save_object'));
          return;
        }
        if (snap.createFlow !== 'confirm_schema') {
          setCreateFlow('confirm_schema');
        }
        await runCreateObjectRef.current?.();
        return;
      }

      const exploreContext = shouldAttachExploreContext(mode) ? exploreContextRef.current : null;
      const session = buildZivaSessionPayload(
        snap.createFlow,
        snap.createDraft,
        snap.wizard,
        snap.workflow,
        snap.assistantMode,
        exploreContext,
      );
      const recent = messagesRef.current.slice(-8).map((m) => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: String(m.text ?? '').slice(0, 2000),
      }));
      try {
        const data = await fetchZivaOrchestrate(apiUrl, {
          question: trimmed,
          session,
          messages: recent,
          model: activeModel,
        });
        if (
          data.workflowCommand?.type === 'start' &&
          applyWorkflowCommand(data.workflowCommand, data.answer)
        ) {
          return;
        }
        if (data.fieldAttributeCommands?.length && !canApplyFieldAttributesInChat(mode)) {
          appendBot(getModeBlockedMessage(mode, 'field_attributes'));
          return;
        }
        if (
          data.workflowCommand?.type === 'list_objects' &&
          workflowRef.current.objectPickStep === 'await_query'
        ) {
          const handled = await processWorkflowUserMessage(
            `Top ${data.workflowCommand.limit}`,
            workflowRef.current,
            makeWorkflowHandlers(pushOrchestrateReply),
          );
          if (handled) return;
        }
        const flow = flowStateRef.current.createFlow;
        const draft = flowStateRef.current.createDraft;
        if (data.fieldAttributeCommands?.length) {
          const attrHandled = await applyOrchestrateFieldAttributeCommands(
            data.fieldAttributeCommands,
            draft,
            flow,
            flowStateRef.current.workflow,
          );
          if (attrHandled) {
            applyAiSuggestionsFromOrchestrate(data.aiSuggestions, createDraftRef.current);
            return;
          }
        }
        if (data.schemaEditCommand && flow === 'confirm_schema' && draft?.fieldSpecLines) {
          const rev = parseSchemaFieldRevision(data.schemaEditCommand, draft.fieldSpecLines, draft.fieldRequired);
          if (rev.kind === 'revise') {
            appendSchemaRevision(rev, draft, data.schemaEditCommand);
            applyAiSuggestionsFromOrchestrate(data.aiSuggestions, createDraftRef.current);
            return;
          }
        }
        if (data.aiSuggestions?.length && flow === 'confirm_schema') {
          applyAiSuggestionsFromOrchestrate(data.aiSuggestions, draft);
        }
        const panels = orchestrateToPanels(data);
        const planSteps =
          shouldShowPlanChecklist(mode) && data.planSteps?.length ? data.planSteps : null;
        setMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: data.answer,
            question: trimmed,
            typingComplete: false,
            navigate: data.navigate,
            relatedControls: panels.relatedControls,
            workflowExitPrompt: data.workflowExitPrompt,
            planSteps,
          },
        ]);
        syncFooterAiSuggestions(panels.aiSuggestions);
      } catch {
        const fb = fallbackOrchestrate(trimmed, session);
        const panels = orchestrateToPanels(fb);
        setMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: fb.answer,
            question: trimmed,
            typingComplete: false,
            navigate: fb.navigate,
            relatedControls: panels.relatedControls,
            planSteps: fb.planSteps?.length ? fb.planSteps : null,
          },
        ]);
        syncFooterAiSuggestions(panels.aiSuggestions);
      }
    },
    [
      activeModel,
      apiUrl,
      appendBot,
      appendSchemaRevision,
      applyOrchestrateFieldAttributeCommands,
      applyAiSuggestionsFromOrchestrate,
      applyWorkflowCommand,
      makeWorkflowHandlers,
      orchestrateToPanels,
      syncFooterAiSuggestions,
      tryApplyFieldAttributeMessage,
    ],
  );

  const togglePlanStep = useCallback((messageIndex, stepId) => {
    setMessages((prev) =>
      prev.map((m, idx) => {
        if (idx !== messageIndex || !Array.isArray(m.planSteps)) return m;
        return {
          ...m,
          planSteps: m.planSteps.map((s, si) => {
            const id = s.id || `step-${si + 1}`;
            if (id !== stepId) return s;
            return { ...s, id, done: !s.done };
          }),
        };
      }),
    );
  }, []);

  const submitCreateTopic = useCallback((topic, userQuestion) => {
    const dk = detectDomainKeyFromMessage(topic);
    const suggested = suggestObjectLabelFromTopic(topic);
    const api = toUserDefinedApiName(suggested);
    setCreateDraft({
      topic,
      label: suggested,
      apiName: api,
      domainKey: dk || 'generic',
      pendingFieldCount: null,
      fieldSpecLines: null,
      fieldRequired: null,
      fieldPresetLabel: '',
    });
    setCreateFlow('confirm_name');
    setMessages((prev) => [
      ...prev,
      {
        from: 'bot',
        text: `Lovely — I’m thinking we call this **${suggested}** behind the scenes as \`${api}\`.\n\nIf that feels right, say **yes** or **ok**. Prefer another name? Just type it.`,
        question: userQuestion || topic,
        typingComplete: false,
      },
    ]);
  }, []);

  const runCreateObject = useCallback(async () => {
    const saveMode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;
    if (!canRunCreateObject(saveMode)) {
      appendBot(getModeBlockedMessage(saveMode, 'save_object'));
      return;
    }
    try {
      const d = { ...INITIAL_CREATE_DRAFT, ...(createDraftRef.current || {}) };
      const count = Number(d.pendingFieldCount);
      if (!Number.isFinite(count) || count < 1) {
        setMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: 'Let’s pick a size again—tap **Top 10**, **Top 15**, **Top 20**, or type a number from **1** to **60**.',
            typingComplete: false,
          },
        ]);
        setCreateFlow('pick_count');
        return;
      }
      const domainKey = d.domainKey === 'health_claims' ? 'health_claims' : 'generic';
      const explicitLines =
        Array.isArray(d.fieldSpecLines) && d.fieldSpecLines.map((x) => String(x ?? '').trim()).filter(Boolean).length > 0
          ? d.fieldSpecLines.map((x) => String(x ?? '').trim()).filter(Boolean)
          : null;
      const fieldRequired =
        explicitLines &&
        Array.isArray(d.fieldRequired) &&
        d.fieldRequired.length === explicitLines.length
          ? d.fieldRequired.map(Boolean)
          : null;
      const res = await createObjectFromZivaChat({
        objectLabel: String(d.label ?? ''),
        objectApiName: String(d.apiName ?? ''),
        description: String(d.topic ?? ''),
        domainKey,
        fieldCount: count,
        fieldSpecLines: explicitLines,
        fieldRequired,
        fieldAttrsByLabel:
          d.fieldAttrsByLabel && typeof d.fieldAttrsByLabel === 'object' ? d.fieldAttrsByLabel : null,
      });
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { from: 'bot', text: `I couldn’t save that yet: ${res.error}`, typingComplete: false },
        ]);
        return;
      }
      const labelUsed = d.label;
      const colCount = explicitLines?.length ?? count;
      syncWorkflow({ ...INITIAL_WORKFLOW });
      setCreateFlow(null);
      setCreateDraft({ ...INITIAL_CREATE_DRAFT });
      const id = res.sysId;
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: `All set — **${labelUsed}** is live with **${colCount}** starter columns (plus the usual system fields). I’m opening it so you can look around.`,
          typingComplete: false,
        },
      ]);
      if (id != null) navigate(`/objects/${id}`);
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: `Something unexpected happened: ${msg}. Want to try again in a moment?`,
          typingComplete: false,
        },
      ]);
    }
  }, [appendBot, navigate, syncWorkflow]);

  runCreateObjectRef.current = runCreateObject;

  const runComprehensiveCreateFlow = useCallback(
    async (spec, userText) => {
      const topic = String(spec.topic ?? spec.objectLabel ?? '').trim();
      const explicitLines = Array.isArray(spec.fieldSpecLines)
        ? spec.fieldSpecLines.map((l) => String(l ?? '').trim()).filter(Boolean)
        : null;
      const count = explicitLines?.length || Number(spec.fieldCount) || 10;
      const label = String(spec.objectLabel ?? '').trim() || suggestObjectLabelFromTopic(topic);
      const api = toUserDefinedApiName(label);
      const domainKey = detectDomainKeyFromMessage(`${topic} ${label}`) || 'generic';
      const usedExplicitColumns = explicitLines && explicitLines.length > 0;

      enterObjectMenu();
      syncWorkflow({ ...INITIAL_WORKFLOW });
      setCreateFlow('confirm_schema');

      appendBot(
        usedExplicitColumns
          ? `Got it — creating **${label}** with the **${count}** columns you listed${spec.autoProceed ? ', then saving and opening it' : ''}.`
          : `Understood — I’ll create **${label}** with **${count}** custom fields in one go${spec.autoProceed ? ' and save when done' : ''}.`,
        { typingComplete: true },
      );

      let specLines = explicitLines;
      let fieldPresetLabel = usedExplicitColumns ? 'Your column list' : '';
      let source = usedExplicitColumns ? 'user' : 'groq';

      const draftBase = {
        topic: topic || label,
        label,
        apiName: api,
        domainKey,
        pendingFieldCount: count,
        fieldSpecLines: null,
        fieldRequired: null,
        fieldAttrsByLabel: null,
        fieldPresetLabel: '',
      };

      if (!usedExplicitColumns) {
        setMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: 'Drafting fields with AI for your topic…',
            typingComplete: true,
          },
        ]);
        const resolved = await resolveFieldSpecsForObject(apiUrl, draftBase, count, activeModel);
        specLines = resolved.specLines;
        fieldPresetLabel = resolved.fieldPresetLabel;
        source = resolved.source;
      }

      const nextDraft = {
        ...draftBase,
        fieldSpecLines: specLines,
        fieldRequired: specLines.map(() => false),
        fieldPresetLabel,
      };
      setCreateDraft(nextDraft);
      createDraftRef.current = nextDraft;

      const preview = formatFriendlyFieldPlan(
        domainKey,
        count,
        label,
        specLines,
        topic || label,
        fieldPresetLabel,
      );
      const fallbackNote =
        source === 'fallback'
          ? '\n\n_(AI wasn’t available — using a local field catalog.)_'
          : '';

      const mode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;
      const autoProceed = shouldAutoProceedCreate(mode, spec.autoProceed);
      const planNote =
        mode === 'plan'
          ? '\n\n**Plan mode** — review this draft. Say **Create** or **Create it** when you want me to save the object.'
          : mode === 'learn'
            ? '\n\n**Learn mode** — this is a preview only. Switch to **Control** or say **Create** in Control mode to save.'
            : '';

      if (autoProceed) {
        setMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: `${preview}${fallbackNote}\n\nCreating **${label}** now…`,
            typingComplete: true,
          },
        ]);
        await runCreateObjectRef.current?.();
        return;
      }

      appendBot(
        `${preview}${fallbackNote}${planNote}\n\nWhen this looks right, say **Create** or tap **Create the object**.`,
        { question: userText },
      );
    },
    [activeModel, apiUrl, appendBot, enterObjectMenu, syncWorkflow],
  );

  runComprehensiveCreateFlowRef.current = runComprehensiveCreateFlow;

  const executePlanStep = async (step) => {
    const stepMode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;
    if (step.kind === 'comprehensive_create' || step.kind === 'explicit_fields_create') {
      if (!canRunComprehensiveCreate(stepMode)) {
        appendBot(getModeBlockedMessage(stepMode, 'comprehensive_create'));
        return;
      }
      await runComprehensiveCreateFlow(step, step.segment);
      return;
    }
    if (step.kind === 'nav') {
      if (step.nav === 'exit_home') exitToHome();
      else exitToPrevious();
      return;
    }
    if (step.kind === 'workflow') {
      if (!canStartMenuWorkflow(stepMode, step.mode)) {
        appendBot(getModeBlockedMessage(stepMode, 'menu_workflow'));
        return;
      }
      const act = OBJECT_MENU_ACTIONS.find((a) => a.workflowMode === step.mode);
      runObjectMenuAction(act || { workflowMode: step.mode, id: step.mode });
      return;
    }
    if (step.kind === 'list') {
      await processWorkflowUserMessage(
        step.segment,
        workflowRef.current.mode ? workflowRef.current : { ...INITIAL_WORKFLOW, mode: 'load_object', objectPickStep: 'await_query' },
        makeWorkflowHandlers(pushOrchestrateReply),
      );
      return;
    }
    await pushOrchestrateReply(step.segment);
  };

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    const { createFlow: flow, createDraft: draftSnap, workflow: wfSnap } = flowStateRef.current;
    const mode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;

    setInput('');
    setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);

    const comprehensive = parseComprehensiveCreateObjectRequest(trimmed);
    if (comprehensive) {
      if (!canRunComprehensiveCreate(mode)) {
        appendBot(getModeBlockedMessage(mode, 'comprehensive_create'));
        return;
      }
      await runComprehensiveCreateFlow(comprehensive, trimmed);
      return;
    }

    const multi = parseMultiCommandPlan(trimmed);
    if (multi.multi) {
      appendBot(
        `I’ll run **${multi.plan.length}** steps in order:\n\n${multi.plan.map((p, i) => `${i + 1}. ${p.summary}`).join('\n')}`,
        { relatedControls: [], aiSuggestions: [] },
      );
      for (const step of multi.plan) {
        await executePlanStep(step);
      }
      return;
    }

    const n = normReply(trimmed);
    const wfHandlers = makeWorkflowHandlers(pushOrchestrateReply);

    if (hasReadyCreateDraft(draftSnap) && isCreateObjectAffirmation(trimmed)) {
      if (!canRunCreateObject(mode)) {
        appendBot(getModeBlockedMessage(mode, 'save_object'));
        return;
      }
      if (flow !== 'confirm_schema') {
        setCreateFlow('confirm_schema');
        createDraftRef.current = draftSnap;
      }
      await runCreateObject();
      return;
    }

    if (wfSnap?.mode && wfSnap.mode !== 'create_object' && !flow) {
      if (mode === 'learn' || mode === 'plan') {
        if (await tryApplyFieldAttributeMessage(trimmed)) return;
        await pushOrchestrateReply(trimmed);
        return;
      }
      const handled = await processWorkflowUserMessage(trimmed, wfSnap, wfHandlers);
      if (handled) return;
      if (await tryApplyFieldAttributeMessage(trimmed)) return;
      await pushOrchestrateReply(trimmed);
      return;
    }

    if (flow && looksOffTopicDuringFlow(trimmed, flow)) {
      await pushOrchestrateReply(trimmed);
      return;
    }

    if (!flow && !wfSnap?.mode) {
      const menuChoice = parseObjectMenuChoice(trimmed);
      if (menuChoice?.nav === 'exit_home') {
        exitToHome();
        return;
      }
      if (menuChoice?.nav === 'exit_previous') {
        exitToPrevious();
        return;
      }
      if (menuChoice?.nav === 'open_objects') {
        enterObjectMenu();
        appendBot(cfg.strings.objectActionPrompt, {
          relatedControls: buildObjectMenuRelatedControls(),
        });
        return;
      }
      if (menuChoice?.mode) {
        if (!canStartMenuWorkflow(mode, menuChoice.mode)) {
          appendBot(getModeBlockedMessage(mode, 'menu_workflow'));
          return;
        }
        const action = OBJECT_MENU_ACTIONS.find((a) => a.workflowMode === menuChoice.mode);
        if (menuChoice.mode === 'create_object') {
          const comprehensiveCreate = parseComprehensiveCreateObjectRequest(trimmed);
          if (comprehensiveCreate) {
            await runComprehensiveCreateFlow(comprehensiveCreate, trimmed);
            return;
          }
          const createIntent = parseCreateObjectIntent(trimmed);
          if (createIntent.topic) {
            const fieldCount = parseTopNFieldChoice(trimmed);
            if (fieldCount?.kind === 'count') {
              await runComprehensiveCreateFlow(
                {
                  kind: 'comprehensive_create',
                  topic: createIntent.topic.split(/,\s*(?:top|you)\b/i)[0].trim(),
                  fieldCount: fieldCount.value,
                  autoProceed: false,
                  navigateAfter: false,
                  summary: '',
                },
                trimmed,
              );
              return;
            }
            enterObjectMenu();
            setCreateFlow('ask_topic');
            submitCreateTopic(createIntent.topic, trimmed);
            return;
          }
        }
        if (flowStateRef.current.wizard?.step !== 'object_actions') {
          enterObjectMenu();
        }
        runObjectMenuAction(
          action || { workflowMode: menuChoice.mode, id: menuChoice.mode, label: trimmed },
        );
        return;
      }
    }

    if (flow === 'ask_topic') {
      submitCreateTopic(trimmed, trimmed);
      return;
    }

    if (flow === 'confirm_name') {
      const cur = draftSnap;
      let label = cur.label;
      let api = cur.apiName;
      if (!['yes', 'ok', 'y'].includes(n)) {
        label = trimmed;
        api = toUserDefinedApiName(trimmed);
      }
      const detectedAtName = detectDomainKeyFromMessage(`${label} ${cur.topic}`);
      const domainKey = detectedAtName === 'health_claims' ? 'health_claims' : 'generic';
      setCreateDraft({
        ...cur,
        label,
        apiName: api,
        domainKey,
        pendingFieldCount: null,
        fieldSpecLines: null,
        fieldRequired: null,
      });
      setCreateFlow('pick_count');
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: `Great — we’ll call it **${label}** (\`${api}\`).\n\nRoughly how many starter fields should I sketch for you? Tap **Top 10**, **Top 15**, **Top 20**, choose **Custom**, or type any number from **1** to **60** (like **25**).`,
          typingComplete: false,
        },
      ]);
      return;
    }

    if (flow === 'pick_count') {
      const choice = parseTopNFieldChoice(trimmed);
      if (choice?.kind === 'custom') {
        setCreateFlow('custom_count');
        setMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: 'Sure — how many fields would you like? Pick a whole number between **1** and **60**.',
            typingComplete: false,
          },
        ]);
        return;
      }
      if (!choice || choice.kind !== 'count') {
        setMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: 'I didn’t quite catch that. Try **Top 10**, **Top 15**, **Top 20**, **Custom**, or a number like **25**.',
            typingComplete: false,
          },
        ]);
        return;
      }
      const count = choice.value;
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: 'Give me a moment — I’m drafting fields for your topic with AI…',
          typingComplete: true,
        },
      ]);
      const { specLines, fieldPresetLabel, source } = await resolveFieldSpecsForObject(
        apiUrl,
        draftSnap,
        count,
        activeModel,
      );
      const specReq = specLines.map(() => false);
      const nextDraft = {
        ...draftSnap,
        pendingFieldCount: count,
        fieldSpecLines: specLines,
        fieldRequired: specReq,
        fieldPresetLabel,
      };
      setCreateDraft(nextDraft);
      createDraftRef.current = nextDraft;
      setCreateFlow('confirm_schema');
      const preview = formatFriendlyFieldPlan(
        nextDraft.domainKey,
        count,
        nextDraft.label,
        specLines,
        nextDraft.topic,
        fieldPresetLabel
      );
      const fallbackNote =
        source === 'fallback'
          ? '\n\n_(AI wasn’t available — using a local fallback. Set **GROQ_API_KEY** and run the Briselle server so `/api/ziva/object-fields` can reach Groq.)_'
          : '';
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: `${preview}${fallbackNote}\n\n${SCHEMA_FIELD_EDIT_HELP}`,
          typingComplete: false,
        },
      ]);
      return;
    }

    if (flow === 'custom_count') {
      const parsed = parseInt(trimmed, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 60) {
        setMessages((prev) => [
          ...prev,
          { from: 'bot', text: 'A number between **1** and **60** works best here—want to try again?', typingComplete: false },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: 'Give me a moment — I’m drafting fields for your topic with AI…',
          typingComplete: true,
        },
      ]);
      const { specLines, fieldPresetLabel, source } = await resolveFieldSpecsForObject(
        apiUrl,
        draftSnap,
        parsed,
        activeModel,
      );
      const specReq = specLines.map(() => false);
      const nextDraft = {
        ...draftSnap,
        pendingFieldCount: parsed,
        fieldSpecLines: specLines,
        fieldRequired: specReq,
        fieldPresetLabel,
      };
      setCreateDraft(nextDraft);
      createDraftRef.current = nextDraft;
      setCreateFlow('confirm_schema');
      const preview = formatFriendlyFieldPlan(
        nextDraft.domainKey,
        parsed,
        nextDraft.label,
        specLines,
        nextDraft.topic,
        fieldPresetLabel
      );
      const fallbackNote =
        source === 'fallback'
          ? '\n\n_(AI wasn’t available — using a local fallback. Set **GROQ_API_KEY** and run the Briselle server.)_'
          : '';
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: `${preview}${fallbackNote}\n\n${SCHEMA_FIELD_EDIT_HELP}`,
          typingComplete: false,
        },
      ]);
      return;
    }

    if (flow === 'confirm_schema') {
      if (isCreateObjectAffirmation(trimmed)) {
        if (!canRunCreateObject(mode)) {
          appendBot(getModeBlockedMessage(mode, 'save_object'));
          return;
        }
        await runCreateObject();
        return;
      }
      if (looksLikeFieldAttributeMessage(trimmed)) {
        if (!canApplyFieldAttributesInChat(mode)) {
          appendBot(getModeBlockedMessage(mode, 'field_attributes'));
          return;
        }
        const attrRev = applyFieldAttributesToDraft(
          trimmed,
          draftSnap.fieldSpecLines,
          draftSnap.fieldAttrsByLabel,
          draftSnap.fieldRequired,
        );
        if (attrRev.kind === 'revise') {
          appendFieldAttributeRevision(attrRev, draftSnap, null);
          return;
        }
        if (attrRev.kind === 'help') {
          setMessages((prev) => [...prev, { from: 'bot', text: attrRev.summary, typingComplete: false }]);
          return;
        }
      }
      const rev = parseSchemaFieldRevision(trimmed, draftSnap.fieldSpecLines, draftSnap.fieldRequired);
      if (rev.kind === 'help') {
        setMessages((prev) => [...prev, { from: 'bot', text: rev.summary, typingComplete: false }]);
        return;
      }
      if (rev.kind === 'empty') {
        setMessages((prev) => [...prev, { from: 'bot', text: rev.summary, typingComplete: false }]);
        return;
      }
      if (rev.kind === 'revise') {
        appendSchemaRevision(rev, draftSnap, trimmed);
        return;
      }
      if (n.includes('change') && n.includes('name')) {
        setCreateDraft((prev) => ({
          ...prev,
          fieldSpecLines: null,
          fieldRequired: null,
          pendingFieldCount: null,
        }));
        setCreateFlow('confirm_name');
        setMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: 'No problem — what would you like to call this object instead?',
            typingComplete: false,
          },
        ]);
        return;
      }
      await pushOrchestrateReply(trimmed);
      return;
    }

    const dkMsg = detectDomainKeyFromMessage(trimmed);
    if (dkMsg) setDomainContextKey(dkMsg);

    if (shouldTryLocalAnswerFirst(mode) && !flow && !wfSnap?.mode) {
      const local = getAnswerForMessage(trimmed, { domainKey: domainContextKey || dkMsg });
      const generic = getConversationalFallback(trimmed);
      if (local && local !== generic) {
        appendBot(local);
        return;
      }
    }

    await pushOrchestrateReply(trimmed);
  };

  sendMessageRef.current = sendMessage;

  const handleRelatedControl = useCallback(
    (ctrl) => {
      if (!ctrl) return;
      const action = String(ctrl.action || '');
      if (action === 'navigate' && ctrl.url) {
        navigate(ctrl.url);
        setOpen(false);
        return;
      }
      if (action === 'open_objects_menu') {
        enterObjectMenu();
        appendBot(cfg.strings.objectActionPrompt, {
          relatedControls: buildObjectMenuRelatedControls(),
        });
        return;
      }
      if (action === 'exit_home') {
        exitToHome();
        return;
      }
      if (action === 'exit_previous') {
        exitToPrevious();
        return;
      }
      if (action === 'exit_workflow' || action === 'exit_to_objects_menu') {
        exitToObjectMenu();
        return;
      }
      if (action === 'start_create' || (action === 'start_workflow' && String(ctrl.value) === 'create_object')) {
        const chipMode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;
        if (!canStartMenuWorkflow(chipMode, 'create_object')) {
          appendBot(getModeBlockedMessage(chipMode, 'menu_workflow'));
          return;
        }
        runObjectMenuAction(OBJECT_MENU_ACTIONS.find((a) => a.id === 'create'));
        return;
      }
      if (action === 'start_workflow') {
        const chipMode = flowStateRef.current.assistantMode || DEFAULT_ASSISTANT_MODE;
        const wfMode = String(ctrl.value || 'modify_object');
        if (!canStartMenuWorkflow(chipMode, wfMode)) {
          appendBot(getModeBlockedMessage(chipMode, 'menu_workflow'));
          return;
        }
        const act = OBJECT_MENU_ACTIONS.find((a) => a.workflowMode === wfMode);
        runObjectMenuAction(act || { workflowMode: wfMode, id: wfMode });
        return;
      }
      if (action === 'exit_create') {
        exitToObjectMenu();
        return;
      }
      if (action === 'rename_object') {
        setCreateFlow('confirm_name');
        appendBot('What would you like to call this object?');
        return;
      }
      if (action === 'edit_object') {
        const objId = workflowRef.current?.selectedObject?.sysId ?? createDraftRef.current?.savedSysId;
        navigate(objId != null ? `/objects/${objId}` : '/objects/new');
        setOpen(false);
        return;
      }
      if (action === 'remove_object' || action === 'delete_object') {
        if (flowStateRef.current.createFlow) {
          appendBot(
            '**Remove Object** — this record is still a chat draft until you tap **Create it**. Use **Exit Object Creation** to discard it, or finish saving first.',
          );
          return;
        }
        navigate('/objects');
        setOpen(false);
        appendBot('Use the **Objects** list to open a row and delete it from row actions.');
        return;
      }
      if (action === 'list_objects') {
        const limit = Number(ctrl.value) || 10;
        if (workflowRef.current?.objectPickStep === 'await_query') {
          void processWorkflowUserMessage(`Top ${limit}`, workflowRef.current, makeWorkflowHandlers(pushOrchestrateReply));
          return;
        }
        void showObjectListInChat(limit);
        return;
      }
      if (action === 'select_object') {
        appendBot(`Working with **${createDraftRef.current?.label || 'your object'}**. Tell me the next change.`);
        return;
      }
      if (action === 'add_field') {
        sendMessage('add field');
        return;
      }
      if (action === 'remove_field') {
        sendMessage('remove field');
        return;
      }
      if (action === 'rename_field') {
        sendMessage('rename field');
        return;
      }
      if (action === 'create_it') {
        runCreateObject();
        return;
      }
      if (action === 'pick_count' && ctrl.value) {
        sendMessage(String(ctrl.value));
      }
    },
    [
      appendBot,
      navigate,
      runCreateObject,
      sendMessage,
      showObjectListInChat,
      syncWorkflow,
      refreshSuggestions,
      makeWorkflowHandlers,
      pushOrchestrateReply,
      enterObjectMenu,
      exitToHome,
      exitToObjectMenu,
      runObjectMenuAction,
      cfg.strings.objectActionPrompt,
      buildObjectMenuRelatedControls,
    ],
  );

  const handleAiSuggestionClick = useCallback(
    (chip) => {
      if (!chip) return;
      if (chip.command?.toLowerCase().startsWith('add ')) {
        const item = schemaAddSuggestions.find((s) => s.command === chip.command) || {
          command: chip.command,
          label: String(chip.label || '').replace(/^\+\s*/, ''),
          spec: chip.command.replace(/^add\s+/i, ''),
        };
        applySchemaFieldAdd(item);
        return;
      }
      if (chip.action) {
        handleRelatedControl({
          action: chip.action,
          value: chip.value,
          label: chip.label,
          id: chip.id,
        });
        return;
      }
      const text = chip.sendText || chip.label;
      if (text) sendMessageRef.current?.(text);
    },
    [applySchemaFieldAdd, handleRelatedControl, schemaAddSuggestions],
  );

  const pickModule = (m) => {
    setCreateFlow(null);
    syncWorkflow({ ...INITIAL_WORKFLOW });
    if (m.submenu === 'objects') {
      enterObjectMenu();
      appendBot(cfg.strings.objectActionPrompt, {
        relatedControls: buildObjectMenuRelatedControls(),
      });
      return;
    }
    if (m.submenu === 'records') {
      setWizard({ step: 'record_actions', moduleId: 'records', objectAction: null });
      return;
    }
    if (!m.submenu) {
      if (m.id === 'ziva') {
        appendBot(
          "You're already in **Ziva**. Ask about **Objects** and **Records**, describe a domain (for example Health Claims), or use **Top 10 / Top 15 field ideas** when they appear below."
        );
        return;
      }
      navigate(m.route);
      setOpen(false);
      return;
    }
  };

  const pickObjectAction = (action) => {
    runObjectMenuAction(action);
  };

  const pickObjectNavAction = (action) => {
    runObjectMenuAction(action);
  };

  const pickFieldAction = (fa) => {
    navigate(fa.route);
    setOpen(false);
    appendBot(`${fa.detail}`);
  };

  const pickRecordAction = (action) => {
    if (action.route) {
      navigate(action.route);
      setOpen(false);
    }
    if (action.botReply) {
      appendBot(action.botReply);
    }
    setWizard({ ...INITIAL_WIZARD });
  };

  const resetWizard = () => {
    setWizard({ ...INITIAL_WIZARD });
  };

  const backFromObjectActions = () => {
    exitToHome();
  };

  const backFromFieldActions = () => {
    setWizard({ step: 'object_actions', moduleId: 'objects', objectAction: null });
  };

  const openTalkToUs = () => {
    setOpen(true);
    setMessages((prev) => [
      ...prev,
      {
        from: 'bot',
        text: cfg.strings.contactIntroBot,
        showContactForm: true,
        typingComplete: false,
      },
    ]);
  };

  const resizeComposer = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  const handleComposerInput = (e) => {
    setInput(e.target.value);
    resizeComposer();
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) sendMessage(input);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
  };

  const hasComposerText = Boolean(input.trim());

  useEffect(() => {
    if (open) resizeComposer();
  }, [open, input, resizeComposer]);

  const showWelcome = messages.length === 0;

  const ContactForm = ContactFormOverride || SimpleZivaContactForm;
  const contactExtraProps = ContactFormOverride ? {} : { submitUrl: cfg.contactSubmitUrl, submitButtonLabel: 'Send' };

  const welcomeTags = () => {
    if (wizard.step === 'modules') {
      return (
        <div className="ziva-chat-roles">
          {BRISHELLE_MODULES.map((m) => (
            <button key={m.id} type="button" className="ziva-role-tag" onClick={() => pickModule(m)}>
              <i className={`fas ${m.icon}`} aria-hidden="true" />
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      );
    }
    if (wizard.step === 'object_actions') {
      return (
        <div className="ziva-wizard-block">
          <button type="button" className="ziva-wizard-back" onClick={backFromObjectActions}>
            {cfg.strings.backToModules}
          </button>
          <div className="ziva-chat-roles ziva-chat-roles-tight">
            {OBJECT_MENU_ACTIONS.map((a) => (
              <button key={a.id} type="button" className="ziva-role-tag" onClick={() => pickObjectAction(a)}>
                <i className={`fas ${a.icon}`} aria-hidden="true" />
                <span>{a.label}</span>
              </button>
            ))}
            {OBJECT_MENU_NAV_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                className="ziva-role-tag ziva-role-tag-muted"
                onClick={() => pickObjectNavAction(a)}
              >
                <i className={`fas ${a.icon}`} aria-hidden="true" />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (wizard.step === 'field_actions') {
      return (
        <div className="ziva-wizard-block">
          <button type="button" className="ziva-wizard-back" onClick={backFromFieldActions}>
            {cfg.strings.backToObjectActions}
          </button>
          <div className="ziva-chat-roles ziva-chat-roles-tight">
            {OBJECT_FIELD_ACTIONS.map((a) => (
              <button key={a.id} type="button" className="ziva-role-tag" onClick={() => pickFieldAction(a)}>
                <i className={`fas ${a.icon}`} aria-hidden="true" />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (wizard.step === 'record_actions') {
      return (
        <div className="ziva-wizard-block">
          <button type="button" className="ziva-wizard-back" onClick={resetWizard}>
            {cfg.strings.backToModules}
          </button>
          <div className="ziva-chat-roles ziva-chat-roles-tight">
            {RECORD_MENU_ACTIONS.map((a) => (
              <button key={a.id} type="button" className="ziva-role-tag" onClick={() => pickRecordAction(a)}>
                <i className={`fas ${a.icon}`} aria-hidden="true" />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const welcomePrompt = () => {
    if (wizard.step === 'object_actions') return cfg.strings.objectActionPrompt;
    if (wizard.step === 'field_actions') return cfg.strings.fieldActionPrompt;
    if (wizard.step === 'record_actions') return cfg.strings.recordsActionPrompt;
    return cfg.strings.modulePrompt;
  };

  return (
    <div className="ziva-chat-wrapper" aria-label="Ziva chat">
      <div className={`ziva-chat-panel ${open ? 'ziva-chat-panel-open' : ''}`}>
        <div className="ziva-chat-header">
          <div className="ziva-chat-header-brand">
            <span className="ziva-chat-logo" aria-hidden="true">
              Z
              <span className="ziva-logo-i-wrap">
                <img src={cfg.assets.sparkle} alt="" className="ziva-logo-sparkle" />I
              </span>
              VA
            </span>
            <span className="ziva-chat-tagline">{cfg.tagline}</span>
          </div>
          <div className="ziva-chat-header-actions">
            <Link to={cfg.routes.learnMorePath} className="ziva-chat-link-page" onClick={() => setOpen(false)}>
              {cfg.routes.learnMoreLabel}
            </Link>
            <button
              type="button"
              className="ziva-chat-close"
              onClick={() => setOpen(false)}
              aria-label={cfg.strings.closePanelAria}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        <div className="ziva-chat-body">
          {showWelcome && (
            <div className="ziva-chat-welcome">
              <p className="ziva-chat-welcome-text">{cfg.strings.welcomeMessage}</p>
              <p className="ziva-chat-role-prompt">{welcomePrompt()}</p>
              {welcomeTags()}
            </div>
          )}

          <div className="ziva-chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ziva-msg-block ziva-msg-block-${msg.from}`}>
                <div className={`ziva-msg ziva-msg-${msg.from}`} role={msg.from === 'bot' ? 'status' : undefined}>
                  {msg.from === 'bot' && (
                    <div className="ziva-msg-avatar" aria-hidden="true">
                      <img src={cfg.assets.logo} alt="" className="ziva-avatar-logo" />
                    </div>
                  )}
                  <div className="ziva-msg-bubble">
                    <p>
                      {msg.from === 'bot' && msg.typingComplete !== true ? (
                        <TypewriterText
                          text={msg.text}
                          onComplete={() => {
                            setMessages((prev) =>
                              prev.map((m, idx) => (idx === i ? { ...m, typingComplete: true } : m))
                            );
                          }}
                        />
                      ) : (
                        msg.text
                      )}
                    </p>
                  </div>
                </div>
                {msg.from === 'bot' && msg.typingComplete === true && (
                  <>
                    {Array.isArray(msg.planSteps) && msg.planSteps.length > 0 && (
                      <ZivaPlanChecklist steps={msg.planSteps} onToggleStep={(id) => togglePlanStep(i, id)} />
                    )}
                    {Array.isArray(msg.relatedControls) && msg.relatedControls.length > 0 && (
                      <div className="ziva-msg-related">
                        <PanelSectionHeader
                          title={cfg.strings.relatedControlsLabel}
                          hint={cfg.strings.relatedControlsPlaceholder}
                        />
                        <div className="ziva-suggestions-chips">
                          {msg.relatedControls.map((ctrl) => (
                            <button
                              key={ctrl.id}
                              type="button"
                              className="ziva-suggestion-chip ziva-related-control-chip"
                              onClick={() => handleRelatedControl(ctrl)}
                            >
                              {ctrl.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.workflowExitPrompt && (
                      <div className="ziva-workflow-exit">
                        <p className="ziva-workflow-exit-text">{msg.workflowExitPrompt.message}</p>
                        <div className="ziva-suggestions-chips">
                          <button
                            type="button"
                            className="ziva-suggestion-chip"
                            onClick={() => handleRelatedControl({ action: 'exit_create', label: 'Exit' })}
                          >
                            {msg.workflowExitPrompt.exitLabel || 'Exit object creation'}
                          </button>
                          <button
                            type="button"
                            className="ziva-suggestion-chip"
                            onClick={() =>
                              appendBot(
                                msg.workflowExitPrompt.continueLabel
                                  ? `OK — ${msg.workflowExitPrompt.continueLabel}`
                                  : 'Continuing object creation.',
                              )
                            }
                          >
                            {msg.workflowExitPrompt.continueLabel || 'Continue creating object'}
                          </button>
                        </div>
                      </div>
                    )}
                    {Array.isArray(msg.navigate) && msg.navigate.length > 0 && (
                      <div className="ziva-msg-nav">
                        <span className="ziva-nav-label">{cfg.strings.navigateLabel}</span>
                        <div className="ziva-nav-links">
                          {msg.navigate.map((link, j) =>
                            link.url?.startsWith('http') ? (
                              <a
                                key={`${j}-${link.label}`}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ziva-nav-link"
                              >
                                {link.label}
                              </a>
                            ) : (
                              <Link
                                key={`${j}-${link.label}`}
                                to={link.url}
                                replace
                                className="ziva-nav-link"
                                onClick={() => setOpen(false)}
                              >
                                {link.label}
                              </Link>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {(msg.showContactForm || (msg.question != null && shouldShowContactForm(msg.question, msg.text))) && (
                      <div className="ziva-msg-contact">
                        <ContactForm {...contactExtraProps} />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="ziva-chat-footer-wrap">
          {footerAiSuggestions.length > 0 && (
            <div className="ziva-chat-suggestions ziva-footer-ai-suggestions">
              <PanelSectionHeader
                title={cfg.strings.aiSuggestionLabel}
                hint={cfg.strings.aiSuggestionsPlaceholder}
              />
              <div className="ziva-suggestions-chips">
                {footerAiSuggestions.map((ctrl) => (
                  <button
                    key={ctrl.id}
                    type="button"
                    className="ziva-suggestion-chip ziva-ai-suggestion-chip"
                    onClick={() => handleAiSuggestionClick(ctrl)}
                  >
                    {ctrl.command?.toLowerCase().startsWith('add ')
                      ? `+ ${String(ctrl.label).replace(/^\+\s*/, '')}`
                      : ctrl.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form className="ziva-composer" onSubmit={handleSubmit}>
            <div className="ziva-composer-body">
              <textarea
                ref={inputRef}
                className="ziva-composer-input"
                rows={1}
                placeholder={getComposerPlaceholderForMode(assistantMode, cfg.strings.inputPlaceholder)}
                value={input}
                onChange={handleComposerInput}
                onKeyDown={handleComposerKeyDown}
                aria-label={cfg.strings.messageZivaAria}
              />
            </div>
            <div className="ziva-composer-toolbar">
              <div className="ziva-composer-toolbar-left">
                <ZivaModePicker selectedMode={assistantMode} onChange={setAssistantMode} />
                <ZivaModelPicker
                  selectedModel={selectedModel}
                  onChange={setSelectedModel}
                />
              </div>
              <div className="ziva-composer-toolbar-right">
                <button
                  type="button"
                  className="ziva-composer-icon-btn"
                  aria-label={cfg.strings.attachImageAria}
                  title={cfg.strings.attachImageAria}
                  disabled
                >
                  <i className="far fa-image" aria-hidden="true" />
                </button>
                {hasComposerText ? (
                  <button
                    type="submit"
                    className="ziva-composer-send ziva-composer-send-active"
                    aria-label={cfg.strings.sendAria}
                  >
                    <i className="fas fa-arrow-up" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ziva-composer-send"
                    aria-label={cfg.strings.voiceInputAria}
                    title={cfg.strings.voiceInputAria}
                    disabled
                  >
                    <i className="fas fa-microphone" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <button
        type="button"
        className={`ziva-chat-fab ${open ? 'ziva-chat-fab-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? cfg.strings.closeChatAria : cfg.strings.openChatAria}
        aria-expanded={open}
      >
        <span className="ziva-fab-circle">
          <img src={cfg.assets.logo} alt="" className="ziva-fab-logo" />
          <img src={cfg.assets.sparkle} alt="" className="ziva-fab-sparkle" />
          <span className="ziva-fab-ai-tag" aria-hidden="true">
            AI
          </span>
        </span>
        <span className="ziva-fab-label">{cfg.fabLabel}</span>
      </button>
    </div>
  );
}
