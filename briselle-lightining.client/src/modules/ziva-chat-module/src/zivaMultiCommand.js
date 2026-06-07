/**
 * Parse multiple user intents in one message (create + edit + load + fields…).
 */

import { parseObjectMenuChoice } from './zivaWorkflow.js';
import { parseComprehensiveCreateObjectRequest } from './zivaComprehensiveCreate.js';
import { parseExplicitFieldsCreateRequest } from './zivaExplicitFieldsCreate.js';

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const SPLIT_RE = /\s+(?:and then|then|and also|also|;\s*|,\s*then\s+|\.\s+then\s+)|,\s*(?=(?:create|load|edit|delete|remove|add|modify|open|list|top)\b)/gi;

function segmentCommand(text) {
  return String(text ?? '')
    .split(SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function summarizeSegment(seg) {
  const menu = parseObjectMenuChoice(seg);
  if (menu?.mode) {
    const labels = {
      create_object: 'Create new object',
      load_object: 'Load an object',
      modify_object: 'Edit an object',
      create_field: 'Create new field',
      modify_field: 'Edit a field',
    };
    return { segment: seg, kind: 'workflow', mode: menu.mode, summary: labels[menu.mode] || menu.mode };
  }
  if (menu?.nav) {
    return {
      segment: seg,
      kind: 'nav',
      nav: menu.nav,
      summary: menu.nav === 'exit_home' ? 'Exit to home' : 'Exit to previous step',
    };
  }
  const n = norm(seg);
  if (/\b(delete|remove)\b/.test(n) && /\bobject/.test(n)) {
    return { segment: seg, kind: 'workflow', mode: 'modify_object', summary: 'Edit/delete object' };
  }
  if (/\b(top|list|show)\s*\d+/i.test(seg)) {
    return { segment: seg, kind: 'list', summary: `List objects (${seg.trim()})` };
  }
  if (/\b(create|make|build)\b/.test(n) && /\bobject/.test(n)) {
    return { segment: seg, kind: 'workflow', mode: 'create_object', summary: 'Create new object' };
  }
  return { segment: seg, kind: 'chat', summary: `Answer: ${seg.trim().slice(0, 80)}` };
}

/**
 * @returns {{ multi: boolean, plan: ReturnType<summarizeSegment>[] }}
 */
export function parseMultiCommandPlan(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { multi: false, plan: [] };

  const comprehensive = parseComprehensiveCreateObjectRequest(raw);
  if (comprehensive) {
    return {
      multi: false,
      plan: [{ ...comprehensive, segment: raw }],
    };
  }

  const explicit = parseExplicitFieldsCreateRequest(raw);
  if (explicit) {
    return {
      multi: false,
      plan: [{ ...explicit, segment: raw }],
    };
  }

  const parts = segmentCommand(raw);
  if (parts.length <= 1) {
    const one = summarizeSegment(raw);
    return { multi: false, plan: [one] };
  }
  const plan = parts.map(summarizeSegment);
  const actionable = plan.filter((p) => p.kind !== 'chat' || parts.length === 1);
  return { multi: plan.length > 1, plan };
}
