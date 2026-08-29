/**
 * One-shot create when the user names the object and lists exact columns/fields.
 * e.g. Create object "Sales" with columns "Sale Date", "Sale Value", … and finish directly.
 */

import { normalizeFieldSpecLine } from './zivaKnowledge.js';

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const AUTO_FINISH_RE =
  /\b(finish(?:\s+it)?\s+directly|go\s+finish|just\s+go|just\s+create|create\s+it\s+now|do\s+it\s+now|no\s+other\s+fields|only\s+these\s+(?:fields|columns)|skip\s+(?:the\s+)?(?:steps|wizard|confirmation)|without\s+asking|don'?t\s+ask|go\s+ahead\s+and\s+(?:create|finish)|that'?s\s+all|nothing\s+else)\b/i;

const COLUMN_SECTION_END_RE =
  /\b(?:no\s+other\s+fields?|and\s+just\s+go|just\s+go|finish\s+it|go\s+finish|that'?s\s+all|only\s+these|nothing\s+else|then\s+create|and\s+create)\b/i;

/** @param {string} label */
function normalizeColumnToSpecLine(label) {
  const t = String(label ?? '').trim();
  if (!t) return '';
  const paren = t.match(/^(.+?)\s*\(\s*([^)]+)\s*\)\s*$/);
  if (paren) return normalizeFieldSpecLine(`${paren[1].trim()} (${paren[2].trim()})`);
  if (/\((?:text|number|date|picklist|email|phone|url|currency|percent|checkbox)/i.test(t)) {
    return normalizeFieldSpecLine(t.replace(/\(/, ' (').replace(/\s+\(/, ' ('));
  }
  return normalizeFieldSpecLine(`${t} (Text)`);
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function extractObjectLabelFromCreateMessage(raw) {
  const patterns = [
    /\bobjects?\s+named\s+"([^"]+)"/i,
    /\bobjects?\s+called\s+"([^"]+)"/i,
    /\bnamed\s+"([^"]+)"/i,
    /\bcalled\s+"([^"]+)"/i,
    /\bobjects?\s+named\s+([A-Za-z][A-Za-z0-9\s\-]{0,40}?)(?:\s+with\s+(?:columns?|fields?)\b)/i,
    /\bnamed\s+([A-Za-z][A-Za-z0-9\s\-]{0,40}?)(?:\s+with\s+(?:columns?|fields?)\b)/i,
    /\bcreate\s+(?:an?\s+)?objects?\s+(?:for|called|named)\s+"([^"]+)"/i,
    /\bcreate\s+(?:an?\s+)?"([^"]+)"\s+objects?/i,
    /\bcreate\s+(?:an?\s+)?objects?\s+"([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) {
      const label = m[1].trim().replace(/\s+object$/i, '');
      if (label.length >= 1 && label.length <= 80) return label;
    }
  }
  return '';
}

/**
 * Pull user-listed column labels from the message body.
 * @param {string} raw
 * @returns {string[]}
 */
export function extractExplicitColumnLabels(raw) {
  const text = String(raw ?? '');
  const anchor = text.match(
    /\bwith\s+(?:the\s+)?(?:following\s+)?(?:columns?|fields?|field\s+columns?)\s*[:\-]?\s*/i,
  );
  if (!anchor) return [];

  let segment = text.slice(anchor.index + anchor[0].length);
  const end = segment.search(COLUMN_SECTION_END_RE);
  if (end > 0) segment = segment.slice(0, end);

  /** @type {string[]} */
  const out = [];
  const seen = new Set();

  const pushLabel = (label) => {
    const t = String(label ?? '').trim().replace(/^["']|["']$/g, '');
    if (t.length < 2 || t.length > 120) return;
    if (!/^[A-Za-z0-9]/.test(t)) return;
    if (/^(with|and|or|no|just|only|required)$/i.test(t)) return;
    const key = norm(t);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const m of segment.matchAll(/"([^"]+)"/g)) {
    pushLabel(m[1]);
  }

  let rest = segment.replace(/"[^"]*"/g, ',');
  for (const m of rest.matchAll(/\b([A-Za-z][A-Za-z0-9\s]*\([A-Za-z][A-Za-z0-9\s/]*\))/g)) {
    pushLabel(m[1]);
    rest = rest.replace(m[1], ',');
  }

  for (const part of rest.split(',')) {
    pushLabel(part);
  }

  return out;
}

/**
 * User listed exact columns — create object in one shot (no Top N / AI field guess).
 * @returns {null | {
 *   kind: 'explicit_fields_create',
 *   objectLabel: string,
 *   topic: string,
 *   fieldSpecLines: string[],
 *   fieldCount: number,
 *   autoProceed: boolean,
 *   navigateAfter: boolean,
 *   summary: string,
 * }}
 */
export function parseExplicitFieldsCreateRequest(text) {
  const raw = String(text ?? '').trim();
  const n = norm(raw);
  if (!raw) return null;

  const wantsObject =
    (/\b(create|make|build|define)\b/.test(n) && /\bobjects?\b/.test(n)) ||
    (/\b(create|make|build)\b/.test(n) && /\b(?:columns?|fields?)\b/.test(n));
  if (!wantsObject) return null;

  const columnLabels = extractExplicitColumnLabels(raw);
  if (columnLabels.length < 1) return null;

  let objectLabel = extractObjectLabelFromCreateMessage(raw);
  if (!objectLabel) {
    const beforeWith = raw.split(/\bwith\s+(?:columns?|fields?)\b/i)[0] || '';
    const m = beforeWith.match(/\b(?:named|called)\s+"?([A-Za-z][A-Za-z0-9\s\-]{0,50})"?/i);
    if (m?.[1]) objectLabel = m[1].trim();
  }
  if (!objectLabel) {
    const m2 = raw.match(/\bcreate\s+(?:an?\s+)?objects?\s+(?:for\s+)?"([^"]+)"/i);
    if (m2?.[1]) objectLabel = m2[1].trim();
  }
  if (!objectLabel) return null;

  const fieldSpecLines = columnLabels.map(normalizeColumnToSpecLine).filter(Boolean);
  if (!fieldSpecLines.length) return null;

  const autoProceed = AUTO_FINISH_RE.test(raw) || AUTO_FINISH_RE.test(n) || /\bdirectly\b/.test(n);
  const navigateAfter = /\bnavigate\b/.test(n);

  return {
    kind: 'explicit_fields_create',
    objectLabel,
    topic: objectLabel,
    fieldSpecLines,
    fieldCount: fieldSpecLines.length,
    autoProceed: autoProceed || fieldSpecLines.length >= 1,
    navigateAfter,
    summary: `Create **${objectLabel}** with your **${fieldSpecLines.length}** columns${autoProceed ? ', then save & open' : ''}`,
  };
}
