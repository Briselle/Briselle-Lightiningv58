/**
 * Natural-language field attribute commands for Ziva (maps to fieldTypeMaster keys).
 */
import { zivaSpecDisplayLabel } from './zivaKnowledge.js';

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/→/g, ' ')
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Checkbox + common scalar attributes users mention in chat. */
const ATTRIBUTE_PHRASES = [
  { key: 'indexed', phrases: ['indexed', 'index', 'indexing', 'index true', 'for index'] },
  {
    key: 'useForAiPrediction',
    phrases: [
      'ai prediction',
      'use for ai prediction',
      'for ai prediction',
      'ai predict',
      'prediction',
      'useforaiprediction',
    ],
  },
  { key: 'externalId', phrases: ['external id', 'externalid', 'external identifier'] },
  { key: 'unique', phrases: ['unique', 'unique value'] },
  { key: 'required', phrases: ['required', 'mandatory', 'must have value'] },
  { key: 'piiData', phrases: ['pii', 'pii data', 'personally identifiable'] },
  { key: 'hiiData', phrases: ['hii', 'hii data', 'health information'] },
  { key: 'financialData', phrases: ['financial', 'financial data'] },
  { key: 'preferredInView', phrases: ['preferred in view', 'preferred view'] },
  {
    key: 'includeInTableView',
    phrases: ['table view', 'include in table', 'include in table view', 'show in table', 'list column'],
  },
  {
    key: 'includeInInlineEdit',
    phrases: ['inline edit', 'include in inline edit', 'inline editing', 'grid edit'],
  },
  { key: 'autoAddToCustomReportType', phrases: ['custom report', 'auto add to report', 'report type'] },
  { key: 'helpText', phrases: ['help text', 'helptext'] },
  { key: 'description', phrases: ['description', 'field description'] },
  { key: 'defaultValue', phrases: ['default', 'default value'] },
];

export const FIELD_ATTRIBUTE_EDIT_HELP =
  '**Field attributes** (per field label or list number):\n' +
  '• `set Project Status for AI Prediction` · `Project code index true`\n' +
  '• `tag Member ID attribute unique yes` · `field 3 indexed on`\n' +
  '• `Project Status useForAiPrediction true` · `make 2 required`\n' +
  'Supported flags include **Indexed**, **AI Prediction**, **External ID**, **Unique**, **Required**, **PII/HII/Financial**, **Table view**, **Inline edit**, and more.';

export function looksLikeFieldAttributeMessage(text) {
  const low = norm(text);
  if (!low || low.length < 4) return false;
  if (/\battribute(s)?\s+(of|for)\b/.test(low)) return true;
  if (/\b(tag|set|enable|turn on|turn off|mark)\s+.+\s+(for|attribute|indexed|index)\b/.test(low)) return true;
  if (/\bfor\s+(ai\s+prediction|index(?:ed)?|external\s+id)\b/.test(low)) return true;
  for (const row of ATTRIBUTE_PHRASES) {
    for (const p of row.phrases) {
      if (low.includes(p)) return true;
    }
  }
  if (/\b(field\s*)?#?\d{1,2}\s+(indexed|index|unique|required)\b/.test(low)) return true;
  if (/\b(indexed|unique|required)\s+(true|false|yes|no|on|off)\b/.test(low) && /\b(field|status|code|name|id)\b/.test(low)) {
    return true;
  }
  return false;
}

export function resolveAttributeKey(phrase) {
  let p = norm(phrase).replace(/[_-]/g, ' ');
  p = p.replace(/\b(true|false|yes|no|on|off)\s*$/i, '').trim();
  if (!p) return null;
  const direct = ATTRIBUTE_PHRASES.find((r) => r.key.toLowerCase() === p.replace(/\s/g, ''));
  if (direct) return direct.key;
  let best = null;
  let bestLen = 0;
  for (const row of ATTRIBUTE_PHRASES) {
    for (const ph of row.phrases) {
      const n = norm(ph);
      if (p === n || p.includes(n)) {
        if (n.length >= bestLen) {
          best = row.key;
          bestLen = n.length;
        }
      }
    }
  }
  return best;
}

export function parseBooleanAttrValue(token, defaultOn = true) {
  const t = norm(token);
  if (!t) return defaultOn;
  if (['true', 'yes', 'y', 'on', '1', 'enable', 'enabled'].includes(t)) return true;
  if (['false', 'no', 'n', 'off', '0', 'disable', 'disabled'].includes(t)) return false;
  return defaultOn;
}

function splitInstructionClauses(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/\s*[,;]\s*|\s+\band\s+\b/i)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts : [raw];
}

