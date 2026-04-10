import type { ObjectLoaderCrudOptions } from "../../components/ui/tabletemplates/objectLoaderRecordModals";
import { mergeFieldMappingsFromRows, mergeReadOnlyKeysFromRows } from "../../utils/dynamicFieldMappings";

/** Friendly labels for known keys; any other column from `select *` is added automatically. */
export const DOBJ_FIELD_LABEL_OVERRIDES: Record<string, string> = {
    sys_id: "System record id",
    sys_status: "System status",
    sys_created_ts: "Created On (System Timestamp)",
    sys_updated_ts: "Modified On (System Timestamp)",
    sys_created_by_id: "Created By (System Timestamp)",
    sys_updated_by_id: "Updated By (System Timestamp)",
    entity_id: "Entity id",
    dobj_id: "Entity id (mirror of system id)",
    dobj_name_display: "Name",
    dobj_name_system: "API Name",
    dobj_description: "Description",
    dobj_type: "Type",
    dobj_status: "Status",
    isCustom: "Custom",
    dobj_configuration: "Configuration",
};

/** Legacy entity mirror audit names; not used on rebuilt `dobj` — drop from list UI even if present on rows. */
export const DOBJ_OMITTED_ENTITY_MIRROR_KEYS: readonly string[] = [
    "dobj_created_at",
    "dobj_updated_at",
    "dobj_created_by_id",
    "dobj_modified_by_id",
];

export const objectLoaderCrudBase: Pick<
    ObjectLoaderCrudOptions,
    "sourceTable" | "idColumn" | "sysStatusActiveValue" | "sysStatusInactiveValue"
> = {
    sourceTable: "dobj",
    idColumn: "sys_id",
    sysStatusActiveValue: 1,
    sysStatusInactiveValue: 0,
};

/** Always read-only in forms when present (merged with keys detected on fetched rows). */
export const DOBJ_READ_ONLY_BASE: string[] = [
    "entity_id",
    "dobj_id",
    "sys_status",
    "sys_created_ts",
    "sys_updated_ts",
    "sys_created_by_id",
    "sys_updated_by_id",
];

/** Normalize row keys to match fieldMappings (handles Supabase returning different casing or names). Preserves all original keys. */
export function normalizeRowsToFieldMappings<T extends Record<string, unknown>>(
    rows: T[],
    mappingKeys: string[],
): Record<string, unknown>[] {
    if (!rows?.length) return [];
    return rows.map((row) => {
        const rowKeysLower = Object.fromEntries(Object.keys(row).map((k) => [k.toLowerCase(), k]));
        const out: Record<string, unknown> = { ...row };
        for (const key of mappingKeys) {
            if (row[key] !== undefined) continue;
            const lowerKey = rowKeysLower[key.toLowerCase()];
            if (lowerKey != null) out[key] = row[lowerKey];
        }
        return out;
    });
}

export function buildDobjFieldMappings(rows: Record<string, unknown>[]) {
    const merged = mergeFieldMappingsFromRows(rows, DOBJ_FIELD_LABEL_OVERRIDES);
    for (const k of DOBJ_OMITTED_ENTITY_MIRROR_KEYS) {
        delete merged[k];
    }
    return merged;
}

export function buildDobjObjectLoaderCrud(rows: Record<string, unknown>[]): ObjectLoaderCrudOptions {
    return {
        ...objectLoaderCrudBase,
        readOnlyKeys: mergeReadOnlyKeysFromRows(rows, DOBJ_READ_ONLY_BASE),
    };
}
