import { supabase } from '../../../../utils/supabase';
import type { TablePreset } from '../action-components/Action_Preset';
import { TAB_BAR_OBJECT_LOADER_KEYS } from './mergePresetConfig';
import {
    CANONICAL_DEFAULT_TAB_ITEM,
    injectCanonicalDefaultTab,
    isProtectedDefaultTab,
} from './canonicalObjectLoaderDefaults';

const TABLE = 'platform_config';
const OBJECT_LOADER_TYPE = 3;
/** Must match `TABLE_TAB_URL_PARAM` in TableTabPanel (used when saving settings to sync active tab) */
const TABLE_TAB_QUERY_PARAM = 'tableTab';

export const DB_ENTITY_ID = 1000000000;
export const DB_DOBJ_ID = 1000000001;

export interface PresetJsonEntry {
    id: string;
    name: string;
    iconKey: string;
    customIcon: string;
    isDefault: boolean;
    isActive: boolean;
    presetOrder: number;
    config: Record<string, unknown>;
}

/** Stored in platform_config.config_json — presets[] plus ObjectLoader-level tab bar + selection */
export interface ConfigJsonPayload {
    activePresetId: string;
    /** Selected tab id (`tableTab` URL param); persisted like activePresetId */
    activeTabId?: string;
    /** Tab strip + tab chrome: single source for all presets on this object */
    objectTabBar?: Record<string, unknown>;
    presets: PresetJsonEntry[];
}

interface PlatformConfigRow {
    config_id: number;
    entity_id: number;
    dobj_id: number;
    config_json: ConfigJsonPayload;
}

export function entryToPreset(entry: PresetJsonEntry): TablePreset {
    return {
        id: entry.id,
        presetId: entry.id,
        name: entry.name,
        config: entry.config as any,
        isDefault: entry.isDefault,
        iconKey: entry.iconKey || 'preset',
        customIcon: entry.customIcon && entry.customIcon !== 'none' ? entry.customIcon : undefined,
    };
}

export function presetToEntry(preset: TablePreset, zeroBasedOrder: number): PresetJsonEntry {
    return {
        id: preset.id,
        name: preset.name,
        iconKey: preset.iconKey || 'preset',
        customIcon: preset.customIcon || 'none',
        isDefault: preset.isDefault ?? false,
        isActive: true,
        presetOrder: zeroBasedOrder,
        config: preset.config || {},
    };
}

export interface FetchPresetsResult {
    presets: TablePreset[];
    activePresetId: string | null;
    activeTabId: string | null;
    objectTabBar: Record<string, unknown> | null;
    rawEntries: PresetJsonEntry[];
    error: string | null;
}

/** Pick tab-related fields for `config_json.objectTabBar` */
export function extractObjectTabBarFromConfig(config: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of TAB_BAR_OBJECT_LOADER_KEYS) {
        if (key in config && config[key] !== undefined) {
            out[key] = config[key];
        }
    }
    return out;
}

/** Remove tab-related fields so preset `config` in DB does not duplicate ObjectLoader tab bar */
export function stripObjectTabBarFromConfig<T extends Record<string, unknown>>(config: T): T {
    const next = { ...config } as T;
    const rec = next as Record<string, unknown>;
    for (const key of TAB_BAR_OBJECT_LOADER_KEYS) {
        delete rec[key];
    }
    return next;
}

async function fetchRawDocument(
    entityId: number,
    dobjId: number,
): Promise<{ payload: ConfigJsonPayload | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from(TABLE)
            .select('config_json')
            .eq('entity_id', entityId)
            .eq('dobj_id', dobjId)
            .eq('config_type', OBJECT_LOADER_TYPE)
            .eq('is_active', true)
            .limit(1)
            .single();

        if (error) return { payload: null, error: error.message };
        return { payload: (data as { config_json: ConfigJsonPayload }).config_json, error: null };
    } catch (e) {
        return { payload: null, error: e instanceof Error ? e.message : String(e) };
    }
}

