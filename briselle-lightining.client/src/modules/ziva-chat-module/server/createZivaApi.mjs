/**
 * ZIVA Groq API — Express router. Provide `getContext()` returning a string (markdown/plain) for the model.
 *
 * @example
 * import express from 'express';
 * import { createZivaApiRouter } from './node_modules/.../createZivaApi.mjs';
 * const app = express();
 * app.use(express.json());
 * app.use(createZivaApiRouter({ getContext: () => fs.readFileSync('./context.md', 'utf8') }));
 */

import express from 'express';
import { buildAssistantModePromptBlock } from '../src/zivaAssistantModes.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

function safeSendJson(res, status, body) {
  if (res.headersSent) return;
  res.status(status).set('Content-Type', 'application/json').end(JSON.stringify(body));
}

function buildSystemPrompt(contextString, productName, baseSiteUrl) {
  return `You are ZIVA, the Zenith Intelligent Virtual Assistant for ${productName} (${baseSiteUrl}). You answer ONLY using the following content. Do not use external knowledge.

RULES:
1. Answer only from the provided context. If the answer is not in the context, say you can only answer about ${productName} and suggest visiting ${baseSiteUrl} or official contact channels that appear in the context.
2. Be helpful, concise, and friendly.
3. When relevant, add navigation hints using only URLs present in the context.
4. Do not make up features, contact details, or URLs.

CONTEXT:
${contextString}`;
}

/**
 * @param {object} options
 * @param {() => string} options.getContext Sync function returning full context text.
 * @param {string} [options.productName]
 * @param {string} [options.baseSiteUrl]
 * @param {string} [options.model] Groq model id.
 * @param {boolean} [options.cacheContext] If true (default), call getContext() once and reuse.
 */
