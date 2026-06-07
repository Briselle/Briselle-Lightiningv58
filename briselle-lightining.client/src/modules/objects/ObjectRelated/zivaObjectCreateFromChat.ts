/**
 * Persists a new `dobj` row from Ziva chat (same shape as ObjectAdd manual save).
 */
import { supabase } from '../../../utils/supabase';
import { ensureObjectLoaderPlatformConfigRow } from '../../../components/ui/tabletemplates/utils/configService';
import type { ObjectFieldDataType } from '../FieldRelated/objectDefinitionSchema';
import { getDefaultAttributesForFieldType, getFieldTypeMasterEntry, validateFieldAttributes } from '../FieldRelated/fieldTypeMaster';
import { toUserDefinedApiName, getAutoNumberDisplayFormatFromObjectLabel } from '../FieldRelated/fieldDataTypeModel';
import {
  buildFixedPlatformSystemFieldRows,
  PLATFORM_SYSTEM_API_SET,
  recordDisplayFieldApiForDataType,
} from '../FieldRelated/platformSystemFields';
import { withDataViewDefaults } from '../FieldRelated/fieldDataViewAttributes';
import { buildContextualFieldSpecLines } from '../../ziva-chat-module/src/zivaKnowledge.js';

const ENTITY_ID = 1000000000;
const USER_ID = 1212;

function normToken(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/→/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse trailing "(Type)" from Ziva field spec lines into a supported data type. */
export function parseDataTypeFromSpecLine(line: string): ObjectFieldDataType {
  const safe = String(line ?? '');
  const m = safe.match(/\(([^)]+)\)\s*$/);
  const raw = normToken(m ? m[1] : 'text');
  if (raw.includes('long text') || raw === 'long text') return 'textAreaLong';
  if (raw.includes('text area') || raw === 'textarea') return 'textArea';
  if (raw.includes('datetime') || raw === 'date time') return 'dateTime';
  if (raw.includes('checkbox') || raw === 'flag') return 'checkbox';
  if (raw.includes('currency') || raw.includes('amount')) return 'currency';
  if (raw.includes('percent')) return 'percent';
  if (raw.includes('picklist')) return 'picklist';
  if (raw.includes('number') || raw.includes('integer')) return 'number';
  if (raw.includes('date') && !raw.includes('time')) return 'date';
  if (raw.includes('email')) return 'email';
  if (raw.includes('phone')) return 'phone';
  if (raw.includes('url')) return 'url';
  if (raw.includes('lookup')) return 'text';
  if (raw.includes('auto number')) return 'text';
  if (raw.includes('text') || raw === '') return 'text';
  return 'text';
}

export function displayLabelFromSpecLine(line: string): string {
  return String(line ?? '')
    .replace(/\s*\([^)]+\)\s*$/, '')
    .trim();
}

function mergeAttributesForValidation(dataType: ObjectFieldDataType, attrs: Record<string, unknown>, required: boolean) {
  const m = getFieldTypeMasterEntry(dataType);
  const a = { ...attrs };
  if (m?.attributeKeys.includes('required')) a.required = required;
  return a;
}

function buildFirstRecordFieldRow(objectLabel: string, dataType: ObjectFieldDataType) {
  const defaults = getDefaultAttributesForFieldType(dataType);
  if (dataType === 'autoNumber' && !String(defaults.displayFormat ?? '').trim()) {
    defaults.displayFormat = getAutoNumberDisplayFormatFromObjectLabel(objectLabel);
  }
  const attrs0 = { ...defaults };
  const rowDescription0 = String(attrs0.description ?? '').trim();
  if ('description' in attrs0) delete attrs0.description;
  const m0 = getFieldTypeMasterEntry(dataType);
  if (m0?.attributeKeys.includes('required')) attrs0.required = true;
  attrs0.indexed = attrs0.indexed === true || attrs0.indexed === 1;
  attrs0.systemManaged = true;

  return {
    version: 1,
    dataType,
    label: 'Name',
    apiName: recordDisplayFieldApiForDataType(dataType),
    description: rowDescription0,
    required: 1,
    isdeleted: 0,
    isactive: 1,
    isCustom: 0,
    attributes: attrs0,
  } as Record<string, unknown>;
}

function mergeChatAttributeOverrides(
  dataType: ObjectFieldDataType,
  attrs: Record<string, unknown>,
  overrides: Record<string, unknown> | undefined,
  required: boolean,
) {
  if (!overrides || !Object.keys(overrides).length) return attrs;
  const entry = getFieldTypeMasterEntry(dataType);
  const allowed = new Set([...(entry?.attributeKeys ?? []), 'indexed']);
  const next = { ...attrs };
  for (const [key, value] of Object.entries(overrides)) {
    if (key === 'required' && entry?.attributeKeys.includes('required')) {
      next.required = !!value;
      continue;
    }
    if (allowed.has(key)) next[key] = value;
  }
  if (entry?.attributeKeys.includes('required')) next.required = required;
  return next;
}

