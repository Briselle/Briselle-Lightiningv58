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
    /** Fixed widths in px for visible columns only; keyed by field/column key (not label). Omitted = auto. */
    columnWidthsPx: Record<string, number>;
    /** Per-column text mode in grid cells. */
    columnWrapStates?: Record<string, 'wrap' | 'clip'>;
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
        columnWidthsPx: {},
    };
}

function sanitizeColumnWidthsPx(
    raw: unknown,
    validKeys: Set<string>,
    visibleKeys: string[]
): Record<string, number> {
    const vis = new Set(visibleKeys);
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!validKeys.has(k) || !vis.has(k)) continue;
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n) || n < 80 || n > 4000) continue;
        out[k] = Math.round(n);
    }
    return out;
}

function sanitizeColumnWrapStates(
    raw: unknown,
    validKeys: Set<string>,
    activeKeys: string[]
): Record<string, 'wrap' | 'clip'> {
    const active = new Set(activeKeys);
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, 'wrap' | 'clip'> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!validKeys.has(k) || !active.has(k)) continue;
        if (v === 'wrap' || v === 'clip') out[k] = v;
    }
    return out;
}

export function sanitizeTableQueryState(
    partial: Partial<TableQueryState> | null | undefined,
    validKeys: string[]
): TableQueryState {
    const set = new Set(validKeys);
    const filterArr = (cols: string[] | undefined) =>
        (cols || []).filter((c) => set.has(c));

    /** Keys the user had ever referenced in saved layout; used to default-new mapping keys to visible without resurrecting columns they removed from all three lists. */
    const storedKeys = new Set(
        [...(partial?.columnOrder ?? []), ...(partial?.visibleColumns ?? []), ...(partial?.activeColumns ?? [])].filter(
            (c) => typeof c === 'string' && set.has(c)
        )
    );

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

    for (const k of validKeys) {
        if (storedKeys.has(k)) continue;
        if (!activeColumns.includes(k)) activeColumns.push(k);
        if (!visibleColumns.includes(k)) visibleColumns.push(k);
    }

    const columnWidthsPx = sanitizeColumnWidthsPx(partial?.columnWidthsPx, set, visibleColumns);
    const columnWrapStates = sanitizeColumnWrapStates(
        (partial as { columnWrapStates?: unknown } | undefined)?.columnWrapStates,
        set,
        activeColumns
    );

    return {
        searchTerm: typeof partial?.searchTerm === 'string' ? partial.searchTerm : '',
        sortCriteria,
        filterCriteria,
        groupByColumn,
        activeColumns,
        visibleColumns,
        columnOrder,
        columnWidthsPx,
        columnWrapStates,
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

/** Remove all persisted per-preset table query state (localStorage only). */
export function clearAllTableUserViewLocalStorage(): void {
    try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(`${KEY_PREFIX}::`)) toRemove.push(k);
        }
        for (const k of toRemove) localStorage.removeItem(k);
    } catch {
        /* ignore */
    }
}