function parseValueTail(segment) {
  const m = segment.match(/\b(true|false|yes|no|on|off|enabled|disabled)\s*$/i);
  if (m) return { body: segment.slice(0, m.index).trim(), valueToken: m[1] };
  const m2 = segment.match(/\s+(?:to|=)\s*(true|false|yes|no|on|off)\s*$/i);
  if (m2) return { body: segment.slice(0, m2.index).trim(), valueToken: m2[1] };
  return { body: segment, valueToken: null };
}

/**
 * Parse one clause into { fieldQuery, attrKey, value } or null.
 * fieldQuery may be "3" (index) or label text.
 */
function parseSingleAttributeClause(clause) {
  let seg = String(clause ?? '').trim();
  if (!seg) return null;

  seg = seg
    .replace(/^(please|ensure|make sure|also)\s+/i, '')
    .replace(/^you\s+(should|must|can|want to|need to)\s+/i, '')
    .replace(/^ensure\s+(that\s+)?(you\s+)?/i, '')
    .trim();
  seg = seg.replace(/^you\s+/i, '');
  seg = seg.replace(/^(?:tag|set|mark)\s+(?:the\s+)?(?:attribute\s+of\s+)?/i, '');

  let fieldQuery = null;
  let attrPhrase = null;
  let valueToken = null;

  const { body, valueToken: tailVal } = parseValueTail(seg);
  valueToken = tailVal;
  let work = body;

  const fieldNum = work.match(/\b(?:field\s*)?#?(\d{1,2})\b/i);
  if (fieldNum) {
    fieldQuery = fieldNum[1];
    work = work.replace(/\b(?:field\s*)?#?\d{1,2}\b/i, ' ').trim();
  }

  const setFor = work.match(
    /^(?:set|enable|turn on|turn off|mark|make)\s+(.+?)\s+(?:attribute\s+)?(?:for|to)\s+(.+)$/i,
  );
  if (setFor) {
    fieldQuery = fieldQuery || setFor[1].trim();
    attrPhrase = setFor[2].trim();
  }

  if (!attrPhrase) {
    const labelFor = work.match(/^(.+?)\s+for\s+(.+)$/i);
    if (labelFor) {
      fieldQuery = fieldQuery || labelFor[1].trim();
      attrPhrase = labelFor[2].trim();
    }
  }

  if (!attrPhrase) {
    const labelAttr = work.match(/^(.+?)\s+(useForAiPrediction|indexed|index|unique|required|externalId)\s*$/i);
    if (labelAttr) {
      fieldQuery = fieldQuery || labelAttr[1].trim();
      attrPhrase = labelAttr[2];
    }
  }

  if (!attrPhrase) {
    const trailingAttr = work.match(/^(.+?)\s+(indexed|index|unique|required)\s+(true|false|yes|no|on|off)?$/i);
    if (trailingAttr) {
      fieldQuery = fieldQuery || trailingAttr[1].trim();
      attrPhrase = trailingAttr[2];
      if (!valueToken && trailingAttr[3]) valueToken = trailingAttr[3];
    }
  }

  if (!attrPhrase) {
    const attrOf = work.match(/^(.+?)\s+attribute\s+(.+)$/i);
    if (attrOf) {
      fieldQuery = fieldQuery || attrOf[1].trim();
      attrPhrase = attrOf[2].trim();
    }
  }

  if (!fieldQuery || !attrPhrase) return null;

  const attrKey = resolveAttributeKey(attrPhrase);
  if (!attrKey) return null;

  const scalarKinds = new Set(['description', 'helpText', 'defaultValue']);
  let value;
  if (scalarKinds.has(attrKey)) {
    value = attrPhrase.replace(new RegExp(`^${attrKey}`, 'i'), '').trim() || valueToken || '';
    if (!value) return null;
  } else {
    value = parseBooleanAttrValue(valueToken, true);
  }

  fieldQuery = fieldQuery
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+attribute$/i, '')
    .trim();

  return { fieldQuery, attrKey, value };
}

/**
 * @returns {{ items: { fieldQuery: string, attrKey: string, value: unknown }[], unparsed: string[] }}
 */
export function parseFieldAttributeInstructions(text) {
  const clauses = splitInstructionClauses(text);
  const items = [];
  const unparsed = [];
  for (const clause of clauses) {
    const low = norm(clause);
    if (/^(create|create it|yes|ok|save)\b/.test(low) && clauses.length === 1) continue;
    const item = parseSingleAttributeClause(clause);
    if (item) items.push(item);
    else if (looksLikeFieldAttributeMessage(clause)) unparsed.push(clause);
  }
  return { items, unparsed };
}

function findFieldIndex(fieldLines, fieldQuery) {
  const lines = (fieldLines || []).map((x) => String(x ?? '').trim()).filter(Boolean);
  const q = String(fieldQuery ?? '').trim();
  if (!q) return -1;
  if (/^\d{1,2}$/.test(q)) {
    const n = parseInt(q, 10);
    if (n >= 1 && n <= lines.length) return n - 1;
    return -1;
  }
  const nq = norm(q);
  const exact = lines.findIndex((l) => norm(zivaSpecDisplayLabel(l)) === nq);
  if (exact >= 0) return exact;
  const partial = lines
    .map((l, i) => ({ i, label: norm(zivaSpecDisplayLabel(l)) }))
    .filter((x) => x.label.includes(nq) || nq.includes(x.label));
  if (partial.length === 1) return partial[0].i;
  if (partial.length > 1) {
    const best = partial.sort((a, b) => a.label.length - b.label.length)[0];
    return best.i;
  }
  return -1;
}

function labelKeyFromLine(line) {
  return norm(zivaSpecDisplayLabel(line));
}

function mergeAttrMap(existing, attrKey, value) {
  const next = { ...(existing || {}) };
  next[attrKey] = value;
  return next;
}

/**
 * Apply attribute instructions to create-draft field list.
 * @returns {{ kind: 'revise'|'help'|'none', fieldAttrsByLabel?: Record<string, Record<string, unknown>>, required?: boolean[], summary?: string }}
 */
export function applyFieldAttributesToDraft(raw, fieldLines, fieldAttrsByLabel, requiredFlags) {
  const lines = (fieldLines || []).map((x) => String(x ?? '').trim()).filter(Boolean);
  if (!lines.length) return { kind: 'none' };

  const { items, unparsed } = parseFieldAttributeInstructions(raw);
  if (!items.length) {
    if (unparsed.length && looksLikeFieldAttributeMessage(raw)) {
      return {
        kind: 'help',
        summary:
          `I couldn’t match that to a field + attribute. Try:\n` +
          `• \`set Project Status for AI Prediction\`\n` +
          `• \`Project code index true\`\n` +
          `• \`field 3 unique yes\`\n\n${FIELD_ATTRIBUTE_EDIT_HELP}`,
      };
    }
    return { kind: 'none' };
  }

  const attrsMap = { ...(fieldAttrsByLabel || {}) };
  let req =
    Array.isArray(requiredFlags) && requiredFlags.length === lines.length
      ? requiredFlags.map(Boolean)
      : lines.map(() => false);
  const summaryParts = [];
  const errors = [];

  for (const { fieldQuery, attrKey, value } of items) {
    const idx = findFieldIndex(lines, fieldQuery);
    if (idx < 0) {
      errors.push(`No field matching **${fieldQuery}**`);
      continue;
    }
    const label = zivaSpecDisplayLabel(lines[idx]);
    const lk = labelKeyFromLine(lines[idx]);
    attrsMap[lk] = mergeAttrMap(attrsMap[lk], attrKey, value);
    if (attrKey === 'required') {
      req[idx] = !!value;
    }
    const displayVal = typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value);
    summaryParts.push(`**${label}** → ${attrKey} = ${displayVal}`);
  }

  if (!summaryParts.length) {
    return {
      kind: 'help',
      summary: `${errors.join('\n')}\n\n${FIELD_ATTRIBUTE_EDIT_HELP}`,
    };
  }

  let summary = summaryParts.join(' · ');
  if (errors.length) summary += `\n\n⚠ ${errors.join(' · ')}`;

  return {
    kind: 'revise',
    fieldAttrsByLabel: attrsMap,
    required: req,
    summary: `Updated field attributes: ${summary}`,
  };
}

export function formatFieldAttrsForPreview(fieldLines, fieldAttrsByLabel) {
  const lines = fieldLines || [];
  const map = fieldAttrsByLabel || {};
  const rows = [];
  for (const line of lines) {
    const label = zivaSpecDisplayLabel(line);
    const lk = labelKeyFromLine(line);
    const attrs = map[lk];
    if (!attrs || !Object.keys(attrs).length) continue;
    const bits = Object.entries(attrs).map(([k, v]) => `${k}=${v === true ? 'yes' : v === false ? 'no' : v}`);
    rows.push(`• **${label}**: ${bits.join(', ')}`);
  }
  return rows.length ? `\n\n**Attributes set in this draft:**\n${rows.join('\n')}` : '';
}