function buildCustomFieldRow(
  label: string,
  apiName: string,
  dataType: ObjectFieldDataType,
  required: boolean,
  attributeOverrides?: Record<string, unknown>,
) {
  const safeLabel = String(label ?? '').trim() || 'Field';
  const safeApi =
    String(apiName ?? '').trim() || toUserDefinedApiName(safeLabel) || toUserDefinedApiName('field');
  const defaults = getDefaultAttributesForFieldType(dataType);
  let attrs = withDataViewDefaults({ ...defaults, indexed: false });
  attrs = mergeChatAttributeOverrides(dataType, attrs, attributeOverrides, required);
  if (dataType === 'picklist' && !String(attrs.picklistValues ?? '').trim()) {
    attrs.picklistValues = 'Pending\nApproved\nDenied\nOther';
  }
  const m = getFieldTypeMasterEntry(dataType);
  if ('description' in attrs) delete attrs.description;
  if (m?.attributeKeys.includes('required')) attrs.required = required;
  attrs.indexed = attrs.indexed === true || attrs.indexed === 1;
  const merged = mergeAttributesForValidation(dataType, attrs, required);
  const errs = validateFieldAttributes(dataType, merged);
  if (errs.length > 0) {
    const fallback: ObjectFieldDataType = 'text';
    const fb = withDataViewDefaults({ ...getDefaultAttributesForFieldType(fallback), indexed: false });
    if ('description' in fb) delete fb.description;
    return {
      version: 1,
      dataType: fallback,
      label: safeLabel,
      apiName: safeApi,
      description: '',
      required: required ? 1 : 0,
      isdeleted: 0,
      isactive: 1,
      isCustom: 1,
      attributes: fb,
    };
  }
  return {
    version: 1,
    dataType,
    label: safeLabel,
    apiName: safeApi,
    description: '',
    required: required ? 1 : 0,
    isdeleted: 0,
    isactive: 1,
    isCustom: 1,
    attributes: attrs,
  } as Record<string, unknown>;
}