async function writeRawDocument(
    entityId: number,
    dobjId: number,
    payload: ConfigJsonPayload | Record<string, unknown>,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from(TABLE)
            .update({ config_json: payload, modified_by_user_id: userId })
            .eq('entity_id', entityId)
            .eq('dobj_id', dobjId)
            .eq('config_type', OBJECT_LOADER_TYPE)
            .select('config_id');

        if (error) return { success: false, error: error.message };
        if (!data?.length) {
            return {
                success: false,
                error:
                    'Update matched no rows. Insert or seed platform_config for entity_id=' +
                    entityId +
                    ', dobj_id=' +
                    dobjId +
                    ', config_type=' +
                    OBJECT_LOADER_TYPE +
                    ' (ObjectLoader).',
            };
        }
        return { success: true, error: null };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

export async function fetchPresetsFromDB(
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
): Promise<FetchPresetsResult> {
    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) {
        console.error('[configService] fetchPresetsFromDB:', error);
        return {
            presets: [],
            activePresetId: null,
            activeTabId: null,
            objectTabBar: null,
            rawEntries: [],
            error: error || 'No data',
        };
    }
    if (!Array.isArray(payload.presets)) {
        return {
            presets: [],
            activePresetId: null,
            activeTabId: null,
            objectTabBar: null,
            rawEntries: [],
            error: 'config_json.presets is not an array',
        };
    }

    const ext = payload as ConfigJsonPayload;
    const objectTabBar =
        ext.objectTabBar && typeof ext.objectTabBar === 'object' && Object.keys(ext.objectTabBar).length > 0
            ? ext.objectTabBar
            : null;
    const activeTabId =
        typeof ext.activeTabId === 'string' && ext.activeTabId.length > 0 ? ext.activeTabId : null;

    const sorted = [...payload.presets].sort((a, b) => (a.presetOrder ?? 99) - (b.presetOrder ?? 99));
    const activeOnly = sorted.filter((e) => e.isActive);
    return {
        presets: activeOnly.map(entryToPreset),
        activePresetId: payload.activePresetId || null,
        activeTabId,
        objectTabBar,
        rawEntries: sorted,
        error: null,
    };
}

export type SaveTableSettingsOptions = {
    /** When set, preferred over URL / stored active tab if it exists in tabList */
    activeTabIdOverride?: string | null;
    /** Allow writing the Default preset body in DB (normally protected). */
    allowDefaultPresetBodyOverwrite?: boolean;
    /** Merged into preset `config` in DB (filter/sort/columns/widths, etc.) */
    savedQueryState?: Record<string, unknown> | null;
};

/**
 * One read/write: ObjectLoader tab bar + active tab id + current preset body (tab keys stripped from preset.config).
 * Default preset body and Default tab row are never overwritten in the database.
 */
