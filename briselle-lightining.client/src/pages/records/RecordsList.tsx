import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    createNotionNestRecord,
    notionNestPagePath,
} from '../../modules/notion-nest';
import { applyNotionNestFieldPolicy } from '../../modules/objects/FieldRelated/notionNestSystemField';
import {
    isNotionNestObjectType,
    parsePlatformObjectType,
    type PlatformObjectType,
} from '../../modules/objects/shared/objectTypes';
import ConfigurableListTemplate, { type TableConfig } from '../../components/ui/tabletemplates/ConfigurableListTemplate';
import { type ObjectLoaderCrudOptions } from '../../modules/records/loader/objectLoaderRecordModals';
import { supabase } from '../../utils/supabase';
import { validateEmailValue, validateUrlValue } from '../../modules/records/loader/objectLoaderDataValidationRules';
import { OBJECT_COUNTER_CONFIG_TYPE } from '../../components/ui/tabletemplates/utils/configService';
import { defaultConfig as objectsDefaultTableConfig } from '../../modules/objects/ObjectRelated/templist';
import {
    isExcludedFromInlineEditSystemPicker,
    isRecordDisplayFieldApi,
    RECORD_ID_FIELD_API,
    RECORD_NAME_FIELD_API,
} from '../../modules/objects/FieldRelated/platformSystemFields';

type DbObjectSchemaField = {
    label?: unknown;
    apiName?: unknown;
    dataType?: unknown;
    required?: unknown;
    attributes?: unknown;
};

type DbObjectRow = {
    sys_id: number;
    dobj_id?: number | null;
    dobj_name_display?: string | null;
    dobj_name_system?: string | null;
    object_type?: string | null;
    dobj_configuration?: unknown;
};

type DdataRow = {
    ddata_id: number;
    dobj_id: number;
    entity_id: number;
    ddata_values: Record<string, unknown> | null;
};
type HierarchyCreateMode = 'root' | 'child';

function safeParseConfig(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw) as unknown;
            return typeof parsed === 'object' && parsed != null ? (parsed as Record<string, unknown>) : {};
        } catch {
            return {};
        }
    }
    return typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function parseObjectTypeFromRow(data: DbObjectRow, config: Record<string, unknown>): PlatformObjectType {
    return parsePlatformObjectType(config, data.object_type ?? null);
}

function generateHierarchyNodeId(): string {
    const token =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    return `NODE-${token}`;
}

function toSchemaFieldMappings(config: Record<string, unknown>): Record<string, string> {
    const raw = Array.isArray(config.fields) ? (config.fields as DbObjectSchemaField[]) : [];
    const mappings: Record<string, string> = {};
    for (const field of raw) {
        const key = String(field.apiName ?? '').trim();
        const label = String(field.label ?? '').trim();
        if (!key) continue;
        mappings[key] = label || key;
    }
    return mappings;
}

function toSchemaPreferredColumns(config: Record<string, unknown>): string[] {
    const raw = Array.isArray(config.fields) ? (config.fields as DbObjectSchemaField[]) : [];
    const preferred: string[] = [];
    const toBool = (value: unknown): boolean => {
        if (value === true || value === 1) return true;
        if (typeof value === 'string') {
            const v = value.trim().toLowerCase();
            return v === 'true' || v === '1' || v === 'yes' || v === 'y' || v === 'on';
        }
        return false;
    };
    for (const field of raw) {
        const key = String(field.apiName ?? '').trim();
        if (!key) continue;
        const attrs = getFieldAttributes(field);
        const preferredRaw = attrs.preferredInView ?? attrs.preferred_in_view ?? attrs.preferred;
        if (toBool(preferredRaw)) {
            preferred.push(key);
        }
    }
    return preferred;
}

function buildRecordsTemplateConfig(): TableConfig {
    const base = (() => {
        try {
            return structuredClone(objectsDefaultTableConfig);
        } catch {
            return JSON.parse(JSON.stringify(objectsDefaultTableConfig)) as TableConfig;
        }
    })();
    return {
        ...base,
        enableNewButton: true,
        newButtonType: 'button',
        enableImport: false,
        enableExport: false,
        enableRowActions: true,
        enableBulkActions: false,
        enableInlineEdit: [],
        customRowBadgeColumn: '',
    };
}

function toSchemaFields(config: Record<string, unknown>): DbObjectSchemaField[] {
    return Array.isArray(config.fields) ? (config.fields as DbObjectSchemaField[]) : [];
}

function getFieldApiName(field: DbObjectSchemaField): string {
    return String(field.apiName ?? '').trim();
}

function getFieldDefaultString(field: DbObjectSchemaField): string {
    const attrs = typeof field.attributes === 'object' && field.attributes != null ? (field.attributes as Record<string, unknown>) : {};
    const raw = attrs.defaultValue;
    return raw == null ? '' : String(raw);
}

