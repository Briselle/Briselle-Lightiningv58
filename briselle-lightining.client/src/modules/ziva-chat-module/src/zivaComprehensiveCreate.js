/**
 * One-shot “create object with N fields” requests (auto-run wizard, no step-by-step prompts).
 */

import { parseCreateObjectIntent } from './zivaKnowledge.js';
import { parseExplicitFieldsCreateRequest } from './zivaExplicitFieldsCreate.js';

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function parseFieldCount(n, raw) {
  const topM = n.match(/\btop\s*(\d{1,2})\b/);
  if (topM) {
    const v = parseInt(topM[1], 10);
    if (v >= 1 && v <= 60) return v;
  }
  const fm = n.match(/\b(\d{1,2})\s*fields?\b/);
  if (fm) {
    const v = parseInt(fm[1], 10);
    if (v >= 1 && v <= 60) return v;
  }
  const only = n.match(/^(\d{1,2})$/);
  if (only) {
    const v = parseInt(only[1], 10);
    if (v >= 1 && v <= 60) return v;
  }
  return null;
}

function extractObjectTopic(raw, n) {
  const patterns = [
    /\bobjects?\s+(?:for|about|named|called)\s+([^,]+?)(?:\s*,\s*|\s+top\s+\d|\s+with\s+\d|\s+you\s+need|\s+and\s+you|\s*$)/i,
    /\bcreate\s+(?:an?\s+)?objects?\s+(?:for|about|named|called)\s+([^,]+?)(?:\s*,\s*|\s+top\s+\d|\s+you\s+need|\s*$)/i,
    /\bfor\s+([A-Za-z][A-Za-z0-9\s\-]{1,40}?)(?:\s*,\s*top|\s*,\s*you|\s+top\s+\d)/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) {
      let t = m[1].trim();
      t = t.replace(/\s+top\s+\d+.*$/i, '').trim();
      t = t.replace(/\s+you\s+need.*$/i, '').trim();
      if (t.length >= 2 && t.length <= 80) return t;
    }
  }
  const intent = parseCreateObjectIntent(raw);
  if (intent.topic) {
    let t = intent.topic.split(/,\s*(?:top|you|and)\b/i)[0].trim();
    if (t.length >= 2) return t;
  }
  return '';
}

/**
 * User gave enough detail to run create-object end-to-end in one go.
 * @returns {null | { kind: 'comprehensive_create', topic: string, fieldCount: number, autoProceed: boolean, navigateAfter: boolean, summary: string }}
 */
export function parseComprehensiveCreateObjectRequest(text) {
  const raw = String(text ?? '').trim();
  const n = norm(raw);
  if (!n) return null;

  const explicit = parseExplicitFieldsCreateRequest(raw);
  if (explicit) return explicit;

  const wantsObject =
    (/\b(create|make|build|define)\b/.test(n) && /\bobjects?\b/.test(n)) ||
    parseCreateObjectIntent(raw).start;
  if (!wantsObject) return null;

  const fieldCount = parseFieldCount(n, raw);
  if (fieldCount == null) return null;

  const topic = extractObjectTopic(raw, n);
  if (!topic) return null;

  const autoProceed =
    /\b(you can pick|pick the best|best approach|auto confirm|auto-confirm|without asking|no need to ask|don'?t ask me|skip confirmation|just create|you decide|handle it)\b/.test(
      n,
    ) ||
    (/\bcreate\b/.test(n) && /\bnavigate\b/.test(n) && /\b(confirm|done)\b/.test(n));

  const navigateAfter = /\bnavigate\b/.test(n);

  const labelHint = topic.replace(/\b(object|objects)\b/gi, '').trim() || topic;

  return {
    kind: 'comprehensive_create',
    topic: labelHint,
    fieldCount,
    autoProceed: autoProceed || navigateAfter,
    navigateAfter,
    summary: `Create **${labelHint}** with **${fieldCount}** fields${autoProceed ? ', then save & open' : ''}`,
  };
}