export async function saveTableSettingsToDB(
    selectedPresetId: string,
    fullLayoutConfig: Record<string, unknown>,
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
    options?: SaveTableSettingsOptions,
): Promise<{ success: boolean; error: string | null; didSkipDefaultPresetBody?: boolean }> {
    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    const p = payload as ConfigJsonPayload;
    const tabSlice = extractObjectTabBarFromConfig(fullLayoutConfig);
    const mergedTabList = injectCanonicalDefaultTab(tabSlice.tabList);
    p.objectTabBar = { ...(p.objectTabBar || {}), ...tabSlice, tabList: mergedTabList };

    const tabList = mergedTabList;
    if (Array.isArray(tabList) && tabList.length > 0) {
        const override = options?.activeTabIdOverride;
        const overrideOk =
            override && tabList.some((t: { id?: string }) => t && (t as { id: string }).id === override);
        if (overrideOk) {
            p.activeTabId = override!;
        } else {
            const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const urlTab = params?.get(TABLE_TAB_QUERY_PARAM);
            const validUrlTab =
                urlTab && tabList.some((t: { id?: string }) => t && (t as { id: string }).id === urlTab);
            if (validUrlTab) {
                p.activeTabId = urlTab!;
            } else if (
                typeof p.activeTabId === 'string' &&
                tabList.some((t: { id?: string }) => (t as { id: string }).id === p.activeTabId)
            ) {
                /* keep stored activeTabId if still valid */
            } else {
                const first = tabList[0] as { id?: string };
                if (first?.id) p.activeTabId = first.id;
            }
        }
    }

    const idx = p.presets.findIndex((e) => e.id === selectedPresetId);
    if (idx === -1) return { success: false, error: `Preset "${selectedPresetId}" not found in DB document` };

    let didSkipDefaultPresetBody = false;
    if (selectedPresetId === 'default' && options?.allowDefaultPresetBodyOverwrite !== true) {
        didSkipDefaultPresetBody = true;
    } else {
        const stripped = stripObjectTabBarFromConfig(fullLayoutConfig) as Record<string, unknown>;
        const sq = options?.savedQueryState;
        const configBody =
            sq != null && typeof sq === 'object'
                ? { ...stripped, savedQueryState: sq }
                : stripped;
        p.presets[idx] = {
            ...p.presets[idx],
            config: configBody as (typeof p.presets)[number]['config'],
        };
    }

    const w = await writeRawDocument(entityId, dobjId, p, userId);
    if (!w.success) return w;
    return { success: true, error: null, didSkipDefaultPresetBody };
}

/**
 * Restore Default preset config + tab chrome from code while keeping non-default tabs in objectTabBar.tabList.
 */
export async function resetDefaultToCodeInDB(
    codeDefaultPreset: TablePreset,
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    if (codeDefaultPreset.id !== 'default') {
        return { success: false, error: 'Only the Default preset can be restored with this action.' };
    }

    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    const p = payload as ConfigJsonPayload;
    const idx = p.presets.findIndex((e) => e.id === 'default');
    if (idx === -1) return { success: false, error: 'Default preset not found in document' };

    const order = p.presets[idx].presetOrder;
    const strippedConfig = stripObjectTabBarFromConfig(codeDefaultPreset.config as Record<string, unknown>);
    const fromCodeEntry = presetToEntry({ ...codeDefaultPreset, config: strippedConfig as TablePreset['config'] }, order);

    p.presets[idx] = {
        ...p.presets[idx],
        ...fromCodeEntry,
        id: 'default',
        isDefault: true,
        name: 'Default',
        presetOrder: order,
    };

    const codeSlice = extractObjectTabBarFromConfig(codeDefaultPreset.config as Record<string, unknown>);
    const restTabs = (Array.isArray(p.objectTabBar?.tabList) ? p.objectTabBar!.tabList : []).filter(
        (t: { presetId?: string; id?: string }) => !isProtectedDefaultTab(t),
    );
    p.objectTabBar = {
        ...(p.objectTabBar || {}),
        ...codeSlice,
        tabList: [CANONICAL_DEFAULT_TAB_ITEM, ...restTabs],
    };

    p.activePresetId = 'default';
    p.activeTabId = CANONICAL_DEFAULT_TAB_ITEM.id;

    return writeRawDocument(entityId, dobjId, p, userId);
}

/**
 * Platform reset (config_type = OBJECT_LOADER_TYPE): keep only default-tagged presets,
 * set tab row to the protected Default tab only, and point active context at default.
 * Does not replace default preset body with code — DB default entry is preserved (normalized id/default flags).
 */