function getFieldAttributes(field: DbObjectSchemaField): Record<string, unknown> {
    return typeof field.attributes === 'object' && field.attributes != null ? (field.attributes as Record<string, unknown>) : {};
}

/** Legacy object-registry keys that must not drive record-grid inline edit. */
const LEGACY_DD_INLINE_KEYS = new Set(['dobj_name_display', 'dobj_description', 'dobj_name_system', 'dobj_status']);

/** Inline-edit picker: all schema columns except system/audit keys and schema `systemManaged` fields (record name/id slot still allowed). */
function buildRecordsInlineEditCandidateKeys(fields: DbObjectSchemaField[], fieldMappings: Record<string, string>): string[] {
    const systemManagedKeys = new Set<string>();
    for (const field of fields) {
        const key = getFieldApiName(field);
        if (!key) continue;
        const attrs = getFieldAttributes(field);
        const sm = attrs.systemManaged === true || attrs.systemManaged === 1;
        if (sm && !isRecordDisplayFieldApi(key)) systemManagedKeys.add(key);
    }
    return Object.keys(fieldMappings).filter((k) => {
        if (isExcludedFromInlineEditSystemPicker(k)) return false;
        if (systemManagedKeys.has(k)) return false;
        return true;
    });
}

function recordsDefaultInlineEditKeys(fields: DbObjectSchemaField[], fieldMappings: Record<string, string>): string[] {
    const nameField = fields.find((f) => getFieldApiName(f) === 'sys_record_name');
    if (!nameField || String(nameField.dataType ?? '') !== 'text') return [];
    if (!('sys_record_name' in fieldMappings)) return [];
    return ['sys_record_name'];
}

function normalizeRecordsEnableInlineEdit(
    raw: string[] | undefined,
    candidates: readonly string[],
    defaultKeys: readonly string[],
): string[] {
    const candidateSet = new Set(candidates);
    const defaultFiltered = defaultKeys.filter((k) => candidateSet.has(k));
    const arr = Array.isArray(raw) ? raw : [];
    const filtered = arr.filter((k) => candidateSet.has(k) && !LEGACY_DD_INLINE_KEYS.has(k));
    if (filtered.length > 0) return [...new Set(filtered)];
    const onlyJunk = arr.length === 0 || arr.every((k) => !candidateSet.has(k) || LEGACY_DD_INLINE_KEYS.has(k));
    if (onlyJunk) return [...defaultFiltered];
    return [];
}

function isRequiredField(field: DbObjectSchemaField): boolean {
    return field.required === 1 || field.required === true;
}

function isAutoNumberField(field: DbObjectSchemaField): boolean {
    return String(field.dataType ?? '') === 'autoNumber';
}

function isPicklistField(field: DbObjectSchemaField): boolean {
    return String(field.dataType ?? '') === 'picklist';
}

function isPicklistMultiField(field: DbObjectSchemaField): boolean {
    return String(field.dataType ?? '') === 'picklistMulti';
}

function getPicklistOptions(field: DbObjectSchemaField): string[] {
    const attrs = getFieldAttributes(field);
    const raw = attrs.picklistValues;
    let options: string[] = [];
    if (Array.isArray(raw)) {
        options = raw.map((v) => String(v).trim()).filter(Boolean);
    } else if (typeof raw === 'string') {
        options = raw
            .split(/\r?\n|,/)
            .map((v) => v.trim())
            .filter(Boolean);
    }
    const fallbackDefault = String(attrs.defaultValue ?? '').trim();
    if (options.length === 0 && fallbackDefault) options = [fallbackDefault];
    if (attrs.picklistDisplayAlphabetically === true) {
        options = [...options].sort((a, b) => a.localeCompare(b));
    }
    return [...new Set(options)];
}

function splitPhoneValue(raw: string): { code: string; number: string } {
    const value = String(raw ?? '').trim();
    if (!value) return { code: '', number: '' };
    const [left, ...rest] = value.split('-');
    if (rest.length === 0) {
        return left.startsWith('+') ? { code: left, number: '' } : { code: '', number: left };
    }
    return { code: left, number: rest.join('-') };
}

function composePhoneValue(code: string, number: string): string {
    const c = String(code ?? '').trim();
    const n = String(number ?? '').trim();
    if (!c && !n) return '';
    if (!c) return n;
    if (!n) return c;
    return `${c}-${n}`;
}

function validatePhoneValue(value: string): string | null {
    if (!value) return null;
    const phoneRegex = /^\+\d{1,4}-[0-9][0-9\s-]{4,19}$/;
    if (!phoneRegex.test(value)) return 'Enter phone as +<countrycode>-<number> (example: +91-289889832).';
    return null;
}

