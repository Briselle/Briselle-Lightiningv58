/**
 * Ziva – Briselle platform assistant: modules, object/record flows, and local answers.
 * Extend with FAQ patterns or wire `/api/ziva` for LLM-backed replies later.
 */

/** Top-level areas (tags) – align with app routes; add more as modules ship. */
export const BRISHELLE_MODULES = [
  { id: 'objects', label: 'Objects', icon: 'fa-database', route: '/objects', submenu: 'objects' },
  { id: 'records', label: 'Records', icon: 'fa-table', route: '/objects', submenu: 'records' },
  { id: 'ziva', label: 'Ziva', icon: 'fa-wand-magic-sparkles', route: '/dashboard', submenu: null },
  { id: 'users', label: 'Users', icon: 'fa-users', route: '/users', submenu: null },
  { id: 'settings', label: 'Settings', icon: 'fa-gear', route: '/settings', submenu: null },
  { id: 'templates', label: 'Templates', icon: 'fa-layer-group', route: '/templist2', submenu: null },
];

/** Level 2 — Objects submenu (in-chat workflows). */
export const OBJECT_MENU_ACTIONS = [
  { id: 'create', label: 'Create New Object', icon: 'fa-plus', workflowMode: 'create_object' },
  { id: 'load', label: 'Load an Object', icon: 'fa-folder-open', workflowMode: 'load_object' },
  { id: 'edit', label: 'Edit an Object', icon: 'fa-edit', workflowMode: 'modify_object' },
  { id: 'create_field', label: 'Create New Field', icon: 'fa-circle-plus', workflowMode: 'create_field' },
  { id: 'edit_field', label: 'Edit a Field', icon: 'fa-sliders', workflowMode: 'modify_field' },
];

/** Level 2 — navigation exits (not workflows). */
export const OBJECT_MENU_NAV_ACTIONS = [
  { id: 'exit_previous', label: 'Exit to previous step', icon: 'fa-arrow-left', navAction: 'exit_previous' },
  { id: 'exit_home', label: 'Exit to home', icon: 'fa-house', navAction: 'exit_home' },
];

export const OBJECT_MENU_SUGGESTION_LABELS = [
  ...OBJECT_MENU_ACTIONS.map((a) => a.label),
  ...OBJECT_MENU_NAV_ACTIONS.map((a) => a.label),
];

export const OBJECT_FIELD_ACTIONS = [
  {
    id: 'add_fields',
    label: 'Add Fields',
    icon: 'fa-circle-plus',
    route: '/objects/new',
    detail:
      'After you create or open an object, use the Fields / definition area to add columns. Each field has a name, API name, and data type (text, number, date, lookup, etc.).',
  },
  {
    id: 'edit_fields',
    label: 'Edit Fields',
    icon: 'fa-sliders',
    route: '/objects',
    detail:
      'Open an object from the list, then use Object detail or Configuration to change labels, types, and behavior for existing fields.',
  },
];

export const RECORD_MENU_ACTIONS = [
  { id: 'browse_objects', label: 'Browse objects', icon: 'fa-list', route: '/objects' },
  {
    id: 'records_help',
    label: 'How records work',
    icon: 'fa-circle-question',
    route: null,
    botReply:
      'Records live under each object. Pick an object from Objects, open it, then use Records to view or edit rows. You need an object before you can load its record list.',
  },
];

/** Ordered master lists for Ziva → `dobj` field generation (slice to N). */
export const HEALTH_CLAIMS_FIELD_SPECS_ALL = [
  'Claim Number (Text)',
  'Member / Subscriber ID (Text)',
  'Patient Name (Text)',
  'Date of Service (Date)',
  'Place of Service Code (Text)',
  'Diagnosis / ICD Code (Text)',
  'Procedure / CPT Code (Text)',
  'Billed Amount (Currency)',
  'Allowed Amount (Currency)',
  'Paid Amount (Currency)',
  'Claim Status (Picklist)',
  'Payer / Plan (Text)',
  'Provider NPI (Text)',
  'Line Number (Number)',
  'Appeal Flag (Checkbox)',
  'Admission Date (Date)',
  'Discharge Date (Date)',
  'Facility Name (Text)',
  'Rendering Provider (Text)',
  'Referring Provider (Text)',
  'Authorization Number (Text)',
  'Group Number (Text)',
  'Policy Number (Text)',
  'Relationship to Subscriber (Picklist)',
  'Claim Type (Picklist)',
  'Remark Code (Text)',
  'Adjustment Reason (TextArea)',
  'Timely Filing Flag (Checkbox)',
  'COB Indicator (Checkbox)',
  'DRG Code (Text)',
  'Revenue Code (Text)',
  'Units of Service (Number)',
  'Modifier 1 (Text)',
  'Modifier 2 (Text)',
  'Tax ID (Text)',
  'Billing Provider (Text)',
  'Service Location (Text)',
  'Claim Received Date (Date)',
  'Adjudication Date (Date)',
  'Check / EFT Number (Text)',
  'Interest Amount (Currency)',
  'Patient Responsibility (Currency)',
  'Notes (TextArea)',
];

/** People, contacts, friends — not finance/CRM defaults. */
export const SOCIAL_PERSONAL_FIELD_SPECS_ALL = [
  'Full Name (Text)',
  'Nickname (Text)',
  'Birthday (Date)',
  'Email (Email)',
  'Mobile Phone (Phone)',
  'Friend Since (Date)',
  'Relationship (Picklist)',
  'City (Text)',
  'Country (Text)',
  'Hobbies (TextArea)',
  'Favorite Color (Text)',
  'Last Contacted (Date)',
  'Is Close Friend (Checkbox)',
  'Notes (TextArea)',
];