export async function pruneObjectLoaderToDefaultOnlyInDB(
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    const p = payload as ConfigJsonPayload;
    const tagged = p.presets.filter((e) => e.isDefault === true || e.id === 'default');
    let defaultRow =
        tagged.find((e) => e.id === 'default') ?? tagged[0];

    if (!defaultRow) {
        return { success: false, error: 'No default-tagged preset in document' };
    }

    defaultRow = {
        ...defaultRow,
        id: 'default',
        isDefault: true,
        name: 'Default',
        presetOrder: 0,
        isActive: true,
    };

    p.presets = [defaultRow];

    const tabSlice = extractObjectTabBarFromConfig(defaultRow.config as Record<string, unknown>);
    p.objectTabBar = {
        ...(p.objectTabBar && typeof p.objectTabBar === 'object' ? p.objectTabBar : {}),
        ...tabSlice,
        tabList: [CANONICAL_DEFAULT_TAB_ITEM],
    };
    p.activePresetId = 'default';
    p.activeTabId = CANONICAL_DEFAULT_TAB_ITEM.id;

    return writeRawDocument(entityId, dobjId, p, userId);
}

/** Persist preset + tab selection (tab click, deep link) in one write */
export async function persistActiveContextToDB(
    activePresetId: string,
    activeTabId: string | null,
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    const p = payload as ConfigJsonPayload;
    p.activePresetId = activePresetId;
    p.activeTabId = activeTabId && activeTabId.length > 0 ? activeTabId : '';
    return writeRawDocument(entityId, dobjId, p, userId);
}

/** Update a single preset entry within the JSON array (does NOT overwrite the whole list) */
export async function updateSinglePresetInDB(
    presetId: string,
    updates: Partial<PresetJsonEntry>,
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    if (presetId === 'default') {
        return {
            success: false,
            error: 'The Default preset is protected and cannot be overwritten in the database from this editor.',
        };
    }

    const idx = payload.presets.findIndex((e) => e.id === presetId);
    if (idx === -1) return { success: false, error: `Preset "${presetId}" not found in DB document` };

    payload.presets[idx] = { ...payload.presets[idx], ...updates };
    return writeRawDocument(entityId, dobjId, payload, userId);
}

/** Append a new preset to the existing list in the DB document */
export async function appendPresetToDB(
    preset: TablePreset,
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    const existing = payload.presets.filter((e) => e.id !== preset.id);
    const maxOrder = existing.reduce((max, e) => Math.max(max, e.presetOrder ?? 0), -1);
    const entry = presetToEntry(preset, maxOrder + 1);
    payload.presets = [...existing, entry];

    return writeRawDocument(entityId, dobjId, payload, userId);
}

/** Remove a preset from the DB document */
export async function removePresetFromDB(
    presetId: string,
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    if (presetId === 'default') {
        return { success: false, error: 'The Default preset cannot be removed from the database.' };
    }

    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    payload.presets = payload.presets.filter((e) => e.id !== presetId);
    if (payload.activePresetId === presetId) {
        payload.activePresetId = 'default';
    }
    return writeRawDocument(entityId, dobjId, payload, userId);
}

/** Set the active preset ID in the DB document (does not change activeTabId) */
export async function setActivePresetInDB(
    activePresetId: string,
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    (payload as ConfigJsonPayload).activePresetId = activePresetId;
    return writeRawDocument(entityId, dobjId, payload as ConfigJsonPayload, userId);
}

/** Save the full reordered preset list to DB (used after drag-drop reorder) */
export async function savePresetOrderToDB(
    presets: TablePreset[],
    activePresetId: string,
    entityId: number = DB_ENTITY_ID,
    dobjId: number = DB_DOBJ_ID,
    userId: string = '1',
): Promise<{ success: boolean; error: string | null }> {
    const { payload, error } = await fetchRawDocument(entityId, dobjId);
    if (error || !payload) return { success: false, error: error || 'No data' };

    payload.activePresetId = activePresetId;
    payload.presets = presets.map((p, i) => {
        const existing = payload.presets.find((e) => e.id === p.id);
        return existing
            ? { ...existing, presetOrder: i, name: p.name, iconKey: p.iconKey || 'preset', customIcon: p.customIcon || 'none' }
            : presetToEntry(p, i);
    });

    return writeRawDocument(entityId, dobjId, payload, userId);
}

// Shorter aliases (same behavior as append/remove preset helpers)
export const savePresetToDB = appendPresetToDB;
export const deletePresetFromDB = removePresetFromDB;
