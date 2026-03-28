/**
 * Local persistence for per-user, per-template, per-preset table query state.
 * Stored as JSON in localStorage (migrate to API/DB later). Optional file export/import helpers.
 */
import type { SortCriteria } from '../action-components/Action_Sort';
import type { FilterCriteria } from '../action-components/Action_Filter';

export interface TableQueryState {
    searchTerm: string;
    sortCriteria: SortCriteria[];
    filterCriteria: FilterCriteria[];
    groupByColumn: string | null;
    activeColumns: string[];
    visibleColumns: string[];
    columnOrder: string[];
}

const STORAGE_VERSION = 'v1';
const KEY_PREFIX = `briselle.tableUserView.${STORAGE_VERSION}`;

/** Single JSON document key (file-like blob) for backup/export of all entries */
export const TABLE_USER_VIEWS_BLOB_KEY = 'briselle_table_user_views.json';

export function computeTemplateId(fieldMappings: Record<string, string>): string {
    const keys = Object.keys(fieldMappings).sort();
    let h = 0;
    const s = keys.join('\u0001');
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    const unsigned = h >>> 0;
    return `tpl_${unsigned.toString(16)}_${keys.length}`;
}

export function userViewStorageKey(userId: string, templateId: string, presetId: string): string {
    return `${KEY_PREFIX}::${encodeURIComponent(userId)}::${encodeURIComponent(templateId)}::${encodeURIComponent(presetId)}`;
}

export function emptyTableQueryState(allColumnKeys: string[]): TableQueryState {
    return {
        searchTerm: '',
        sortCriteria: [],
        filterCriteria: [],
        groupByColumn: null,
        activeColumns: [...allColumnKeys],
        visibleColumns: [...allColumnKeys],
        columnOrder: [...allColumnKeys],
    };
}

export function sanitizeTableQueryState(
    partial: Partial<TableQueryState> | null | undefined,
    validKeys: string[]
): TableQueryState {
    const set = new Set(validKeys);
    const filterArr = (cols: string[] | undefined) =>
        (cols || []).filter((c) => set.has(c));

    const sortCriteria = (partial?.sortCriteria || []).filter((s) => set.has(s.column));
    const filterCriteria = (partial?.filterCriteria || []).filter((f) => set.has(f.column));
    const groupByColumn =
        partial?.groupByColumn != null && set.has(partial.groupByColumn) ? partial.groupByColumn : null;

    let activeColumns = filterArr(partial?.activeColumns);
    let visibleColumns = filterArr(partial?.visibleColumns);
    let columnOrder = filterArr(partial?.columnOrder);

    if (activeColumns.length === 0) activeColumns = [...validKeys];
    if (visibleColumns.length === 0) visibleColumns = [...activeColumns];
    if (columnOrder.length === 0) columnOrder = [...validKeys];

    visibleColumns = visibleColumns.filter((c) => activeColumns.includes(c));
    columnOrder = columnOrder.filter((c) => validKeys.includes(c));
    const rest = validKeys.filter((k) => !columnOrder.includes(k));
    columnOrder = [...columnOrder, ...rest];

    return {
        searchTerm: typeof partial?.searchTerm === 'string' ? partial.searchTerm : '',
        sortCriteria,
        filterCriteria,
        groupByColumn,
        activeColumns,
        visibleColumns,
        columnOrder,
    };
}

export function loadTableQueryState(
    userId: string,
    templateId: string,
    presetId: string
): TableQueryState | null {
    try {
        const raw = localStorage.getItem(userViewStorageKey(userId, templateId, presetId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<TableQueryState>;
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as TableQueryState;
    } catch {
        return null;
    }
}

export function saveTableQueryState(
    userId: string,
    templateId: string,
    presetId: string,
    state: TableQueryState
): void {
    try {
        localStorage.setItem(userViewStorageKey(userId, templateId, presetId), JSON.stringify(state));
    } catch {
        /* quota / private mode */
    }
}

/** Remove savedQueryState from preset layout config before merging into live TableConfig */
export function stripSavedQueryStateFromConfig<T extends Record<string, unknown>>(cfg: T | null | undefined): T {
    if (!cfg || typeof cfg !== 'object') return ({} as T) as T;
    const { savedQueryState: _removed, ...rest } = cfg as T & { savedQueryState?: unknown };
    return rest as T;
}

export function readSavedQueryStateFromPresetConfig(config: unknown): Partial<TableQueryState> | undefined {
    if (!config || typeof config !== 'object') return undefined;
    const sq = (config as { savedQueryState?: unknown }).savedQueryState;
    if (!sq || typeof sq !== 'object') return undefined;
    return sq as Partial<TableQueryState>;
}

/** Export all briselle.tableUserView keys into one JSON object (for download / backup). */
export function exportAllUserViewsAsJsonObject(): Record<string, TableQueryState> {
    const out: Record<string, TableQueryState> = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith(`${KEY_PREFIX}::`)) continue;
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            try {
                out[k] = JSON.parse(raw) as TableQueryState;
            } catch {
                /* skip */
            }
        }
    } catch {
        /* ignore */
    }
    return out;
}

export function importUserViewsFromJsonObject(blob: Record<string, TableQueryState>): { imported: number } {
    let imported = 0;
    for (const [k, v] of Object.entries(blob)) {
        if (!k.startsWith(`${KEY_PREFIX}::`)) continue;
        try {
            localStorage.setItem(k, JSON.stringify(v));
            imported++;
        } catch {
            /* skip */
        }
    }
    return { imported };
}
