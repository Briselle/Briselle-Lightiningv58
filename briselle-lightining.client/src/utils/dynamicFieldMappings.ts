/**
 * Build column labels and read-only sets from `select *` (or any row shape).
 * Known keys get friendly labels; unknown keys get title-cased names.
 */

export function collectRowKeysFromRows(rows: Record<string, unknown>[]): string[] {
    const set = new Set<string>();
    for (const row of rows) {
        for (const k of Object.keys(row)) {
            set.add(k);
        }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

export function humanizeFieldKey(key: string): string {
    if (key === 'isCustom') return 'Custom';
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Merge API keys with optional label overrides (overrides win). */
export function mergeFieldMappingsFromRows(
    rows: Record<string, unknown>[],
    labelOverrides: Record<string, string>,
): Record<string, string> {
    const keys = collectRowKeysFromRows(rows);
    const out: Record<string, string> = { ...labelOverrides };
    for (const k of keys) {
        if (out[k] == null || out[k] === '') {
            out[k] = humanizeFieldKey(k);
        }
    }
    return out;
}

/** System / entity-scope / generated-style columns: read-only in object CRUD when present. */
export function isIntrinsicReadOnlyColumnKey(key: string): boolean {
    if (key === 'entity_id' || key === 'dobj_id' || key === 'sys_id') return true;
    if (key.startsWith('sys_')) return true;
    if (
        key === 'dobj_created_at' ||
        key === 'dobj_updated_at' ||
        key === 'dobj_created_by_id' ||
        key === 'dobj_modified_by_id'
    ) {
        return true;
    }
    return false;
}

export function mergeReadOnlyKeysFromRows(rows: Record<string, unknown>[], base: string[]): string[] {
    const fromData = collectRowKeysFromRows(rows).filter(isIntrinsicReadOnlyColumnKey);
    return [...new Set([...base, ...fromData])];
}