export const GENERIC_FIELD_SPECS_ALL = [
  'Name (Text)',
  'External Id (Text)',
  'Status (Picklist)',
  'Priority (Picklist)',
  'Owner (Text)',
  'Description (TextArea)',
  'Start Date (Date)',
  'End Date (Date)',
  'Amount (Currency)',
  'Quantity (Number)',
  'Category (Picklist)',
  'Subcategory (Picklist)',
  'Region (Picklist)',
  'Account (Text)',
  'Contact Email (Email)',
  'Phone (Phone)',
  'Website (Url)',
  'Percent Complete (Percent)',
  'Is Active (Checkbox)',
  'Budget (Currency)',
  'Actual Cost (Currency)',
  'Due Date (Date)',
  'Completed On (DateTime)',
  'Rating (Number)',
  'Source (Picklist)',
  'Campaign (Text)',
  'Industry (Picklist)',
  'Employees (Number)',
  'Annual Revenue (Currency)',
  'Billing Street (Text)',
  'Billing City (Text)',
  'Billing State (Text)',
  'Billing Postal Code (Text)',
  'Billing Country (Text)',
  'Shipping Street (Text)',
  'Shipping City (Text)',
  'Tags (TextArea)',
  'Last Activity (DateTime)',
  'Created From (Text)',
  'Reference Code (Text)',
];

/** Student / learning / AI-assessment use cases (not health claims or generic CRM). */
export const STUDENT_EDUCATION_FIELD_SPECS_ALL = [
  'Student ID (Text)',
  'Student Name (Text)',
  'Course Name (Text)',
  'Course Code (Text)',
  'Term / Semester (Text)',
  'Enrollment Date (Date)',
  'Assessment Name (Text)',
  'Assessment Date (Date)',
  'Score (Number)',
  'Grade (Picklist)',
  'Percent Score (Percent)',
  'Performance Band (Picklist)',
  'Rating (Number)',
  'Percent Complete (Percent)',
  'AI Model (Text)',
  'AI Confidence Score (Percent)',
  'AI Feedback Summary (TextArea)',
  'Instructor (Text)',
  'Attendance Percent (Percent)',
  'Assignment Due Date (Date)',
  'Submitted On (DateTime)',
  'Learning Objective (TextArea)',
  'Strengths (TextArea)',
  'Areas To Improve (TextArea)',
  'Status (Picklist)',
  'Notes (TextArea)',
];

/** @param {string} domainKey `health_claims` | `generic` | other → generic */
/** @param {number} count clamped 1…60 */
export function getFieldSpecLinesForDomain(domainKey, count) {
  const n = Math.min(60, Math.max(1, Number(count) || 10));
  const pool = domainKey === 'health_claims' ? HEALTH_CLAIMS_FIELD_SPECS_ALL : GENERIC_FIELD_SPECS_ALL;
  return pool.slice(0, n);
}

const CONTEXT_TOKEN_STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'are',
  'was',
  'our',
  'your',
  'its',
  'about',
  'object',
  'create',
  'build',
  'related',
  'tracking',
  'system',
  'data',
  'field',
  'fields',
]);

/** Expand topic tokens so labels like Rating match “performance”, etc. */
const CONTEXT_TOKEN_EXPANSIONS = {
  student: ['student', 'enrollment', 'course', 'grade', 'class', 'learner', 'education', 'school'],
  performance: ['performance', 'rating', 'grade', 'score', 'percent', 'complete', 'result', 'assessment'],
  measure: ['measure', 'metric', 'score', 'rating', 'assessment'],
  ai: ['ai', 'model', 'prediction', 'confidence', 'automated', 'machine'],
  claim: ['claim', 'payer', 'diagnosis', 'member', 'billed', 'adjudication', 'provider', 'patient'],
  health: ['health', 'medical', 'member', 'patient', 'insurance'],
  invoice: ['invoice', 'billing', 'due', 'payment', 'vendor'],
  order: ['order', 'quantity', 'shipping', 'product', 'fulfillment'],
  project: ['project', 'task', 'milestone', 'deadline', 'owner', 'priority'],
  employee: ['employee', 'staff', 'hr', 'hire', 'department'],
  customer: ['customer', 'account', 'contact', 'lead', 'opportunity'],
};

function contextTokensFromText(text) {
  const words = norm(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !CONTEXT_TOKEN_STOP.has(w));
  const out = new Set(words);
  for (const w of words) {
    const extras = CONTEXT_TOKEN_EXPANSIONS[w];
    if (extras) extras.forEach((x) => out.add(x));
  }
  return [...out];
}

function mergeUniqueFieldSpecPools(...pools) {
  const seen = new Set();
  const out = [];
  for (const pool of pools) {
    for (const line of pool) {
      const key = zivaSpecDisplayLabel(line).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(line);
    }
  }
  return out;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreFieldSpecLine(line, tokens) {
  const label = zivaSpecDisplayLabel(line).toLowerCase();
  const parts = label.split(/[^a-z0-9]+/).filter((p) => p.length >= 2);
  let score = 0;
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(label)) score += 6;
    for (const p of parts) {
      if (p === t) score += 5;
      else if (t.length >= 5 && p.length >= 5 && (p.startsWith(t) || t.startsWith(p))) score += 3;
    }
  }
  return score;
}

/** Which field catalogs apply to this topic (health vs student vs general). */
export function detectContextProfile(text) {
  const n = norm(text);
  if (detectDomainKeyFromMessage(text) === 'health_claims') {
    return {
      id: 'health_claims',
      presetLabel: 'Health Claims',
      pools: [HEALTH_CLAIMS_FIELD_SPECS_ALL],
    };
  }
  if (
    /\b(student|students|learner|enrollment|course|grade|grades|school|education|academic|classroom|teacher|instructor|assessment|exam|quiz|homework|syllabus|campus|degree|performance|tutor|lesson)\b/.test(
      n,
    )
  ) {
    return {
      id: 'student_education',
      presetLabel: 'Student learning & performance',
      pools: [STUDENT_EDUCATION_FIELD_SPECS_ALL],
    };
  }
  if (
    /\b(friend|friends|buddy|contact|person|people|relationship|family|relative|colleague|social|acquaintance|neighbor|guest|member profile)\b/.test(
      n,
    )
  ) {
    return {
      id: 'social_personal',
      presetLabel: 'People & relationships',
      pools: [SOCIAL_PERSONAL_FIELD_SPECS_ALL, GENERIC_FIELD_SPECS_ALL],
    };
  }
  return {
    id: 'generic',
    presetLabel: 'General business object',
    pools: [GENERIC_FIELD_SPECS_ALL],
  };
}

