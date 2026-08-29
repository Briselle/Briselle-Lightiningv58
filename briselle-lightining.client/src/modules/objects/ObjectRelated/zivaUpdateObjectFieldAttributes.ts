/**
 * Apply field attribute updates on an existing object from Ziva chat.
 */
import { supabase } from '../../../utils/supabase';
import type { ObjectFieldDataType } from '../FieldRelated/objectDefinitionSchema';
import {
  getFieldTypeMasterEntry,
  validateFieldAttributes,
} from '../FieldRelated/fieldTypeMaster';
import { withDataViewDefaults } from '../FieldRelated/fieldDataViewAttributes';
import { isPlatformSystemApi } from '../FieldRelated/platformSystemFields';

function safeParseConfig(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    return JSON.parse(String(raw)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function norm(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findFieldIndex(
  fields: Array<Record<string, unknown>>,
  fieldQuery: string,
): number {
  const q = String(fieldQuery ?? '').trim();
  if (!q) return -1;
  if (/^\d{1,2}$/.test(q)) {
    const userFields = fields.filter((f) => {
      const api = String(f.apiName ?? '').trim();
      return api && !isPlatformSystemApi(api);
    });
    const n = parseInt(q, 10);
    if (n >= 1 && n <= userFields.length) {
      const apiTarget = String(userFields[n - 1]?.apiName ?? '').trim();
      return fields.findIndex((f) => String(f.apiName ?? '').trim() === apiTarget);
    }
    return -1;
  }
  const nq = norm(q);
  const matches = fields
    .map((f, i) => ({
      i,
      label: norm(String(f.label ?? '')),
      api: norm(String(f.apiName ?? '')),
    }))
    .filter((x) => !isPlatformSystemApi(String(fields[x.i]?.apiName ?? '')))
    .filter((x) => x.label === nq || x.label.includes(nq) || nq.includes(x.label) || x.api === nq);
  if (matches.length === 1) return matches[0].i;
  if (matches.length > 1) {
    const exact = matches.filter((x) => x.label === nq);
    if (exact.length === 1) return exact[0].i;
    return matches.sort((a, b) => a.label.length - b.label.length)[0].i;
  }
  return -1;
}

export interface FieldAttributeUpdateItem {
  fieldQuery: string;
  attrKey: string;
  value: unknown;
}

export interface ApplyFieldAttributeUpdatesResult {
  ok: boolean;
  summary: string;
  error?: string;
}

export async function applyFieldAttributeUpdatesOnObject(
  sysId: number,
  items: FieldAttributeUpdateItem[],
): Promise<ApplyFieldAttributeUpdatesResult> {
  if (!items.length) {
    return { ok: false, summary: '', error: 'No attribute updates to apply.' };
  }

  const { data, error } = await supabase
    .from('dobj')
    .select('dobj_configuration,dobj_name_display')
    .eq('sys_id', sysId)
    .maybeSingle();

  if (error) {
    return { ok: false, summary: '', error: error.message || 'Failed to load object.' };
  }

  const cfg = safeParseConfig(data?.dobj_configuration);
  const fields = Array.isArray(cfg.fields) ? ([...cfg.fields] as Array<Record<string, unknown>>) : [];
  if (!fields.length) {
    return { ok: false, summary: '', error: 'Object has no field configuration.' };
  }

  const summaryParts: string[] = [];
  const errors: string[] = [];

  for (const { fieldQuery, attrKey, value } of items) {
    const idx = findFieldIndex(fields, fieldQuery);
    if (idx < 0) {
      errors.push(`No field matching "${fieldQuery}"`);
      continue;
    }
    const row = { ...fields[idx] };
    const api = String(row.apiName ?? '').trim();
    if (isPlatformSystemApi(api)) {
      errors.push(`Cannot change attributes on system field **${row.label ?? api}**`);
      continue;
    }

    const dataType = String(row.dataType ?? 'text') as ObjectFieldDataType;
    const entry = getFieldTypeMasterEntry(dataType);
    const allowed = new Set([...(entry?.attributeKeys ?? []), 'indexed']);
    if (!allowed.has(attrKey) && attrKey !== 'required') {
      errors.push(`Attribute **${attrKey}** is not available for **${row.label}** (${dataType})`);
      continue;
    }

    const attrs = withDataViewDefaults({ ...(row.attributes as Record<string, unknown>) });
    if (attrKey === 'required' && entry?.attributeKeys.includes('required')) {
      row.required = value ? 1 : 0;
      attrs.required = !!value;
    } else {
      attrs[attrKey] = value;
    }
    if (attrKey === 'indexed' || attrs.indexed != null) {
      attrs.indexed = attrs.indexed === true || attrs.indexed === 1;
    }

    const merged = { ...attrs };
    if (entry?.attributeKeys.includes('required')) {
      merged.required = row.required === 1 || attrs.required === true;
    }

    const validationErrors = validateFieldAttributes(dataType, merged);
    if (validationErrors.length) {
      errors.push(`${row.label}: ${validationErrors[0]}`);
      continue;
    }

    row.attributes = merged;
    fields[idx] = row;
    const label = String(row.label ?? fieldQuery);
    const displayVal = typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value);
    summaryParts.push(`**${label}** → ${attrKey} = ${displayVal}`);
  }

  if (!summaryParts.length) {
    return {
      ok: false,
      summary: '',
      error: errors.join(' · ') || 'No updates applied.',
    };
  }

  const nextConfig = { ...cfg, fields };
  const { error: updateError } = await supabase
    .from('dobj')
    .update({ dobj_configuration: nextConfig })
    .eq('sys_id', sysId);

  if (updateError) {
    return { ok: false, summary: '', error: updateError.message || 'Failed to save attributes.' };
  }

  let summary = `Saved on **${data?.dobj_name_display ?? 'object'}**: ${summaryParts.join(' · ')}`;
  if (errors.length) summary += `\n\n⚠ ${errors.join(' · ')}`;

  return { ok: true, summary };
}
