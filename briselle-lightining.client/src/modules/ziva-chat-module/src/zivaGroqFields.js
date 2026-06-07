/**
 * Fetch custom field specs from Groq via POST /api/ziva/object-fields
 */

const ALLOWED_TYPES = new Set([
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
]);

function normalizeFieldSpecLine(line) {
  const t = String(line ?? '').trim();
  if (!t || t === '[object Object]') return '';
  const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!m) return `${t} (Text)`;
  const label = m[1].trim();
  const raw = m[2].trim();
  const type = [...ALLOWED_TYPES].find((x) => x.toLowerCase() === raw.toLowerCase()) || 'Text';
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

export function parseObjectFieldsPayload(data, count) {
  const n = Math.min(60, Math.max(1, Number(count) || 10));
  const presetLabel = String(data?.presetLabel ?? 'Custom object').trim() || 'Custom object';
  const raw = Array.isArray(data?.fields) ? data.fields : [];
  const fields = raw
    .map((x) => fieldItemToSpecLine(x))
    .filter(Boolean)
    .slice(0, n);
  return { fields, presetLabel, source: data?.source || 'groq' };
}

/**
 * @param {string} apiBase e.g. /api/ziva
 */
export async function fetchFieldSpecsFromGroq(apiBase, { topic, objectLabel, count, model = 'auto' }) {
  const base = String(apiBase || '/api/ziva').replace(/\/$/, '');
  const url = `${base}/object-fields`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: String(topic ?? '').trim(),
      objectLabel: String(objectLabel ?? '').trim(),
      count: Math.min(60, Math.max(1, Number(count) || 10)),
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
    const err = new Error(data.error || `Field AI request failed (${res.status})`);
    err.status = res.status;
    err.fallback = data.fallback === true || res.status === 501 || res.status === 502;
    throw err;
  }
  const parsed = parseObjectFieldsPayload(data, count);
  if (!parsed.fields.length) {
    const err = new Error('Empty field list from AI');
    err.fallback = true;
    throw err;
  }
  return parsed;
}