/**
 * Rank fields from the right catalog(s) by overlap with user topic and object label (not fixed top-N generic).
 */
export function buildContextualFieldSpecLines(topic, objectLabel, count) {
  const n = Math.min(60, Math.max(1, Number(count) || 10));
  const haystack = norm(`${topic ?? ''} ${objectLabel ?? ''}`);
  const profile = detectContextProfile(haystack);
  const tokens = contextTokensFromText(haystack);

  if (tokens.length === 0) {
    const fallbackPool = profile.pools[0] || GENERIC_FIELD_SPECS_ALL;
    return fallbackPool.slice(0, n);
  }

  const pool = mergeUniqueFieldSpecPools(...profile.pools);
  const scored = pool
    .map((line) => ({ line, score: scoreFieldSpecLine(line, tokens) }))
    .sort((a, b) => b.score - a.score || zivaSpecDisplayLabel(a.line).localeCompare(zivaSpecDisplayLabel(b.line)));

  const picked = [];
  const used = new Set();
  const minScore =
    profile.id === 'student_education' ? 3 : profile.id === 'social_personal' ? 2 : 2;
  for (const { line, score } of scored) {
    if (picked.length >= n) break;
    if (score < minScore) continue;
    const key = zivaSpecDisplayLabel(line).toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    picked.push(line);
  }

  for (const { line } of scored) {
    if (picked.length >= n) break;
    const key = zivaSpecDisplayLabel(line).toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    picked.push(line);
  }

  return picked.slice(0, n);
}

/** Example domain → suggested fields (Top 10 / Top 15) for guided object design. */
export const DOMAIN_FIELD_PRESETS = {
  health_claims: {
    label: 'Health Claims',
    top10: HEALTH_CLAIMS_FIELD_SPECS_ALL.slice(0, 10),
    top15: HEALTH_CLAIMS_FIELD_SPECS_ALL.slice(0, 15),
    top20: HEALTH_CLAIMS_FIELD_SPECS_ALL.slice(0, 20),
  },
  generic: {
    label: 'General business object',
    top10: GENERIC_FIELD_SPECS_ALL.slice(0, 10),
    top15: GENERIC_FIELD_SPECS_ALL.slice(0, 15),
    top20: GENERIC_FIELD_SPECS_ALL.slice(0, 20),
  },
};

function norm(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function detectDomainKeyFromMessage(text) {
  const n = norm(text);
  if (n.includes('health') && (n.includes('claim') || n.includes('claims'))) return 'health_claims';
  if (n.includes('claim') && (n.includes('medical') || n.includes('insurance'))) return 'health_claims';
  return null;
}

export function getDomainPresetForText(text) {
  const key = detectDomainKeyFromMessage(text);
  if (key && DOMAIN_FIELD_PRESETS[key]) return { key, ...DOMAIN_FIELD_PRESETS[key] };
  return { key: 'generic', ...DOMAIN_FIELD_PRESETS.generic };
}

/** User tapped a chip – map normalized phrase → field count */
const FIELD_SUGGESTION_CHIP = {
  'top 10 field ideas': 10,
  'top 15 field ideas': 15,
  'top 20 field ideas': 20,
  'suggest top 10 fields': 10,
  'suggest top 15 fields': 15,
  'suggest top 20 fields': 20,
};

function formatFieldListAnswer(domainKey, count) {
  const dk = domainKey === 'health_claims' ? 'health_claims' : 'generic';
  const preset = DOMAIN_FIELD_PRESETS[dk] || DOMAIN_FIELD_PRESETS.generic;
  const n = Math.min(60, Math.max(1, Number(count) || 10));
  const lines = getFieldSpecLinesForDomain(dk, n);
  const body = lines.map((f, i) => `${i + 1}. ${f}`).join('\n');
  return `Here are **${n}** suggested fields for **${preset.label}**:\n\n${body}\n\nYou can create this object from **Ziva** (Objects → Create New Object) or add these fields manually in the object builder.`;
}

/** FAQ-style answers for the platform (not EdTech marketing). */
const FAQ = [
  [
    ['hello', 'hi', 'hey', 'good morning'],
    "Hi — I'm Ziva, your Briselle AI. Use the module tags (Objects, Records, …) or tell me what you want to build (for example a **Health Claims** object), and I'll guide you with next steps and field ideas.",
  ],
  [
    ['what can you do', 'help me', 'how can you help'],
    'I help you move around the Briselle platform: **Objects** (define data), **Records** (rows per object), **Ziva** (this assistant), plus Users, Settings, and Templates. Choose **Objects** for create / load / edit flows and field suggestions.',
  ],
  [
    ['create object', 'new object', 'define object', 'build object'],
    'Starting the **create object** wizard here in chat — tell me what the object is about in your next message, or use **Objects** → **Create New Object** in the tags above.',
  ],
  [
    ['load object', 'open object', 'list object'],
    'Use **Objects** → **Load an Object** to open the object list, then select an object to view details, fields, and records.',
  ],
  [
    ['edit object', 'change object'],
    'Open an object from the list, then use the object detail screen to change configuration. Use **Edit Fields** when you need to adjust field definitions.',
  ],
  [
    ['add field', 'new field', 'field type', 'data type'],
    'Fields belong to an object. Create or open an object, then use **Add Fields** in the object definition UI. Pick a data type (Text, Number, Date, Currency, Picklist, Lookup, etc.) that matches how the data will be stored and validated.',
  ],
  [
    ['record', 'records', 'rows', 'data entry'],
    '**Records** are instances of an object (like rows in a table). Pick an object first, then open **Records** for that object to view, create, or edit entries.',
  ],
  [
    ['suggest fields for my domain', 'field ideas', 'suggest fields'],
    'Describe what you are modeling (for example **health insurance claims** or **Health Claims**). I will detect the domain and show **Top 10 field ideas** and **Top 15 field ideas** in the suggestions row. Pick one, or type that phrase in chat.',
  ],
  [
    ['ziva', 'assistant', 'chat'],
    'You are already talking to **Ziva**. I can suggest fields, routes, and next actions. More automation (auto-creating metadata in the database) can be wired to your API later.',
  ],
];

export const defaultAnswer =
  "I'm Ziva—your Briselle copilot. I can walk you through objects and records, sketch field ideas, or just chat. What would you like to do first?";

/** Strip trailing "(Type)" from a field spec line. @param {string} line */
export function zivaSpecDisplayLabel(line) {
  return String(line ?? '')
    .replace(/\s*\([^)]+\)\s*$/, '')
    .trim();
}

