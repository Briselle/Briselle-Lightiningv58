/**
 * Built-in record columns every object stores in loader/runtime.
 * Api names are fixed; labels match UI convention (bracket text in product spec).
 */
import type { ObjectFieldDataType } from './objectDefinitionSchema';
import { isNotionNestPageFieldApi, NOTION_NEST_PAGE_FIELD_API } from './notionNestSystemField';

/** Primary display name when the slot is Text. */
export const RECORD_NAME_FIELD_API = 'sys_record_name';

/** Generated display id when the slot is Auto Number. */
export const RECORD_ID_FIELD_API = 'sys_record_id';

export const RECORD_DISPLAY_FIELD_APIS = [RECORD_NAME_FIELD_API, RECORD_ID_FIELD_API] as const;

const RECORD_DISPLAY_SET = new Set<string>(RECORD_DISPLAY_FIELD_APIS);

/** Text → sys_record_name; Auto Number → sys_record_id */
export function recordDisplayFieldApiForDataType(dt: ObjectFieldDataType): typeof RECORD_NAME_FIELD_API | typeof RECORD_ID_FIELD_API {
    return dt === 'autoNumber' ? RECORD_ID_FIELD_API : RECORD_NAME_FIELD_API;
}

export const PLATFORM_SYSTEM_FIXED_APIS = [
    'sys_id',
    'sys_status',
    'sys_created_ts',
    'sys_modified_ts',
    'sys_created_by_id',
    'sys_modified_by_id',
] as const;

export const PLATFORM_SYSTEM_API_SET = new Set<string>([
    ...PLATFORM_SYSTEM_FIXED_APIS,
    RECORD_NAME_FIELD_API,
    RECORD_ID_FIELD_API,
]);

export function isPlatformSystemApi(apiName: string): boolean {
    return PLATFORM_SYSTEM_API_SET.has(String(apiName ?? '').trim().toLowerCase());
}

/** Fixed columns (not the configurable record display slot). */
export function isFixedPlatformSystemApi(apiName: string): boolean {
    const a = String(apiName ?? '').trim().toLowerCase();
    return PLATFORM_SYSTEM_FIXED_APIS.some((x) => x === a);
}

/**
 * Keys never offered in “Configure Inline Edit Columns” (schema + `dobj` / `ddata` naming variants).
 * Does not include {@link RECORD_NAME_FIELD_API} / {@link RECORD_ID_FIELD_API} — those remain user-facing slots.
 */
const INLINE_EDIT_EXCLUDED_EXTRA = [
    'sys_updated_ts',
    'sys_updated_by_id',
    'ddata_id',
    'entity_id',
    'dobj_id',
    'ddata_created_at',
    'ddata_updated_at',
    'ddata_created_by_id',
    'ddata_modified_by_id',
] as const;

const INLINE_EDIT_EXCLUDED_SYSTEM_SET = new Set<string>([
    ...PLATFORM_SYSTEM_FIXED_APIS.map((x) => x.toLowerCase()),
    ...INLINE_EDIT_EXCLUDED_EXTRA.map((x) => x.toLowerCase()),
]);

export function isExcludedFromInlineEditSystemPicker(apiName: string): boolean {
    if (isNotionNestPageFieldApi(apiName)) return true;
    return INLINE_EDIT_EXCLUDED_SYSTEM_SET.has(String(apiName ?? '').trim().toLowerCase());
}

/** Record display slot: either name (text) or id (auto-number); editable type/attrs, non-removable. */
export function isRecordDisplayFieldApi(apiName: string): boolean {
    return RECORD_DISPLAY_SET.has(String(apiName ?? '').trim().toLowerCase());
}

/** @deprecated Use isRecordDisplayFieldApi — kept for short-term compatibility. */
export function isRecordNameFieldApi(apiName: string): boolean {
    return isRecordDisplayFieldApi(apiName);
}

export function platformFieldSortIndex(apiName: string): number {
    const a = String(apiName ?? '').trim().toLowerCase();
    const fi = PLATFORM_SYSTEM_FIXED_APIS.findIndex((x) => x === a);
    if (fi >= 0) return fi;
    if (RECORD_DISPLAY_SET.has(a)) return PLATFORM_SYSTEM_FIXED_APIS.length;
    if (isNotionNestPageFieldApi(a)) return PLATFORM_SYSTEM_FIXED_APIS.length + 1;
    return 1000;
}

export { NOTION_NEST_PAGE_FIELD_API };

/**
 * Six non–record-display platform rows persisted with `dobj_configuration.fields`.
 */
export function buildFixedPlatformSystemFieldRows(): Array<Record<string, unknown>> {
    return [
        {
            version: 1,
            dataType: 'number',
            label: 'ID',
            apiName: 'sys_id',
            description: 'Unique record identifier.',
            required: 0,
            isdeleted: 0,
            isactive: 1,
            isCustom: 0,
            attributes: {
                indexed: true,
                systemManaged: true,
                includeInTableView: true,
                includeInInlineEdit: false,
            },
        },
        {
            version: 1,
            dataType: 'text',
            label: 'Status',
            apiName: 'sys_status',
            description: 'Record lifecycle status.',
            required: 0,
            isdeleted: 0,
            isactive: 1,
            isCustom: 0,
            attributes: {
                indexed: false,
                systemManaged: true,
                includeInTableView: true,
                includeInInlineEdit: false,
            },
        },
        {
            version: 1,
            dataType: 'dateTime',
            label: 'Created On',
            apiName: 'sys_created_ts',
            description: 'Timestamp when the record was created.',
            required: 0,
            isdeleted: 0,
            isactive: 1,
            isCustom: 0,
            attributes: {
                indexed: false,
                systemManaged: true,
                includeInTableView: true,
                includeInInlineEdit: false,
            },
        },
        {
            version: 1,
            dataType: 'dateTime',
            label: 'Modified On',
            apiName: 'sys_modified_ts',
            description: 'Timestamp when the record was last modified.',
            required: 0,
            isdeleted: 0,
            isactive: 1,
            isCustom: 0,
            attributes: {
                indexed: false,
                systemManaged: true,
                includeInTableView: true,
                includeInInlineEdit: false,
            },
        },
        {
            version: 1,
            dataType: 'number',
            label: 'Created By',
            apiName: 'sys_created_by_id',
            description: 'User id that created the record.',
            required: 0,
            isdeleted: 0,
            isactive: 1,
            isCustom: 0,
            attributes: {
                indexed: false,
                systemManaged: true,
                includeInTableView: true,
                includeInInlineEdit: false,
            },
        },
        {
            version: 1,
            dataType: 'number',
            label: 'Modified By',
            apiName: 'sys_modified_by_id',
            description: 'User id that last modified the record.',
            required: 0,
            isdeleted: 0,
            isactive: 1,
            isCustom: 0,
            attributes: {
                indexed: false,
                systemManaged: true,
                includeInTableView: true,
                includeInInlineEdit: false,
            },
        },
    ];
}