function allocateApiNames(displayLabels: string[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (const lb of displayLabels) {
    let base = toUserDefinedApiName(String(lb ?? '')) || toUserDefinedApiName('field');
    let candidate = base;
    let i = 2;
    while (used.has(candidate) || PLATFORM_SYSTEM_API_SET.has(candidate.toLowerCase())) {
      candidate = `${base.replace(/_u$/, '')}_${i}_u`.replace(/__/g, '_');
      i += 1;
    }
    used.add(candidate);
    out.push(candidate);
  }
  return out;
}

function labelKeyFromSpecLine(line: string): string {
  return displayLabelFromSpecLine(line)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildConfigurationPayload(
  objId: number,
  params: {
    objectLabel: string;
    objectApiName: string;
    objectDescription: string;
    fieldSpecLines: string[];
    fieldRequiredFlags?: boolean[];
    fieldAttrsByLabel?: Record<string, Record<string, unknown>> | null;
  },
) {
  const { objectLabel, objectApiName, objectDescription, fieldSpecLines, fieldRequiredFlags, fieldAttrsByLabel } =
    params;
  const attrMap = fieldAttrsByLabel ?? {};
  const firstType: ObjectFieldDataType = 'autoNumber';
  const fixedRows = buildFixedPlatformSystemFieldRows();
  const recordNameRow = buildFirstRecordFieldRow(objectLabel, firstType);

  const displayLabels = fieldSpecLines.map((line) => displayLabelFromSpecLine(line));
  const apiNames = allocateApiNames(displayLabels);
  const customRows = fieldSpecLines.map((line, idx) => {
    const dt = parseDataTypeFromSpecLine(line);
    const req = fieldRequiredFlags != null && fieldRequiredFlags.length === fieldSpecLines.length ? !!fieldRequiredFlags[idx] : false;
    const lk = labelKeyFromSpecLine(line);
    const overrides = attrMap[lk] ?? attrMap[displayLabels[idx].toLowerCase().replace(/\s+/g, ' ').trim()];
    return buildCustomFieldRow(displayLabels[idx], apiNames[idx], dt, req, overrides);
  });

  const normalizedFields: Array<Record<string, unknown>> = [
    ...fixedRows.map((row) => ({ ...row })),
    recordNameRow,
    ...customRows,
  ];

  normalizedFields.forEach((field, index) => {
    field.id = index + 1;
    field.order = index + 1;
  });

  return {
    obj_id: objId,
    version: 1,
    fields: normalizedFields,
    objectType: 'list',
    objectIcon: 'table',
    objectCustomIcon: '',
    objectLabel: String(objectLabel ?? '').trim(),
    objectApiName: String(objectApiName ?? '').trim(),
    objectDescription: String(objectDescription ?? '').trim(),
  } as Record<string, unknown>;
}

export interface CreateObjectFromZivaResult {
  ok: boolean;
  sysId?: number;
  error?: string;
}

/**
 * Inserts `dobj` + seeds ObjectLoader `platform_config`, matching ObjectAdd.handleSave.
 */
export async function createObjectFromZivaChat(params: {
  objectLabel: string;
  objectApiName: string;
  description: string;
  domainKey: string;
  fieldCount: number;
  /** When set (e.g. after user edits in chat), used instead of regenerating from domain + count. */
  fieldSpecLines?: string[] | null;
  fieldRequired?: boolean[] | null;
  fieldAttrsByLabel?: Record<string, Record<string, unknown>> | null;
}): Promise<CreateObjectFromZivaResult> {
  const {
    objectLabel,
    objectApiName,
    description,
    domainKey,
    fieldCount,
    fieldSpecLines: explicitLines,
    fieldRequired,
    fieldAttrsByLabel,
  } = params;
  const labelSafe = String(objectLabel ?? '').trim();
  const apiSafe = String(objectApiName ?? '').trim();
  const descSafe = String(description ?? '').trim();
  const fromExplicit =
    Array.isArray(explicitLines) && explicitLines.map((l) => String(l ?? '').trim()).filter(Boolean).length > 0
      ? explicitLines.map((l) => String(l ?? '').trim()).filter(Boolean)
      : null;
  const lines = fromExplicit ?? buildContextualFieldSpecLines(descSafe, labelSafe, fieldCount);
  if (!labelSafe || !apiSafe) {
    return { ok: false, error: 'Object label and API name are required.' };
  }
  if (!lines.length) {
    return { ok: false, error: 'Add at least one custom field (or pick a field count again).' };
  }
  let requiredFlags: boolean[] | undefined;
  if (Array.isArray(fieldRequired) && fieldRequired.length === lines.length) {
    requiredFlags = fieldRequired.map(Boolean);
  }

  const nowIso = new Date().toISOString();
  const { data: lastRows, error: lastError } = await supabase
    .from('dobj')
    .select('sys_id')
    .order('sys_id', { ascending: false })
    .limit(1);
  if (lastError) return { ok: false, error: lastError.message || 'Unable to read last System ID.' };

  const lastIdRaw = lastRows?.[0]?.sys_id;
  const lastIdNum = Number(lastIdRaw);
  const baseSystemId = 1000000001;
  const nextSystemId = Number.isFinite(lastIdNum) && lastIdNum >= baseSystemId ? lastIdNum + 1 : baseSystemId;

  const configurationPayload = buildConfigurationPayload(nextSystemId, {
    objectLabel: labelSafe,
    objectApiName: apiSafe,
    objectDescription: descSafe,
    fieldSpecLines: lines,
    fieldRequiredFlags: requiredFlags,
    fieldAttrsByLabel: fieldAttrsByLabel ?? null,
  });

  const payload = {
    sys_id: nextSystemId,
    entity_id: ENTITY_ID,
    sys_status: 1,
    sys_created_ts: nowIso,
    sys_updated_ts: nowIso,
    sys_created_by_id: USER_ID,
    sys_updated_by_id: USER_ID,
    dobj_name_display: labelSafe,
    dobj_name_system: apiSafe,
    dobj_description: descSafe || null,
    dobj_type: 'custom',
    object_type: 'list',
    dobj_status: 1,
    isCustom: 1,
    dobj_configuration: configurationPayload,
  };

  const { data: insertedRows, error } = await supabase
    .from('dobj')
    .insert(payload)
    .select('sys_id,dobj_id')
    .limit(1);

  if (error) return { ok: false, error: error.message || 'Failed to save object.' };

  const inserted = insertedRows?.[0] as { sys_id?: number; dobj_id?: number | null } | undefined;
  const scopeDobjId = Number(inserted?.dobj_id ?? inserted?.sys_id ?? nextSystemId);
  const pcResult = await ensureObjectLoaderPlatformConfigRow(ENTITY_ID, scopeDobjId);
  if (pcResult.error) {
    console.warn('[Ziva create object] platform_config seed failed:', pcResult.error);
  }

  return { ok: true, sysId: Number(inserted?.sys_id ?? nextSystemId) };
}

const LABEL_FILLER_WORDS = new Set([
  'i',
  'we',
  'you',
  'me',
  'my',
  'our',
  'the',
  'a',
  'an',
  'to',
  'for',
  'of',
  'in',
  'on',
  'at',
  'is',
  'it',
  'its',
  'via',
  'with',
  'and',
  'or',
  'wanted',
  'want',
  'need',
  'would',
  'like',
  'build',
  'create',
  'make',
  'object',
  'objects',
  'related',
  'about',
  'tracking',
  'track',
  'measure',
  'measuring',
  'using',
  'use',
]);

export function suggestObjectLabelFromTopic(topic: string): string {
  let t = String(topic ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const lower = t.toLowerCase();
  for (const prefix of ['related to', 'about', 'object for', 'for ', 'build an object', 'create an object for', "it's for", 'its for']) {
    if (lower.startsWith(prefix)) {
      t = t.slice(prefix.length).trim();
      break;
    }
  }
  t = t.replace(/^[\s,.-]+|[\s,.-]+$/g, '');
  if (!t) return 'Custom Object';
  const words = t
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !LABEL_FILLER_WORDS.has(w.toLowerCase()));
  const core = (words.length ? words : t.split(/\s+/)).slice(0, 5);
  const titled = core.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return titled.length > 80 ? `${titled.slice(0, 77)}…` : titled || 'Custom Object';
}