const ZIVA_FIELD_TYPES = [
  'Text',
  'Number',
  'Date',
  'DateTime',
  'Currency',
  'Percent',
  'Checkbox',
  'Picklist',
  'TextArea',
  'TextAreaLong',
  'Email',
  'Phone',
  'Url',
];

/** Normalize "Label (Type)" for add/rename during schema confirmation. */
export function normalizeFieldSpecLine(line) {
  const t = String(line ?? '').trim();
  if (!t || t === '[object Object]') return '';
  const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!m) return `${t} (Text)`;
  const label = m[1].trim();
  const raw = m[2].trim();
  const type = ZIVA_FIELD_TYPES.find((x) => x.toLowerCase() === raw.toLowerCase()) || 'Text';
  return `${label} (${type})`;
}

/** Shown after the field list while user reviews the schema. */
export const SCHEMA_FIELD_EDIT_HELP =
  '**Edit your field list** (use the numbers from the list):\n' +
  '• **Remove:** `remove 3` or `delete Member ID`\n' +
  '• **Add:** `add Notes (TextArea)` or `add Renewal Date (Date)`\n' +
  '• **Rename:** `rename 3 to Follow-up Date (Date)` or `rename Member ID to Patient ID (Text)`\n' +
  '• **Subset:** `keep only 1, 2, 5`\n' +
  '• **Required:** `make 2 required` · `field 4 not required`\n' +
  '• **Attributes:** `set Project Status for AI Prediction` · `Project code index true` · `field 3 unique yes`\n' +
  'Tap a **suggested field** below to add it in one click, or type e.g. `add Hospital Rohini ID (Text)`.\n' +
  'Say **Create it** or **Yes** when ready. Say **Change name** to rename the object.';

/** Suggestion chips while reviewing fields before create (edit commands — not one-click adds). */
export function getSchemaConfirmSuggestions() {
  return ['Remove 3', 'Rename field', 'Create', 'Create it', 'How to edit?'];
}

/** User wants to save the in-chat object draft (confirm_schema step). */
export function isCreateObjectAffirmation(text) {
  const n = norm(text);
  if (!n) return false;
  const exact = new Set([
    'yes',
    'y',
    'yeah',
    'yep',
    'ok',
    'okay',
    'confirm',
    'confirmed',
    'proceed',
    'go',
    'go ahead',
    'do it',
    'ship it',
    'save',
    'save it',
    'submit',
    'finish',
    'done',
    'create',
    'create it',
    'create the object',
    'create object',
    'please create',
    'sounds good',
    'looks good',
    'all good',
    'perfect',
  ]);
  if (exact.has(n)) return true;
  if (/^(yes|ok|create|confirm|proceed|save|submit|finish)\b/.test(n) && n.length <= 32) return true;
  if (/\bcreate\s+(?:the\s+)?object\b/.test(n) && n.length <= 40) return true;
  return false;
}

/** Draft has label + field list and is ready to persist. */
export function hasReadyCreateDraft(draft) {
  if (!draft?.label || !String(draft.label).trim()) return false;
  const lines = draft?.fieldSpecLines;
  if (!Array.isArray(lines) || lines.length === 0) return false;
  const count = Number(draft.pendingFieldCount);
  return Number.isFinite(count) && count >= 1;
}

/** One-click add chip for Notes when not already in the field list. */
export function buildNotesAddChip(existingLines) {
  const spec = normalizeFieldSpecLine('Notes (TextArea)');
  const label = zivaSpecDisplayLabel(spec);
  const key = label.toLowerCase();
  const exists = (existingLines || []).some((l) => zivaSpecDisplayLabel(l).toLowerCase() === key);
  if (exists) return null;
  return { command: `add ${spec}`, label, spec };
}

function titleCaseToken(word) {
  const w = String(word ?? '').trim();
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** Build field specs from topic words (e.g. hospital + rohini → "Hospital Rohini ID"). */
function buildTopicDerivedFieldSpecs(topic, objectLabel) {
  const words = norm(`${topic ?? ''} ${objectLabel ?? ''}`)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !CONTEXT_TOKEN_STOP.has(w));
  const uniq = [...new Set(words)];
  const specs = [];
  if (uniq.length >= 2) {
    const a = titleCaseToken(uniq[0]);
    const b = titleCaseToken(uniq[1]);
    specs.push(normalizeFieldSpecLine(`${a} ${b} ID (Text)`));
    specs.push(normalizeFieldSpecLine(`${b} Code (Text)`));
    specs.push(normalizeFieldSpecLine(`${a} ${b} Name (Text)`));
  }
  if (uniq.length >= 1) {
    const a = titleCaseToken(uniq[0]);
    specs.push(normalizeFieldSpecLine(`${a} ID (Text)`));
    specs.push(normalizeFieldSpecLine(`${a} Reference (Text)`));
  }
  if (uniq.length >= 3) {
    const c = titleCaseToken(uniq[2]);
    specs.push(normalizeFieldSpecLine(`${c} Location (Text)`));
  }
  return specs.filter(Boolean);
}