export function createZivaApiRouter(options) {
  const {
    getContext,
    productName = 'Briselle',
    baseSiteUrl = 'https://www.briselle.com',
    model = DEFAULT_MODEL,
    cacheContext = true,
  } = options;

  if (typeof getContext !== 'function') {
    throw new Error('createZivaApiRouter: getContext is required');
  }

  let cachedContext = null;

  function resolveContextString() {
    if (cacheContext && cachedContext !== null) return cachedContext;
    const ctx = getContext();
    if (typeof ctx !== 'string') {
      throw new Error('createZivaApiRouter: getContext() must return a string');
    }
    if (cacheContext) cachedContext = ctx;
    return ctx;
  }

  async function handleZiva(req, res) {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const apiKey = process.env.GROQ_API_KEY;

    if (!question) {
      return safeSendJson(res, 400, { error: 'Missing question' });
    }

    if (!apiKey) {
      return safeSendJson(res, 501, { error: 'AI not configured', fallback: true });
    }

    try {
      let contextString;
      try {
        contextString = resolveContextString();
      } catch (ctxErr) {
        console.error('ZIVA context error', ctxErr);
        return safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
      }

      const systemPrompt = buildSystemPrompt(contextString, productName, baseSiteUrl);

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
          max_tokens: 512,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Groq API error', response.status, errText);
        return safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
      }

      const rawBody = await response.text();
      let data = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch (parseErr) {
        console.error('Groq response not JSON', parseErr?.message);
        return safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
      }
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return safeSendJson(res, 502, { error: 'Empty AI response', fallback: true });
      }

      return safeSendJson(res, 200, { answer: content });
    } catch (err) {
      console.error('ZIVA API error', err);
      return safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
    }
  }

  const ALLOWED_FIELD_TYPES = [
    'Text', 'Number', 'Date', 'DateTime', 'Currency', 'Percent', 'Checkbox',
    'Picklist', 'TextArea', 'TextAreaLong', 'Email', 'Phone', 'Url',
  ];

  function buildObjectFieldsSystemPrompt() {
    const types = ALLOWED_FIELD_TYPES.join(', ');
    return `You design custom object fields for the Briselle data platform.
Return ONLY JSON: {"presetLabel":"short domain label","fields":["Label (Type)",...]}
CRITICAL: "fields" must be an array of STRINGS only, each like "Student Name (Text)". Never use objects inside "fields".
Types: ${types}.

INTELLIGENCE RULES:
- Infer domain ONLY from the object name + user description (e.g. "Friends" → social fields: Name, Nickname, Birthday, Email — NOT Balance, Interest Rate, Claim, Policy, Currency unless finance is explicit).
- Every field label must make sense for that specific object; reject generic banking/CRM templates when irrelevant.
- Use varied appropriate types; prefer Text, Picklist, Date, Email, Phone, Checkbox as needed.`;
  }

  function resolveRequestModel(body) {
    const requested = typeof body?.model === 'string' ? body.model.trim() : '';
    if (!requested || requested === 'auto') return model;
    return requested;
  }

  function normalizeFieldSpecLine(line) {
    const t = String(line ?? '').trim();
    if (!t || t === '[object Object]') return '';
    const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (!m) return `${t} (Text)`;
    const label = m[1].trim();
    const raw = m[2].trim();
    const type = ALLOWED_FIELD_TYPES.find((x) => x.toLowerCase() === raw.toLowerCase()) || 'Text';
    return `${label} (${type})`;
  }

  function fieldItemToSpecLine(item) {
    if (item == null) return '';
    if (typeof item === 'string') return normalizeFieldSpecLine(item);
    if (typeof item === 'object') {
      const label = String(item.label ?? item.name ?? item.fieldLabel ?? item.field ?? '').trim();
      const type = String(item.type ?? item.dataType ?? item.fieldType ?? 'Text').trim();
      if (label) return normalizeFieldSpecLine(`${label} (${type})`);
    }
    return '';
  }

  function parseObjectFieldsContent(content, count) {
    let jsonText = String(content ?? '').trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) jsonText = fence[1].trim();
    const data = JSON.parse(jsonText);
    const presetLabel = String(data.presetLabel ?? 'Custom object').trim() || 'Custom object';
    const fields = (Array.isArray(data.fields) ? data.fields : [])
      .map((x) => fieldItemToSpecLine(x))
      .filter(Boolean)
      .slice(0, Math.min(60, Math.max(1, count)));
    return { fields, presetLabel };
  }

  function buildOrchestratorSystemPrompt(contextString, session) {
    const assistantMode = session?.assistantMode || 'control';
    const modeBlock = buildAssistantModePromptBlock(assistantMode);

    if (assistantMode === 'learn') {
      return `You are ZIVA in **Learn** mode (read-only). Return ONLY valid JSON (no markdown fences).

{
  "answer": "friendly markdown explanation — no platform actions"
}

${modeBlock}

- Answer clearly using platform context below. Do not invent UI actions the user cannot run from this mode.
- Platform context:
${contextString}

SESSION:
${JSON.stringify(session)}`;
    }

    const baseControls = [
      'start_workflow', 'exit_workflow', 'exit_create', 'rename_object', 'edit_object', 'remove_object',
      'add_field', 'remove_field', 'rename_field', 'create_it', 'pick_count', 'list_objects', 'navigate',
    ];

    const planStepsField =
      assistantMode === 'plan'
        ? '\n  "planSteps": [{"id":"s1","label":"step description","done":false}] OR null,'
        : '';

    return `You are ZIVA, the Briselle platform copilot. Return ONLY valid JSON (no markdown fences).

{
  "answer": "friendly markdown reply",
  "navigate": [{"label":"short label","url":"/objects"}],
  "relatedControls": [{"id":"unique","label":"Button label","action":"one of ${baseControls.join('|')}","value":"optional string or number"}],
  "suggestedReplies": [],
  "workflowCommand": null OR {"start":"create_object|modify_object|create_field|modify_field"} OR {"listObjects":5|10|15|20},
  "aiSuggestions": [{"command":"add Label (Type)","label":"Label"}],
  "schemaEditCommand": "only during createFlow confirm_schema — add/remove/rename fields",
  "fieldAttributeCommands": ["set Label for AI Prediction","Project code index true"] OR null — during confirm_schema or modify_field when user sets field flags (indexed, AI prediction, unique, external id, table view, etc.),${planStepsField}
  "workflowExitPrompt": null OR {"message":"…","exitLabel":"Exit","continueLabel":"Continue"}
}

MENU (session.wizardStep):
- modules: Level 1 — user picks **Objects** (or Records, etc.).
- object_actions: Level 2 — Create New Object | Load an Object | Edit an Object | Create New Field | Edit a Field | Exit to previous step | Exit to home. Do NOT start object pick until user chose a Level 2 action.

WORKFLOWS after Level 2 (set workflowCommand.start; do not repeat Level 2 prompts):
a) create_object (session.createFlow): topic → name → Top X fields → field list → confirm_schema. When session.createFlow is confirm_schema and user says Create / Yes / Create it / save / proceed, answer briefly that you are saving the object and set relatedControls with create_it — do NOT give a generic introduction.
b) load_object: object pick → Yes/No confirm → Open object.
c) modify_object (Edit an Object): object pick → Yes/No → Edit/Rename/Delete sub-actions.
d) create_field: object pick → field topic → confirm name/type.
e) modify_field: object pick → field pick → Yes/No → Edit/Rename/Delete field.

${modeBlock}

RULES:
- When user intent matches a workflow, set workflowCommand.start and answer with the correct next question for that step (respect ASSISTANT MODE above).
- Put workflow/menu actions in relatedControls only. Put quick replies, Top N examples, and field-add ideas in aiSuggestions. Do not use suggestedReplies.
- For object list requests, user may say any Top N (e.g. Top 7) — set listObjects to that number.
- Field attributes (not field types): Indexed, AI Prediction (useForAiPrediction), External ID, Unique, Required, PII/HII/Financial, Table view, Inline edit. When user tags attributes on named fields, return fieldAttributeCommands with one string per assignment (e.g. "set Project Status for AI Prediction", "Project code index true"). During confirm_schema also use schemaEditCommand only for add/remove/rename.
- One-shot create with explicit columns: if user names an object and lists columns/fields (quoted or comma-separated) and says finish directly / no other fields, set workflowCommand.start to create_object and answer that you are creating it with their columns — do NOT return a generic introduction.
- Free-form questions: answer naturally like a capable assistant (clear, accurate, helpful).
- If user is off-topic during an active workflow, set workflowExitPrompt.
- navigate: in-app paths only (/objects, /objects/new, /records, /dashboard).
- Platform context:
${contextString}
${
  assistantMode === 'explore' && session?.exploreContext
    ? `
EXPLORE CONTEXT (object registry + field snapshots — cite accurately):
${JSON.stringify(session.exploreContext)}`
    : ''
}

SESSION:
${JSON.stringify(session)}`;
  }

  function parseOrchestratorContent(content) {
    let jsonText = String(content ?? '').trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) jsonText = fence[1].trim();
    return JSON.parse(jsonText);
  }

  async function handleOrchestrate(req, res) {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const session = req.body?.session && typeof req.body.session === 'object' ? req.body.session : {};
    const history = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const apiKey = process.env.GROQ_API_KEY;
    const chatModel = resolveRequestModel(req.body);

    if (!question) {
      return safeSendJson(res, 400, { error: 'Missing question' });
    }
    if (!apiKey) {
      return safeSendJson(res, 501, { error: 'AI not configured', fallback: true });
    }

    try {
      const contextString = resolveContextString();
      const systemPrompt = buildOrchestratorSystemPrompt(contextString, session);
      const assistantMode = session?.assistantMode || 'control';
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...history
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
          .slice(-8)
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
        { role: 'user', content: question },
      ];

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: chatModel,
          messages: chatMessages,
          max_tokens: assistantMode === 'explore' ? 2048 : 1536,
          temperature: assistantMode === 'learn' ? 0.35 : assistantMode === 'explore' ? 0.55 : 0.4,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        return safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return safeSendJson(res, 502, { error: 'Empty AI response', fallback: true });
      }

      const parsed = parseOrchestratorContent(content);
      const mode = session?.assistantMode || 'control';

      if (mode === 'learn') {
        return safeSendJson(res, 200, {
          answer: String(parsed.answer ?? '').trim() || 'How can I help you next?',
          navigate: [],
          relatedControls: [],
          aiSuggestions: [],
          suggestedReplies: [],
          schemaEditCommand: null,
          fieldAttributeCommands: null,
          workflowExitPrompt: null,
          workflowCommand: null,
          planSteps: null,
        });
      }

      return safeSendJson(res, 200, {
        answer: String(parsed.answer ?? '').trim() || 'How can I help you next?',
        navigate: Array.isArray(parsed.navigate) ? parsed.navigate : [],
        relatedControls: Array.isArray(parsed.relatedControls) ? parsed.relatedControls : [],
        aiSuggestions: Array.isArray(parsed.aiSuggestions) ? parsed.aiSuggestions : [],
        suggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : [],
        schemaEditCommand: parsed.schemaEditCommand || null,
        fieldAttributeCommands: Array.isArray(parsed.fieldAttributeCommands)
          ? parsed.fieldAttributeCommands.map((x) => String(x ?? '').trim()).filter(Boolean)
          : null,
        workflowExitPrompt: parsed.workflowExitPrompt || null,
        workflowCommand: parsed.workflowCommand || null,
        planSteps: Array.isArray(parsed.planSteps) ? parsed.planSteps : null,
      });
    } catch (err) {
      console.error('ZIVA orchestrate error', err);
      return safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
    }
  }

  async function handleObjectFields(req, res) {
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const objectLabel = typeof req.body?.objectLabel === 'string' ? req.body.objectLabel.trim() : '';
    const count = Math.min(60, Math.max(1, Number(req.body?.count) || 10));
    const apiKey = process.env.GROQ_API_KEY;
    const chatModel = resolveRequestModel(req.body);

    if (!topic && !objectLabel) {
      return safeSendJson(res, 400, { error: 'Topic or object label is required.' });
    }
    if (!apiKey) {
      return safeSendJson(res, 501, { error: 'AI not configured', fallback: true });
    }

    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: chatModel,
          messages: [
            { role: 'system', content: buildObjectFieldsSystemPrompt() },
            {
              role: 'user',
              content: `Object display name: ${objectLabel}\nWhat it is for: ${topic}\nNumber of fields: ${count}\nGenerate fields a human would expect for THIS object only.`,
            },
          ],
          max_tokens: 2048,
          temperature: 0.35,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        return safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return safeSendJson(res, 502, { error: 'Empty AI response', fallback: true });
      }

      const parsed = parseObjectFieldsContent(content, count);
      if (!parsed.fields.length) {
        return safeSendJson(res, 502, { error: 'Could not parse field list', fallback: true });
      }

      return safeSendJson(res, 200, { fields: parsed.fields, presetLabel: parsed.presetLabel, source: 'groq' });
    } catch (err) {
      console.error('ZIVA object-fields error', err);
      return safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
    }
  }

  const router = express.Router();
  router.post('/api/ziva', (req, res) => {
    Promise.resolve(handleZiva(req, res)).catch((err) => {
      console.error('ZIVA unhandled', err);
      if (!res.headersSent) safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
    });
  });
  router.post('/api/ziva/object-fields', (req, res) => {
    Promise.resolve(handleObjectFields(req, res)).catch((err) => {
      console.error('ZIVA object-fields unhandled', err);
      if (!res.headersSent) safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
    });
  });
  router.post('/api/ziva/orchestrate', (req, res) => {
    Promise.resolve(handleOrchestrate(req, res)).catch((err) => {
      console.error('ZIVA orchestrate unhandled', err);
      if (!res.headersSent) safeSendJson(res, 502, { error: 'AI temporarily unavailable', fallback: true });
    });
  });

  return router;
}