/** Next value shown in UI — reads `platform_config` ObjectCounter row only (does not consume a number). */
async function peekNextAutoNumberFromPlatformConfig(
    entityId: number,
    dobjId: number,
    field: DbObjectSchemaField,
): Promise<{ value: string; error: string | null }> {
    const key = getFieldApiName(field);
    const attrs = getFieldAttributes(field);
    const prefix = String(attrs.displayFormat ?? '').trim();
    const startingNumberRaw = Number(attrs.startingNumber ?? 1);
    const startingNumber = Number.isFinite(startingNumberRaw) && startingNumberRaw > 0 ? startingNumberRaw : 1;
    if (!key) return { value: `${prefix}${startingNumber}`, error: null };

    const { data, error } = await supabase
        .from('platform_config')
        .select('config_json')
        .eq('entity_id', entityId)
        .eq('dobj_id', dobjId)
        .eq('config_type', OBJECT_COUNTER_CONFIG_TYPE)
        .maybeSingle();

    if (error) return { value: `${prefix}${startingNumber}`, error: error.message };

    const root =
        data?.config_json != null && typeof data.config_json === 'object'
            ? (data.config_json as Record<string, unknown>)
            : {};
    const countersRaw = root.counters;
    const counters =
        countersRaw != null && typeof countersRaw === 'object' ? (countersRaw as Record<string, unknown>) : {};
    const rawLast = counters[key];
    let lastAllocated = startingNumber - 1;
    if (rawLast != null && rawLast !== '') {
        if (typeof rawLast === 'number' && Number.isFinite(rawLast)) {
            lastAllocated = rawLast;
        } else {
            const n = Number(rawLast);
            if (Number.isFinite(n)) lastAllocated = n;
        }
    }
    const nextNumeric = Math.max(startingNumber, lastAllocated + 1);
    return { value: `${prefix}${nextNumeric}`, error: null };
}

async function allocateAutoNumberFromLedger(
    entityId: number,
    dobjId: number,
    field: DbObjectSchemaField,
): Promise<{ value: string | null; error: string | null }> {
    const key = getFieldApiName(field);
    if (!key) return { value: null, error: 'Invalid auto-number field key.' };
    const attrs = getFieldAttributes(field);
    const prefix = String(attrs.displayFormat ?? '').trim();
    const startingNumberRaw = Number(attrs.startingNumber ?? 1);
    const startingNumber = Number.isFinite(startingNumberRaw) && startingNumberRaw > 0 ? startingNumberRaw : 1;
    const { data, error } = await supabase.rpc('next_object_autonumber', {
        p_entity_id: entityId,
        p_dobj_id: dobjId,
        p_field_key: key,
        p_starting_number: startingNumber,
    });
    if (error) return { value: null, error: error.message || 'Failed to allocate auto number.' };
    const n = Number(data);
    if (!Number.isFinite(n) || n < startingNumber) {
        return { value: null, error: 'Auto-number allocator returned an invalid value.' };
    }
    return { value: `${prefix}${n}`, error: null };
}

const FIXED_ENTITY_ID = 1000000000;
const FIXED_USER_ID = 1212;