/**
 * Up to `limit` contextual "add …" commands for one-click field adds during schema review.
 * @param {string[]} [extraExcludeLabels] labels already on screen or dismissed (lowercase ok)
 * @returns {{ command: string, label: string, spec: string }[]}
 */
export function getSuggestedFieldAddCommands(topic, objectLabel, existingLines, limit = 3, extraExcludeLabels = []) {
  const cap = Math.min(60, Math.max(1, Number(limit) || 3));
  const existing = new Set(
    (existingLines || []).map((l) => zivaSpecDisplayLabel(l).toLowerCase()),
  );
  for (const x of extraExcludeLabels) {
    const k = String(x ?? '')
      .trim()
      .toLowerCase();
    if (k) existing.add(k);
  }
  const reserved = new Set();
  /** @type {{ command: string, label: string, spec: string }[]} */
  const out = [];

  const tryPush = (specLine) => {
    if (!specLine || out.length >= cap) return;
    const label = zivaSpecDisplayLabel(specLine);
    const key = label.toLowerCase();
    if (existing.has(key) || reserved.has(key)) return;
    reserved.add(key);
    out.push({
      command: `add ${specLine}`,
      label,
      spec: specLine,
    });
  };

  const haystack = norm(`${topic ?? ''} ${objectLabel ?? ''}`);
  const tokens = contextTokensFromText(haystack);
  const profile = detectContextProfile(haystack);
  const pool = mergeUniqueFieldSpecPools(...profile.pools);
  const scored = pool
    .map((line) => ({ line, score: scoreFieldSpecLine(line, tokens) }))
    .sort((a, b) => b.score - a.score || zivaSpecDisplayLabel(a.line).localeCompare(zivaSpecDisplayLabel(b.line)));

  for (const spec of buildTopicDerivedFieldSpecs(topic, objectLabel)) {
    tryPush(spec);
    if (out.length >= cap) return out;
  }

  for (const { line, score } of scored) {
    if (score < 1) continue;
    tryPush(line);
    if (out.length >= cap) return out;
  }

  for (const { line } of scored) {
    tryPush(line);
    if (out.length >= cap) return out;
  }

  const fallbacks = [
    'External Reference (Text)',
    'Notes (TextArea)',
    'Status (Picklist)',
    'Record Owner (Text)',
    'Department Code (Text)',
  ];
  for (const fb of fallbacks) {
    tryPush(normalizeFieldSpecLine(fb));
    if (out.length >= cap) return out;
  }

  return out;
}

/** Human-friendly list of fields Ziva will create (before save). Optional `linesOverride` after user edits. */
export function formatFriendlyFieldPlan(domainKey, count, objectLabel, linesOverride, topic, presetLabelOverride) {
  const n = Math.min(60, Math.max(1, Number(count) || 10));
  const profile = detectContextProfile(norm(`${topic ?? ''} ${objectLabel ?? ''}`));
  const presetLabel =
    String(presetLabelOverride ?? '').trim() || profile.presetLabel;
  const lines =
    Array.isArray(linesOverride) && linesOverride.map((x) => String(x ?? '').trim()).filter(Boolean).length > 0
      ? linesOverride.map((x) => String(x ?? '').trim()).filter(Boolean)
      : buildContextualFieldSpecLines(topic ?? '', objectLabel, n);
  const name = String(objectLabel || 'your object').trim() || 'your object';
  const intro = `Here’s a thoughtful starter set of **${lines.length}** columns for **${name}**, shaped for **${presetLabel}**. Each line is a field we can create for you—you’ll still be able to edit everything afterward in the object designer.`;
  const body = lines.map((f, i) => `${i + 1}. ${f}`).join('\n');
  return `${intro}\n\n${body}`;
}

/**
 * Parse edits during schema confirmation: remove, add, rename, keep-only, optional/required.
 * @param {string} raw
 * @param {string[]|null|undefined} fieldLines
 * @param {boolean[]|null|undefined} requiredFlags parallel to fieldLines
 * @returns {{ kind: 'none'|'revise'|'empty'|'help', lines?: string[], required?: boolean[], summary?: string }}
 */
