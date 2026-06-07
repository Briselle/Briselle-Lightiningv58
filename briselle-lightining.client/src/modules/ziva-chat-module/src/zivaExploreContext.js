/**
 * Enriches Explore-mode orchestration with live object registry + field summaries.
 */
import { fetchDobjObjectListForChat, fetchObjectFieldsForChat } from './zivaFetchObjectList.js';

/**
 * @returns {Promise<{ objectRegistry: object[], objectSnapshots: object[], error: string|null }>}
 */
export async function buildExploreContextForSession(limit = 15, detailObjectCount = 5) {
  const cap = Math.min(30, Math.max(1, Number(limit) || 15));
  const detailCap = Math.min(8, Math.max(1, Number(detailObjectCount) || 5));

  const { rows, error } = await fetchDobjObjectListForChat(cap);
  if (error) {
    return { objectRegistry: [], objectSnapshots: [], error };
  }

  const objectRegistry = rows.map((r) => ({
    sysId: r.sysId,
    displayName: r.displayName,
    systemName: r.systemName,
  }));

  const objectSnapshots = [];
  for (const row of rows.slice(0, detailCap)) {
    if (row.sysId == null) continue;
    const { fields, error: fieldErr } = await fetchObjectFieldsForChat(row.sysId);
    objectSnapshots.push({
      sysId: row.sysId,
      displayName: row.displayName,
      systemName: row.systemName,
      fieldCount: fields.length,
      fields: fields.slice(0, 12).map((f) => ({
        label: f.label,
        apiName: f.apiName,
        dataType: f.dataType,
      })),
      fieldsError: fieldErr || null,
    });
  }

  return { objectRegistry, objectSnapshots, error: null };
}

export function formatExploreContextMarkdown(ctx) {
  if (!ctx?.objectRegistry?.length) {
    return '_No objects loaded from registry._';
  }
  const lines = ['**Registry (sample):**'];
  for (const o of ctx.objectRegistry.slice(0, 15)) {
    lines.push(`- ${o.displayName}${o.systemName ? ` (\`${o.systemName}\`)` : ''}`);
  }
  if (ctx.objectSnapshots?.length) {
    lines.push('', '**Field snapshots:**');
    for (const snap of ctx.objectSnapshots) {
      const fieldList = (snap.fields || []).map((f) => f.label).join(', ');
      lines.push(`- **${snap.displayName}**: ${snap.fieldCount} fields${fieldList ? ` — ${fieldList}` : ''}`);
    }
  }
  return lines.join('\n');
}
