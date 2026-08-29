import { supabase } from '../../../utils/supabase';
import { resolveObjectLoaderCrudDefaults } from '../../../components/ui/tabletemplates/objectLoaderRecordModals';
import { objectLoaderCrudBase } from '../../objects/ObjectRelated/dobjTableShared';
import { isPlatformSystemApi } from '../../objects/FieldRelated/platformSystemFields';

const LIST_LIMITS = [5, 10, 15, 20];

export function getObjectListLimitOptions() {
  return [...LIST_LIMITS];
}

function displayNameFromRow(row) {
  const display = String(row?.dobj_name_display ?? '').trim();
  const system = String(row?.dobj_name_system ?? '').trim();
  return display || system || `Object ${row?.sys_id ?? ''}`.trim();
}

function applyActiveFilter(q, listOpts) {
  if (listOpts.queryActiveOnly) {
    return q.eq(listOpts.sysStatusColumn, listOpts.sysStatusActiveValue);
  }
  return q;
}

function mapRows(data) {
  return (data ?? []).map((row) => ({
    sysId: row?.sys_id ?? null,
    displayName: displayNameFromRow(row),
    systemName: String(row?.dobj_name_system ?? '').trim() || null,
    raw: row,
  }));
}

/**
 * Load objects from `dobj` (select *), ordered by display name, capped by limit.
 */
export async function fetchDobjObjectListForChat(limit = 10, query = '') {
  const n = Math.min(60, Math.max(1, Number(limit) || 10));
  const listOpts = resolveObjectLoaderCrudDefaults(objectLoaderCrudBase);
  const qTrim = String(query ?? '').trim();
  let q = supabase.from('dobj').select('*').order('dobj_name_display', { ascending: true }).limit(n);
  q = applyActiveFilter(q, listOpts);
  if (qTrim.length >= 2) {
    const esc = qTrim.replace(/[%_]/g, '');
    q = q.or(`dobj_name_display.ilike.%${esc}%,dobj_name_system.ilike.%${esc}%`);
  }
  const { data, error } = await q;
  if (error) {
    return { rows: [], error: error.message || 'Failed to load objects.' };
  }
  return { rows: mapRows(data), error: null };
}

export function formatObjectListChatMarkdown(rows, limitRequested) {
  const cap = Number(limitRequested) || rows.length;
  if (!rows.length) {
    return `No objects found in the registry (top ${cap}).`;
  }
  const lines = rows.map((r, i) => {
    const name = r.displayName;
    const api = r.systemName ? ` — \`${r.systemName}\`` : '';
    return `${i + 1}. **${name}**${api}`;
  });
  return `**Object list** (top ${rows.length} by name):\n\n${lines.join('\n')}`;
}

function safeParseConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

/** User-defined fields from dobj_configuration for picker / modify-field flows. */
export async function fetchObjectFieldsForChat(sysId) {
  const id = sysId;
  if (id == null) return { fields: [], error: 'Missing object id.' };
  const { data, error } = await supabase
    .from('dobj')
    .select('dobj_configuration,dobj_name_display')
    .eq('sys_id', id)
    .maybeSingle();
  if (error) return { fields: [], error: error.message || 'Failed to load fields.' };
  const cfg = safeParseConfig(data?.dobj_configuration);
  const raw = Array.isArray(cfg.fields) ? cfg.fields : [];
  const fields = raw
    .map((row, idx) => {
      const apiName = String(row?.apiName ?? row?.api_name ?? '').trim();
      const label = String(row?.label ?? row?.name ?? apiName).trim() || apiName;
      const dataType = String(row?.dataType ?? row?.type ?? 'Text').trim();
      const idNum = Number(row?.id);
      return {
        id: Number.isFinite(idNum) ? idNum : idx + 1,
        label,
        apiName,
        dataType,
      };
    })
    .filter((f) => f.apiName && !isPlatformSystemApi(f.apiName));
  return { fields, error: null };
}