export function parseSchemaFieldRevision(raw, fieldLines, requiredFlags) {
  const baseLines = (fieldLines || []).map((x) => String(x ?? '').trim()).filter(Boolean);
  if (!baseLines.length) return { kind: 'none' };

  let req =
    Array.isArray(requiredFlags) && requiredFlags.length === baseLines.length
      ? requiredFlags.map(Boolean)
      : baseLines.map(() => false);
  const lines = [...baseLines];
  const text = String(raw ?? '').trim();
  const low = text.toLowerCase().replace(/\*+/g, '');
  const summaryParts = [];
  let changed = false;

  if (/^(how to edit|edit help|field help|help with fields)(\?)?$/.test(low) || low === 'how to edit?') {
    return { kind: 'help', summary: SCHEMA_FIELD_EDIT_HELP };
  }
  if (/^remove\s+(?:a\s+)?fields?$/.test(low) || low === 'delete field' || low === 'delete a field') {
    return {
      kind: 'help',
      summary:
        '**Remove a field:** use the list number — `remove 3` — or the label — `delete Member ID` or `drop Status`.',
    };
  }
  if (/^add\s+(?:a\s+)?fields?$/.test(low) || low === 'add field' || low === 'add a field') {
    return {
      kind: 'help',
      summary:
        '**Add a field:** `add Notes (TextArea)`, `add Score (Number)`, `add Renewal Date (Date)`. Types include Text, Number, Date, Picklist, TextArea, Email, Phone, Url.',
    };
  }
  if (/^rename\s+(?:a\s+)?fields?$/.test(low) || low === 'rename field' || low === 'rename a field') {
    return {
      kind: 'help',
      summary:
        '**Rename a field:** by number — `rename 3 to Follow-up Date (Date)` — or by current label — `rename Member ID to Patient ID (Text)`.',
    };
  }
  if (/^rename\s+#?\d{1,2}\s+to\s*(\.{3}|…)\s*$/i.test(low)) {
    return {
      kind: 'help',
      summary: '**Rename example:** `rename 3 to Follow-up Date (Date)` — replace **3** with the field number from your list.',
    };
  }

  const extractNums = (segment) => {
    const out = [];
    const re = /\b([1-9]|[1-5][0-9]|60)\b/g;
    let m;
    while ((m = re.exec(segment)) !== null) {
      out.push(parseInt(m[1], 10));
    }
    return out;
  };

  // Rename by field number
  const renameByNum = text.match(/\brename\s+(?:field\s*)?#?(\d{1,2})\s+to\s+(.+)$/i);
  if (renameByNum) {
    const n = parseInt(renameByNum[1], 10);
    const newSpec = normalizeFieldSpecLine(renameByNum[2]);
    if (n >= 1 && n <= lines.length && newSpec) {
      const oldLabel = zivaSpecDisplayLabel(lines[n - 1]);
      lines[n - 1] = newSpec;
      changed = true;
      summaryParts.push(`renamed **${oldLabel}** (#${n}) → **${zivaSpecDisplayLabel(newSpec)}**`);
    }
  }

  // Rename by current label
  if (!changed) {
    const renameByLabel = text.match(/\brename\s+(.+?)\s+to\s+(.+)$/i);
    if (renameByLabel) {
      const fromPart = renameByLabel[1].replace(/\([^)]*\)/g, ' ').trim();
      if (fromPart && !/^\d{1,2}$/.test(fromPart)) {
        const needle = fromPart.toLowerCase().replace(/\s+/g, ' ');
        const lix = lines.findIndex((ln) => {
          const lab = zivaSpecDisplayLabel(ln).toLowerCase();
          return lab.length >= 2 && (needle.includes(lab) || lab.includes(needle));
        });
        const newSpec = normalizeFieldSpecLine(renameByLabel[2]);
        if (lix >= 0 && newSpec) {
          const oldLabel = zivaSpecDisplayLabel(lines[lix]);
          lines[lix] = newSpec;
          changed = true;
          summaryParts.push(`renamed **${oldLabel}** → **${zivaSpecDisplayLabel(newSpec)}**`);
        }
      }
    }
  }

  // Add new field
  const addMatch = text.match(/^(?:add|include)\s+(?:a\s+)?(?:new\s+)?(?:field\s+)?(.+)$/i);
  if (addMatch) {
    const addBody = addMatch[1].trim();
    if (addBody.length >= 2 && !/^fields?$/i.test(addBody)) {
      const spec = normalizeFieldSpecLine(addBody);
      if (spec) {
        if (lines.length >= 60) {
          return {
            kind: 'help',
            summary: 'You already have **60** fields (the maximum). Remove one first, then add your new column.',
          };
        }
        lines.push(spec);
        req.push(false);
        changed = true;
        summaryParts.push(`added **${zivaSpecDisplayLabel(spec)}**`);
      }
    }
  }

  // Keep-only / subset first (uses original numbering)
  const keepOnly =
    /\b(?:keep|include)\s+(?:only|just)\b/i.test(low) ||
    /^\s*only\s+(?:the\s+)?(?:fields?|columns?|lines?)\b/i.test(low) ||
    /\bonly\s+include\b/i.test(low);
  if (keepOnly) {
    const nums = [...new Set(extractNums(low))].filter((n) => n >= 1 && n <= baseLines.length).sort((a, b) => a - b);
    if (nums.length > 0) {
      const next = nums.map((n) => baseLines[n - 1]);
      const nextReq = nums.map((n) => req[n - 1]);
      if (next.length !== lines.length || next.some((v, i) => v !== lines[i])) {
        lines.length = 0;
        lines.push(...next);
        req = nextReq;
        changed = true;
        summaryParts.push(`keeping **${nums.join(', ')}**`);
      }
    }
  }

  // Remove inclusive range: remove 21 to 31, remove 21-31, delete fields 21 through 31
  const rangeRm = low.match(
    /\b(remove|delete|drop|skip|exclude)\s+(?:fields?\s+)?#?(\d{1,2})\s*(?:to|through|thru|until|-\s*|–\s*)\s*#?(\d{1,2})\b/i,
  );
  if (rangeRm) {
    const a = parseInt(rangeRm[2], 10);
    const b = parseInt(rangeRm[3], 10);
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    let removedCount = 0;
    for (let n = to; n >= from; n -= 1) {
      if (n >= 1 && n <= lines.length) {
        lines.splice(n - 1, 1);
        req.splice(n - 1, 1);
        removedCount += 1;
      }
    }
    if (removedCount > 0) {
      changed = true;
      summaryParts.push(`removed fields **${from}** through **${to}** (${removedCount} columns)`);
    }
  }

  // Remove by label (phrase after remove/delete/drop) — skip if range already handled
  const labelRm = !changed && low.match(/\b(remove|delete|drop|skip)\s+(.+)$/i);
  if (labelRm && labelRm[2]) {
    const phrase = labelRm[2].replace(/\([^)]*\)/g, ' ').trim();
    if (phrase && !/^\d+(?:\s*(?:,|and)\s*\d+)*$/.test(phrase)) {
      const needle = phrase.replace(/\s+/g, ' ').trim();
      if (needle.length >= 2) {
        for (let i = lines.length - 1; i >= 0; i -= 1) {
          const lab = zivaSpecDisplayLabel(lines[i]).toLowerCase();
          if (lab.includes(needle) || needle.includes(lab)) {
            const goneLabel = zivaSpecDisplayLabel(lines[i]);
            lines.splice(i, 1);
            req.splice(i, 1);
            changed = true;
            summaryParts.push(`removed **${goneLabel}**`);
            break;
          }
        }
      }
    }
  }

  // Remove by field numbers (tail after first remove-like keyword) — skip if range already handled
  const rmKw = !changed && /\b(remove|delete|drop|skip|exclude|without)\b/i;
  if (rmKw && rmKw.test(low)) {
    const start = low.search(rmKw);
    const tail = start >= 0 ? low.slice(start) : low;
    const nums = [...new Set(extractNums(tail))].sort((a, b) => b - a);
    for (const n of nums) {
      if (n >= 1 && n <= lines.length) {
        const [gone] = lines.splice(n - 1, 1);
        req.splice(n - 1, 1);
        changed = true;
        summaryParts.push(`removed #**${n}** (${zivaSpecDisplayLabel(gone)})`);
      }
    }
  }

  // Optional / not required / required (1-based indices, current list)
  const optRe =
    /(?:^|\s)(?:field\s*)?#?(\d{1,2})\s*(?:is\s+)?(?:not\s+required|optional|not\s+mandatory)\b|\b(?:mark\s+)?(?:field\s*)?#?(\d{1,2})\s+as\s+optional\b/gi;
  let om;
  while ((om = optRe.exec(low)) !== null) {
    const n = parseInt(om[1] || om[2], 10);
    if (n >= 1 && n <= lines.length) {
      if (req[n - 1] !== false) {
        req[n - 1] = false;
        changed = true;
        summaryParts.push(`#**${n}** optional`);
      }
    }
  }

  const reqRe =
    /\b(?:make\s+)?(?:field\s*)?#?(\d{1,2})\s+(?:required|mandatory)\b|\brequire\s+(?:field\s*)?#?(\d{1,2})\b/gi;
  let rm2;
  while ((rm2 = reqRe.exec(low)) !== null) {
    const n = parseInt(rm2[1] || rm2[2], 10);
    if (n >= 1 && n <= lines.length) {
      if (req[n - 1] !== true) {
        req[n - 1] = true;
        changed = true;
        summaryParts.push(`#**${n}** required`);
      }
    }
  }

  const notReqLabel = low.match(/^(?:please\s+)?(?:mark|make|set)?\s*(.+?)\s+not\s+required\b/i);
  if (notReqLabel && notReqLabel[1] && !/\b(remove|delete|drop|keep|only)\b/i.test(notReqLabel[1])) {
    let inner = notReqLabel[1].trim().replace(/^the\s+/i, '');
    const fieldNumOnly = inner.match(/^field\s*#?(\d{1,2})$/i);
    if (!fieldNumOnly) {
      const innerLow = inner.toLowerCase();
      const lix = lines.findIndex((ln) => {
        const lab = zivaSpecDisplayLabel(ln).toLowerCase();
        return lab.length >= 2 && (innerLow.includes(lab) || lab.includes(innerLow));
      });
      if (lix >= 0) {
        if (req[lix] !== false) {
          req[lix] = false;
          changed = true;
          summaryParts.push(`**${zivaSpecDisplayLabel(lines[lix])}** optional`);
        } else {
          changed = true;
          summaryParts.push(`**${zivaSpecDisplayLabel(lines[lix])}** already optional`);
        }
      }
    }
  }

  if (!changed) return { kind: 'none' };

  if (!lines.length) {
    return {
      kind: 'empty',
      summary: 'That would leave no custom fields. Keep at least one column, or say **Change name** to restart.',
    };
  }

  const uniq = [...new Set(summaryParts)];
  const summary = uniq.length ? uniq.join(' · ') : 'Updated your field list.';
  return { kind: 'revise', lines, required: req, summary };
}