export default function RecordsList() {
    const { objectId } = useParams<{ objectId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [objectLabel, setObjectLabel] = useState('Object');
    const [resolvedDobjId, setResolvedDobjId] = useState<number | null>(null);
    const [schemaFields, setSchemaFields] = useState<DbObjectSchemaField[]>([]);
    const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
    const [preferredColumns, setPreferredColumns] = useState<string[]>([]);
    const [config, setConfig] = useState<TableConfig>(() => buildRecordsTemplateConfig());
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createValues, setCreateValues] = useState<Record<string, string>>({});
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [authBootstrapTried, setAuthBootstrapTried] = useState(false);
    /** From `dobj_configuration.objectType`; default list. */
    const [objectType, setObjectType] = useState<PlatformObjectType>('list');
    const [notionPageTitle, setNotionPageTitle] = useState('');
    /** After counter allocated + insert failed on a transaction object — freeze Save / Retry / edits. */
    const [createSubmissionFrozen, setCreateSubmissionFrozen] = useState(false);
    const [hierarchyMode, setHierarchyMode] = useState<HierarchyCreateMode>('root');
    const [hierarchyParentId, setHierarchyParentId] = useState('');
    const fieldTypeByKey = useMemo<Record<string, string>>(
        () =>
            schemaFields.reduce<Record<string, string>>((acc, field) => {
                const key = getFieldApiName(field);
                if (key) acc[key] = String(field.dataType ?? '');
                return acc;
            }, {}),
        [schemaFields],
    );

    const fieldLinkClickBehaviorByKey = useMemo<Record<string, 'new_page' | 'same_page'>>(() => {
        const out: Record<string, 'new_page' | 'same_page'> = {};
        for (const field of schemaFields) {
            const key = getFieldApiName(field);
            if (!key) continue;
            const dt = String(field.dataType ?? '');
            if (dt !== 'url' && dt !== 'email') continue;
            const raw = getFieldAttributes(field).linkClickBehavior;
            out[key] = raw === 'same_page' ? 'same_page' : 'new_page';
        }
        return out;
    }, [schemaFields]);

    const recordsPlatformScope = useMemo(
        () =>
            resolvedDobjId == null
                ? null
                : { entityId: FIXED_ENTITY_ID, dobjId: resolvedDobjId },
        [resolvedDobjId],
    );

    const inlineEditCandidateKeys = useMemo(
        () => buildRecordsInlineEditCandidateKeys(schemaFields, fieldMappings),
        [schemaFields, fieldMappings],
    );

    const recordsDefaultInlineKeys = useMemo(
        () => recordsDefaultInlineEditKeys(schemaFields, fieldMappings),
        [schemaFields, fieldMappings],
    );

    const sanitizeRecordsTableConfig = useCallback(
        (next: TableConfig): TableConfig => {
            const ne = normalizeRecordsEnableInlineEdit(
                next.enableInlineEdit,
                inlineEditCandidateKeys,
                recordsDefaultInlineKeys,
            );
            const prevE = next.enableInlineEdit ?? [];
            if (prevE.length === ne.length && prevE.every((k, i) => k === ne[i])) return next;
            return { ...next, enableInlineEdit: ne };
        },
        [inlineEditCandidateKeys, recordsDefaultInlineKeys],
    );

    useEffect(() => {
        if (resolvedDobjId == null) return;
        setConfig((prev) => sanitizeRecordsTableConfig(prev));
    }, [resolvedDobjId, sanitizeRecordsTableConfig]);

    const notionNestBadgeColumn = useMemo(() => {
        if (RECORD_NAME_FIELD_API in fieldMappings) return RECORD_NAME_FIELD_API;
        if (RECORD_ID_FIELD_API in fieldMappings) return RECORD_ID_FIELD_API;
        if ('ddata_id' in fieldMappings) return 'ddata_id';
        const preferred = preferredColumns.find((k) => k in fieldMappings);
        if (preferred) return preferred;
        return Object.keys(fieldMappings)[0] ?? '';
    }, [fieldMappings, preferredColumns]);

    useEffect(() => {
        if (!isNotionNestObjectType(objectType)) return;
        setConfig((prev) =>
            sanitizeRecordsTableConfig({
                ...prev,
                customRowBadgeColumn: notionNestBadgeColumn,
                enableInlineEdit: [],
            }),
        );
    }, [objectType, notionNestBadgeColumn, sanitizeRecordsTableConfig]);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            setError(null);
            const numericObjectId = Number(objectId ?? 0);
            let query = supabase
                .from('dobj')
                .select('sys_id,dobj_id,dobj_name_display,dobj_name_system,object_type,dobj_configuration')
                .limit(1);
            if (Number.isFinite(numericObjectId) && numericObjectId > 0) {
                query = query.or(`sys_id.eq.${numericObjectId},dobj_id.eq.${numericObjectId}`);
            } else if (objectId) {
                query = query.or(`dobj_name_system.eq.${objectId},dobj_name_display.eq.${objectId}`);
            }
            const { data, error: fetchError } = await query.maybeSingle<DbObjectRow>();
            if (fetchError) {
                setError(fetchError.message || 'Unable to load object schema.');
                setFieldMappings({});
                setLoading(false);
                return;
            }
            if (!data) {
                setError(`Object not found for id: ${objectId ?? 'unknown'}`);
                setFieldMappings({});
                setLoading(false);
                return;
            }
            const schemaRaw = safeParseConfig(data.dobj_configuration);
            const resolvedType = parseObjectTypeFromRow(data, schemaRaw);
            const schema = applyNotionNestFieldPolicy(schemaRaw, resolvedType);
            const mappings = toSchemaFieldMappings(schema);
            const preferred = toSchemaPreferredColumns(schema);
            const fields = toSchemaFields(schema);
            setObjectType(resolvedType);
            setObjectLabel(String(data.dobj_name_display ?? data.dobj_name_system ?? 'Object'));
            setResolvedDobjId(Number(data.dobj_id ?? data.sys_id));
            setSchemaFields(fields);
            setFieldMappings(mappings);
            setPreferredColumns(preferred);
            setLoading(false);
        };
        void run();
    }, [objectId]);

    useEffect(() => {
        if (resolvedDobjId == null) return;
        const run = async () => {
            const { data, error: fetchError } = await supabase
                .from('ddata')
                .select('ddata_id,dobj_id,entity_id,ddata_values')
                .eq('dobj_id', resolvedDobjId)
                .eq('entity_id', FIXED_ENTITY_ID)
                .eq('ddata_status', 1)
                .order('ddata_id', { ascending: true });
            if (fetchError) {
                setError(fetchError.message || 'Unable to load object records.');
                setRows([]);
                return;
            }
            const normalized = ((data ?? []) as DdataRow[]).map((row) => ({
                id: row.ddata_id,
                ddata_id: row.ddata_id,
                ...(row.ddata_values ?? {}),
            }));
            setRows(normalized);
        };
        void run();
    }, [resolvedDobjId]);

    const title = useMemo(() => objectLabel, [objectLabel]);
    const objectLoaderCrud = useMemo<ObjectLoaderCrudOptions | null>(() => {
        if (resolvedDobjId == null) return null;
        return {
            sourceTable: 'ddata',
            idColumn: 'ddata_id',
            softDelete: true,
            sysStatusColumn: 'ddata_status',
            sysStatusActiveValue: 1,
            sysStatusInactiveValue: 0,
            queryActiveOnly: true,
            readOnlyKeys: ['ddata_id', 'entity_id', 'dobj_id', 'ddata_created_at', 'ddata_updated_at', 'ddata_created_by_id', 'ddata_modified_by_id'],
            jsonValueColumn: 'ddata_values',
            fieldTypeByKey,
            fieldLinkClickBehaviorByKey,
        };
    }, [fieldLinkClickBehaviorByKey, fieldTypeByKey, resolvedDobjId]);

    const reloadRows = async () => {
        if (resolvedDobjId == null) return;
        const { data, error: fetchError } = await supabase
            .from('ddata')
            .select('ddata_id,dobj_id,entity_id,ddata_values')
            .eq('dobj_id', resolvedDobjId)
            .eq('entity_id', FIXED_ENTITY_ID)
            .eq('ddata_status', 1)
            .order('ddata_id', { ascending: true });
        if (fetchError) {
            setError(fetchError.message || 'Unable to load object records.');
            setRows([]);
            return;
        }
        const normalized = ((data ?? []) as DdataRow[]).map((row) => ({
            id: row.ddata_id,
            ddata_id: row.ddata_id,
            ...(row.ddata_values ?? {}),
        }));
        setRows(normalized);
    };

    const handleConfigChange = (next: TableConfig) => {
        setConfig(sanitizeRecordsTableConfig(next));
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreateSubmissionFrozen(false);
        setCreateError(null);
    };

    const openCreateModal = async () => {
        setCreateSubmissionFrozen(false);
        setCreateError(null);
        setHierarchyMode('root');
        setHierarchyParentId('');
        const defaults: Record<string, string> = {};
        for (const field of schemaFields) {
            const key = getFieldApiName(field);
            if (!key) continue;
            if (isAutoNumberField(field)) {
                if (resolvedDobjId == null) {
                    defaults[key] = '';
                    continue;
                }
                const peeked = await peekNextAutoNumberFromPlatformConfig(
                    FIXED_ENTITY_ID,
                    resolvedDobjId,
                    field,
                );
                defaults[key] = peeked.value;
            } else if (isPicklistField(field)) {
                const attrs = getFieldAttributes(field);
                const options = getPicklistOptions(field);
                if (attrs.picklistUseFirstAsDefault === true && options.length > 0) {
                    defaults[key] = options[0];
                } else {
                    defaults[key] = getFieldDefaultString(field);
                }
            } else if (isPicklistMultiField(field)) {
                defaults[key] = getFieldDefaultString(field);
            } else {
                defaults[key] = getFieldDefaultString(field);
            }
        }
        setCreateValues(defaults);
        if (objectType === 'hierarchy') {
            defaults.parent_id_u = '';
            defaults.child_id_u = defaults.child_id_u || '';
        }
        setShowCreateModal(true);
    };

    const handleNewRecordClick = () => {
        // Always use the standard schema-driven form for every object type.
        // NotionNest objects will derive their page title from sys_record_name / sys_record_id.
        void openCreateModal();
    };

    const handleNavigateToRowDetail = useCallback(
        (row: Record<string, unknown>) => {
            if (!isNotionNestObjectType(objectType) || !objectId) return;
            const rowId = row.ddata_id ?? row.id ?? row.sys_id;
            if (rowId == null || rowId === '') return;
            navigate(notionNestPagePath(objectId, String(rowId)));
        },
        [navigate, objectId, objectType],
    );

    const handleSaveNewRecord = async () => {
        if (resolvedDobjId == null) return;

        if (isNotionNestObjectType(objectType)) {
            // Validate required fields first (same as standard objects)
            const missingRequired = schemaFields.filter((f) => {
                if (!isRequiredField(f)) return false;
                const key = getFieldApiName(f);
                if (!key) return false;
                return String(createValues[key] ?? '').trim() === '';
            });
            if (missingRequired.length > 0) {
                setCreateError('Please fill all required fields.');
                return;
            }
            // Derive the notion page title from sys_record_name or sys_record_id, falling back to 'Untitled'
            const titleFromName = String(createValues['sys_record_name'] ?? '').trim();
            const titleFromId   = String(createValues['sys_record_id']   ?? '').trim();
            const derivedTitle  = titleFromName || titleFromId || 'Untitled';

            setCreating(true);
            setCreateError(null);
            let { data: authSessionData } = await supabase.auth.getSession();
            if (!authSessionData.session && !authBootstrapTried) {
                setAuthBootstrapTried(true);
                const { data: anonData } = await supabase.auth.signInAnonymously();
                authSessionData = { session: anonData.session };
            }
            const authUser = authSessionData.session?.user ?? null;
            const candidateActorId =
                authUser?.user_metadata?.user_id ??
                authUser?.app_metadata?.user_id ??
                authUser?.user_metadata?.id ??
                authUser?.app_metadata?.id ??
                null;
            const actorIdNum = Number(candidateActorId);
            const actorId = Number.isFinite(actorIdNum) && actorIdNum > 0 ? actorIdNum : FIXED_USER_ID;

            // Allocate auto-number values (same logic as standard objects)
            const ddataValuesForNotion: Record<string, unknown> = schemaFields.reduce<Record<string, unknown>>((acc, field) => {
                const key = getFieldApiName(field);
                if (key) acc[key] = String(createValues[key] ?? '');
                return acc;
            }, {});
            for (const field of schemaFields) {
                if (!isAutoNumberField(field)) continue;
                const key = getFieldApiName(field);
                if (!key) continue;
                const allocated = await allocateAutoNumberFromLedger(FIXED_ENTITY_ID, resolvedDobjId, field);
                if (allocated.error || !allocated.value) {
                    setCreating(false);
                    setCreateError(`${String(field.label ?? key)}: ${allocated.error ?? 'Unable to allocate a unique auto number.'}`);
                    return;
                }
                ddataValuesForNotion[key] = allocated.value;
            }
            // createNotionNestRecord handles inserting the record with the notion page structure;
            // we pass the extra schema values so they are stored too.
            const { recordId, error: createErr } = await createNotionNestRecord({
                dobjId: resolvedDobjId,
                title: derivedTitle,
                actorId,
                extraValues: ddataValuesForNotion,
            });
            setCreating(false);
            if (createErr || recordId == null) {
                setCreateError(createErr ?? 'Unable to create page.');
                return;
            }
            closeCreateModal();
            if (objectId) {
                navigate(notionNestPagePath(objectId, recordId));
            }
            return;
        }

        const missingRequired = schemaFields.filter((f) => {
            if (!isRequiredField(f)) return false;
            const key = getFieldApiName(f);
            if (!key) return false;
            return String(createValues[key] ?? '').trim() === '';
        });
        if (missingRequired.length > 0) {
            setCreateError('Please fill all required fields.');
            return;
        }
        for (const field of schemaFields) {
            const key = getFieldApiName(field);
            if (!key) continue;
            const dt = String(field.dataType ?? '');
            const value = String(createValues[key] ?? '').trim();
            const validationError =
                dt === 'email'
                    ? validateEmailValue(value)
                    : dt === 'url'
                      ? validateUrlValue(value)
                      : dt === 'phone'
                        ? validatePhoneValue(value)
                        : null;
            if (validationError) {
                setCreateError(`${String(field.label ?? key)}: ${validationError}`);
                return;
            }
        }
        const ddataValues = schemaFields.reduce<Record<string, unknown>>((acc, field) => {
            const key = getFieldApiName(field);
            if (!key) return acc;
            acc[key] = String(createValues[key] ?? '');
            return acc;
        }, {});
        if (objectType === 'hierarchy') {
            const hasParentField = schemaFields.some((f) => getFieldApiName(f) === 'parent_id_u');
            const hasChildField = schemaFields.some((f) => getFieldApiName(f) === 'child_id_u');
            if (!hasParentField || !hasChildField) {
                setCreateError(
                    'Hierarchy object requires Parent ID and Child ID fields. Re-save object schema to auto-create them.',
                );
                return;
            }
            if (hierarchyMode === 'child' && !hierarchyParentId.trim()) {
                setCreateError('Select a parent record to create a child record.');
                return;
            }
            ddataValues.parent_id_u = hierarchyMode === 'child' ? hierarchyParentId.trim() : '';
            const existingChild = String(ddataValues.child_id_u ?? '').trim();
            ddataValues.child_id_u = existingChild || generateHierarchyNodeId();
        }
        for (const field of schemaFields) {
            if (!isAutoNumberField(field)) continue;
            const key = getFieldApiName(field);
            if (!key) continue;
            const allocated = await allocateAutoNumberFromLedger(FIXED_ENTITY_ID, resolvedDobjId, field);
            if (allocated.error || !allocated.value) {
                setCreateError(
                    `${String(field.label ?? key)}: ${allocated.error ?? 'Unable to allocate a unique auto number.'}`,
                );
                return;
            }
            ddataValues[key] = allocated.value;
        }
        setCreating(true);
        setCreateError(null);
        const nowIso = new Date().toISOString();
        let { data: authSessionData } = await supabase.auth.getSession();
        if (!authSessionData.session && !authBootstrapTried) {
            setAuthBootstrapTried(true);
            const { data: anonData } = await supabase.auth.signInAnonymously();
            authSessionData = { session: anonData.session };
        }
        const authUser = authSessionData.session?.user ?? null;
        const candidateActorId =
            authUser?.user_metadata?.user_id ??
            authUser?.app_metadata?.user_id ??
            authUser?.user_metadata?.id ??
            authUser?.app_metadata?.id ??
            null;
        const actorIdNum = Number(candidateActorId);
        const actorId = Number.isFinite(actorIdNum) && actorIdNum > 0 ? actorIdNum : FIXED_USER_ID;
        const { error: insertError } = await supabase.from('ddata').insert({
            entity_id: FIXED_ENTITY_ID,
            dobj_id: resolvedDobjId,
            ddata_values: ddataValues,
            ddata_status: 1,
            ddata_created_at: nowIso,
            ddata_updated_at: nowIso,
            ddata_created_by_id: actorId,
            ddata_modified_by_id: actorId,
        });
        if (insertError) {
            setCreating(false);
            setCreateError(insertError.message || 'Unable to save record.');
            if (objectType === 'transaction') {
                setCreateSubmissionFrozen(true);
                setCreateValues((prev) => {
                    const next = { ...prev };
                    for (const field of schemaFields) {
                        if (!isAutoNumberField(field)) continue;
                        const key = getFieldApiName(field);
                        if (!key) continue;
                        const v = ddataValues[key];
                        if (v != null && v !== '') next[key] = String(v);
                    }
                    return next;
                });
            }
            return;
        }
        await reloadRows();
        setCreating(false);
        setCreateSubmissionFrozen(false);
        closeCreateModal();
    };

    return (
        <>
            {recordsPlatformScope ? (
            <ConfigurableListTemplate
                title={title}
                data={rows}
                fieldMappings={fieldMappings}
                preferredColumns={preferredColumns}
                config={config}
                loading={loading}
                error={error}
                onConfigChange={handleConfigChange}
                baseUrl={`/objects/${objectId}/records`}
                onNewButtonClick={handleNewRecordClick}
                onRefresh={() => void reloadRows()}
                objectLoaderCrud={objectLoaderCrud}
                platformConfigScope={recordsPlatformScope}
                inlineEditCandidateKeys={inlineEditCandidateKeys}
                onNavigateToRowDetail={
                    isNotionNestObjectType(objectType) ? handleNavigateToRowDetail : undefined
                }
            />
            ) : (
                <div className="card p-6 text-center text-gray-600">
                    {loading ? 'Loading…' : error ?? 'Object not found.'}
                </div>
            )}
            {showCreateModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">
                                New {objectLabel}
                            </h2>
                            <button
                                type="button"
                                className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-40 disabled:pointer-events-none"
                                onClick={() => closeCreateModal()}
                                disabled={creating && !createSubmissionFrozen}
                                aria-label="Close"
                            >
                                x
                            </button>
                        </div>
                        <div className="overflow-auto flex-1 px-4 py-3">
                            {createSubmissionFrozen && objectType === 'transaction' ? (
                                <div
                                    className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                                    role="status"
                                >
                                    <strong>Transaction object:</strong> this submission failed after an ID was reserved.
                                    The values below are frozen. Close this dialog to start a new record — Save and Retry
                                    are disabled to prevent a duplicate submission.
                                </div>
                            ) : null}
                            {createError ? <p className="text-sm text-red-600 mb-3">{createError}</p> : null}
                            {isNotionNestObjectType(objectType) ? (
                                <p className="text-sm text-gray-600 mb-2">
                                    Fill in the fields below. The page title will be set from the Name field (or ID) and you can edit it after the page opens.
                                </p>
                            ) : null}
                            {objectType === 'hierarchy' ? (
                                <div className="mb-3 rounded border border-blue-200 bg-blue-50/50 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <button
                                            type="button"
                                            className={`btn btn-secondary py-1 px-2 text-xs ${hierarchyMode === 'root' ? 'bg-blue-100 border-blue-300 text-blue-900' : ''}`}
                                            onClick={() => {
                                                setHierarchyMode('root');
                                                setHierarchyParentId('');
                                                setCreateValues((prev) => ({ ...prev, parent_id_u: '' }));
                                            }}
                                            disabled={createSubmissionFrozen || creating}
                                        >
                                            Add Root Record
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn btn-secondary py-1 px-2 text-xs ${hierarchyMode === 'child' ? 'bg-blue-100 border-blue-300 text-blue-900' : ''}`}
                                            onClick={() => setHierarchyMode('child')}
                                            disabled={createSubmissionFrozen || creating}
                                        >
                                            Add Child Record
                                        </button>
                                    </div>
                                    {hierarchyMode === 'child' ? (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Parent Record ID</label>
                                            <select
                                                className="input text-sm py-1.5 w-full"
                                                value={hierarchyParentId}
                                                disabled={createSubmissionFrozen || creating}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setHierarchyParentId(v);
                                                    setCreateValues((prev) => ({ ...prev, parent_id_u: v }));
                                                }}
                                            >
                                                <option value="">-- Select Parent --</option>
                                                {rows.map((row) => {
                                                    const parentCandidate =
                                                        String(row['child_id_u'] ?? '').trim() ||
                                                        String(row['name_u'] ?? '').trim() ||
                                                        String(row['ddata_id'] ?? '').trim();
                                                    if (!parentCandidate) return null;
                                                    return (
                                                        <option key={`${String(row['ddata_id'] ?? parentCandidate)}-${parentCandidate}`} value={parentCandidate}>
                                                            {parentCandidate}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-600">Root record: Parent ID will be blank.</p>
                                    )}
                                </div>
                            ) : null}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {schemaFields
                                    .filter((field) => getFieldApiName(field))
                                    .map((field) => {
                                        const key = getFieldApiName(field);
                                        const label = String(field.label ?? key);
                                        const formLocked = createSubmissionFrozen || creating;
                                        const readOnly = isAutoNumberField(field);
                                        const isPhone = String(field.dataType ?? '') === 'phone';
                                        const phoneParts = splitPhoneValue(String(createValues[key] ?? ''));
                                        return (
                                            <div key={key}>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    {label}
                                                    {isRequiredField(field) ? ' *' : ''}
                                                </label>
                                                {isPicklistField(field) ? (
                                                    <select
                                                        className="input text-sm py-1.5 w-full"
                                                        value={String(createValues[key] ?? '')}
                                                        disabled={formLocked}
                                                        onChange={(e) =>
                                                            setCreateValues((prev) => ({
                                                                ...prev,
                                                                [key]: e.target.value,
                                                            }))
                                                        }
                                                    >
                                                        <option value="">-- Select --</option>
                                                        {getPicklistOptions(field).map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : isPicklistMultiField(field) ? (
                                                    <select
                                                        className="input text-sm py-1.5 w-full"
                                                        multiple
                                                        disabled={formLocked}
                                                        size={Math.max(3, Number(getFieldAttributes(field).picklistVisibleLines ?? 5))}
                                                        value={String(createValues[key] ?? '')
                                                            .split(/\r?\n|,/)
                                                            .map((v) => v.trim())
                                                            .filter(Boolean)}
                                                        onChange={(e) => {
                                                            const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                                                            setCreateValues((prev) => ({
                                                                ...prev,
                                                                [key]: selected.join('\n'),
                                                            }));
                                                        }}
                                                    >
                                                        {getPicklistOptions(field).map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    isPhone ? (
                                                        <div className="grid grid-cols-[120px_1fr] gap-2">
                                                            <input
                                                                className="input text-sm py-1.5 w-full"
                                                                placeholder="+91"
                                                                value={phoneParts.code}
                                                                disabled={formLocked}
                                                                onChange={(e) =>
                                                                    setCreateValues((prev) => ({
                                                                        ...prev,
                                                                        [key]: composePhoneValue(
                                                                            e.target.value,
                                                                            splitPhoneValue(String(prev[key] ?? '')).number,
                                                                        ),
                                                                    }))
                                                                }
                                                            />
                                                            <input
                                                                className="input text-sm py-1.5 w-full"
                                                                placeholder="289889832"
                                                                value={phoneParts.number}
                                                                disabled={formLocked}
                                                                onChange={(e) =>
                                                                    setCreateValues((prev) => ({
                                                                        ...prev,
                                                                        [key]: composePhoneValue(
                                                                            splitPhoneValue(String(prev[key] ?? '')).code,
                                                                            e.target.value,
                                                                        ),
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                    ) : (
                                                        <input
                                                            className="input text-sm py-1.5 w-full"
                                                            value={String(createValues[key] ?? '')}
                                                            readOnly={readOnly}
                                                            disabled={formLocked}
                                                            onChange={(e) =>
                                                                setCreateValues((prev) => ({
                                                                    ...prev,
                                                                    [key]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => closeCreateModal()}
                                disabled={creating && !createSubmissionFrozen}
                            >
                                {createSubmissionFrozen ? 'Close' : 'Cancel'}
                            </button>
                            {objectType === 'transaction' && createSubmissionFrozen ? (
                                <button
                                    type="button"
                                    className="btn btn-secondary opacity-60 cursor-not-allowed"
                                    disabled
                                    title="Retry is disabled after a failed save on a transaction object. Close and open a new record."
                                >
                                    Retry
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSaveNewRecord}
                                disabled={creating || createSubmissionFrozen}
                            >
                                {creating ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}