/** When we don’t have a scripted answer—keep tone warm and honest about scope. */
export function getConversationalFallback(userText) {
  const t = String(userText || '').trim();
  if (!t) {
    return "I’m here. Tell me what you’re working on—anything from “I need an object for invoices” to a random question—and I’ll answer in plain language.";
  }
  return `I read you. I’m **Ziva**, living inside your Briselle workspace, so I’m strongest when we talk about **your data model**, **objects**, **records**, or walking through a build step-by-step.\n\nFor open-ended questions (like a general ChatGPT prompt), I can still respond here, but for long, deep dives you may want a dedicated LLM and optionally plug it into this chat later.\n\nWant to stay product-focused? Say what you’re trying to organize (e.g. health claims, projects, donors). Or pick **Objects** in the tags and we’ll build something together.`;
}

/**
 * Parse "Top 10", "10", "top 15", "custom", etc. Returns { kind:'count', value } | { kind:'custom' } | null
 */
/** Exact phrases from suggestion chips or common shortcuts → start in-chat object wizard. */
const CREATE_OBJECT_EXACT = new Set([
  'create object',
  'create new object',
  'create an object',
  'create a object',
  'new object',
  'define object',
  'define new object',
  'build object',
  'build new object',
  'make an object',
  'make new object',
]);

/**
 * Detect when the user wants the conversational create-object wizard (not static FAQ).
 * @returns {{ start: boolean, topic: string }} topic set when message includes domain text
 */
export function parseCreateObjectIntent(text) {
  const raw = String(text ?? '').trim();
  const n = norm(raw);
  if (!n) return { start: false, topic: '' };

  if (CREATE_OBJECT_EXACT.has(n)) return { start: true, topic: '' };

  const withTopic = raw.match(
    /^(?:i\s+(?:wanted|want)\s+to\s+)?(?:please\s+)?(?:create|make|build|define)\s+(?:a\s+)?(?:new\s+)?objects?\s+(?:for|about|to\s+(?:track|manage|store))\s+(.+)$/i
  );
  if (withTopic) {
    let topic = withTopic[1].trim();
    topic = topic.split(/,\s*(?:top\s+\d|you\s+need|and\s+you)\b/i)[0].trim();
    if (topic.length >= 2) return { start: true, topic };
  }

  if (
    /\b(want|need|like)\s+to\s+(?:create|make|build)\b/.test(n) &&
    /\bobjects?\b/.test(n) &&
    !/\bfield/.test(n)
  ) {
    return { start: true, topic: '' };
  }

  if (
    /^(?:create|make|build|define)\b/.test(n) &&
    /\bobjects?\b/.test(n) &&
    !/^(how|what|why|where|when)\b/.test(n) &&
    n.length <= 48 &&
    (!/\bfield/.test(n) || /\bwith\s+(?:columns?|fields?)\b/.test(n))
  ) {
    return { start: true, topic: '' };
  }

  const namedWithColumns = raw.match(
    /\bcreate\s+(?:an?\s+)?objects?\s+named\s+"([^"]+)"\s+with\s+(?:columns?|fields?)/i,
  );
  if (namedWithColumns?.[1]) {
    return { start: true, topic: namedWithColumns[1].trim() };
  }

  if (/\bwith\s+(?:columns?|fields?)\b/.test(n) && /\b(create|make|build)\b/.test(n) && /\bobjects?\b/.test(n)) {
    const labelM = raw.match(/\bnamed\s+"([^"]+)"/i);
    return { start: true, topic: labelM?.[1]?.trim() || '' };
  }

  return { start: false, topic: '' };
}

export function parseTopNFieldChoice(raw) {
  const s = String(raw ?? '')
    .toLowerCase()
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;
  if (s === 'custom' || /\bcustom\b/.test(s)) return { kind: 'custom' };
  const topNum = s.match(/\btop\s*(\d{1,2})\b/);
  if (topNum) {
    const v = parseInt(topNum[1], 10);
    if (v >= 1 && v <= 60) return { kind: 'count', value: v };
  }
  if (/^(\d{1,2})$/.test(s)) {
    const v = parseInt(s, 10);
    if (v >= 1 && v <= 60) return { kind: 'count', value: v };
  }
  const wordNum = s.match(/\b([1-9]|[1-5][0-9]|60)\b/);
  if (wordNum && s.length <= 4) return { kind: 'count', value: parseInt(wordNum[1], 10) };
  return null;
}

export function getAnswerForMessage(text, context = {}) {
  const n = norm(text);
  if (!n) return getConversationalFallback(text);

  const fieldCount = FIELD_SUGGESTION_CHIP[n];
  if (fieldCount) {
    const dk = context.domainKey || 'generic';
    return formatFieldListAnswer(dk, fieldCount);
  }

  for (const [patterns, answer] of FAQ) {
    if (patterns.some((p) => n.includes(p))) return answer;
  }

  const domainKey = detectDomainKeyFromMessage(text);
  if (domainKey && (n.includes('field') || n.includes('column') || n.includes('suggest') || n.includes('build'))) {
    const preset = DOMAIN_FIELD_PRESETS[domainKey];
    return `Got it—**${preset.label}** is a great use case. When you’re ready, ask for **Top 10**, **Top 15**, or **Top 20** field ideas (or start **Create New Object** in the tags) and I’ll line up columns that make sense for that world.`;
  }

  if (n.includes('object') || n.includes('schema') || n.includes('metadata')) {
    return 'If you’re shaping data in Briselle, the easiest path is: pick **Objects** in the tags, then **Create New Object**. I can also suggest fields once you tell me what the thing is *about* (for example patient claims or school enrollments).';
  }

  return getConversationalFallback(text);
}

/** Suggestion chips under the thread (context-aware). */
export const SUGGESTED_QUESTIONS = {
  default: [
    'What can you do?',
    'Create object',
    'How do records work?',
    'Add field',
  ],
  objects: [
    'Create object',
    'Load an object',
    'Suggest fields for my domain',
    'What can you do?',
  ],
  domain_health: [
    'Top 10 field ideas',
    'Top 15 field ideas',
    'Top 20 field ideas',
    'Create object',
    'How do records work?',
  ],
  domain_generic: ['Top 10 field ideas', 'Top 15 field ideas', 'Top 20 field ideas', 'Create object', 'What can you do?'],
};

export function getSuggestedQuestions(context = {}) {
  if (context.domainKey === 'health_claims') return [...SUGGESTED_QUESTIONS.domain_health];
  if (context.domainKey) return [...SUGGESTED_QUESTIONS.domain_generic];
  if (context.moduleId === 'objects' || context.wizardStep === 'object_actions' || context.wizardStep === 'field_actions')
    return [...SUGGESTED_QUESTIONS.objects];
  return [...SUGGESTED_QUESTIONS.default];
}

const PLATFORM_NAV = [
  { label: 'Objects', url: '/objects' },
  { label: 'New object', url: '/objects/new' },
  { label: 'Dashboard', url: '/dashboard' },
  { label: 'Settings', url: '/settings' },
];

export function getNavLinksForMessage(messageText) {
  const n = norm(messageText || '');
  const out = [...PLATFORM_NAV];
  if (n.includes('record')) out.unshift({ label: 'Browse objects', url: '/objects' });
  if (n.includes('user')) out.push({ label: 'Users', url: '/users' });
  if (n.includes('template')) out.push({ label: 'Templates', url: '/templist2' });
  return out.slice(0, 6);
}

export function isFieldSuggestionChip(text) {
  return FIELD_SUGGESTION_CHIP[norm(text)] != null;
}

export function isSuggestedQuestion(text, context) {
  const trimmed = String(text).trim();
  const list = getSuggestedQuestions(context);
  return list.some((q) => norm(q) === norm(trimmed));
}

export function shouldShowContactForm(text, _answerText) {
  const n = norm(String(text ?? ''));
  return ['contact support', 'talk to a human', 'speak to support'].some((p) => n.includes(p));
}

/**
 * @deprecated Legacy export – Briselle platform uses BRISHELLE_MODULES.
 * ZivaPage maps this to platform modules for display.
 */
export const ZIVA_ROLES = BRISHELLE_MODULES;
