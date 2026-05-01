import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";

import {
    Plus,
    AlertTriangle,
    ExternalLink,
    Settings,
    Edit,
    Trash2,
    ChevronRight,
    ChevronDown,
    GripVertical,
    X,
    Copy,
    Camera,
    Bookmark,
    Star,
} from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../../../utils/helpers';
import TableSettingsModal from "./TableSettingsModal";
import TableTitlePanel from "./table-components/TableTitlePanel";
import TableTabPanel, {
    TabItem,
    TabBarPlacement,
    TabMenuStyle,
    TabVisualStyle,
    TABLE_TAB_URL_PARAM,
} from "./table-components/TableTabPanel";
import { TAB_ICON_CUSTOM_KEY } from "./utils/tabBarIcons";
import TableActionPanel from "./table-components/TableActionPanel.refactored";
// Note: After testing, rename TableActionPanel.refactored.tsx to TableActionPanel.tsx
import DataTable from "./table-components/DataTable";
import ChartPanel from "./table-components/ChartPanel";
import TableFooter from "./table-components/TableFooter";
import { useTableData } from "./hooks/useTableData";
import { SortCriteria } from "./action-components/Action_Sort";
import { FilterCriteria } from "./action-components/Action_Filter";
import { TablePreset } from "./action-components/Action_Preset";
import { loadTableConfig, loadTablePresets } from "./utils/loadTableConfig";
import { DEFAULT_PRESETS, getDefaultPreset, loadCustomPresetsFromStorage, saveCustomPresetsToStorage } from "./utils/presets";
import {
    deleteShareLinksForPresetFromDB,
    deleteShareLinkFromDB,
    DB_DOBJ_ID,
    DB_ENTITY_ID,
    ensureObjectLoaderPlatformConfigRow,
    fetchPresetsFromDB,
    listShareLinksForPresetFromDB,
    persistActiveContextToDB,
    saveTableSettingsToDB,
    resolveShareLinkSettingsFromDB,
    type PlatformConfigScope,
    upsertShareLinkSettingsInDB,
} from "./utils/configService";
import { mergePresetWithPreservedTabState, mergeObjectTabBarIntoConfig } from "./utils/mergePresetConfig";
import { injectCanonicalDefaultTab } from "./utils/canonicalObjectLoaderDefaults";
import { normalizeTabMenuStyle, resolveTabShowUnderline, sanitizeTabListPresetIds } from "./utils/tabBarNormalize";
import { useAuthStore } from "../../../stores/authStore";
import { supabase } from '../../../utils/supabase';
import {
    computeTemplateId,
    loadTableQueryState,
    saveTableQueryState,
    sanitizeTableQueryState,
    stripSavedQueryStateFromConfig,
    readSavedQueryStateFromPresetConfig,
    type TableQueryState,
} from "./utils/tableUserViewStorage";
import { applyFreezePaneConsistency } from "./utils/freezePaneConfigSync";
import {
    CopyGridClipboardModal,
    ObjectLoaderRecordModals,
    ObjectLoaderRowActionsBar,
    resolveRowRecordId,
    type ObjectLoaderCrudOptions,
    type ObjectLoaderRecordModalState,
} from "./objectLoaderRecordModals";
import { buildClipboardGridPayload } from "./utils/clipboardGridTable";

/** Sticky frozen body cells stack above horizontally scrolling cells so borders/dividers stay visible. */
const FROZEN_BODY_Z_BASE = 40;
/** Header frozen cells sit above body stickies and `.freeze-header` defaults. */
const FROZEN_HEADER_Z_BASE = 52;

type CellRangePoint = { row: number; col: string };

function normalizeCellRangeRect(orderCols: string[], a: CellRangePoint, b: CellRangePoint) {
    const ia = orderCols.indexOf(a.col);
    const ib = orderCols.indexOf(b.col);
    if (ia < 0 || ib < 0) return null;
    const c0 = Math.min(ia, ib);
    const c1 = Math.max(ia, ib);
    const r0 = Math.min(a.row, b.row);
    const r1 = Math.max(a.row, b.row);
    return { r0, r1, c0, c1 };
}

function isCellInRangeRect(
    flatRow: number,
    col: string,
    orderCols: string[],
    rect: NonNullable<ReturnType<typeof normalizeCellRangeRect>>,
): boolean {
    const ci = orderCols.indexOf(col);
    if (ci < 0) return false;
    return flatRow >= rect.r0 && flatRow <= rect.r1 && ci >= rect.c0 && ci <= rect.c1;
}

/** Theme-aligned grid inside a selection (lighter/thinner than the hull outline). */
const SELECTION_GRID_LINE = '#e5e7eb';

function findCheckboxRowRangeForFlatRow(
    flatRow: number,
    ranges: { r0: number; r1: number; c0: number; c1: number }[],
): { r0: number; r1: number; c0: number; c1: number } | null {
    return ranges.find((r) => flatRow >= r.r0 && flatRow <= r.r1) ?? null;
}

function findRangeForDataCell(
    flatRow: number,
    col: string,
    orderCols: string[],
    ranges: { r0: number; r1: number; c0: number; c1: number }[],
): { r0: number; r1: number; c0: number; c1: number } | null {
    for (const r of ranges) {
        if (isCellInRangeRect(flatRow, col, orderCols, r)) return r;
    }
    return null;
}

/** Thin interior grid (1px) inside the selection block. */
function selectionInnerGridBoxShadow(
    rect: { r0: number; r1: number; c0: number; c1: number },
    flatRow: number,
    colIndex: number,
    gridColor: string,
): string {
    const g = 1;
    const parts: string[] = [];
    if (flatRow < rect.r1) parts.push(`inset 0 -${g}px 0 0 ${gridColor}`);
    if (colIndex < rect.c1) parts.push(`inset -${g}px 0 0 0 ${gridColor}`);
    return parts.join(', ');
}

/** Leftmost checkbox column: hull on the left; thin separator toward data cells. */
function checkboxLeadSelectionShadow(
    rect: { r0: number; r1: number; c0: number; c1: number },
    flatRow: number,
    accentColor: string,
    gridColor: string,
): string {
    const W = 2;
    const g = 1;
    const parts: string[] = [];
    if (flatRow === rect.r0) parts.push(`inset 0 ${W}px 0 0 ${accentColor}`);
    if (flatRow === rect.r1) parts.push(`inset 0 -${W}px 0 0 ${accentColor}`);
    parts.push(`inset ${W}px 0 0 0 ${accentColor}`);
    parts.push(`inset -${g}px 0 0 0 ${gridColor}`);
    if (flatRow < rect.r1) parts.push(`inset 0 -${g}px 0 0 ${gridColor}`);
    return parts.join(', ');
}

/** Excel-like outline: only the selection hull gets 2px edges. */
function cellRangeExteriorBoxShadow(
    rect: { r0: number; r1: number; c0: number; c1: number },
    flatRow: number,
    colIndex: number,
    color: string,
    opts?: { omitLeft?: boolean },
): string {
    const w = 2;
    const parts: string[] = [];
    if (flatRow === rect.r0) parts.push(`inset 0 ${w}px 0 0 ${color}`);
    if (flatRow === rect.r1) parts.push(`inset 0 -${w}px 0 0 ${color}`);
    if (!opts?.omitLeft && colIndex === rect.c0) parts.push(`inset ${w}px 0 0 0 ${color}`);
    if (colIndex === rect.c1) parts.push(`inset -${w}px 0 0 0 ${color}`);
    return parts.join(', ');
}

function composeDataCellSelectionShadow(
    rect: { r0: number; r1: number; c0: number; c1: number },
    flatRow: number,
    colIndex: number,
    accentColor: string,
    omitLeftExterior: boolean,
): string {
    const inner = selectionInnerGridBoxShadow(rect, flatRow, colIndex, SELECTION_GRID_LINE);
    const ext = cellRangeExteriorBoxShadow(rect, flatRow, colIndex, accentColor, {
        omitLeft: omitLeftExterior,
    });
    return [inner, ext].filter(Boolean).join(', ');
}

export type { ObjectLoaderCrudOptions, ObjectLoaderRecordModalState } from "./objectLoaderRecordModals";
export { resolveObjectLoaderCrudDefaults, coercePostgrestNumericId } from "./objectLoaderRecordModals";

/** Skip these when picking a fallback “title” column (bold) if the name column is hidden. */
const ROW_ACCENT_SKIP_KEYS = new Set(['sys_id', 'entity_id', 'dobj_id']);

const DEFAULT_CUSTOM_BADGE_COLUMN = 'dobj_name_display';

/**
 * “Custom” badge: only on the configured name column (default dobj_name_display). Never on description or other fields.
 */
function resolveCustomBadgeColumnKey(
    orderedVisibleColumns: string[],
    explicit?: string | null,
): string | null {
    const key = (explicit && explicit.trim() !== '' ? explicit.trim() : DEFAULT_CUSTOM_BADGE_COLUMN);
    return orderedVisibleColumns.includes(key) ? key : null;
}

/** Row title emphasis (font-medium) when the name column is visible; else first non-id column. */
function resolveRowAccentColumnKey(
    orderedVisibleColumns: string[],
    badgeColumnKey: string | null,
): string | null {
    if (badgeColumnKey) return badgeColumnKey;
    const hit = orderedVisibleColumns.find((c) => !ROW_ACCENT_SKIP_KEYS.has(c));
    return hit ?? null;
}

/** Per-column wrap vs clip when enableWrapClipOption; otherwise follows enableWrapText. */
function getCellWrapMode(
    col: string,
    config: TableConfig,
    columnWrapStates: Record<string, 'wrap' | 'clip'>,
): 'wrap' | 'clip' {
    if (config.enableWrapClipOption) {
        return columnWrapStates[col] ?? 'clip';
    }
    return config.enableWrapText ? 'wrap' : 'clip';
}

export type CustomRowBadgeOverflowMode = 'follow' | 'wrap' | 'clip' | 'none';

/** How the Custom badge + name behave when space is tight (independent from generic cell wrap when set). */
function getCustomBadgeLayoutKind(
    col: string,
    config: TableConfig,
    columnWrapStates: Record<string, 'wrap' | 'clip'>,
): 'wrap' | 'clip' | 'none' {
    const raw = (config.customRowBadgeOverflowMode ?? 'follow') as CustomRowBadgeOverflowMode;
    if (raw === 'wrap' || raw === 'clip' || raw === 'none') {
        return raw;
    }
    if (config.enableWrapClipOption) {
        return getCellWrapMode(col, config, columnWrapStates) === 'wrap' ? 'wrap' : 'clip';
    }
    if (config.enableWrapText) return 'wrap';
    return 'none';
}

/** `inline-flex` + `max-w-full` (never `w-full`) so short values stay width-hugged and the pill sits flush after the text. */
function getCustomBadgeCellWrapperClass(
    col: string,
    config: TableConfig,
    columnWrapStates: Record<string, 'wrap' | 'clip'>,
): string {
    const kind = getCustomBadgeLayoutKind(col, config, columnWrapStates);
    if (kind === 'wrap') {
        return 'inline-flex flex-wrap items-center justify-start gap-x-2 gap-y-1 max-w-full min-w-0 text-left align-middle';
    }
    if (kind === 'clip') {
        return 'inline-flex flex-nowrap items-center justify-start gap-2 max-w-full min-w-0 text-left align-middle';
    }
    return 'inline-flex flex-nowrap items-center justify-start gap-2 max-w-full min-w-0 text-left align-middle';
}

function getCustomBadgeValueSpanClass(
    col: string,
    config: TableConfig,
    columnWrapStates: Record<string, 'wrap' | 'clip'>,
    isAccentCol: boolean,
): string {
    const kind = getCustomBadgeLayoutKind(col, config, columnWrapStates);
    return cn(
        'min-w-0 text-left',
        kind === 'wrap' && 'break-words [overflow-wrap:anywhere]',
        kind === 'clip' && 'truncate',
        kind === 'none' && 'whitespace-nowrap',
        isAccentCol && 'font-medium',
    );
}

/** Checkbox / # column: strong divider only when freeze count = 1 (checkbox only). Otherwise light divider like other internal edges. */
function checkboxColumnRightBorderClass(
    enableColumnDivider: boolean,
    checkboxFrozen: boolean,
    enableFreezePaneColumn: boolean | undefined,
    freezePaneColumnIndexNo: number | undefined,
): string {
    if (!enableColumnDivider) return '';
    const fi = freezePaneColumnIndexNo || 1;
    if (checkboxFrozen && enableFreezePaneColumn && fi === 1) {
        return 'freeze-pane-seam';
    }
    /* fi > 1: first frozen data cell uses ::before left (higher z); checkbox right pseudo would sit under that cell. */
    if (checkboxFrozen && enableFreezePaneColumn && fi > 1) {
        return '';
    }
    return 'border-r border-gray-200';
}

export interface TableConfig {
    [x: string]: any;

    // Search Function Variables
    enableSearch?: boolean;
    searchButtonType?: 'icon' | 'button';
    searchButtonAlign?: 'left' | 'right';
    searchQuery?: string;


    // Core Features
    enableSort?: boolean;
    enableHeader?: boolean;
    enableRowNumber?: boolean;
    enableRowSelection?: boolean;
    /** Drag to select a rectangle of body cells (copy / screenshot toolbar). When omitted, treated as on. */
    enableTableCellSelection?: boolean;
    /** Plain + footer row to append new editable rows (per group when grouped). When omitted, treated as on. */
    enableQuickAddRow?: boolean;
    /** Optional mandatory keys used by quick-add row Save validation. */
    requiredColumns?: string[];
    /** Backward-compatible alias for requiredColumns. */
    mandatoryFields?: string[];
    enableMassSelection?: boolean;
    enableRowHoverHighlight?: boolean;
    enableStripedRows?: boolean;
    enableRowDivider?: boolean;
    enableColumnDivider?: boolean;
    enableColumnResize?: boolean;
    enableRowReorder?: boolean;



    enableFilter?: boolean;
    enableExport?: boolean;
    enableImport?: boolean;
    enableRefresh?: boolean;
    enablePagination?: boolean;
    enableColumnVisibility?: boolean;
    enableColumnReorder?: boolean;
    enableInlineEdit?: string[];
    enableRowActions?: boolean;
    enableBulkActions?: boolean;
    enableGroup?: boolean;

    // New Button Features
    enablePrint: boolean;
    enableChangeOwner: boolean;
    enableChart: boolean;
    enableShare: boolean;

    // Display Options
    enableWrapText?: boolean;
    enableTooltips?: boolean;
    //enableRowReorder?: boolean;

    // Title and Info Options
    enableTitle?: boolean;
    enableNewButton?: boolean;
    enableTitleBackground?: boolean;
    titleBackgroundColor?: string;
    enableRecordCount?: boolean;
    enableSortInfo?: boolean;
    enableFilterInfo?: boolean;
    enableLastUpdated?: boolean;
    titleTableSpacing?: number;

    // Table Panel Options
    enableTablePanel?: boolean;
    tablePanelBackground?: boolean;
    tablePanelBackgroundColor?: string;
    enablePresetSelector?: boolean;

    // Table Background Options
    tableBackground?: boolean;
    tableBackgroundColor?: string;

   
    sortButtonType?: 'icon' | 'button';
    sortButtonAlign?: 'left' | 'right';
    filterButtonType?: 'icon' | 'button';
    filterButtonAlign?: 'left' | 'right';
    columnVisibilityButtonType?: 'icon' | 'button';
    columnVisibilityButtonAlign?: 'left' | 'right';
    refreshButtonType?: 'icon' | 'button';
    refreshButtonAlign?: 'left' | 'right';
    exportButtonType?: 'icon' | 'button';
    exportButtonAlign?: 'left' | 'right';
    importButtonType?: 'icon' | 'button';
    importButtonAlign?: 'left' | 'right';

    printButtonType: 'icon' | 'button';
    printButtonAlign: 'left' | 'right';
    changeOwnerButtonType: 'icon' | 'button';
    changeOwnerButtonAlign: 'left' | 'right';
    chartButtonType: 'icon' | 'button';
    chartButtonAlign: 'left' | 'right';
    shareButtonType: 'icon' | 'button';
    shareButtonAlign: 'left' | 'right';

    editActionButtonType?: 'icon' | 'button';
    editActionButtonAlign?: 'left' | 'right';
    chartActionButtonType?: 'icon' | 'button';
    chartActionButtonAlign?: 'left' | 'right';
    printActionButtonType?: 'icon' | 'button';
    printActionButtonAlign?: 'left' | 'right';
    ownerActionButtonType?: 'icon' | 'button';
    ownerActionButtonAlign?: 'left' | 'right';
    tableViewButtonType?: 'icon' | 'button';
    tableViewButtonAlign?: 'left' | 'right';
    settingsButtonType?: 'icon' | 'button';
    settingsButtonAlign?: 'left' | 'right';
    presetButtonType?: 'icon' | 'button';
    presetButtonAlign?: 'left' | 'right';
    groupButtonType?: 'icon' | 'button';
    groupButtonAlign?: 'left' | 'right';

    // Freeze Pane
    enableFreezePane?: boolean;
    freezePaneType?: 'icon' | 'button';
    freezePaneAlign?: 'left' | 'right';

    // Freeze options
    enableFreezePaneRowHeader?: boolean;
    enablefreezePaneColumnIndex?: boolean;
    freezePaneColumnIndexNo: number; // 1-based index (1 = first column)
    


    // Pagination Settings
    pageSize?: number;
    pageSizeOptions?: number[];

    // Theme and Styling
    theme?: 'default' | 'professional' | 'modern' | 'minimal' | 'executive' | 'corporate' | 'finance' | 'tech' | 'classic' | 'neutral';
    tableView?: 'default' | 'max-compact' | 'compact' | 'comfortable' | 'spacious';

    // Action Settings
    rowActionsPosition?: 'left' | 'right';
    showRowActionsOnHover?: boolean;
    enabledRowActions?: string[];
    actionStyle?: 'icons' | 'menu';
    actionStyleFlow?: 'expand' | 'dropdown';
    bulkActionStyle?: 'icons' | 'buttons';

    // Additional Data Actions
    enableEditAction?: boolean;
    enableChartAction?: boolean;
    enablePrintAction?: boolean;
    enableOwnerAction?: boolean;


    // Table Footer
    enableFooter: boolean;
    enableTableTotals: boolean;

    // Additional Options
    enableWrapClipOption: boolean;
    tablePanelSpacing: number;
    newButtonType: 'icon' | 'button';
    tabPanelSpacing: number;
    tabPanelBackgroundColor: string;

    // Tab Configuration
    enableTabs: boolean;
    tabHeight: 'small' | 'medium' | 'large';
    tabAlignment: 'left' | 'right' | 'center';
    tabOrientation: 'horizontal' | 'vertical';
    tabLabelWidth: number;
    tabCustomSelection: boolean;
    tabSelectionColor: string;
    tabCustomHover: boolean;
    tabHoverColor: string;
    tabPanelBackground: string;
    /** When false, tab strip uses default white background (ignores tabPanelBackground). */
    tabUseCustomPanelBackground?: boolean;
    tabList: TabItem[];
    /** Tab strip between title & toolbar, or vertical rail left of the table (below toolbar) */
    tabBarPlacement?: TabBarPlacement;
    /** Extra space above the tab strip (when horizontal placement) */
    tabPanelMarginTop?: number;
    /** Icon-only, icon + label, or label-only */
    tabMenuStyle?: TabMenuStyle;
    /** Visual chrome for tab buttons (e.g. underline, rounded) */
    tabStyle?: string;
    /** Accent underline / side line on the active tab (all shapes) */
    tabShowUnderline?: boolean;
    /** Icon size in px (14–28); when unset, derived from tab height */
    tabIconSize?: number;
    /** Gap between tabs in px */
    tabGap?: number;

    // Column Management
    visibleColumns?: string[];
    columnOrder?: string[];

    /** Preset JSON only: default query (filter/sort/group/columns). Stripped when merging into live page config. */
    savedQueryState?: TableQueryState;

    /**
     * Column key for the “Custom” row badge and primary (bold) cell. Default: dobj_name_display (Name).
     * Badge never appears on other columns unless you set this to another visible field key.
     */
    customRowBadgeColumn?: string;
    /**
     * How the Custom badge groups with the name when space is tight.
     * `follow` = use column Wrap/Clip when “Enable Wrap & Clip” is on, else table wrap text, else no clip.
     */
    customRowBadgeOverflowMode?: CustomRowBadgeOverflowMode;
}

// Types are now imported from action components

interface Props {
    title: string;
    data: any[];
    fieldMappings: Record<string, string>;
    preferredColumns?: string[];
    config: TableConfig;
    loading?: boolean;
    error?: string | null;
    onConfigChange: (newConfig: TableConfig) => void;
    baseUrl?: string;
    onRefresh?: () => void;
    /** When set, row actions open dynamic view/edit/copy/delete modals and call Supabase on the given table. */
    objectLoaderCrud?: ObjectLoaderCrudOptions | null;
    /** If provided, new quick-add rows are merged by the parent (e.g. persist). If omitted, rows are kept in template state only until refresh. */
    onDataChange?: (rows: any[]) => void;
    /** Optional handler for title-panel New button action. */
    onNewButtonClick?: () => void;
    /** When set, ObjectLoader presets and saves use this `platform_config` scope (entity_id + dobj_id). */
    platformConfigScope?: PlatformConfigScope;
}

/** Stable row identity for React keys and findIndex — avoid entity_id alone when many rows share one tenant. */
function getTemplateRowIdentityKey(row: Record<string, unknown>): string | number | undefined {
    const qa = row.__quickAddId;
    if (qa !== undefined && qa !== null) return String(qa);
    const v = row.sys_id ?? row.dobj_id ?? row.id ?? row.entity_id;
    if (v !== undefined && v !== null) return v as string | number;
    return undefined;
}

const QUICK_ADD_DRAFT_KEY = '__quickAddDraft';

function isQuickAddDraftRow(row: Record<string, unknown>): boolean {
    return row[QUICK_ADD_DRAFT_KEY] === true;
}

function rowsLooselyEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    if (a === b) return true;
    const ak = getTemplateRowIdentityKey(a);
    const bk = getTemplateRowIdentityKey(b);
    if (ak != null && bk != null && String(ak) === String(bk)) return true;
    const aid = (a as { id?: unknown }).id;
    const bid = (b as { id?: unknown }).id;
    if (aid != null && bid != null && aid === bid) return true;
    return false;
}

export default function ConfigurableListTemplate({
    title,
    data,
    fieldMappings,
    preferredColumns,
    config,
    loading,
    error,
    onConfigChange,
    baseUrl = '/data',
    onRefresh,
    objectLoaderCrud = null,
    onDataChange,
    onNewButtonClick,
    platformConfigScope: platformConfigScopeProp,
}: Props) {
    // Initialize selectedRows as a proper Set to fix the .has() error

    const navigate = useNavigate();
    const configRef = useRef(config);
    configRef.current = config;

    const platformScope = useMemo<PlatformConfigScope>(() => {
        if (platformConfigScopeProp) return platformConfigScopeProp;
        return { entityId: DB_ENTITY_ID, dobjId: DB_DOBJ_ID };
    }, [platformConfigScopeProp?.entityId, platformConfigScopeProp?.dobjId]);
    const platformScopeRef = useRef(platformScope);
    platformScopeRef.current = platformScope;

    const pushConfig = useCallback(
        (next: TableConfig) => onConfigChange(applyFreezePaneConsistency(next) as TableConfig),
        [onConfigChange],
    );
    const pushConfigRef = useRef(pushConfig);
    pushConfigRef.current = pushConfig;

    /** `enableFreezePane === false` turns off table/header/column freeze; action bar Freeze control stays visible. */
    const freezePaneAppliesToTable = config.enableFreezePane !== false;
    const tableFreezeColumnEnabled = freezePaneAppliesToTable && !!config.enablefreezePaneColumnIndex;
    const tableFreezeHeaderEnabled = freezePaneAppliesToTable && !!config.enableFreezePaneRowHeader;

    // State management
    const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>([]);
    const [filterCriteria, setFilterCriteria] = useState<FilterCriteria[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [objectLoaderModal, setObjectLoaderModal] = useState<ObjectLoaderRecordModalState>(null);
    const [cellRangeGridCopy, setCellRangeGridCopy] = useState<{
        rows: Record<string, unknown>[];
        cols: string[];
    } | null>(null);
    const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
    /** Rows created via quick-add when parent does not supply `onDataChange`. */
    const [localDataAppendix, setLocalDataAppendix] = useState<Record<string, unknown>[]>([]);
    const [presets, setPresets] = useState<TablePreset[]>([]);
    const [activePresetId, setActivePresetId] = useState<string>('default');
    const location = useLocation();
    const isShareRoute = useMemo(() => new URLSearchParams(location.search).has('share'), [location.search]);
    const [, setSearchParams] = useSearchParams();
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [checkboxColumnWidth, setCheckboxColumnWidth] = useState<number | null>(null);
    const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
    const [rowDragOverIndex, setRowDragOverIndex] = useState<number | null>(null);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
    const [columnDragOverIndex, setColumnDragOverIndex] = useState<number | null>(null);
    const [rowOrder, setRowOrder] = useState<number[] | null>(null);
    const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
    const [chartPanelOpen, setChartPanelOpen] = useState(false);
    const [columnWrapStates, setColumnWrapStates] = useState<Record<string, 'wrap' | 'clip'>>({});
    /** Inline-edit + Custom badge: show text+badge until user clicks value; then input only (badge hidden). */
    const [inlineEditActiveKey, setInlineEditActiveKey] = useState<string | null>(null);

    /** Re-fetch presets from DB and merge with localStorage (icons + custom); keeps preset `config` in sync after Save. */
    const reloadPresetsFromDatabase = useCallback(async () => {
        let overrides: Record<string, { iconKey?: string; customIcon?: string }> = {};
        try {
            overrides = JSON.parse(localStorage.getItem('presetIconOverrides') || '{}');
        } catch {
            overrides = {};
        }
        const { entityId, dobjId } = platformScopeRef.current;
        const { presets: dbPresets, error: dbError } = await fetchPresetsFromDB(entityId, dobjId);
        if (dbError) {
            console.warn('[Presets] Refresh after save failed:', dbError);
            return;
        }
        if (!dbPresets.length) return;

        const mergedSystem = dbPresets.map((p) => ({
            ...p,
            ...(overrides[p.id] || {}),
        }));
        const customPresets = loadCustomPresetsFromStorage();
        const systemIds = new Set(mergedSystem.map((p) => p.id));
        const uniqueCustom = customPresets.filter((p) => !systemIds.has(p.id));
        const merged = [...mergedSystem, ...uniqueCustom];
        setPresets(merged);
    }, [platformScope.entityId, platformScope.dobjId]);
    const initialShareToken =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('share') : null;
    const [shareViewParams, setShareViewParams] = useState<{
        isShareView: boolean;
        shareToken: string | null;
        restrictCopy: boolean;
        panelAllowed: boolean;
        lockedPresetId?: string;
        lockedTabId?: string;
        requireCredentials?: boolean;
        allowedEmailOrDomain?: string;
    }>({
        isShareView: Boolean(initialShareToken),
        shareToken: initialShareToken,
        restrictCopy: false,
        panelAllowed: false,
    });
    const [shareParamsResolved, setShareParamsResolved] = useState<boolean>(!initialShareToken);
    const [shareGeneratedLinks, setShareGeneratedLinks] = useState<
        Array<{ token: string; linkName: string; url: string; createdAt?: string }>
    >([]);
    const [shareConsentAccepted, setShareConsentAccepted] = useState(false);
    const [shareCredentialUser, setShareCredentialUser] = useState('');
    const [shareCredentialPassword, setShareCredentialPassword] = useState('');
    const [shareCredentialError, setShareCredentialError] = useState<string | null>(null);
    const [shareCredentialAuthed, setShareCredentialAuthed] = useState(false);
    const copyRestrictedByShare = shareViewParams.isShareView && shareViewParams.restrictCopy;
    const toShareOnlyParams = useCallback((prev: URLSearchParams): URLSearchParams => {
        const token = prev.get('share') || shareViewParams.shareToken;
        const only = new URLSearchParams();
        if (token) only.set('share', token);
        return only;
    }, [shareViewParams.shareToken]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        let cancelled = false;
        const resolveShareParams = async () => {
            const q = new URLSearchParams(window.location.search);
            const rawShare = q.get('share');
            const isShare = Boolean(rawShare);
            const rawRestrict = q.get('restrictCopy');
            const rawPanel = q.get('panelAllowed');
            let restrict = rawRestrict === '1';
            let panel = rawPanel === '1';

            let resolvedFromDb = false;
            let dbLookupError: string | null = null;
            let lockedPresetId: string | undefined;
            let lockedTabId: string | undefined;
            let requireCredentials = false;
            let allowedEmailOrDomain: string | undefined;
            if (isShare && (rawRestrict == null || rawPanel == null)) {
                const { entityId: se, dobjId: sd } = platformScopeRef.current;
                const { settings, error } = await resolveShareLinkSettingsFromDB(String(rawShare), se, sd);
                dbLookupError = error;
                if (settings) {
                    restrict = Boolean(settings.restrictCopy);
                    panel = Boolean(settings.panelAllowed);
                    lockedPresetId = settings.lockedPresetId;
                    lockedTabId = settings.lockedTabId;
                    requireCredentials = Boolean(settings.requireCredentials);
                    allowedEmailOrDomain = settings.allowedEmailOrDomain;
                    resolvedFromDb = true;
                }
            }
            if (cancelled) return;
            setShareViewParams({
                isShareView: isShare,
                shareToken: rawShare,
                restrictCopy: restrict,
                panelAllowed: panel,
                lockedPresetId,
                lockedTabId,
                requireCredentials,
                allowedEmailOrDomain,
            });
            setShareParamsResolved(true);
        };
        void resolveShareParams();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleCreateShareTokenSettings = useCallback(
        async (
            token: string,
            settings: {
                restrictCopy: boolean;
                panelAllowed: boolean;
                scope?: string;
                linkName?: string;
                presetId?: string;
                lockedPresetId?: string;
                lockedTabId?: string;
                requireCredentials?: boolean;
                allowedEmailOrDomain?: string;
            }
        ): Promise<boolean> => {
            const { entityId, dobjId } = platformScopeRef.current;
            const { success } = await upsertShareLinkSettingsInDB(token, settings, entityId, dobjId);
            return success;
        },
        [],
    );

    const currentTabIdForShare = useMemo(() => {
        const q = new URLSearchParams(location.search);
        return q.get(TABLE_TAB_URL_PARAM) ?? undefined;
    }, [location.search]);

    const loadShareLinksForPreset = useCallback(async (presetId: string) => {
        const { entityId, dobjId } = platformScopeRef.current;
        const { links } = await listShareLinksForPresetFromDB(presetId, entityId, dobjId);
        const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
        setShareGeneratedLinks(
            links.map((l) => ({
                token: l.token,
                linkName: l.linkName,
                createdAt: l.createdAt,
                url: `${base}?share=${encodeURIComponent(l.token)}`,
            })),
        );
    }, []);

    useEffect(() => {
        void loadShareLinksForPreset(activePresetId);
    }, [activePresetId, loadShareLinksForPreset, config?.shareLinkUrl]);

    const handleDeleteShareToken = useCallback(
        async (token: string): Promise<boolean> => {
            const { entityId, dobjId } = platformScopeRef.current;
            const { success } = await deleteShareLinkFromDB(token, entityId, dobjId);
            if (success) {
                await loadShareLinksForPreset(activePresetId);
            }
            return success;
        },
        [activePresetId, loadShareLinksForPreset],
    );

    const handleDeleteAllShareTokens = useCallback(async (): Promise<boolean> => {
        const { entityId, dobjId } = platformScopeRef.current;
        const { success } = await deleteShareLinksForPresetFromDB(activePresetId, entityId, dobjId);
        if (success) {
            await loadShareLinksForPreset(activePresetId);
        }
        return success;
    }, [activePresetId, loadShareLinksForPreset]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!shareViewParams.isShareView || !shareViewParams.shareToken) {
            setShareConsentAccepted(false);
            setShareCredentialAuthed(false);
            return;
        }
        const consentKey = `share-consent-${shareViewParams.shareToken}`;
        const authKey = `share-auth-${shareViewParams.shareToken}`;
        setShareConsentAccepted(sessionStorage.getItem(consentKey) === '1');
        setShareCredentialAuthed(sessionStorage.getItem(authKey) === '1');
    }, [shareViewParams.isShareView, shareViewParams.shareToken]);

    useEffect(() => {
        if (!shareViewParams.isShareView || !shareViewParams.shareToken) return;
        setSearchParams((prev) => {
            const next = new URLSearchParams();
            next.set('share', shareViewParams.shareToken!);
            const prevStr = prev.toString();
            const nextStr = next.toString();
            return next;
        }, { replace: true });
    }, [setSearchParams, shareViewParams.isShareView, shareViewParams.shareToken]);

    const requiresCredentialGate = shareViewParams.isShareView && Boolean(shareViewParams.requireCredentials);
    const shareContentUnlocked =
        !shareViewParams.isShareView
            ? true
            : shareParamsResolved && shareConsentAccepted && (!requiresCredentialGate || shareCredentialAuthed);

    const submitShareCredentials = useCallback(() => {
        const allowed = shareViewParams.allowedEmailOrDomain?.trim().toLowerCase() || '';
        const candidate = shareCredentialUser.trim().toLowerCase();
        const passwordOk = shareCredentialPassword === 'Admin@1212';
        const identityOk = !allowed
            || candidate === allowed
            || (allowed.startsWith('@') ? candidate.endsWith(allowed) : candidate.endsWith(`@${allowed}`));
        if (!passwordOk || !identityOk) {
            setShareCredentialError('Invalid username/email domain or password.');
            return;
        }
        if (shareViewParams.shareToken) {
            sessionStorage.setItem(`share-auth-${shareViewParams.shareToken}`, '1');
        }
        setShareCredentialError(null);
        setShareCredentialAuthed(true);
    }, [shareCredentialPassword, shareCredentialUser, shareViewParams.allowedEmailOrDomain, shareViewParams.shareToken]);

    const allColumns = Object.keys(fieldMappings);
    const [activeColumns, setActiveColumns] = useState<string[]>(allColumns);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns);
    const [columnOrder, setColumnOrder] = useState<string[]>(Object.keys(fieldMappings));

    const fieldMappingsRef = useRef(fieldMappings);
    fieldMappingsRef.current = fieldMappings;

    const tableUserId = useAuthStore((s) => s.user?.id ?? 'local');
    const templateId = useMemo(() => computeTemplateId(fieldMappings), [fieldMappings]);
    
    const resizeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const checkboxColumnRef = useRef<HTMLTableCellElement | null>(null);
    const headerCellRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [openRowActionsMenuId, setOpenRowActionsMenuId] = useState<string | null>(null);
    const isResizingColumnRef = useRef(false);
    const [activeResizeColumn, setActiveResizeColumn] = useState<string | null>(null);
    const [activeInlineCellKey, setActiveInlineCellKey] = useState<string | null>(null);
    const [activeQuickAddCellKey, setActiveQuickAddCellKey] = useState<string | null>(null);
    const [quickAddInlineErrors, setQuickAddInlineErrors] = useState<Record<string, string>>({});
    const inlineEditHighlightColor =
        config.tabCustomSelection && config.tabSelectionColor ? config.tabSelectionColor : '#2563eb';

    const navigateToRowDetail = useCallback((row: Record<string, unknown>) => {
        const rowId =
            objectLoaderCrud != null
                ? resolveRowRecordId(row, objectLoaderCrud.idColumn) ?? resolveTableRowKey(row)
                : resolveTableRowKey(row);
        if (rowId == null) return;
        navigate(`${baseUrl}/${encodeURIComponent(String(rowId))}`);
    }, [baseUrl, navigate, objectLoaderCrud]);

    const goToObjectDataFromRow = useCallback((row: Record<string, unknown>) => {
        if (baseUrl !== '/objects') return;
        const objectId =
            objectLoaderCrud != null
                ? resolveRowRecordId(row, objectLoaderCrud.idColumn) ?? row.sys_id ?? row.dobj_id
                : row.sys_id ?? row.dobj_id ?? row.id;
        if (objectId == null) return;
        const objectName = String(row.dobj_name_display ?? row.dobj_name_system ?? `Object ${objectId}`).trim() || `Object ${objectId}`;
        const cfgRaw = row.dobj_configuration;
        let objectIcon: string | undefined;
        if (cfgRaw && typeof cfgRaw === 'object') {
            objectIcon = String((cfgRaw as Record<string, unknown>).objectIcon ?? '').trim() || undefined;
        } else if (typeof cfgRaw === 'string') {
            try {
                const parsed = JSON.parse(cfgRaw) as Record<string, unknown>;
                objectIcon = String(parsed.objectIcon ?? '').trim() || undefined;
            } catch {
                objectIcon = undefined;
            }
        }
        const payload = { id: String(objectId), name: objectName, icon: objectIcon };
        try {
            localStorage.setItem('activeObjectDataTarget', JSON.stringify(payload));
            window.dispatchEvent(new CustomEvent('active-object-data-target-changed', { detail: payload }));
        } catch {
            /* non-blocking */
        }
        navigate(`/objects/${encodeURIComponent(String(objectId))}/records`);
    }, [baseUrl, navigate, objectLoaderCrud]);

    const isObjectManagerLinkCell = useCallback(
        (rowIsDraft: boolean, col: string) =>
            !rowIsDraft &&
            baseUrl === '/objects' &&
            (col === 'dobj_name_display' || col === 'sys_id'),
        [baseUrl],
    );

    const detectFieldLinkKind = useCallback((col: string, value: string): 'email' | 'url' | null => {
        const v = String(value ?? '').trim();
        if (!v || v === '-') return null;
        const colLower = col.toLowerCase();
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        const urlRegex = /^(https?:\/\/|www\.)[^\s]+$/i;
        if (emailRegex.test(v) || colLower.includes('email')) return 'email';
        if (urlRegex.test(v) || colLower.includes('url') || colLower.includes('website') || colLower.includes('web')) return 'url';
        return null;
    }, []);

    // Checkbox column width only (data columns use auto layout unless `columnWidths` has explicit px)
    useEffect(() => {
        if (visibleColumns.length === 0) return;
        if (checkboxColumnRef.current) {
            const checkboxWidth = checkboxColumnRef.current.offsetWidth;
            if (checkboxWidth !== checkboxColumnWidth) {
                setCheckboxColumnWidth(checkboxWidth);
            }
        }
    }, [visibleColumns, data.length, localDataAppendix.length]);

    /* =======================
      UI & DATA HELPERS
      ======================= */

    const mergedTableSource = useMemo(
        () => (onDataChange ? data : [...data, ...localDataAppendix]),
        [data, localDataAppendix, onDataChange],
    );

    const dateColumnKeys = useMemo(() => {
        const keys = Object.keys(fieldMappings);
        const dateKeyRegex = /(timestamp|time|date|created|updated|modified|_ts$|_date$|_at$|_time$)/i;
        const candidates = keys.filter((k) => dateKeyRegex.test(k));
        if (!candidates.length) return [];

        const sampleRows = mergedTableSource.slice(0, 30);
        const parseableRatio = (colKey: string) => {
            let total = 0;
            let ok = 0;
            for (const r of sampleRows) {
                const raw = (r as Record<string, unknown> | undefined)?.[colKey];
                if (raw == null) continue;
                const s = String(raw).trim();
                if (!s) continue;
                total += 1;
                const t = Date.parse(s);
                if (!Number.isNaN(t)) ok += 1;
                if (total >= 20) break;
            }
            if (total === 0) return 0;
            return ok / total;
        };

        return candidates.filter((k) => parseableRatio(k) >= 0.6);
    }, [fieldMappings, mergedTableSource]);

    // Use the reusable data processing hook
    const { filteredEntities, sortedData } = useTableData(
        mergedTableSource,
        searchTerm,
        sortCriteria,
        filterCriteria,
        fieldMappings,
        groupByColumn
    );

    const displayRows = rowOrder ? rowOrder.map(i => sortedData[i]) : sortedData;
    const displayIndices = rowOrder ? rowOrder : sortedData.map((_, i) => i);

    /** Visual row sequence (applies manual reorder on top of sort). Grouping uses this so drag-drop matches the list. */
    const orderedSortedRows = useMemo(() => {
        const order = rowOrder ?? sortedData.map((_, i) => i);
        return order.map((si) => sortedData[si]).filter((r) => r != null);
    }, [rowOrder, sortedData]);

    const groupedDisplayData = useMemo(() => {
        if (!groupByColumn) return null;
        return orderedSortedRows.reduce<Record<string, typeof sortedData>>((groups, row) => {
            const key = row[groupByColumn]?.toString() || 'Ungrouped';
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
            return groups;
        }, {});
    }, [groupByColumn, orderedSortedRows]);

    const findSortedIndexForRow = useCallback(
        (row: Record<string, unknown>) => sortedData.findIndex((r) => rowsLooselyEqual(r as Record<string, unknown>, row)),
        [sortedData]
    );

    const findDisplayIndexForRow = useCallback(
        (row: Record<string, unknown>) =>
            orderedSortedRows.findIndex((r) => rowsLooselyEqual(r as Record<string, unknown>, row)),
        [orderedSortedRows]
    );

    const orderedVisibleCols = useMemo(
        () => columnOrder.filter((c) => visibleColumns.includes(c)),
        [columnOrder, visibleColumns],
    );

    const flatDataRowsForRange = useMemo(() => {
        if (!groupedDisplayData) return displayRows;
        const rows: typeof sortedData = [];
        for (const [, groupRows] of Object.entries(groupedDisplayData)) {
            for (const r of groupRows) rows.push(r);
        }
        return rows;
    }, [groupedDisplayData, displayRows]);

    const [cellRangeAnchor, setCellRangeAnchor] = useState<CellRangePoint | null>(null);
    const [cellRangeFocus, setCellRangeFocus] = useState<CellRangePoint | null>(null);
    const cellRangeDraggingRef = useRef(false);

    const cellRangeRect = useMemo(() => {
        if (!cellRangeAnchor || !cellRangeFocus) return null;
        return normalizeCellRangeRect(orderedVisibleCols, cellRangeAnchor, cellRangeFocus);
    }, [cellRangeAnchor, cellRangeFocus, orderedVisibleCols]);

    const cellRangeHasDraftRows = useMemo(() => {
        if (!cellRangeRect) return false;
        const slice = flatDataRowsForRange.slice(cellRangeRect.r0, cellRangeRect.r1 + 1) as Record<string, unknown>[];
        return slice.some((r) => isQuickAddDraftRow(r));
    }, [cellRangeRect, flatDataRowsForRange]);

    const clearCellRangeSelection = useCallback(() => {
        setCellRangeAnchor(null);
        setCellRangeFocus(null);
        cellRangeDraggingRef.current = false;
    }, []);

    const tableCellSelectionEnabled = config.enableTableCellSelection !== false;

    useEffect(() => {
        if (config.enableTableCellSelection === false) {
            clearCellRangeSelection();
            setCellRangeGridCopy(null);
        }
    }, [config.enableTableCellSelection, clearCellRangeSelection]);

    /** Checkbox-driven row highlight: map sortedData indices → flat display row, merge contiguous blocks. */
    const checkboxSelectionRanges = useMemo(() => {
        if (!config.enableRowSelection || selectedRows.length === 0 || orderedVisibleCols.length === 0) {
            return [] as { r0: number; r1: number; c0: number; c1: number }[];
        }
        const sortedIdxToFlat = new Map<number, number>();
        if (groupedDisplayData) {
            let f = 0;
            for (const [, groupRows] of Object.entries(groupedDisplayData)) {
                for (const row of groupRows) {
                    const si = sortedData.findIndex((r) =>
                        rowsLooselyEqual(r as Record<string, unknown>, row as Record<string, unknown>),
                    );
                    if (si >= 0) sortedIdxToFlat.set(si, f);
                    f++;
                }
            }
        } else {
            displayIndices.forEach((sortedIdx, displayIdx) => {
                sortedIdxToFlat.set(sortedIdx, displayIdx);
            });
        }
        const flats = selectedRows
            .map((si) => sortedIdxToFlat.get(si))
            .filter((x): x is number => x !== undefined);
        if (flats.length === 0) return [];

        const uniq = [...new Set(flats)].sort((a, b) => a - b);
        const cLast = orderedVisibleCols.length - 1;
        const ranges: { r0: number; r1: number; c0: number; c1: number }[] = [];
        let s = uniq[0];
        let p = uniq[0];
        for (let i = 1; i < uniq.length; i++) {
            if (uniq[i] === p + 1) {
                p = uniq[i];
                continue;
            }
            ranges.push({ r0: s, r1: p, c0: 0, c1: cLast });
            s = p = uniq[i];
        }
        ranges.push({ r0: s, r1: p, c0: 0, c1: cLast });
        return ranges;
    }, [
        config.enableRowSelection,
        selectedRows,
        orderedVisibleCols,
        groupedDisplayData,
        displayIndices,
        sortedData,
    ]);

    const handleCellRangeMouseDown = useCallback(
        (e: React.MouseEvent, flatRowIndex: number, col: string) => {
            if (e.button !== 0) return;
            const t = e.target as HTMLElement;
            if (t.closest('input, textarea, select, button, a')) return;
            if (shareViewParams.isShareView && shareViewParams.restrictCopy) return;
            if (!tableCellSelectionEnabled) return;
            const clearRowSelectionForCellRange = () => {
                setSelectedRows((prev) => (prev.length === 0 ? prev : []));
            };
            if (e.shiftKey && cellRangeAnchor) {
                setCellRangeFocus({ row: flatRowIndex, col });
                clearRowSelectionForCellRange();
                e.preventDefault();
                return;
            }
            setCellRangeAnchor({ row: flatRowIndex, col });
            setCellRangeFocus({ row: flatRowIndex, col });
            cellRangeDraggingRef.current = true;
            clearRowSelectionForCellRange();
            e.preventDefault();
        },
        [cellRangeAnchor, shareViewParams.isShareView, shareViewParams.restrictCopy, tableCellSelectionEnabled],
    );

    const handleCellRangeMouseEnter = useCallback((e: React.MouseEvent, flatRowIndex: number, col: string) => {
        if (!cellRangeDraggingRef.current) return;
        if ((e.buttons & 1) === 0) return;
        setCellRangeFocus({ row: flatRowIndex, col });
    }, []);

    useEffect(() => {
        const endDrag = () => {
            cellRangeDraggingRef.current = false;
        };
        window.addEventListener('mouseup', endDrag);
        return () => window.removeEventListener('mouseup', endDrag);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') clearCellRangeSelection();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [clearCellRangeSelection]);

    const openCellRangeCopyModal = useCallback(() => {
        if (!tableCellSelectionEnabled) return;
        if (shareViewParams.isShareView && shareViewParams.restrictCopy) return;
        if (!cellRangeRect) return;
        const cols = orderedVisibleCols.slice(cellRangeRect.c0, cellRangeRect.c1 + 1);
        const slice = flatDataRowsForRange.slice(cellRangeRect.r0, cellRangeRect.r1 + 1) as Record<string, unknown>[];
        if (slice.some((r) => isQuickAddDraftRow(r))) return;
        if (cols.length === 0 || slice.length === 0) return;
        setCellRangeGridCopy({ rows: slice, cols });
    }, [
        cellRangeRect,
        orderedVisibleCols,
        flatDataRowsForRange,
        shareViewParams.isShareView,
        shareViewParams.restrictCopy,
        tableCellSelectionEnabled,
    ]);

    const captureSelectionAsPng = useCallback(async () => {
        if (!tableCellSelectionEnabled) return;
        if (shareViewParams.isShareView && shareViewParams.restrictCopy) return;
        if (!cellRangeRect) return;
        const cols = orderedVisibleCols.slice(cellRangeRect.c0, cellRangeRect.c1 + 1);
        const slice = flatDataRowsForRange.slice(cellRangeRect.r0, cellRangeRect.r1 + 1) as Record<string, unknown>[];
        if (slice.some((r) => isQuickAddDraftRow(r))) return;
        if (cols.length === 0 || slice.length === 0) return;
        const { html } = buildClipboardGridPayload(slice, cols, fieldMappings);
        const wrap = document.createElement('div');
        wrap.style.cssText =
            'position:fixed;left:-10000px;top:0;background:#fff;padding:10px;box-sizing:border-box;';
        wrap.innerHTML = html;
        document.body.appendChild(wrap);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(wrap, { backgroundColor: '#ffffff', scale: 2, logging: false });
            document.body.removeChild(wrap);
            const fname = `table-selection-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.png`;
            await new Promise<void>((resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('PNG blob failed'));
                            return;
                        }
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fname;
                        a.rel = 'noopener';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        window.alert(
                            `Screenshot saved.\n\nFile name: ${fname}\n\nYour browser saved the file to your default download folder (on most systems this is the Downloads folder). The exact folder path is chosen by your browser and is not available to web apps for security reasons.`
                        );
                        resolve();
                    },
                    'image/png',
                    0.95
                );
            });
        } catch (e) {
            if (wrap.parentNode) document.body.removeChild(wrap);
            console.error(e);
            window.alert('Could not create the screenshot. Try again or use Copy instead.');
        }
    }, [
        cellRangeRect,
        orderedVisibleCols,
        flatDataRowsForRange,
        fieldMappings,
        shareViewParams.isShareView,
        shareViewParams.restrictCopy,
        tableCellSelectionEnabled,
    ]);

    useEffect(() => {
        const onCopy = (e: ClipboardEvent) => {
            if (!tableCellSelectionEnabled) return;
            if (shareViewParams.isShareView && shareViewParams.restrictCopy) return;
            const tgt = e.target;
            if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement) return;
            if (!cellRangeRect) return;
            const cols = orderedVisibleCols.slice(cellRangeRect.c0, cellRangeRect.c1 + 1);
            if (cols.length === 0) return;
            const slice = flatDataRowsForRange.slice(cellRangeRect.r0, cellRangeRect.r1 + 1) as Record<string, unknown>[];
            if (slice.some((r) => isQuickAddDraftRow(r))) return;
            if (slice.length === 0) return;
            const { tsv, html } = buildClipboardGridPayload(slice, cols, fieldMappings);
            e.preventDefault();
            e.clipboardData?.setData('text/plain', tsv);
            e.clipboardData?.setData('text/html', html);
        };
        window.addEventListener('copy', onCopy);
        return () => window.removeEventListener('copy', onCopy);
    }, [
        shareViewParams.isShareView,
        shareViewParams.restrictCopy,
        cellRangeRect,
        orderedVisibleCols,
        flatDataRowsForRange,
        fieldMappings,
        tableCellSelectionEnabled,
    ]);

    const sortSignature = sortCriteria.map(s => `${s.column}-${s.order}`).join(',');
    useEffect(() => {
        setRowOrder(null);
    }, [sortedData.length, sortSignature]);

    //// ---------- Presets ----------
    //const applyPreset = (preset: TablePreset) => {
    //    onConfigChange(preset.config);
    //    setShowPresetDropdown(false);
    //};

    // ---------- Refresh ----------
    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    // ---------- Button Content ----------
    //const getButtonContent = (
    //    icon: React.ReactNode,
    //    text: string,
    //    buttonType: 'icon' | 'button'
    //) => {
    //    if (buttonType === 'button') {
    //        return (
    //            <span className="flex items-center">
    //                {icon}
    //                <span className="ml-2">{text}</span>
    //            </span>
    //        );
    //    }
    //    return icon;
    //};

    // ---------- Styles ----------
    //const getTitleStyle = (): React.CSSProperties => {
    //    const style: React.CSSProperties = {};

    //    if (config.enableTitleBackground) {
    //        style.backgroundColor = config.titleBackgroundColor || '#ffffff';
    //        style.padding = '1rem';
    //        style.borderRadius = '0.5rem 0.5rem 0 0';
    //    }

    //    if (config.titleTableSpacing) {
    //        style.marginBottom = `${config.titleTableSpacing}px`;
    //    }

    //    return style;
    //};

    //const getTablePanelStyle = (): React.CSSProperties => {
    //    if (!config.tablePanelBackground) return {};
    //    return {
    //        backgroundColor: config.tablePanelBackgroundColor || '#ffffff',
    //        padding: '1rem',
    //        borderRadius: '0.5rem'
    //    };
    //};

    //const getTableStyle = (): React.CSSProperties => {
    //    if (!config.tableBackground) return {};
    //    return {
    //        backgroundColor: config.tableBackgroundColor || '#ffffff'
    //    };
    //};

    //const getThemeClasses = (): string => {
    //    const baseClasses = 'data-table';

    //    const themeClasses: Record<string, string> = {
    //        default: '',
    //        professional: 'theme-professional',
    //        modern: 'theme-modern',
    //        minimal: 'theme-minimal'
    //    };

    //    const densityClasses: Record<string, string> = {
    //        compact: 'compact',
    //        standard: '',
    //        comfortable: 'comfortable',
    //        spacious: 'spacious'
    //    };

    //    return `
    //    ${baseClasses}
    //    ${themeClasses[config.theme || 'default']}
    //    ${densityClasses[config.density || 'standard']}
    //    ${!config.enableRowHoverHighlight ? 'no-hover' : ''}
    //    ${config.enableStripedRows ? 'striped' : ''}
    //    ${config.enableStickyHeader ? 'sticky-header' : ''}
    //    ${config.enableFreezeFirstColumn ? 'freeze-first-column' : ''}
    //`;
    //};



    // Load presets: DB active preset → DB default → code Default failover
    useEffect(() => {
        let cancelled = false;

        const loadPresets = async () => {
            let overrides: Record<string, { iconKey?: string; customIcon?: string }> = {};
            try {
                overrides = JSON.parse(localStorage.getItem('presetIconOverrides') || '{}');
            } catch {
                overrides = {};
            }

            const { entityId: loadEntityId, dobjId: loadDobjId } = platformScopeRef.current;
            await ensureObjectLoaderPlatformConfigRow(loadEntityId, loadDobjId);
            const {
                presets: dbPresets,
                activePresetId: dbActiveId,
                activeTabId: dbTabId,
                objectTabBar,
                error: dbError,
            } = await fetchPresetsFromDB(loadEntityId, loadDobjId);

            if (cancelled) return;

            const CODE_DEFAULT = DEFAULT_PRESETS[0];
            let systemPresets: TablePreset[];
            let resolvedActiveId: string;

            if (!dbError && dbPresets.length > 0) {
                systemPresets = dbPresets;
                resolvedActiveId = dbActiveId || 'default';
                console.log(`[Presets] Loaded ${dbPresets.length} preset(s) from database, active: ${resolvedActiveId}`);
            } else {
                systemPresets = [CODE_DEFAULT];
                resolvedActiveId = 'default';
                if (dbError) {
                    console.warn(`[Presets] Database fetch failed, using code Default failover. Error: ${dbError}`);
                    alert('Could not load presets from server. Showing default preset only. Other presets will be available when the connection is restored.');
                }
            }

            // Apply icon overrides from localStorage
            const mergedSystem = systemPresets.map((p) => ({
                ...p,
                ...(overrides[p.id] || {}),
            }));

            // Load user's custom presets from localStorage
            const customPresets = loadCustomPresetsFromStorage();
            const systemIds = new Set(mergedSystem.map((p) => p.id));
            const uniqueCustom = customPresets.filter((p) => !systemIds.has(p.id));

            const allPresets = [...mergedSystem, ...uniqueCustom];
            setPresets(allPresets);

            // Apply active preset from DB, then default, then first
            const activePreset = allPresets.find((p) => p.id === resolvedActiveId)
                || allPresets.find((p) => p.isDefault)
                || allPresets[0];

            if (activePreset) {
                setActivePresetId(activePreset.id);
                const base = stripSavedQueryStateFromConfig(activePreset.config as Record<string, unknown>);
                const merged = mergeObjectTabBarIntoConfig(base as TableConfig, objectTabBar);
                const withCanonicalTabs: TableConfig = {
                    ...merged,
                    tabList: injectCanonicalDefaultTab<TabItem>(merged.tabList),
                };
                pushConfigRef.current(withCanonicalTabs);

                setSearchParams((sp) => {
                    if (isShareRoute || shareViewParams.isShareView) {
                        return toShareOnlyParams(sp);
                    }
                    const next = new URLSearchParams(sp);
                    if (!sp.get('preset')) {
                        next.set('preset', resolvedActiveId);
                    }
                    const tabs = withCanonicalTabs.tabList ?? [];
                    if (!sp.get(TABLE_TAB_URL_PARAM) && dbTabId && tabs.some((t: TabItem) => t.id === dbTabId)) {
                        next.set(TABLE_TAB_URL_PARAM, dbTabId);
                    }
                    return next;
                });
            }
        };

        loadPresets();
        return () => { cancelled = true; };
    }, [
        isShareRoute,
        platformScope.entityId,
        platformScope.dobjId,
        setSearchParams,
        shareViewParams.isShareView,
        shareViewParams.shareToken,
        toShareOnlyParams,
    ]);

    // Close preset dropdown when clicking outside (used when table panel is disabled and dropdown is in title bar)
    useEffect(() => {
        if (!showPresetDropdown) return;
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowPresetDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showPresetDropdown]);

    // Ctrl+F search activation is now handled by Action_Search component
    // No need for this handler here since search is managed by individual action components

    const handleOpenTableSettings = () => {
        setIsTableSettingsOpen(true);
    };

    const handleCloseTableSettings = () => {
        setIsTableSettingsOpen(false);
    };
    const handleFilterClick = () => {
        console.log("Filter button clicked!");
        // Implement filter logic
    };

    const [showExportConsent, setShowExportConsent] = React.useState(false);
    const [showEmailInput, setShowEmailInput] = React.useState(false);
    const [emailAddresses, setEmailAddresses] = React.useState('');
    const [pendingExportFormat, setPendingExportFormat] = React.useState<'csv' | 'excel' | 'json' | 'connector' | 'email' | null>(null);

    const handleExportClick = (format: 'csv' | 'excel' | 'json' | 'connector' | 'email') => {
        if (format === 'email') {
            setPendingExportFormat(format);
            setShowEmailInput(true);
        } else if (format === 'connector') {
            setPendingExportFormat(format);
            setShowConnectorExportConfirm(true);
        } else {
            setPendingExportFormat(format);
            setShowExportConsent(true);
        }
    };

    const handleExportConfirm = () => {
        setShowExportConsent(false);
        if (!pendingExportFormat) return;

        // Get the table data
        const tableData = sortedData;
        const headers = columnOrder
            .filter(col => visibleColumns.includes(col))
            .map(col => fieldMappings[col] || col);

        // Export based on format
        if (pendingExportFormat === 'csv') {
            exportToCSV(tableData, headers);
        } else if (pendingExportFormat === 'excel') {
            exportToExcel(tableData, headers);
        } else if (pendingExportFormat === 'json') {
            exportToJSON(tableData, headers);
        }

        setPendingExportFormat(null);
    };

    const handleExportCancel = () => {
        setShowExportConsent(false);
        setPendingExportFormat(null);
    };

    const exportToCSV = (data: any[], headers: string[]) => {
        const csvRows = [
            headers.join(','),
            ...data.map(row => {
                return columnOrder
                    .filter(col => visibleColumns.includes(col))
                    .map(col => {
                        const value = row[col];
                        // Escape commas and quotes in CSV
                        if (value === null || value === undefined) return '';
                        const stringValue = String(value).replace(/"/g, '""');
                        return `"${stringValue}"`;
                    })
                    .join(',');
            })
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title || 'table'}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = (data: any[], headers: string[]) => {
        // Create Excel XML format (Excel 2003+ compatible)
        const escapeXml = (str: string): string => {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        let xml = '<?xml version="1.0"?>\n';
        xml += '<?mso-application progid="Excel.Sheet"?>\n';
        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
        xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
        xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
        xml += '<Worksheet ss:Name="Sheet1">\n';
        xml += '<Table>\n';

        // Headers row
        xml += '<Row>\n';
        headers.forEach(header => {
            xml += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>\n`;
        });
        xml += '</Row>\n';

        // Data rows
        data.forEach(row => {
            xml += '<Row>\n';
            columnOrder
                .filter(col => visibleColumns.includes(col))
                .forEach(col => {
                    const value = row[col];
                    if (value === null || value === undefined) {
                        xml += '<Cell><Data ss:Type="String"></Data></Cell>\n';
                    } else if (typeof value === 'number') {
                        xml += `<Cell><Data ss:Type="Number">${value}</Data></Cell>\n`;
                    } else {
                        xml += `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>\n`;
                    }
                });
            xml += '</Row>\n';
        });

        xml += '</Table>\n';
        xml += '</Worksheet>\n';
        xml += '</Workbook>';

        // Add BOM for UTF-8
        const bom = '\ufeff';
        const blob = new Blob([bom + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title || 'table'}_${new Date().toISOString().split('T')[0]}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToJSON = (data: any[], headers: string[]) => {
        // Export as JSON array with mapped data
        const jsonData = data.map(row => {
            const mappedRow: any = {};
            columnOrder
                .filter(col => visibleColumns.includes(col))
                .forEach(col => {
                    mappedRow[fieldMappings[col] || col] = row[col];
                });
            return mappedRow;
        });

        const jsonContent = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title || 'table'}_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [showConnectorExportConfirm, setShowConnectorExportConfirm] = React.useState(false);
    const [showConnectorImportConfirm, setShowConnectorImportConfirm] = React.useState(false);

    const handleConnectorExportConfirm = () => {
        // TODO: Call backend API to export to connector
        // For now, just show confirmation
        alert('Data successfully sent to connector.');
        setShowConnectorExportConfirm(false);
        setPendingExportFormat(null);
    };

    const handleConnectorExportCancel = () => {
        setShowConnectorExportConfirm(false);
        setPendingExportFormat(null);
    };

    const handleEmailExportConfirm = () => {
        if (!emailAddresses.trim()) {
            alert('Please enter at least one email address');
            return;
        }

        const emails = emailAddresses.split(',').map(e => e.trim()).filter(e => e);
        if (emails.length === 0) {
            alert('Please enter valid email addresses');
            return;
        }

        // Get the table data
        const tableData = sortedData;
        const headers = columnOrder
            .filter(col => visibleColumns.includes(col))
            .map(col => fieldMappings[col] || col);

        // TODO: Call backend API to send email
        // For now, just show success message
        alert(`Data successfully sent to: ${emails.join(', ')}`);
        
        setShowEmailInput(false);
        setEmailAddresses('');
        setPendingExportFormat(null);
    };

    const handleEmailExportCancel = () => {
        setShowEmailInput(false);
        setEmailAddresses('');
        setPendingExportFormat(null);
    };

    const [showImportConsent, setShowImportConsent] = React.useState(false);
    const [showImportMapping, setShowImportMapping] = React.useState(false);
    const [importedData, setImportedData] = React.useState<any[]>([]);
    const [importFieldMapping, setImportFieldMapping] = React.useState<Record<string, string>>({});
    const [pendingImportFormat, setPendingImportFormat] = React.useState<'csv' | 'excel' | 'connector' | null>(null);

    const handleImportClick = (format: 'csv' | 'excel' | 'connector') => {
        if (format === 'connector') {
            setPendingImportFormat(format);
            setShowConnectorImportConfirm(true);
        } else {
            setPendingImportFormat(format);
            setShowImportConsent(true);
        }
    };

    const handleConnectorImport = () => {
        // TODO: Call backend API to import from connector
        // For now, just show confirmation
        alert('Data successfully imported from connector.');
        setShowConnectorImportConfirm(false);
        setPendingImportFormat(null);
    };

    const handleConnectorImportConfirm = () => {
        handleConnectorImport();
    };

    const handleConnectorImportCancel = () => {
        setShowConnectorImportConfirm(false);
        setPendingImportFormat(null);
    };

    const handleImportConfirm = () => {
        setShowImportConsent(false);
        if (!pendingImportFormat) return;

        // Create file input based on format
        const input = document.createElement('input');
        input.type = 'file';
        
        if (pendingImportFormat === 'csv') {
            input.accept = '.csv';
        } else if (pendingImportFormat === 'excel') {
            input.accept = '.xlsx,.xls';
        }
        
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                setPendingImportFormat(null);
                return;
            }

            const reader = new FileReader();
            if (pendingImportFormat === 'csv') {
                reader.onload = (event) => {
                    const text = event.target?.result as string;
                    parseCSV(text);
                };
                reader.readAsText(file, 'UTF-8');
            } else if (pendingImportFormat === 'excel') {
                // For Excel files, read as binary and parse XML
                reader.onload = (event) => {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    parseExcel(arrayBuffer, file.name);
                };
                reader.readAsArrayBuffer(file);
            }
        };
        input.click();
    };

    const parseExcel = (arrayBuffer: ArrayBuffer, fileName: string) => {
        // For .xls files (Excel XML format), parse as text
        // For .xlsx files, we'd need a library, but for now we'll try to parse as XML
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        
        if (fileExtension === 'xls') {
            // Excel XML format - read as UTF-8 text
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(arrayBuffer);
            parseExcelXML(text);
        } else {
            // For .xlsx, we need a library. For now, show an error or try CSV-like parsing
            alert('Excel (.xlsx) import requires a library. Please use .xls format or convert to CSV.');
            setPendingImportFormat(null);
        }
    };

    const parseExcelXML = (xmlText: string) => {
        try {
            // Remove BOM if present
            let cleanText = xmlText;
            if (xmlText.charCodeAt(0) === 0xFEFF) {
                cleanText = xmlText.slice(1);
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(cleanText, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Failed to parse Excel XML');
            }

            const rows = xmlDoc.querySelectorAll('Row');
            if (rows.length === 0) {
                alert('No data found in Excel file');
                setPendingImportFormat(null);
                return;
            }

            // Get headers from first row
            const headerRow = rows[0];
            const headerCells = headerRow.querySelectorAll('Cell > Data');
            const headers: string[] = [];
            headerCells.forEach(cell => {
                const text = cell.textContent || '';
                // Clean up any encoding issues
                headers.push(text.trim());
            });

            if (headers.length === 0) {
                alert('No headers found in Excel file');
                setPendingImportFormat(null);
                return;
            }

            // Parse data rows
            const rowsData: any[] = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll('Cell > Data');
                const rowData: any = {};
                cells.forEach((cell, idx) => {
                    if (headers[idx]) {
                        const text = cell.textContent || '';
                        rowData[headers[idx]] = text.trim();
                    }
                });
                // Only add row if it has at least one non-empty value
                if (Object.values(rowData).some(v => v !== '')) {
                    rowsData.push(rowData);
                }
            }

            setImportedData(rowsData);
            // Initialize field mapping
            const mapping: Record<string, string> = {};
            headers.forEach(header => {
                if (header) {
                    const matchingCol = Object.keys(fieldMappings).find(
                        col => fieldMappings[col].toLowerCase() === header.toLowerCase()
                    );
                    mapping[header] = matchingCol || '';
                }
            });
            setImportFieldMapping(mapping);
            setShowImportMapping(true);
            setPendingImportFormat(null);
        } catch (error) {
            console.error('Error parsing Excel XML:', error);
            alert('Failed to parse Excel file. Please ensure it is a valid Excel XML format (.xls) file. If you have a .xlsx file, please convert it to .xls or CSV format.');
            setPendingImportFormat(null);
        }
    };

    const handleImportCancel = () => {
        setShowImportConsent(false);
        setPendingImportFormat(null);
    };

    const parseCSV = (csvText: string) => {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        // Improved CSV parsing that handles quoted fields with commas
        const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseCSVLine(lines[0]);
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const row: any = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx] || '';
            });
            rows.push(row);
        }

        setImportedData(rows);
        // Initialize field mapping - map CSV headers to table columns
        const mapping: Record<string, string> = {};
        headers.forEach(header => {
            // Try to find matching column
            const matchingCol = Object.keys(fieldMappings).find(
                col => fieldMappings[col].toLowerCase() === header.toLowerCase()
            );
            mapping[header] = matchingCol || '';
        });
        setImportFieldMapping(mapping);
        setShowImportMapping(true);
    };

    const handleImportMappingConfirm = () => {
        // Map imported data to table structure
        const mappedData = importedData.map(row => {
            const mappedRow: any = {};
            Object.entries(importFieldMapping).forEach(([csvHeader, tableColumn]) => {
                if (tableColumn && row[csvHeader] !== undefined) {
                    mappedRow[tableColumn] = row[csvHeader];
                }
            });
            return mappedRow;
        });

        // TODO: Integrate with data source - this would typically update the parent component's data
        console.log('Imported and mapped data:', mappedData);
        alert(`Successfully imported ${mappedData.length} rows. Data mapping complete.`);
        
        setShowImportMapping(false);
        setImportedData([]);
        setImportFieldMapping({});
    };

    const handleImportMappingCancel = () => {
        setShowImportMapping(false);
        setImportedData([]);
        setImportFieldMapping({});
    };

    const [showPrintConsent, setShowPrintConsent] = React.useState(false);

    const handlePrintClick = () => {
        setShowPrintConsent(true);
    };

    const handlePrintConfirm = () => {
        setShowPrintConsent(false);
        // Use setTimeout to ensure modal is closed before printing
        setTimeout(() => {
            const printContent = document.getElementById('printable-table-content');
            if (!printContent) {
                console.error('Print content not found');
                return;
            }

            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow pop-ups to print');
                return;
            }

            // Get all styles from the current document
            const styles = Array.from(document.styleSheets)
                .map(sheet => {
                    try {
                        return Array.from(sheet.cssRules)
                            .map(rule => rule.cssText)
                            .join('\n');
                    } catch (e) {
                        return '';
                    }
                })
                .join('\n');

            // Clone the content
            const content = printContent.cloneNode(true) as HTMLElement;
            
            // Write to print window
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print - ${title}</title>
                    <style>
                        ${styles}
                        @media print {
                            @page {
                                margin: 0.25in;
                                size: landscape;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                            }
                            .no-print {
                                display: none !important;
                            }
                            * {
                                box-sizing: border-box;
                            }
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            padding: 10px;
                            margin: 0;
                        }
                        #printable-table-content {
                            width: 100%;
                            overflow: visible;
                        }
                        .overflow-x-auto {
                            overflow-x: visible !important;
                        }
                        table {
                            width: 100% !important;
                            max-width: 100% !important;
                            border-collapse: collapse;
                            table-layout: auto;
                        }
                        th, td {
                            border: 1px solid #e5e7eb;
                            padding: 6px 8px;
                            text-align: left;
                            white-space: nowrap;
                            font-size: 11px;
                        }
                        th {
                            background-color: #f9fafb;
                            font-weight: 600;
                        }
                        @media print {
                            table {
                                font-size: 9px;
                            }
                            th, td {
                                padding: 4px 6px;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Trigger print after content is loaded
            printWindow.onload = () => {
                printWindow.print();
                // Close the window after printing (optional)
                // printWindow.close();
            };
        }, 100);
    };

    const handlePrintCancel = () => {
        setShowPrintConsent(false);
    };

    const handleChangeOwnerClick = () => {
        console.log("Change Owner button clicked!");
        // Implement change owner logic
    };

    const handleChartClick = () => {
        setChartPanelOpen((prev) => !prev);
    };

    const handleShareClick = () => {
        console.log("Share button clicked!");
        // Implement share logic
    };

    const handleTableViewChange = (view: 'default' | 'max-compact' | 'compact' | 'comfortable' | 'spacious') => {
        console.log("Table view changed to:", view);
        pushConfig({
            ...config,
            tableView: view
        });
    };

    const handleSettingsClick = () => {
        console.log("Settings button clicked!");
        setIsTableSettingsOpen(true);
    };

    const handlePresetClick = () => {
        console.log("Preset button clicked!");
        // Implement preset selection logic
    };

   

    const handleWrapClipToggle = useCallback((column: string) => {
        setColumnWrapStates(prev => ({
            ...prev,
            [column]: prev[column] === 'wrap' ? 'clip' : 'wrap'
        }));
    }, []);

    const handlePersistColumnSettings = useCallback(
        async (payload: {
            activeColumns: string[];
            visibleColumns: string[];
            columnWidths: Record<string, number>;
            columnWrapStates: Record<string, 'wrap' | 'clip'>;
        }) => {
            const presetId = activePresetId || 'default';
            const keys = Object.keys(fieldMappingsRef.current);
            const nextQueryState = sanitizeTableQueryState(
                {
                    searchTerm,
                    sortCriteria,
                    filterCriteria,
                    groupByColumn,
                    activeColumns: payload.activeColumns,
                    visibleColumns: payload.visibleColumns,
                    columnOrder: payload.activeColumns,
                    columnWidthsPx: payload.columnWidths,
                    columnWrapStates: payload.columnWrapStates,
                },
                keys,
            );
            const { entityId, dobjId } = platformScopeRef.current;
            const { success, error } = await saveTableSettingsToDB(
                presetId,
                configRef.current as Record<string, unknown>,
                entityId,
                dobjId,
                undefined,
                {
                    allowDefaultPresetBodyOverwrite: true,
                    savedQueryState: nextQueryState as unknown as Record<string, unknown>,
                },
            );
        },
        [
            activePresetId,
            searchTerm,
            sortCriteria,
            filterCriteria,
            groupByColumn,
        ],
    );

    // Presets are loaded from database on mount. Resets to code default when DB fetch is unavailable.
    const setDefaultPresets = () => {
        const codeDefault = DEFAULT_PRESETS[0];
        const customPresets = loadCustomPresetsFromStorage();
        setPresets([codeDefault, ...customPresets]);
    };
    
    // OLD CODE - REMOVED - Now using presets.ts as single source
    /* const setDefaultPresets_OLD = () => {
        const defaultPresets: TablePreset[] = [
            {
                id: 'default',
                name: 'Default',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableTablePanel: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#ffffff',
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#ffffff',
                    enablePresetSelector: true,
                    titleTableSpacing: 0,
                    theme: 'default',
                    tableView: 'default',
                    searchButtonType: 'icon',
                    searchButtonAlign: 'right',
                    settingsButtonAlign: 'right',
                    presetButtonAlign: 'right',
                    tableViewButtonAlign: 'right',
                    enableFreezePane: true,

                    //FreezePane
                    freezePaneType: 'icon',
                    freezePaneAlign: 'right',
                    enableFreezePaneRowHeader: false,
                    enablefreezePaneColumnIndex: false,

                    enablePrint: false,
                    enableChangeOwner: false,
                    enableChart: false,
                    enableShare: false,
                    printButtonType: "icon",
                    printButtonAlign: "left",
                    changeOwnerButtonType: "icon",
                    changeOwnerButtonAlign: "left",
                    chartButtonType: "icon",
                    chartButtonAlign: "left",
                    shareButtonType: "icon",
                    shareButtonAlign: "left",
                    enableFooter: false,
                    enableTableTotals: false,
                    enableWrapClipOption: false,
                    tablePanelSpacing: 0,
                    newButtonType: "icon",
                    tabPanelSpacing: 0,
                    tabPanelBackgroundColor: "",
                    enableTabs: false,
                    tabHeight: "small",
                    tabAlignment: "left",
                    tabOrientation: "horizontal",
                    tabLabelWidth: 0,
                    tabCustomSelection: false,
                    tabSelectionColor: "",
                    tabCustomHover: false,
                    tabHoverColor: "",
                    tabPanelBackground: "",
                    tabList: [],
                    tabBarPlacement: "between-title-and-panel",
                    tabPanelMarginTop: 0,
                    tabMenuStyle: "icon",
                    tabStyle: "standard",
                    tabShowUnderline: true,
                    tabIconSize: 0,
                    tabGap: 8,
                },
                isDefault: true,
                presetId: "default"
            },
            {
                id: 'all-icons-right',
                name: 'All Icons Right',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableFilter: true,
                    enableExport: true,
                    enableImport: true,
                    enableRefresh: true,
                    enableColumnVisibility: true,
                    enableRowActions: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#f8f9fa',
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#f8f9fa',
                    enablePresetSelector: true,
                    searchButtonType: 'icon',
                    searchButtonAlign: 'right',
                    sortButtonType: 'icon',
                    sortButtonAlign: 'right',
                    filterButtonType: 'icon',
                    filterButtonAlign: 'right',
                    columnVisibilityButtonType: 'icon',
                    columnVisibilityButtonAlign: 'right',
                    refreshButtonType: 'icon',
                    refreshButtonAlign: 'right',
                    exportButtonType: 'icon',
                    exportButtonAlign: 'right',
                    importButtonType: 'icon',
                    importButtonAlign: 'right',
                    tableViewButtonType: 'icon',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'icon',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'icon',
                    presetButtonAlign: 'right',
                    theme: 'default',
                    tableView: 'default'
                },
                isDefault: false,
                presetId: 'all-icons-right'
            },
            {
                id: 'all-buttons-right',
                name: 'All Buttons Right',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableFilter: true,
                    enableExport: true,
                    enableImport: true,
                    enableRefresh: true,
                    enableColumnVisibility: true,
                    enableRowActions: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#f1f5f9',
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#f1f5f9',
                    enablePresetSelector: true,
                    searchButtonType: 'button',
                    searchButtonAlign: 'right',
                    sortButtonType: 'button',
                    sortButtonAlign: 'right',
                    filterButtonType: 'button',
                    filterButtonAlign: 'right',
                    columnVisibilityButtonType: 'button',
                    columnVisibilityButtonAlign: 'right',
                    refreshButtonType: 'button',
                    refreshButtonAlign: 'right',
                    exportButtonType: 'button',
                    exportButtonAlign: 'right',
                    importButtonType: 'button',
                    importButtonAlign: 'right',
                    tableViewButtonType: 'button',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'button',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'button',
                    presetButtonAlign: 'right',
                    theme: 'professional',
                    tableView: 'comfortable'
                },
                isDefault: false,
                presetId: 'all-buttons-right'
            },
            {
                id: 'left-aligned-modern',
                name: 'Left Aligned Modern',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableFilter: true,
                    enableExport: true,
                    enableRefresh: true,
                    enableColumnVisibility: true,
                    enableRowActions: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#ecfdf5',
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#ecfdf5',
                    enablePresetSelector: true,
                    searchButtonType: 'button',
                    searchButtonAlign: 'left',
                    sortButtonType: 'button',
                    sortButtonAlign: 'left',
                    filterButtonType: 'button',
                    filterButtonAlign: 'left',
                    columnVisibilityButtonType: 'icon',
                    columnVisibilityButtonAlign: 'right',
                    refreshButtonType: 'icon',
                    refreshButtonAlign: 'right',
                    exportButtonType: 'button',
                    exportButtonAlign: 'left',
                    tableViewButtonType: 'icon',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'icon',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'button',
                    presetButtonAlign: 'left',
                    theme: 'modern',
                    tableView: 'comfortable'
                },
                isDefault: false,
                presetId: 'left-aligned-modern'
            },
            {
                id: 'compact-minimal',
                name: 'Compact Minimal',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: false,
                    titleTableSpacing: 8,
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#ffffff',
                    enablePresetSelector: true,
                    searchButtonType: 'icon',
                    searchButtonAlign: 'right',
                    sortButtonType: 'icon',
                    sortButtonAlign: 'right',
                    tableViewButtonType: 'icon',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'icon',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'icon',
                    presetButtonAlign: 'right',
                    theme: 'minimal',
                    tableView: 'compact'
                },
                isDefault: false,
                presetId: 'compact-minimal'
            },
            {
                id: 'data-analyst',
                name: 'Data Analyst',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowNumber: true,
                    enableRowSelection: true,
                    enableMassSelection: true,
                    enableRowHoverHighlight: true,
                    enableStripedRows: true,
                    enableRowDivider: true,
                    enableColumnResize: true,
                    enableSearch: true,
                    enableFilter: true,
                    enableExport: true,
                    enableColumnVisibility: true,
                    enableGroup: true,
                    enableRowActions: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#fef3c7',
                    enableRecordCount: true,
                    enableSortInfo: true,
                    enableFilterInfo: true,
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#fef3c7',
                    enablePresetSelector: true,
                    searchButtonType: 'button',
                    searchButtonAlign: 'left',
                    sortButtonType: 'button',
                    sortButtonAlign: 'left',
                    filterButtonType: 'button',
                    filterButtonAlign: 'left',
                    columnVisibilityButtonType: 'button',
                    columnVisibilityButtonAlign: 'right',
                    exportButtonType: 'button',
                    exportButtonAlign: 'right',
                    groupButtonType: 'button',
                    groupButtonAlign: 'left',
                    tableViewButtonType: 'icon',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'icon',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'button',
                    presetButtonAlign: 'left',
                    theme: 'professional',
                    tableView: 'spacious'
                },
                isDefault: false,
                presetId: 'data-analyst'
            }
        ];
        setPresets(defaultPresets);
        localStorage.setItem('tablePresets', JSON.stringify(defaultPresets));
    };
    */

    // Dropdown click-outside handlers are now managed by individual action components
    // Each action component (Action_Search, Action_Sort, etc.) handles its own dropdown state

    const handleSort = (column: string) => {
        if (!config.enableSort) return;
        const existingIndex = sortCriteria.findIndex(s => s.column === column);

        if (existingIndex >= 0) {
            const newCriteria = [...sortCriteria];
            if (newCriteria[existingIndex].order === 'asc') {
                newCriteria[existingIndex].order = 'desc';
            } else {
                newCriteria.splice(existingIndex, 1);
            }
            setSortCriteria(newCriteria);
        } else {
            setSortCriteria([...sortCriteria, { column, order: 'asc' }]);
        }
    };

    const addSortCriteria = (column: string, order: 'asc' | 'desc') => {
        const existingIndex = sortCriteria.findIndex(s => s.column === column);
        if (existingIndex >= 0) {
            const newCriteria = [...sortCriteria];
            newCriteria[existingIndex].order = order;
            setSortCriteria(newCriteria);
        } else {
            setSortCriteria([...sortCriteria, { column, order }]);
        }
    };

    const removeSortCriteria = (column: string) => {
        setSortCriteria(sortCriteria.filter(s => s.column !== column));
    };

    const clearSort = () => {
        setSortCriteria([]);
    };

    const addFilterCriteria = (column: string, operator: FilterCriteria['operator'], value: string, logic: 'AND' | 'OR' = 'AND') => {
        setFilterCriteria([...filterCriteria, { column, operator, value, logic }]);
    };

    const removeFilterCriteria = (index: number) => {
        setFilterCriteria(filterCriteria.filter((_, i) => i !== index));
    };

    const clearFilters = () => {
        setFilterCriteria([]);
    };

    const toggleRowSelection = (index: number) => {
        clearCellRangeSelection();
        setSelectedRows((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    const handleSelectAllRows = () => {
        clearCellRangeSelection();
        if (selectedRows.length === data.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(data.map((_, i) => i));
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, col: string) => {
        if (!config.enableColumnResize) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = columnWidths[col] || (resizeRefs.current[col]?.offsetWidth ?? 150);
        const MIN_COLUMN_WIDTH = 80;
        let moveCount = 0;
        isResizingColumnRef.current = true;
        setActiveResizeColumn(col);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + (e.clientX - startX));
            moveCount += 1;
            if (moveCount === 1 || moveCount % 8 === 0) {
                // sampled move ticks kept for lightweight breakpointing if needed
            }
            setColumnWidths((prev) => ({ ...prev, [col]: newWidth }));
        };

        const handleMouseUp = () => {
            isResizingColumnRef.current = false;
            setActiveResizeColumn(null);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // Row reordering functions
    const handleRowDragStart = (e: React.DragEvent, displayIndex: number) => {
        if (!config.enableRowReorder) return;
        setRowDragOverIndex(null);
        setDraggedRowIndex(displayIndex);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleRowDragOver = (e: React.DragEvent, displayIndex: number) => {
        if (!config.enableRowReorder || draggedRowIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setRowDragOverIndex(displayIndex);
    };

    const handleRowDrop = (e: React.DragEvent, dropDisplayIndex: number) => {
        if (!config.enableRowReorder || draggedRowIndex === null) return;
        e.preventDefault();
        setRowOrder((prev) => {
            const order = prev ?? sortedData.map((_, i) => i);
            const next = [...order];
            const [removed] = next.splice(draggedRowIndex, 1);
            next.splice(dropDisplayIndex, 0, removed);
            return next;
        });
        setDraggedRowIndex(null);
        setRowDragOverIndex(null);
    };

    const handleRowDragEnd = () => {
        setDraggedRowIndex(null);
        setRowDragOverIndex(null);
    };

    // Column reordering functions
    const handleColumnDragStart = (e: React.DragEvent, index: number) => {
        if (!config.enableColumnReorder) return;
        if (isResizingColumnRef.current || activeResizeColumn !== null) {
            e.preventDefault();
            return;
        }
        setColumnDragOverIndex(null);
        setDraggedColumnIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleColumnDragOver = (e: React.DragEvent, index: number) => {
        if (!config.enableColumnReorder || draggedColumnIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setColumnDragOverIndex(index);
    };

    const handleColumnDrop = (e: React.DragEvent, dropIndex: number) => {
        if (!config.enableColumnReorder || draggedColumnIndex === null) return;
        e.preventDefault();
        const orderedColumns = columnOrder.filter(col => visibleColumns.includes(col));
        const fromIdx = draggedColumnIndex;
        const toIdx = dropIndex;
        if (fromIdx < 0 || fromIdx >= orderedColumns.length || toIdx < 0 || toIdx >= orderedColumns.length || fromIdx === toIdx) {
            setDraggedColumnIndex(null);
            setColumnDragOverIndex(null);
            return;
        }
        const draggedKey = orderedColumns[fromIdx];
        const nextOrder = [...orderedColumns];
        nextOrder.splice(fromIdx, 1);
        nextOrder.splice(toIdx, 0, draggedKey);
        setColumnOrder(prev => {
            const other = prev.filter(c => !visibleColumns.includes(c));
            return [...nextOrder, ...other];
        });
        setActiveColumns(prev => {
            const inOrder = prev.filter(c => visibleColumns.includes(c));
            if (inOrder.length !== orderedColumns.length) return prev;
            const next = [...nextOrder, ...prev.filter(c => !visibleColumns.includes(c))];
            return next;
        });
        setDraggedColumnIndex(null);
        setColumnDragOverIndex(null);
    };

    const handleColumnDragEnd = () => {
        setDraggedColumnIndex(null);
        setColumnDragOverIndex(null);
    };


    // Button rendering is now handled by TableActionPanel component
    // All action components are imported and used through TableActionPanel


    // Data processing is now handled by useTableData hook above


   

    const handleColumnVisibilityClick = () => {
        console.log("Column Visibility button clicked!")
        setShowColumnDropdown(prev => !prev);
    };


    // ===============================
    // Column Visibility helpers
    // ===============================

    // Eye toggle → show / hide ONLY (do not remove from active list)
    const toggleColumnVisibility = (key: string) => {
        setVisibleColumns(prev => {
            if (prev.includes(key)) {
                // minimum 1 visible column must remain
                if (prev.length === 1) return prev;
                return prev.filter(col => col !== key);
            }
            return [...prev, key];
        });
    };

    // Close (X) → remove from active list AND table
    const removeColumn = (key: string) => {
        setActiveColumns(prev => {
            if (prev.length === 1) return prev;
            return prev.filter(col => col !== key);
        });

        setVisibleColumns(prev => prev.filter(col => col !== key));
    };

    // Add column → add to active list AND visible
    const addColumn = (key: string) => {
        setActiveColumns(prev =>
            prev.includes(key) ? prev : [...prev, key]
        );
        setVisibleColumns(prev =>
            prev.includes(key) ? prev : [...prev, key]
        );
    };

    // Reset → keep first column by index
    const resetColumns = () => {
        if (!allColumns.length) return;
        setActiveColumns([allColumns[0]]);
        setVisibleColumns([allColumns[0]]);
    };

    // Move Active Column  → keep first column by index
    const moveActiveColumn = (key: string, direction: 'up' | 'down') => {
        setActiveColumns(prev => {
            const index = prev.indexOf(key);
            if (index === -1) return prev;

            const newIndex =
                direction === 'up' ? index - 1 : index + 1;

            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const next = [...prev];
            [next[index], next[newIndex]] = [next[newIndex], next[index]];
            return next;
        });

        // Keep visibleColumns order in sync
        setVisibleColumns(prev => {
            const index = prev.indexOf(key);
            if (index === -1) return prev;

            const newIndex =
                direction === 'up' ? index - 1 : index + 1;

            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const next = [...prev];
            [next[index], next[newIndex]] = [next[newIndex], next[index]];
            return next;
        });
    };

    // GetAllColumns and Prefered Columns
    const getAllColumns = () =>
        Object.keys(fieldMappings);

    const getPreferredColumns = () => {
        if (Array.isArray(preferredColumns) && preferredColumns.length > 0) {
            return preferredColumns.filter((key) => allColumns.includes(key));
        }
        return Object.entries(fieldMappings)
            .filter(([, value]) => typeof value === 'object' && (value as { preferred?: boolean }).preferred)
            .map(([key]) => key);
    };

    const loadAllColumns = () => {
        const all = getAllColumns();
        setActiveColumns(all);
        setVisibleColumns(all);
    };

    const loadPreferredColumns = () => {
        const preferred = getPreferredColumns();

        if (!preferred.length) {
            alert('No preferred columns found');
            return;
        }

        setActiveColumns(preferred);
        setVisibleColumns(preferred);
    };

    // Apply preset handler — merge so preset.config does not wipe tabList / tab UI (was clearing saved tabs)
    // Use pushConfigRef so preset apply stays stable and freeze flags stay consistent with saved JSON.
    const applyPreset = useCallback((preset: TablePreset, explicitTableTabId?: string | null) => {
        setActivePresetId(preset.id);
        const prev = configRef.current;
        const presetLayout = stripSavedQueryStateFromConfig((preset.config || {}) as Record<string, unknown>);
        const mergedForTabs = mergePresetWithPreservedTabState(prev, presetLayout as typeof prev);
        pushConfigRef.current(mergedForTabs);

        const tabs = mergedForTabs.tabList ?? [];
        let tabId: string | null = explicitTableTabId ?? null;
        if (tabId && !tabs.some((t) => t.id === tabId)) {
            tabId = null;
        }
        if (!tabId && mergedForTabs.enableTabs && tabs.length > 0) {
            const match =
                tabs.find((t) => t.presetId === preset.id) ||
                tabs.find((t) => t.presetId === preset.presetId);
            tabId = match?.id ?? tabs[0]?.id ?? null;
        }

        const { entityId, dobjId } = platformScopeRef.current;
        void persistActiveContextToDB(preset.id, tabId, entityId, dobjId);

        setSearchParams((prevParams) => {
            if (isShareRoute || shareViewParams.isShareView) {
                return toShareOnlyParams(prevParams);
            }
            const next = new URLSearchParams(prevParams);
            next.set('preset', preset.id);
            if (tabId) next.set(TABLE_TAB_URL_PARAM, tabId);
            else next.delete(TABLE_TAB_URL_PARAM);
            return next;
        });
    }, [
        isShareRoute,
        platformScope.entityId,
        platformScope.dobjId,
        setSearchParams,
        shareViewParams.isShareView,
        shareViewParams.shareToken,
        toShareOnlyParams,
    ]);

    /** Per-user + per-template + per-preset query state: hydrate before paint when preset/template/user changes */
    useLayoutEffect(() => {
        if (!presets.length) return;
        const p = presets.find((pr) => pr.id === activePresetId || pr.presetId === activePresetId);
        if (!p) return;

        const keys = Object.keys(fieldMappingsRef.current);
        if (!keys.length) return;

        const fromUser = loadTableQueryState(tableUserId, templateId, p.id);
        const fromPreset = readSavedQueryStateFromPresetConfig(p.config);
        const mergedPartial = (fromUser || fromPreset || {}) as Partial<TableQueryState>;
        const sanitized = sanitizeTableQueryState(mergedPartial, keys);

        setSearchTerm(sanitized.searchTerm);
        setSortCriteria(sanitized.sortCriteria);
        setFilterCriteria(sanitized.filterCriteria);
        setGroupByColumn(sanitized.groupByColumn);
        setActiveColumns(sanitized.activeColumns);
        setVisibleColumns(sanitized.visibleColumns);
        setColumnOrder(sanitized.columnOrder);
        setColumnWidths(sanitized.columnWidthsPx ?? {});
        setColumnWrapStates(sanitized.columnWrapStates ?? {});
    }, [activePresetId, templateId, tableUserId, presets.length]);

    /** Debounced persist of current query state (local JSON via localStorage) */
    useEffect(() => {
        const handle = window.setTimeout(() => {
            if (!presets.length) return;
            const p = presets.find((pr) => pr.id === activePresetId || pr.presetId === activePresetId);
            if (!p) return;
            const keys = Object.keys(fieldMappingsRef.current);
            if (!keys.length) return;
            const visibleSet = new Set(visibleColumns);
            const columnWidthsPx = Object.fromEntries(
                Object.entries(columnWidths).filter(([k]) => visibleSet.has(k))
            );
            const state: TableQueryState = {
                searchTerm,
                sortCriteria,
                filterCriteria,
                groupByColumn,
                activeColumns,
                visibleColumns,
                columnOrder,
                columnWidthsPx,
                columnWrapStates,
            };
            const sanitized = sanitizeTableQueryState(state, keys);
            saveTableQueryState(tableUserId, templateId, p.id, sanitized);

            const { entityId, dobjId } = platformScopeRef.current;
            void saveTableSettingsToDB(
                p.id,
                configRef.current as Record<string, unknown>,
                entityId,
                dobjId,
                undefined,
                {
                    allowDefaultPresetBodyOverwrite: true,
                    savedQueryState: sanitized as unknown as Record<string, unknown>,
                },
            );
        }, 500);
        return () => window.clearTimeout(handle);
    }, [
        searchTerm,
        sortCriteria,
        filterCriteria,
        groupByColumn,
        activeColumns,
        visibleColumns,
        columnOrder,
        columnWidths,
        columnWrapStates,
        tableUserId,
        templateId,
        activePresetId,
        presets.length,
    ]);

    /** Debounced persist of layout/action-bar settings (freeze, button visibility, tabs, etc.). */
    const lastLayoutPersistSigRef = useRef<string>('');
    useEffect(() => {
        const handle = window.setTimeout(() => {
            if (!presets.length) return;
            const presetId = activePresetId || 'default';
            const layoutConfig = stripSavedQueryStateFromConfig(
                configRef.current as Record<string, unknown>,
            ) as Record<string, unknown>;
            let sig = '';
            try {
                sig = JSON.stringify({ presetId, layoutConfig });
            } catch {
                sig = `${presetId}:${Date.now()}`;
            }
            if (lastLayoutPersistSigRef.current === sig) return;
            lastLayoutPersistSigRef.current = sig;

            const { entityId, dobjId } = platformScopeRef.current;
            void saveTableSettingsToDB(
                presetId,
                layoutConfig,
                entityId,
                dobjId,
                undefined,
                { allowDefaultPresetBodyOverwrite: true },
            );
        }, 700);
        return () => window.clearTimeout(handle);
    }, [config, activePresetId, presets.length]);

    /** Tab click: activate preset + sync ?preset= & ?tableTab= (disambiguates duplicate preset links) */
    const handleTabPresetSelect = useCallback(
        (presetId: string, tabId: string) => {
            const p = presets.find((pr) => pr.id === presetId || pr.presetId === presetId);
            if (p) {
                applyPreset(p, tabId);
            } else {
                setSearchParams((prev) => {
                    if (isShareRoute || shareViewParams.isShareView) {
                        return toShareOnlyParams(prev);
                    }
                    const next = new URLSearchParams(prev);
                    next.set('preset', presetId);
                    next.set(TABLE_TAB_URL_PARAM, tabId);
                    return next;
                });
            }
        },
        [isShareRoute, presets, applyPreset, setSearchParams, shareViewParams.isShareView, shareViewParams.shareToken, toShareOnlyParams]
    );

    const applyPresetRef = useRef(applyPreset);
    applyPresetRef.current = applyPreset;

    // Deep link / refresh: apply preset from URL (do not depend on applyPreset identity — avoids effect running every parent render)
    useEffect(() => {
        if (presets.length === 0) return;
        const params = new URLSearchParams(location.search);
        const presetId = params.get('preset');
        if (!presetId) return;
        const p = presets.find((pr) => pr.id === presetId || pr.presetId === presetId);
        if (p) {
            applyPresetRef.current(p, params.get(TABLE_TAB_URL_PARAM));
        }
    }, [location.search, presets, shareViewParams.isShareView, shareViewParams.shareToken]);

    // If a preset is removed from the master list, retarget tabs to the default (or first) preset
    useEffect(() => {
        if (presets.length === 0) return;
        const prev = configRef.current;
        if (!prev.enableTabs || !prev.tabList?.length) return;
        const sanitized = sanitizeTabListPresetIds(prev.tabList, presets);
        if (!sanitized || sanitized === prev.tabList) return;
        pushConfigRef.current({ ...prev, tabList: sanitized });
    }, [presets]);

    // All button rendering is now handled by TableActionPanel component
    // The component uses individual action components from action-components folder
    // OLD BUTTON RENDERING CODE REMOVED - All buttons are now in TableActionPanel.refactored.tsx
    // All button rendering is handled by TableActionPanel component which uses individual action components

    // Column reordering handler
    const handleColumnReorder = (draggedColumn: string, targetColumn: string) => {
        if (!config.enableColumnReorder) return;
        
        setColumnOrder(prev => {
            const from = prev.indexOf(draggedColumn);
            const to = prev.indexOf(targetColumn);
            if (from === -1 || to === -1) return prev;

            const next = [...prev];
            next.splice(from, 1);
            next.splice(to, 0, draggedColumn);
            return next;
        });

        setActiveColumns(prev => {
            const from = prev.indexOf(draggedColumn);
            const to = prev.indexOf(targetColumn);
            if (from === -1 || to === -1) return prev;

            const next = [...prev];
            next.splice(from, 1);
            next.splice(to, 0, draggedColumn);
            return next;
        });

        setVisibleColumns(prev => {
            if (!prev.includes(draggedColumn)) return prev;
            const from = prev.indexOf(draggedColumn);
            const to = prev.indexOf(targetColumn);
            if (from === -1 || to === -1) return prev;

            const next = [...prev];
            next.splice(from, 1);
            next.splice(to, 0, draggedColumn);
            return next;
        });
    };

    // Row reordering handler
    const handleRowReorder = (draggedIndex: number, targetIndex: number) => {
        if (!config.enableRowReorder || draggedIndex === null || targetIndex === null) return;
        // Row reordering logic would go here
        setDraggedRowIndex(null);
    };

    // Column resize handler
    const handleColumnResize = (column: string, width: number) => {
        setColumnWidths((prev) => ({ ...prev, [column]: width }));
    };

    // OLD BUTTON RENDERING CODE REMOVED - All buttons are now in TableActionPanel.refactored.tsx
    // The following section (previously lines 1102-2201) contained old inline button rendering code
    // This has been completely removed and replaced with TableActionPanel component
    // All button rendering is handled by TableActionPanel which uses individual action components
    
    // OLD BUTTON RENDERING CODE COMPLETELY REMOVED
    // All button rendering is now handled by TableActionPanel component
    // which uses individual action components from the action-components folder
    // No old inline button code remains in this file

    const createQuickAddRow = useCallback(
        (groupLabel: string | null): Record<string, unknown> => {
            const row: Record<string, unknown> = {
                [QUICK_ADD_DRAFT_KEY]: true,
                __quickAddId: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            };
            if (groupByColumn && groupLabel != null && groupLabel !== '') {
                row[groupByColumn] = groupLabel;
            }
            return row;
        },
        [groupByColumn],
    );

    const handleQuickAddRow = useCallback(
        (groupLabel: string | null) => {
            if (config.enableQuickAddRow === false) return;
            const nr = createQuickAddRow(groupLabel);
            const groupKey = groupLabel ?? '__ungrouped__';
            setQuickAddInlineErrors((prev) => {
                if (!prev[groupKey]) return prev;
                const next = { ...prev };
                delete next[groupKey];
                return next;
            });
            if (onDataChange) {
                onDataChange([...data, nr]);
            } else {
                setLocalDataAppendix((p) => [...p, nr]);
            }
            setActiveQuickAddCellKey(null);
        },
        [createQuickAddRow, data, onDataChange, config.enableQuickAddRow],
    );

    const updateQuickAddDraftField = useCallback(
        (draftId: string, col: string, value: string) => {
            const rows = (onDataChange ? data : localDataAppendix) as Record<string, unknown>[];
            const draftRow = rows.find((r) => String(r.__quickAddId) === draftId);
            const draftGroupKey =
                draftRow && groupByColumn && String(draftRow[groupByColumn] ?? '').trim() !== ''
                    ? String(draftRow[groupByColumn])
                    : '__ungrouped__';
            const apply = (rows: Record<string, unknown>[]) =>
                rows.map((r) => (String(r.__quickAddId) === draftId ? { ...r, [col]: value } : r));
            if (onDataChange) {
                onDataChange(apply(data as Record<string, unknown>[]));
            } else {
                setLocalDataAppendix((p) => apply(p));
            }
            setQuickAddInlineErrors((prev) => {
                if (!prev[draftGroupKey]) return prev;
                const next = { ...prev };
                delete next[draftGroupKey];
                return next;
            });
        },
        [data, onDataChange, localDataAppendix, groupByColumn],
    );

    const hasQuickAddDraftValues = useCallback(
        (row: Record<string, unknown>) =>
            orderedVisibleCols.some((col) => String(row[col] ?? '').trim() !== ''),
        [orderedVisibleCols],
    );

    const finalizeQuickAddDraftRow = useCallback(
        async (draftId: string) => {
            const requiredColsRaw = Array.isArray(config.requiredColumns)
                ? (config.requiredColumns as string[])
                : Array.isArray(config.mandatoryFields)
                  ? (config.mandatoryFields as string[])
                  : [];
            const requiredCols = requiredColsRaw.filter((c) => orderedVisibleCols.includes(c));
            const rows = (onDataChange ? data : localDataAppendix) as Record<string, unknown>[];
            const draftRow = rows.find((r) => String(r.__quickAddId) === draftId);
            if (!draftRow) return;
            const draftGroupKey =
                groupByColumn && String(draftRow[groupByColumn] ?? '').trim() !== ''
                    ? String(draftRow[groupByColumn])
                    : '__ungrouped__';

            const missing = requiredCols.filter((c) => String(draftRow[c] ?? '').trim() === '');
            if (missing.length > 0) {
                const missingLabels = missing.map((c) => {
                    const fromMap = fieldMappings[c];
                    if (fromMap && String(fromMap).trim() !== '') return String(fromMap);
                    return c
                        .replace(/^[_\s]+|[_\s]+$/g, '')
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (ch) => ch.toUpperCase());
                });
                setQuickAddInlineErrors((prev) => ({
                    ...prev,
                    [draftGroupKey]: `Please complete the required fields: ${missingLabels.join(', ')}.`,
                }));
                return;
            }

            const payload: Record<string, unknown> = { ...draftRow };
            delete payload[QUICK_ADD_DRAFT_KEY];
            delete payload.__quickAddId;

            let persistedRow: Record<string, unknown> = payload;
            if (objectLoaderCrud?.sourceTable) {
                const { data: inserted, error: insertError } = await supabase
                    .from(objectLoaderCrud.sourceTable)
                    .insert(payload)
                    .select()
                    .single();
                if (insertError) {
                    const rawMsg = String(insertError.message ?? '');
                    const notNullMatch = rawMsg.match(/null value in column "([^"]+)"/i);
                    const constraintCol = notNullMatch?.[1];
                    const displayFieldLabel = constraintCol
                        ? (fieldMappings[constraintCol] ??
                          constraintCol
                              .replace(/^[_\s]+|[_\s]+$/g, '')
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (ch) => ch.toUpperCase()))
                        : null;
                    const friendlyMessage = displayFieldLabel
                        ? `Could not save yet. Please fill the required field: ${displayFieldLabel}.`
                        : 'Could not save this row yet. Please review required fields and try again.';
                    setQuickAddInlineErrors((prev) => ({
                        ...prev,
                        [draftGroupKey]: friendlyMessage,
                    }));
                    return;
                }
                persistedRow = (inserted as Record<string, unknown>) ?? payload;
            }

            const applySaved = (input: Record<string, unknown>[]) =>
                input.map((r) => (String(r.__quickAddId) === draftId ? persistedRow : r));
            if (onDataChange) onDataChange(applySaved(data as Record<string, unknown>[]));
            else setLocalDataAppendix((p) => applySaved(p));
            setQuickAddInlineErrors((prev) => {
                if (!prev[draftGroupKey]) return prev;
                const next = { ...prev };
                delete next[draftGroupKey];
                return next;
            });
            setActiveQuickAddCellKey(null);
        },
        [
            config.requiredColumns,
            config.mandatoryFields,
            orderedVisibleCols,
            fieldMappings,
            onDataChange,
            data,
            localDataAppendix,
            objectLoaderCrud,
            groupByColumn,
        ],
    );

    // Get checkbox state for header
    const getHeaderCheckboxState = () => {
        if (selectedRows.length === 0) return 'unchecked';
        if (selectedRows.length === sortedData.length) return 'checked';
        return 'indeterminate';
    };

    const renderTableRows = () => {
        const badgeColumnKey = resolveCustomBadgeColumnKey(orderedVisibleCols, config.customRowBadgeColumn ?? null);
        const rowAccentColumnKey = resolveRowAccentColumnKey(orderedVisibleCols, badgeColumnKey);
        const quickAddEnabled = config.enableQuickAddRow !== false;
        const hasLeadColumn = config.enableRowSelection || config.enableRowNumber;
        const bodyColumnsCount =
            visibleColumns.length +
            (config.enableRowActions ? 1 : 0) +
            (hasLeadColumn ? 0 : 1);

        const renderQuickAddStrip = (groupLabel: string | null, stripKey: string) => {
            if (!quickAddEnabled) return null;
            const gutterW =
                config.enableRowSelection || config.enableRowNumber ? checkboxColumnWidth ?? 48 : 48;
            const groupKey = groupLabel ?? '__ungrouped__';
            const inlineError = quickAddInlineErrors[groupKey];
            const iconSize = 14;
            const btnSizeClass = 'h-6 w-6';
            return (
                <tr key={`qa-strip-${stripKey}`} data-quick-add-strip="true" className="bg-white [&>td]:border-0">
                    <td
                        className="px-4 py-2 text-sm text-gray-700 !border-0 border-t border-gray-100 bg-gray-50/50 align-middle"
                        style={{ width: gutterW, minWidth: gutterW, maxWidth: gutterW }}
                    >
                        <div className="flex items-center justify-center">
                            <button
                                type="button"
                                className={`inline-flex ${btnSizeClass} items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-600 hover:bg-white hover:border-gray-400`}
                                onClick={() => handleQuickAddRow(groupLabel)}
                                aria-label="Add row"
                            >
                                <Plus size={iconSize} />
                            </button>
                        </div>
                    </td>
                    <td
                        colSpan={bodyColumnsCount}
                        className="px-4 py-2 text-sm text-gray-700 !border-0 border-t border-gray-100 bg-gray-50/50 align-middle"
                    >
                        <div className="flex items-center">
                            {inlineError ? (
                                <div className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700">
                                    {inlineError}
                                </div>
                            ) : null}
                        </div>
                    </td>
                </tr>
            );
        };

        if (groupedDisplayData) {
            let flatRowCounter = 0;
            return Object.entries(groupedDisplayData).map(([groupValue, groupRows], groupIdx) => {
                const sortSignature = sortCriteria.map(s => `${s.column}-${s.order}`).join('|');
                
                return (
                <React.Fragment key={`group-${groupValue}-${groupByColumn}-${sortSignature}`}>
                    <tr className="bg-gray-100 font-medium">
                        <td
                            colSpan={
                                (config.enableRowSelection ? 1 : 0) +
                                (config.enableRowNumber ? 1 : 0) +
                                visibleColumns.length +
                                (config.enableRowActions ? 1 : 0)
                            }
                            className="px-4 py-3 text-sm text-gray-700"
                        >
                            <div className="flex items-center">
                                <ChevronRight size={16} className="mr-2" />
                                {fieldMappings[groupByColumn!]}: {groupValue} ({groupRows.length} records)
                                </div>
                        </td>
                    </tr>
                    {groupRows.map((row, groupRowIdx) => {
                        const flatRowIndex = flatRowCounter++;
                        const sortedIdx = findSortedIndexForRow(row as Record<string, unknown>);
                        const displayPos = findDisplayIndexForRow(row as Record<string, unknown>);
                        const selectionIdx = sortedIdx >= 0 ? sortedIdx : -1;
                        const rowIsDraft = isQuickAddDraftRow(row as Record<string, unknown>);
                        const draftId = rowIsDraft ? String((row as Record<string, unknown>).__quickAddId ?? '') : '';
                        const rowKey =
                            getTemplateRowIdentityKey(row as Record<string, unknown>) ??
                            `${groupValue}-${groupRowIdx}-${JSON.stringify(row).substring(0, 50)}`;
                        const stableRowKey = `${rowKey}-group-${groupValue}-${groupByColumn}-${sortSignature}`;
                        const rowCanDrag = config.enableRowReorder && displayPos >= 0 && !rowIsDraft;
                        const stripeIdx = displayPos >= 0 ? displayPos : groupRowIdx;
                        const rowDropHighlight =
                            config.enableRowReorder &&
                            rowDragOverIndex !== null &&
                            draggedRowIndex !== null &&
                            displayPos >= 0 &&
                            rowDragOverIndex === displayPos &&
                            draggedRowIndex !== displayPos;

                        return (
                        <tr
                            key={stableRowKey}
                            data-row-kind={rowIsDraft ? 'draft' : 'data'}
                            className={cn(
                                config.enableRowHoverHighlight ? 'hover:bg-gray-100 transition-colors group' : 'group',
                                config.enableStripedRows && stripeIdx % 2 === 1 && 'bg-gray-50',
                                config.enableRowDivider ? 'border-b border-gray-200' : 'border-b-0',
                            )}
                            style={{
                                ...(rowDropHighlight
                                    ? { boxShadow: `inset 0 -2px 0 0 ${inlineEditHighlightColor}` }
                                    : {}),
                            }}
                            draggable={rowCanDrag}
                            onDragStart={(e) => displayPos >= 0 && handleRowDragStart(e, displayPos)}
                            onDragOver={(e) => displayPos >= 0 && handleRowDragOver(e, displayPos)}
                            onDrop={(e) => displayPos >= 0 && handleRowDrop(e, displayPos)}
                            onDragEnd={handleRowDragEnd}
                        >
                            {(config.enableRowSelection || config.enableRowNumber) && (() => {
                                const checkboxFrozen = isCheckboxColumnFrozen();
                                const rowBg = config.enableStripedRows && stripeIdx % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                                const rowNum = (displayPos >= 0 ? displayPos : groupRowIdx) + 1;
                                const cbRowRange = config.enableRowSelection
                                    ? findCheckboxRowRangeForFlatRow(flatRowIndex, checkboxSelectionRanges)
                                    : null;
                                const checkSelHighlight = cbRowRange != null;
                                return (
                                <td 
                                    className={cn(
                                        'px-4 py-2 text-sm text-gray-700 relative',
                                        checkboxColumnRightBorderClass(
                                            !!config.enableColumnDivider,
                                            checkboxFrozen,
                                            tableFreezeColumnEnabled,
                                            config.freezePaneColumnIndexNo,
                                        ),
                                        !config.enableRowDivider ? '!border-b-0' : '',
                                        checkSelHighlight && 'relative z-[1]',
                                    )}
                                    style={{
                                        width: checkboxColumnWidth ? `${checkboxColumnWidth}px` : 'auto',
                                        boxSizing: 'border-box',
                                        ...(checkSelHighlight && cbRowRange
                                            ? {
                                                  boxShadow: checkboxLeadSelectionShadow(
                                                      cbRowRange,
                                                      flatRowIndex,
                                                      inlineEditHighlightColor,
                                                      SELECTION_GRID_LINE,
                                                  ),
                                                  backgroundColor: 'rgb(219 234 254)',
                                              }
                                            : {}),
                                        ...(checkboxFrozen
                                            ? {
                                                  position: 'sticky',
                                                  left: '0px',
                                                  zIndex: FROZEN_BODY_Z_BASE,
                                                  ...(checkSelHighlight && cbRowRange ? {} : { backgroundColor: rowBg }),
                                              }
                                            : {}),
                                    }}
                                >
                                    {config.enableRowReorder && !rowIsDraft && (
                                        <div className="absolute left-1 top-1/2 transform -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                            <GripVertical size={14} className="text-gray-400" />
                                        </div>
                                    )}
                                    {rowIsDraft ? null : (
                                    <div className="flex items-center justify-center gap-2">
                                        {config.enableRowSelection && config.enableRowNumber ? (
                                            <>
                                                <input
                                                    type="checkbox"
                                                    checked={selectionIdx >= 0 && selectedRows.includes(selectionIdx)}
                                                    onChange={() => selectionIdx >= 0 && toggleRowSelection(selectionIdx)}
                                                />
                                                <span className="text-xs text-gray-500 tabular-nums">{rowNum}</span>
                                            </>
                                        ) : config.enableRowSelection ? (
                                            <input
                                                type="checkbox"
                                                checked={selectionIdx >= 0 && selectedRows.includes(selectionIdx)}
                                                onChange={() => selectionIdx >= 0 && toggleRowSelection(selectionIdx)}
                                            />
                                        ) : config.enableRowNumber ? (
                                            <span className="text-xs text-gray-500">{rowNum}</span>
                                        ) : null}
                                    </div>
                                    )}
                                </td>
                                );
                            })()}

                            {config.enableRowActions && config.rowActionsPosition === 'left' &&
                                (rowIsDraft ? (
                                    <td
                                        className={cn(
                                            'px-4 py-2 text-sm text-gray-700 relative',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            config.enableColumnDivider ? 'border-r border-gray-200' : '',
                                        )}
                                    >
                                        {hasQuickAddDraftValues(row as Record<string, unknown>) && (
                                            <button
                                                type="button"
                                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex h-5 items-center rounded border border-gray-300 px-1.5 text-[10px] leading-none font-medium hover:bg-gray-50"
                                                onClick={() => void finalizeQuickAddDraftRow(draftId)}
                                            >
                                                Save
                                            </button>
                                        )}
                                    </td>
                                ) : (
                                    (() => {
                                const enabledActionsBase = config.enabledRowActions ?? ['view', 'edit', 'copy', 'delete'];
                                const enabledActions = copyRestrictedByShare
                                    ? enabledActionsBase.filter((a) => a !== 'copy')
                                    : enabledActionsBase;
                                const actionStyleIsMenu = config.actionStyle === 'menu' || config.actionStyle === 'dropdown';
                                const rowLinkId =
                                    objectLoaderCrud != null
                                        ? resolveRowRecordId(row as Record<string, unknown>, objectLoaderCrud.idColumn) ?? row.id
                                        : row.id;
                                const menuId = `row-actions-left-${rowLinkId ?? rowKey}`;
                                const isMenuOpen = openRowActionsMenuId === menuId;
                                return (
                                    <ObjectLoaderRowActionsBar
                                        enabledActions={enabledActions}
                                        actionStyleIsMenu={actionStyleIsMenu}
                                        menuId={menuId}
                                        isMenuOpen={isMenuOpen}
                                        setOpenRowActionsMenuId={setOpenRowActionsMenuId}
                                        menuDropdownAlign="left"
                                        baseUrl={baseUrl}
                                        rowLinkId={rowLinkId ?? rowKey}
                                        objectLoaderCrud={objectLoaderCrud}
                                        onObjectLoaderAction={
                                            objectLoaderCrud
                                                ? (action) => {
                                                      const r = row as Record<string, unknown>;
                                                      if (action === 'view') setObjectLoaderModal({ type: 'view', row: r });
                                                      else if (action === 'edit') setObjectLoaderModal({ type: 'edit', row: r });
                                                      else if (action === 'copy') setObjectLoaderModal({ type: 'copy', row: r });
                                                      else setObjectLoaderModal({ type: 'delete', row: r });
                                                  }
                                                : undefined
                                        }
                                        customActionLabel={baseUrl === '/objects' ? 'Go Object Data' : undefined}
                                        customActionTitle={baseUrl === '/objects' ? 'Open records and set active object menu' : undefined}
                                        onCustomAction={baseUrl === '/objects' ? () => goToObjectDataFromRow(row as Record<string, unknown>) : undefined}
                                        showRowActionsOnHover={config.showRowActionsOnHover}
                                        actionsTdClassName={cn(
                                            'px-4 py-2 text-sm text-gray-700',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            config.enableColumnDivider ? 'border-r border-gray-200' : ''
                                        )}
                                    />
                                );
                            })()))}
                            {columnOrder
                                .filter(col => visibleColumns.includes(col))
                                .map((col, colIndex, arr) => {
                                    const isFrozen = isColumnFrozen(colIndex);
                                    const freezeIndex = config.freezePaneColumnIndexNo || 1;
                                    const shouldShowBorder =
                                        tableFreezeColumnEnabled &&
                                        freezeIndex >= 2 &&
                                        colIndex === freezeIndex - 2;
                                    const freezeEdgeDivider =
                                        !!config.enableColumnDivider && shouldShowBorder;
                                    const lightColDivider =
                                        !!config.enableColumnDivider &&
                                        colIndex < arr.length - 1 &&
                                        !freezeEdgeDivider;
                                    const nextIsFrozen =
                                        colIndex + 1 < arr.length && isColumnFrozen(colIndex + 1);
                                    const showFrozenLeftDivider =
                                        isFrozen &&
                                        ((colIndex > 0 && isColumnFrozen(colIndex - 1)) ||
                                            (colIndex === 0 &&
                                                (config.enableRowSelection || config.enableRowNumber) &&
                                                isCheckboxColumnFrozen() &&
                                                freezeIndex > 1));
                                    const rowBg = config.enableStripedRows && stripeIdx % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                                    const leftOffset = isFrozen ? getFreezeLeftOffset(colIndex) : 0;
                                    const rawCellValue = row[col];
                                    const cellValue =
                                        rawCellValue == null
                                            ? '-'
                                            : typeof rawCellValue === 'object'
                                              ? (() => {
                                                    try {
                                                        const compact = JSON.stringify(rawCellValue);
                                                        return compact.length > 220
                                                            ? `${compact.slice(0, 220)}...`
                                                            : compact;
                                                    } catch {
                                                        return '[object]';
                                                    }
                                                })()
                                              : String(rawCellValue);
                                    const hyperlinkKind = detectFieldLinkKind(col, cellValue);
                                    const hyperlinkHref =
                                        hyperlinkKind === 'email'
                                            ? `mailto:${cellValue}`
                                            : hyperlinkKind === 'url'
                                              ? /^(https?:\/\/)/i.test(cellValue)
                                                  ? cellValue
                                                  : `https://${cellValue}`
                                              : null;
                                    const wrapMode = getCellWrapMode(col, config, columnWrapStates);
                                    const clipMode = wrapMode === 'clip';
                                    const isAccentCol = col === rowAccentColumnKey;
                                    const showCustomBadge =
                                        badgeColumnKey != null &&
                                        col === badgeColumnKey &&
                                        (row['isCustom'] === true || row['isCustom'] === 1);
                                    const badgeLayoutKind = showCustomBadge
                                        ? getCustomBadgeLayoutKind(col, config, columnWrapStates)
                                        : null;
                                    const tdClipOverflow =
                                        clipMode && !(showCustomBadge && badgeLayoutKind === 'wrap');
                                    const badgeInlineEditKey = `${stableRowKey}__${col}`;
                                    const quickAddCellKey = `${draftId}__${col}`;
                                    const isBadgeColumnEditing =
                                        showCustomBadge &&
                                        config.enableInlineEdit?.includes(col) &&
                                        inlineEditActiveKey === badgeInlineEditKey;
                                    const cbRange = findRangeForDataCell(
                                        flatRowIndex,
                                        col,
                                        orderedVisibleCols,
                                        checkboxSelectionRanges,
                                    );
                                    const inCheckboxRange = cbRange != null && config.enableRowSelection;
                                    const inCellRange =
                                        cellRangeRect != null &&
                                        isCellInRangeRect(flatRowIndex, col, orderedVisibleCols, cellRangeRect);
                                    const showRangeHighlight =
                                        !rowIsDraft &&
                                        (inCellRange || inCheckboxRange) &&
                                        activeInlineCellKey !== badgeInlineEditKey;
                                    const shadowRect =
                                        inCellRange && cellRangeRect
                                            ? cellRangeRect
                                            : inCheckboxRange
                                              ? cbRange
                                              : null;
                                    const omitLeftExterior = Boolean(
                                        shadowRect &&
                                            inCheckboxRange &&
                                            config.enableRowSelection &&
                                            colIndex === shadowRect.c0,
                                    );

                                    return (
                                    <td
                                        key={`${stableRowKey}-${col}`}
                                        data-cell-row={flatRowIndex}
                                        data-cell-col={col}
                                        onMouseDown={rowIsDraft ? undefined : (e) => handleCellRangeMouseDown(e, flatRowIndex, col)}
                                        onMouseEnter={rowIsDraft ? undefined : (e) => handleCellRangeMouseEnter(e, flatRowIndex, col)}
                                        className={cn(
                                            'px-4 py-2 text-sm text-gray-700 text-left align-top select-none',
                                            lightColDivider &&
                                                (!isFrozen || !nextIsFrozen) &&
                                                !showRangeHighlight &&
                                                'border-r border-gray-200',
                                            showFrozenLeftDivider && 'freeze-col-light-l',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            showRangeHighlight &&
                                                shadowRect &&
                                                flatRowIndex < shadowRect.r1 &&
                                                config.enableRowDivider &&
                                                '!border-b-0',
                                            freezeEdgeDivider && 'freeze-pane-seam',
                                            tdClipOverflow && 'overflow-hidden',
                                            activeInlineCellKey === badgeInlineEditKey && 'relative z-[2]',
                                            showRangeHighlight && 'relative z-[1]',
                                        )}
                                        style={{
                                            width: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            minWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            maxWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            boxSizing: 'border-box',
                                            ...(rowIsDraft && activeQuickAddCellKey === quickAddCellKey
                                                ? {
                                                      boxShadow: `inset 0 0 0 2px ${inlineEditHighlightColor}`,
                                                      backgroundColor: 'white',
                                                  }
                                                : {}),
                                            ...(activeInlineCellKey === badgeInlineEditKey
                                                ? {
                                                      boxShadow: `inset 0 0 0 2px ${inlineEditHighlightColor}`,
                                                      backgroundColor: 'white',
                                                  }
                                                : showRangeHighlight && shadowRect
                                                  ? {
                                                        boxShadow: composeDataCellSelectionShadow(
                                                            shadowRect,
                                                            flatRowIndex,
                                                            colIndex,
                                                            inlineEditHighlightColor,
                                                            omitLeftExterior,
                                                        ),
                                                        backgroundColor: 'rgb(219 234 254)',
                                                    }
                                                  : {}),
                                            ...(isFrozen
                                                ? {
                                                      position: 'sticky',
                                                      left: `${leftOffset}px`,
                                                      zIndex: FROZEN_BODY_Z_BASE + 1 + colIndex,
                                                      ...(!(activeInlineCellKey === badgeInlineEditKey || showRangeHighlight)
                                                          ? { backgroundColor: rowBg }
                                                          : {}),
                                                  }
                                                : {}),
                                        }}
                                        title={config.enableTooltips === true && !rowIsDraft ? cellValue : undefined}
                                        >
                                        {rowIsDraft ? (
                                            <input
                                                type="text"
                                                value={String(row[col] ?? '')}
                                                onChange={(e) => updateQuickAddDraftField(draftId, col, e.target.value)}
                                                onFocus={() => {
                                                    setActiveQuickAddCellKey(quickAddCellKey);
                                                }}
                                                onBlur={() => setActiveQuickAddCellKey((prev) => (prev === quickAddCellKey ? null : prev))}
                                                className="min-w-0 border-none bg-transparent focus:bg-transparent focus:outline-none px-1 py-0.5 rounded w-full max-w-full select-text"
                                            />
                                        ) : (
                                        <div
                                            className={cn(
                                                showCustomBadge
                                                    ? getCustomBadgeCellWrapperClass(col, config, columnWrapStates)
                                                    : 'flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 w-full',
                                            )}
                                        >
                                            {config.enableInlineEdit?.includes(col) ? (
                                                showCustomBadge ? (
                                                    isBadgeColumnEditing ? (
                                                        <input
                                                            key={badgeInlineEditKey}
                                                            type="text"
                                                            defaultValue={cellValue}
                                                            autoFocus
                                                            title={config.enableTooltips === true ? cellValue : undefined}
                                                            onFocus={() => {
                                                                setActiveInlineCellKey(badgeInlineEditKey);
                                                            }}
                                                            onBlur={() => {
                                                                setActiveInlineCellKey(null);
                                                                setInlineEditActiveKey(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    e.stopPropagation();
                                                                    setInlineEditActiveKey(null);
                                                                }
                                                            }}
                                                            className={cn(
                                                                'min-w-0 w-full border-none bg-transparent focus:bg-transparent focus:outline-none px-1 py-0.5 rounded select-text',
                                                                isAccentCol && 'font-medium',
                                                            )}
                                                        />
                                                    ) : (
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setInlineEditActiveKey(badgeInlineEditKey);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    setInlineEditActiveKey(badgeInlineEditKey);
                                                                }
                                                            }}
                                                            className={cn(
                                                                getCustomBadgeValueSpanClass(
                                                                    col,
                                                                    config,
                                                                    columnWrapStates,
                                                                    isAccentCol,
                                                                ),
                                                                'cursor-text rounded px-0.5 -mx-0.5 hover:bg-gray-100/80',
                                                            )}
                                                            title={config.enableTooltips === true ? cellValue : undefined}
                                                        >
                                                            {cellValue}
                                                        </span>
                                                    )
                                                ) : (
                                                    <input
                                                        type="text"
                                                        defaultValue={cellValue}
                                                        title={config.enableTooltips === true ? cellValue : undefined}
                                                        onFocus={() => {
                                                            setActiveInlineCellKey(badgeInlineEditKey);
                                                        }}
                                                        onBlur={() => {
                                                            setActiveInlineCellKey(null);
                                                        }}
                                                        className={cn(
                                                            'min-w-0 border-none bg-transparent focus:bg-transparent focus:outline-none px-1 py-0.5 rounded w-full max-w-full select-text',
                                                            isAccentCol && 'font-medium',
                                                        )}
                                                    />
                                                )
                                            ) : (
                                                <span
                                                    className={cn(
                                                        showCustomBadge
                                                            ? getCustomBadgeValueSpanClass(
                                                                  col,
                                                                  config,
                                                                  columnWrapStates,
                                                                  isAccentCol,
                                                              )
                                                            : cn(
                                                                  'min-w-0 text-left block w-full',
                                                                  isAccentCol && 'font-medium',
                                                                  clipMode && 'truncate',
                                                                  !clipMode && 'break-words [overflow-wrap:anywhere]',
                                                              ),
                                                    )}
                                                    title={config.enableTooltips === true ? cellValue : undefined}
                                                >
                                                    {isObjectManagerLinkCell(rowIsDraft, col) ? (
                                                        <button
                                                            type="button"
                                                            className="text-left text-primary hover:underline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigateToRowDetail(row as Record<string, unknown>);
                                                            }}
                                                        >
                                                            {cellValue}
                                                        </button>
                                                    ) : hyperlinkHref ? (
                                                        <a
                                                            href={hyperlinkHref}
                                                            className="text-primary hover:underline"
                                                            target={hyperlinkKind === 'url' ? '_blank' : undefined}
                                                            rel={hyperlinkKind === 'url' ? 'noreferrer noopener' : undefined}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {cellValue}
                                                        </a>
                                                    ) : (
                                                        cellValue
                                                    )}
                                                </span>
                                            )}
                                            {showCustomBadge && !isBadgeColumnEditing && (
                                                <span className="shrink-0 whitespace-nowrap px-2 py-0.5 text-xs bg-accent text-white rounded-full leading-tight">
                                                    Custom
                                                </span>
                                            )}
                                        </div>
                                        )}
                                    </td>
                                    );
                                })}

                            {config.enableRowActions && config.rowActionsPosition !== 'left' &&
                                (rowIsDraft ? (
                                    <td
                                        className={cn(
                                            'px-4 py-2 text-sm text-gray-700 relative',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            config.enableColumnDivider ? 'border-l border-gray-200' : '',
                                        )}
                                    >
                                        {hasQuickAddDraftValues(row as Record<string, unknown>) && (
                                            <button
                                                type="button"
                                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex h-5 items-center rounded border border-gray-300 px-1.5 text-[10px] leading-none font-medium hover:bg-gray-50"
                                                onClick={() => void finalizeQuickAddDraftRow(draftId)}
                                            >
                                                Save
                                            </button>
                                        )}
                                    </td>
                                ) : (
                                    (() => {
                                const enabledActionsBase = config.enabledRowActions ?? ['view', 'edit', 'copy', 'delete'];
                                const enabledActions = copyRestrictedByShare
                                    ? enabledActionsBase.filter((a) => a !== 'copy')
                                    : enabledActionsBase;
                                const actionStyleIsMenu = config.actionStyle === 'menu' || config.actionStyle === 'dropdown';
                                const rowLinkId =
                                    objectLoaderCrud != null
                                        ? resolveRowRecordId(row as Record<string, unknown>, objectLoaderCrud.idColumn) ?? row.id
                                        : row.id;
                                const menuId = `row-actions-${rowLinkId ?? rowKey}`;
                                const isMenuOpen = openRowActionsMenuId === menuId;
                                return (
                                    <ObjectLoaderRowActionsBar
                                        enabledActions={enabledActions}
                                        actionStyleIsMenu={actionStyleIsMenu}
                                        menuId={menuId}
                                        isMenuOpen={isMenuOpen}
                                        setOpenRowActionsMenuId={setOpenRowActionsMenuId}
                                        menuDropdownAlign="right"
                                        baseUrl={baseUrl}
                                        rowLinkId={rowLinkId ?? rowKey}
                                        objectLoaderCrud={objectLoaderCrud}
                                        onObjectLoaderAction={
                                            objectLoaderCrud
                                                ? (action) => {
                                                      const r = row as Record<string, unknown>;
                                                      if (action === 'view') setObjectLoaderModal({ type: 'view', row: r });
                                                      else if (action === 'edit') setObjectLoaderModal({ type: 'edit', row: r });
                                                      else if (action === 'copy') setObjectLoaderModal({ type: 'copy', row: r });
                                                      else setObjectLoaderModal({ type: 'delete', row: r });
                                                  }
                                                : undefined
                                        }
                                        customActionLabel={baseUrl === '/objects' ? 'Go Object Data' : undefined}
                                        customActionTitle={baseUrl === '/objects' ? 'Open records and set active object menu' : undefined}
                                        onCustomAction={baseUrl === '/objects' ? () => goToObjectDataFromRow(row as Record<string, unknown>) : undefined}
                                        showRowActionsOnHover={config.showRowActionsOnHover}
                                        actionsTdClassName={cn(
                                            'px-4 py-2 text-sm text-gray-700',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            config.enableColumnDivider ? 'border-l border-gray-200' : ''
                                        )}
                                    />
                                );
                            })()))}
                        </tr>
                    )})}
                    {renderQuickAddStrip(groupValue, `g-${groupIdx}`)}
                </React.Fragment>
                );
            });
        }

        return (
 <>
                {displayRows.map((row, idx) => {
            const actualIndex = displayIndices[idx];
            const sortSignature = sortCriteria.map(s => `${s.column}-${s.order}`).join('|');
            const rowKey =
                getTemplateRowIdentityKey(row as Record<string, unknown>) ??
                `row-${actualIndex}-${JSON.stringify(row).substring(0, 50)}`;
            const stableRowKey = `${rowKey}-ungrouped-${sortSignature}`;
            const rowPositionKey = `${stableRowKey}-pos${idx}`;
            const rowIsDraft = isQuickAddDraftRow(row as Record<string, unknown>);
            const draftId = rowIsDraft ? String((row as Record<string, unknown>).__quickAddId ?? '') : '';
            const rowDropHighlightUngrouped =
                config.enableRowReorder &&
                rowDragOverIndex !== null &&
                draggedRowIndex !== null &&
                rowDragOverIndex === idx &&
                draggedRowIndex !== idx;

            return (
            <tr
                key={rowPositionKey}
                data-row-kind={rowIsDraft ? 'draft' : 'data'}
                className={cn(
                    config.enableRowHoverHighlight ? 'hover:bg-gray-100 transition-colors group' : 'group',
                    config.enableStripedRows && idx % 2 === 1 && 'bg-gray-50',
                    config.enableRowDivider ? 'border-b border-gray-200' : 'border-b-0',
                )}
                style={{
                    ...(rowDropHighlightUngrouped
                        ? { boxShadow: `inset 0 -2px 0 0 ${inlineEditHighlightColor}` }
                        : {}),
                }}
                draggable={config.enableRowReorder && !rowIsDraft}
                onDragStart={(e) => handleRowDragStart(e, idx)}
                onDragOver={(e) => handleRowDragOver(e, idx)}
                onDrop={(e) => handleRowDrop(e, idx)}
                onDragEnd={handleRowDragEnd}
            >
                {(config.enableRowSelection || config.enableRowNumber) && (() => {
                    const checkboxFrozen = isCheckboxColumnFrozen();
                    const rowBg = config.enableStripedRows && idx % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                    const cbRowRange = config.enableRowSelection
                        ? findCheckboxRowRangeForFlatRow(idx, checkboxSelectionRanges)
                        : null;
                    const checkSelHighlight = cbRowRange != null;
                    return (
                    <td 
                        className={cn(
                            'px-4 py-2 text-sm text-gray-700 relative',
                            checkboxColumnRightBorderClass(
                                !!config.enableColumnDivider,
                                checkboxFrozen,
                                tableFreezeColumnEnabled,
                                config.freezePaneColumnIndexNo,
                            ),
                            !config.enableRowDivider ? '!border-b-0' : '',
                            checkSelHighlight && 'relative z-[1]',
                        )}
                        style={{
                            width: checkboxColumnWidth ? `${checkboxColumnWidth}px` : 'auto',
                            boxSizing: 'border-box',
                            ...(checkSelHighlight && cbRowRange
                                ? {
                                      boxShadow: checkboxLeadSelectionShadow(
                                          cbRowRange,
                                          idx,
                                          inlineEditHighlightColor,
                                          SELECTION_GRID_LINE,
                                      ),
                                      backgroundColor: 'rgb(219 234 254)',
                                  }
                                : {}),
                            ...(checkboxFrozen
                                ? {
                                      position: 'sticky',
                                      left: '0px',
                                      zIndex: FROZEN_BODY_Z_BASE,
                                      ...(checkSelHighlight && cbRowRange ? {} : { backgroundColor: rowBg }),
                                  }
                                : {}),
                        }}
                    >
                        {config.enableRowReorder && !rowIsDraft && (
                            <div className="absolute left-1 top-1/2 transform -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={14} className="text-gray-400" />
                            </div>
                        )}
                        {rowIsDraft ? null : (
                        <div className="flex items-center justify-center gap-2">
                            {config.enableRowSelection && config.enableRowNumber ? (
                                <>
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.includes(actualIndex)}
                                        onChange={() => toggleRowSelection(actualIndex)}
                                    />
                                    <span className="text-xs text-gray-500 tabular-nums">{idx + 1}</span>
                                </>
                            ) : config.enableRowSelection ? (
                                <input
                                    type="checkbox"
                                    checked={selectedRows.includes(actualIndex)}
                                    onChange={() => toggleRowSelection(actualIndex)}
                                />
                            ) : config.enableRowNumber ? (
                                <span className="text-xs text-gray-500 tabular-nums">{idx + 1}</span>
                            ) : null}
                        </div>
                        )}
                    </td>
                    );
                })()}

                            {config.enableRowActions && config.rowActionsPosition === 'left' &&
                                (rowIsDraft ? (
                                    <td
                                        className={cn(
                                            'px-4 py-2 text-sm text-gray-700 relative',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            config.enableColumnDivider ? 'border-r border-gray-200' : '',
                                        )}
                                    >
                                        {hasQuickAddDraftValues(row as Record<string, unknown>) && (
                                            <button
                                                type="button"
                                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex h-5 items-center rounded border border-gray-300 px-1.5 text-[10px] leading-none font-medium hover:bg-gray-50"
                                                onClick={() => void finalizeQuickAddDraftRow(draftId)}
                                            >
                                                Save
                                            </button>
                                        )}
                                    </td>
                                ) : (
                                    (() => {
                                const enabledActionsBase = config.enabledRowActions ?? ['view', 'edit', 'copy', 'delete'];
                                const enabledActions = copyRestrictedByShare
                                    ? enabledActionsBase.filter((a) => a !== 'copy')
                                    : enabledActionsBase;
                                const actionStyleIsMenu = config.actionStyle === 'menu' || config.actionStyle === 'dropdown';
                                const rowLinkId =
                                    objectLoaderCrud != null
                                        ? resolveRowRecordId(row as Record<string, unknown>, objectLoaderCrud.idColumn) ?? row.id
                                        : row.id;
                                const menuId = `row-actions-left-${rowLinkId ?? rowPositionKey}`;
                                const isMenuOpen = openRowActionsMenuId === menuId;
                                return (
                                    <ObjectLoaderRowActionsBar
                                        enabledActions={enabledActions}
                                        actionStyleIsMenu={actionStyleIsMenu}
                                        menuId={menuId}
                                        isMenuOpen={isMenuOpen}
                                        setOpenRowActionsMenuId={setOpenRowActionsMenuId}
                                        menuDropdownAlign="left"
                                        baseUrl={baseUrl}
                                        rowLinkId={rowLinkId ?? rowPositionKey}
                                        objectLoaderCrud={objectLoaderCrud}
                                        onObjectLoaderAction={
                                            objectLoaderCrud
                                                ? (action) => {
                                                      const r = row as Record<string, unknown>;
                                                      if (action === 'view') setObjectLoaderModal({ type: 'view', row: r });
                                                      else if (action === 'edit') setObjectLoaderModal({ type: 'edit', row: r });
                                                      else if (action === 'copy') setObjectLoaderModal({ type: 'copy', row: r });
                                                      else setObjectLoaderModal({ type: 'delete', row: r });
                                                  }
                                                : undefined
                                        }
                                        customActionLabel={baseUrl === '/objects' ? 'Go Object Data' : undefined}
                                        customActionTitle={baseUrl === '/objects' ? 'Open records and set active object menu' : undefined}
                                        onCustomAction={baseUrl === '/objects' ? () => goToObjectDataFromRow(row as Record<string, unknown>) : undefined}
                                        showRowActionsOnHover={config.showRowActionsOnHover}
                                        actionsTdClassName={cn(
                                            'px-4 py-2 text-sm text-gray-700',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            config.enableColumnDivider ? 'border-r border-gray-200' : ''
                                        )}
                                    />
                                );
                            })()))}
                            {columnOrder
                                .filter(col => visibleColumns.includes(col))
                                .map((col, colIndex, arr) => {
                                    const isFrozen = isColumnFrozen(colIndex);
                                    const freezeIndex = config.freezePaneColumnIndexNo || 1;
                                    const shouldShowBorder =
                                        tableFreezeColumnEnabled &&
                                        freezeIndex >= 2 &&
                                        colIndex === freezeIndex - 2;
                                    const freezeEdgeDivider =
                                        !!config.enableColumnDivider && shouldShowBorder;
                                    const lightColDivider =
                                        !!config.enableColumnDivider &&
                                        colIndex < arr.length - 1 &&
                                        !freezeEdgeDivider;
                                    const nextIsFrozen =
                                        colIndex + 1 < arr.length && isColumnFrozen(colIndex + 1);
                                    const showFrozenLeftDivider =
                                        isFrozen &&
                                        ((colIndex > 0 && isColumnFrozen(colIndex - 1)) ||
                                            (colIndex === 0 &&
                                                (config.enableRowSelection || config.enableRowNumber) &&
                                                isCheckboxColumnFrozen() &&
                                                freezeIndex > 1));
                                    const rowBg = config.enableStripedRows && idx % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                                    const leftOffset = isFrozen ? getFreezeLeftOffset(colIndex) : 0;
                                    const rawCellValue = row[col];
                                    const cellValue =
                                        rawCellValue == null
                                            ? '-'
                                            : typeof rawCellValue === 'object'
                                              ? (() => {
                                                    try {
                                                        const compact = JSON.stringify(rawCellValue);
                                                        return compact.length > 220
                                                            ? `${compact.slice(0, 220)}...`
                                                            : compact;
                                                    } catch {
                                                        return '[object]';
                                                    }
                                                })()
                                              : String(rawCellValue);
                                    const hyperlinkKind = detectFieldLinkKind(col, cellValue);
                                    const hyperlinkHref =
                                        hyperlinkKind === 'email'
                                            ? `mailto:${cellValue}`
                                            : hyperlinkKind === 'url'
                                              ? /^(https?:\/\/)/i.test(cellValue)
                                                  ? cellValue
                                                  : `https://${cellValue}`
                                              : null;
                                    const cellKey = `${rowPositionKey}-${col}`;
                                    const wrapMode = getCellWrapMode(col, config, columnWrapStates);
                                    const clipMode = wrapMode === 'clip';
                                    const isAccentCol = col === rowAccentColumnKey;
                                    const showCustomBadge =
                                        badgeColumnKey != null &&
                                        col === badgeColumnKey &&
                                        (row['isCustom'] === true || row['isCustom'] === 1);
                                    const badgeLayoutKind = showCustomBadge
                                        ? getCustomBadgeLayoutKind(col, config, columnWrapStates)
                                        : null;
                                    const tdClipOverflow =
                                        clipMode && !(showCustomBadge && badgeLayoutKind === 'wrap');
                                    const badgeInlineEditKey = `${rowPositionKey}__${col}`;
                                    const quickAddCellKey = `${draftId}__${col}`;
                                    const isBadgeColumnEditing =
                                        showCustomBadge &&
                                        config.enableInlineEdit?.includes(col) &&
                                        inlineEditActiveKey === badgeInlineEditKey;
                                    const cbRange = findRangeForDataCell(
                                        idx,
                                        col,
                                        orderedVisibleCols,
                                        checkboxSelectionRanges,
                                    );
                                    const inCheckboxRange = cbRange != null && config.enableRowSelection;
                                    const inCellRange =
                                        cellRangeRect != null &&
                                        isCellInRangeRect(idx, col, orderedVisibleCols, cellRangeRect);
                                    const showRangeHighlight =
                                        !rowIsDraft &&
                                        (inCellRange || inCheckboxRange) &&
                                        activeInlineCellKey !== badgeInlineEditKey;
                                    const shadowRect =
                                        inCellRange && cellRangeRect
                                            ? cellRangeRect
                                            : inCheckboxRange
                                              ? cbRange
                                              : null;
                                    const omitLeftExterior = Boolean(
                                        shadowRect &&
                                            inCheckboxRange &&
                                            config.enableRowSelection &&
                                            colIndex === shadowRect.c0,
                                    );

                                    return (
                                    <td
                                        key={cellKey}
                                        data-cell-row={idx}
                                        data-cell-col={col}
                                        onMouseDown={rowIsDraft ? undefined : (e) => handleCellRangeMouseDown(e, idx, col)}
                                        onMouseEnter={rowIsDraft ? undefined : (e) => handleCellRangeMouseEnter(e, idx, col)}
                                        className={cn(
                                            'px-4 py-2 text-sm text-gray-700 text-left align-top select-none',
                                            lightColDivider &&
                                                (!isFrozen || !nextIsFrozen) &&
                                                !showRangeHighlight &&
                                                'border-r border-gray-200',
                                            showFrozenLeftDivider && 'freeze-col-light-l',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            showRangeHighlight &&
                                                shadowRect &&
                                                idx < shadowRect.r1 &&
                                                config.enableRowDivider &&
                                                '!border-b-0',
                                            freezeEdgeDivider && 'freeze-pane-seam',
                                            tdClipOverflow && 'overflow-hidden',
                                            activeInlineCellKey === badgeInlineEditKey && 'relative z-[2]',
                                            showRangeHighlight && 'relative z-[1]',
                                        )}
                                        style={{
                                            width: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            minWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            maxWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            boxSizing: 'border-box',
                                            ...(rowIsDraft && activeQuickAddCellKey === quickAddCellKey
                                                ? {
                                                      boxShadow: `inset 0 0 0 2px ${inlineEditHighlightColor}`,
                                                      backgroundColor: 'white',
                                                  }
                                                : {}),
                                            ...(activeInlineCellKey === badgeInlineEditKey
                                                ? {
                                                      boxShadow: `inset 0 0 0 2px ${inlineEditHighlightColor}`,
                                                      backgroundColor: 'white',
                                                  }
                                                : showRangeHighlight && shadowRect
                                                  ? {
                                                        boxShadow: composeDataCellSelectionShadow(
                                                            shadowRect,
                                                            idx,
                                                            colIndex,
                                                            inlineEditHighlightColor,
                                                            omitLeftExterior,
                                                        ),
                                                        backgroundColor: 'rgb(219 234 254)',
                                                    }
                                                  : {}),
                                            ...(isFrozen
                                                ? {
                                                      position: 'sticky',
                                                      left: `${leftOffset}px`,
                                                      zIndex: FROZEN_BODY_Z_BASE + 1 + colIndex,
                                                      ...(!(activeInlineCellKey === badgeInlineEditKey || showRangeHighlight)
                                                          ? { backgroundColor: rowBg }
                                                          : {}),
                                                  }
                                                : {}),
                                        }}
                                                                               title={config.enableTooltips === true && !rowIsDraft ? cellValue : undefined}
                                        >
                                        {rowIsDraft ? (
                                            <input
                                                type="text"
                                                value={String(row[col] ?? '')}
                                                onChange={(e) => updateQuickAddDraftField(draftId, col, e.target.value)}
                                                onFocus={() => {
                                                    setActiveQuickAddCellKey(quickAddCellKey);
                                                }}
                                                onBlur={() => setActiveQuickAddCellKey((prev) => (prev === quickAddCellKey ? null : prev))}
                                                className="min-w-0 border-none bg-transparent focus:bg-transparent focus:outline-none px-1 py-0.5 rounded w-full max-w-full select-text"
                                            />
                                        ) : (
                                        <div
                                            className={cn(
                                                showCustomBadge
                                                    ? getCustomBadgeCellWrapperClass(col, config, columnWrapStates)
                                                    : 'flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 w-full',
                                            )}
                                        >
                                            {config.enableInlineEdit?.includes(col) ? (
                                                showCustomBadge ? (
                                                    isBadgeColumnEditing ? (
                                                        <input
                                                            key={badgeInlineEditKey}
                                                            type="text"
                                                            defaultValue={cellValue}
                                                            autoFocus
                                                            title={config.enableTooltips === true ? cellValue : undefined}
                                                            onFocus={() => {
                                                                setActiveInlineCellKey(badgeInlineEditKey);
                                                            }}
                                                            onBlur={() => {
                                                                setActiveInlineCellKey(null);
                                                                setInlineEditActiveKey(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    e.stopPropagation();
                                                                    setInlineEditActiveKey(null);
                                                                }
                                                            }}
                                                            className={cn(
                                                                'min-w-0 w-full border-none bg-transparent focus:bg-transparent focus:outline-none px-1 py-0.5 rounded select-text',
                                                                isAccentCol && 'font-medium',
                                                            )}
                                                        />
                                                    ) : (
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setInlineEditActiveKey(badgeInlineEditKey);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    setInlineEditActiveKey(badgeInlineEditKey);
                                                                }
                                                            }}
                                                            className={cn(
                                                                getCustomBadgeValueSpanClass(
                                                                    col,
                                                                    config,
                                                                    columnWrapStates,
                                                                    isAccentCol,
                                                                ),
                                                                'cursor-text rounded px-0.5 -mx-0.5 hover:bg-gray-100/80',
                                                            )}
                                                            title={config.enableTooltips === true ? cellValue : undefined}
                                                        >
                                                            {cellValue}
                                                        </span>
                                                    )
                                                ) : (
                                                    <input
                                                        type="text"
                                                        defaultValue={cellValue}
                                                        title={config.enableTooltips === true ? cellValue : undefined}
                                                        onFocus={() => {
                                                            setActiveInlineCellKey(badgeInlineEditKey);
                                                        }}
                                                        onBlur={() => {
                                                            setActiveInlineCellKey(null);
                                                        }}
                                                        className={cn(
                                                            'min-w-0 border-none bg-transparent focus:bg-transparent focus:outline-none px-1 py-0.5 rounded w-full max-w-full select-text',
                                                            isAccentCol && 'font-medium',
                                                        )}
                                                    />
                                                )
                                            ) : (
                                                <span
                                                    className={cn(
                                                        showCustomBadge
                                                            ? getCustomBadgeValueSpanClass(
                                                                  col,
                                                                  config,
                                                                  columnWrapStates,
                                                                  isAccentCol,
                                                              )
                                                            : cn(
                                                                  'min-w-0 text-left block w-full',
                                                                  isAccentCol && 'font-medium',
                                                                  clipMode && 'truncate',
                                                                  !clipMode && 'break-words [overflow-wrap:anywhere]',
                                                              ),
                                                    )}
                                                    title={config.enableTooltips === true ? cellValue : undefined}
                                                >
                                                    {isObjectManagerLinkCell(rowIsDraft, col) ? (
                                                        <button
                                                            type="button"
                                                            className="text-left text-primary hover:underline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigateToRowDetail(row as Record<string, unknown>);
                                                            }}
                                                        >
                                                            {cellValue}
                                                        </button>
                                                    ) : hyperlinkHref ? (
                                                        <a
                                                            href={hyperlinkHref}
                                                            className="text-primary hover:underline"
                                                            target={hyperlinkKind === 'url' ? '_blank' : undefined}
                                                            rel={hyperlinkKind === 'url' ? 'noreferrer noopener' : undefined}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {cellValue}
                                                        </a>
                                                    ) : (
                                                        cellValue
                                                    )}
                                                </span>
                                            )}
                                            {showCustomBadge && !isBadgeColumnEditing && (
                                                <span className="shrink-0 whitespace-nowrap px-2 py-0.5 text-xs bg-accent text-white rounded-full leading-tight">
                                                    Custom
                                                </span>
                                            )}
                                        </div>
                                        )}
                                    </td>
                                    );
                                })}

                            {config.enableRowActions && config.rowActionsPosition !== 'left' &&
                                (rowIsDraft ? (
                                    <td
                                        className={cn(
                                            'px-4 py-2 text-sm text-gray-700 relative',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            config.enableColumnDivider ? 'border-l border-gray-200' : '',
                                        )}
                                    >
                                        {hasQuickAddDraftValues(row as Record<string, unknown>) && (
                                            <button
                                                type="button"
                                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex h-5 items-center rounded border border-gray-300 px-1.5 text-[10px] leading-none font-medium hover:bg-gray-50"
                                                onClick={() => void finalizeQuickAddDraftRow(draftId)}
                                            >
                                                Save
                                            </button>
                                        )}
                                    </td>
                                ) : (
                                    (() => {
                                const enabledActionsBase = config.enabledRowActions ?? ['view', 'edit', 'copy', 'delete'];
                                const enabledActions = copyRestrictedByShare
                                    ? enabledActionsBase.filter((a) => a !== 'copy')
                                    : enabledActionsBase;
                                const actionStyleIsMenu = config.actionStyle === 'menu' || config.actionStyle === 'dropdown';
                                const rowLinkId =
                                    objectLoaderCrud != null
                                        ? resolveRowRecordId(row as Record<string, unknown>, objectLoaderCrud.idColumn) ?? row.id
                                        : row.id;
                                const menuId = `row-actions-${rowLinkId ?? rowPositionKey}`;
                                const isMenuOpen = openRowActionsMenuId === menuId;
                                return (
                                    <ObjectLoaderRowActionsBar
                                        enabledActions={enabledActions}
                                        actionStyleIsMenu={actionStyleIsMenu}
                                        menuId={menuId}
                                        isMenuOpen={isMenuOpen}
                                        setOpenRowActionsMenuId={setOpenRowActionsMenuId}
                                        menuDropdownAlign="right"
                                        baseUrl={baseUrl}
                                        rowLinkId={rowLinkId ?? rowPositionKey}
                                        objectLoaderCrud={objectLoaderCrud}
                                        onObjectLoaderAction={
                                            objectLoaderCrud
                                                ? (action) => {
                                                      const r = row as Record<string, unknown>;
                                                      if (action === 'view') setObjectLoaderModal({ type: 'view', row: r });
                                                      else if (action === 'edit') setObjectLoaderModal({ type: 'edit', row: r });
                                                      else if (action === 'copy') setObjectLoaderModal({ type: 'copy', row: r });
                                                      else setObjectLoaderModal({ type: 'delete', row: r });
                                                  }
                                                : undefined
                                        }
                                        customActionLabel={baseUrl === '/objects' ? 'Go Object Data' : undefined}
                                        customActionTitle={baseUrl === '/objects' ? 'Open records and set active object menu' : undefined}
                                        onCustomAction={baseUrl === '/objects' ? () => goToObjectDataFromRow(row as Record<string, unknown>) : undefined}
                                        showRowActionsOnHover={config.showRowActionsOnHover}
                                        actionsTdClassName={cn(
                                            'px-4 py-2 text-sm text-gray-700',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            config.enableColumnDivider ? 'border-l border-gray-200' : ''
                                        )}
                                    />
                                );
                            })()))}
            </tr>
            );
        })}
            {renderQuickAddStrip(null, 'ungrouped')}
        </>
        );
    };

    // ===== ORPHANED CODE BLOCK REMOVED (was lines 1110-2409) =====
    // This block contained old button rendering code referencing undefined variables
    // and a duplicate renderTableRows implementation
    // All button rendering is now handled by TableActionPanel component
    // renderTableRows is already complete above (ends at line 1103)
    // ORPHANED CODE BLOCK REMOVED: Lines 1110-2402 contained old button rendering code
    // and a duplicate renderTableRows implementation
    // All button rendering is now handled by TableActionPanel component
    // renderTableRows is already complete above (ends at line 1103)
    // ORPHANED CODE BLOCK REMOVED: All old button rendering code has been removed
    // All button rendering is now handled by TableActionPanel component

    function getTitleStyle(): React.CSSProperties {
        const style: React.CSSProperties = {};

        if (config.enableTitleBackground) {
            style.backgroundColor = config.titleBackgroundColor || '#ffffff';
            style.padding = '1rem';
            style.borderRadius = '0.5rem 0.5rem 0 0';
        }

        if (config.titleTableSpacing) {
            style.marginBottom = `${config.titleTableSpacing}px`;
        }

        return style;
    }


    function getTableStyle(): React.CSSProperties {
        if (!config.tableBackground) return {};
        return {
            backgroundColor: config.tableBackgroundColor || '#ffffff'
        };
    }


    function getTablePanelStyle(): React.CSSProperties {
        if (!config.tablePanelBackground) return {};
        return {
            backgroundColor: config.tablePanelBackgroundColor || '#ffffff',
            padding: '1rem',
            borderRadius: '0.5rem'
        };
    }

    // Calculate left offset for frozen columns
    // This needs to account for checkbox/row number column width exactly
    const getFreezeLeftOffset = useCallback((colIndex: number) => {
        let left = 0;
        
        // Selection column - measure actual width or use calculated width
        if (config.enableRowSelection) {
            // Try to get actual width from ref, otherwise use calculated width
            // px-4 = 16px padding on each side = 32px total
            // Content: checkbox (~20px) or checkbox+number (~24px)
            // Total: typically 48-56px, but we measure it
            const checkboxEl = checkboxColumnRef.current;
            const checkboxWidth = checkboxEl ? checkboxEl.offsetWidth : 48; // Fallback to 48px
            left += checkboxWidth;
        }
        
        // Row number column - same calculation (if separate from selection)
        if (config.enableRowNumber && !config.enableRowSelection) {
            // Row number column typically has same width as checkbox column
            left += 48; // Standard row number column width
        }
        
        // Data columns before the frozen one - must match actual rendered width exactly
        const orderedColumns = columnOrder.filter(col => visibleColumns.includes(col));
        for (let i = 0; i < colIndex; i++) {
            const colKey = orderedColumns[i];
            // Try to get width from state, then from ref, then default
            let baseWidth = columnWidths[colKey];
            if (!baseWidth && headerCellRefs.current[colKey]) {
                baseWidth = headerCellRefs.current[colKey]!.offsetWidth;
            }
            if (!baseWidth) {
                // Default fallback - try to measure from resizeRefs if available
                const resizeEl = resizeRefs.current[colKey] as HTMLTableCellElement | null;
                baseWidth = resizeEl?.offsetWidth || 150;
            }
            left += baseWidth;
        }
        
        return left;
    }, [config.enableRowSelection, config.enableRowNumber, columnOrder, visibleColumns, columnWidths, config.freezePaneColumnIndexNo]);

    // Check if a data column should be frozen based on current column order
    // freezePaneColumnIndexNo is 1-based where column 0 = checkbox:
    // - 1 = freeze column 0 (checkbox) only
    // - 2 = freeze columns 0 (checkbox) + 1 (first data column)
    // - 3 = freeze columns 0 (checkbox) + 1 + 2 (first two data columns)
    // - 4 = freeze columns 0 (checkbox) + 1 + 2 + 3 (first three data columns)
    // colIndex is 0-based for data columns (0 = first data column, which is overall column 1)
    // So if freezePaneColumnIndexNo = 2, freeze colIndex < 1 (i.e., colIndex 0 = first data column)
    // If freezePaneColumnIndexNo = 3, freeze colIndex < 2 (i.e., colIndex 0 and 1)
    // If freezePaneColumnIndexNo = 4, freeze colIndex < 3 (i.e., colIndex 0, 1, and 2)
    const isColumnFrozen = useCallback((colIndex: number) => {
        if (config.enableFreezePane === false) return false;
        if (!config.enablefreezePaneColumnIndex) return false;
        const freezeIndex = (config.freezePaneColumnIndexNo || 1); // 1-based
        // Freeze all data columns up to and including (freezeIndex - 2)
        // If freezeIndex = 2, freeze colIndex < 1 (i.e., colIndex 0)
        // If freezeIndex = 3, freeze colIndex < 2 (i.e., colIndex 0, 1)
        // If freezeIndex = 4, freeze colIndex < 3 (i.e., colIndex 0, 1, 2)
        return colIndex < (freezeIndex - 1);
    }, [config.enableFreezePane, config.enablefreezePaneColumnIndex, config.freezePaneColumnIndexNo]);

    // Check if checkbox/row number column should be frozen
    // Checkbox is column 0, so it's frozen if freezePaneColumnIndexNo >= 1
    const isCheckboxColumnFrozen = useCallback(() => {
        if (config.enableFreezePane === false) return false;
        if (!config.enablefreezePaneColumnIndex) return false;
        const freezeIndex = (config.freezePaneColumnIndexNo || 1);
        // If freezeIndex >= 1, freeze the checkbox column (column 0)
        return freezeIndex >= 1;
    }, [config.enableFreezePane, config.enablefreezePaneColumnIndex, config.freezePaneColumnIndexNo]);

    function getThemeClasses(): string {
        const baseClasses = 'data-table';

        const themeClasses: Record<string, string> = {
            default: '',
            professional: 'theme-professional',
            modern: 'theme-modern',
            minimal: 'theme-minimal',
            executive: 'theme-executive',
            corporate: 'theme-corporate',
            finance: 'theme-finance',
            tech: 'theme-tech',
            classic: 'theme-classic',
            neutral: 'theme-neutral',
        };

        const viewClasses: Record<string, string> = {
            default: '',
            'max-compact': 'max-compact',
            compact: 'compact',
            comfortable: 'comfortable',
            spacious: 'spacious'
        };

        const composed = `
        ${baseClasses}
        ${themeClasses[config.theme || 'default']}
        ${viewClasses[config.tableView || 'default']}
        ${!config.enableRowHoverHighlight ? 'no-hover' : ''}
        ${config.enableStripedRows ? 'striped' : ''}
        ${tableFreezeHeaderEnabled ? 'freeze-header' : ''}
    `;
        return composed;
    }

    /** Invalid saved values (e.g. confused with tabOrientation) hid both tab strips */
    const tabBarPlacement: TabBarPlacement =
        config.tabBarPlacement === 'left-of-table' ? 'left-of-table' : 'between-title-and-panel';
    const tabMenuStyle: TabMenuStyle = normalizeTabMenuStyle(config.tabMenuStyle);
    const tabShowUnderline = resolveTabShowUnderline(config.tabShowUnderline, config.tabStyle);

    const effectiveTabList: TabItem[] = useMemo(() => {
        const raw = config.tabList ?? [];
        const applyShareTabLock = (tabs: TabItem[]): TabItem[] => {
            if (!shareViewParams.isShareView || !shareViewParams.lockedTabId) return tabs;
            const one = tabs.find((t) => t.id === shareViewParams.lockedTabId);
            return one ? [one] : tabs.slice(0, 1);
        };
        if (!config.enableTabs) return raw;
        if (raw.length > 0) {
            const normalized = raw.map((t) => {
                const emoji = t.customIcon?.trim();
                let iconKey = t.iconKey || 'list';
                if (emoji && iconKey !== TAB_ICON_CUSTOM_KEY) {
                    iconKey = TAB_ICON_CUSTOM_KEY;
                }
                return {
                    ...t,
                    iconKey,
                    customIcon: iconKey === TAB_ICON_CUSTOM_KEY ? emoji || undefined : undefined,
                };
            });
            return applyShareTabLock(normalized);
        }
        return applyShareTabLock([
            {
                id: 'tab-default-ui',
                label: 'Default',
                presetId: 'default',
                iconKey: 'list',
            },
        ]);
    }, [config.enableTabs, config.tabList, shareViewParams.isShareView, shareViewParams.lockedTabId]);

    const showTabBar = !!config.enableTabs && effectiveTabList.length > 0;
    const tabLabelW =
        typeof config.tabLabelWidth === 'number' && config.tabLabelWidth > 0 ? config.tabLabelWidth : 120;

    const tabIconSize =
        typeof config.tabIconSize === 'number' &&
        config.tabIconSize >= 12 &&
        config.tabIconSize <= 32
            ? config.tabIconSize
            : undefined;
    const tabGap = typeof config.tabGap === 'number' && config.tabGap >= 0 ? config.tabGap : 8;

    const tabBarPanelProps = {
        enableTabs: !!config.enableTabs,
        tabList: effectiveTabList,
        tabHeight: config.tabHeight ?? 'small',
        tabAlignment: config.tabAlignment ?? 'left',
        tabLabelWidth: tabLabelW,
        tabPanelBackground:
            config.tabUseCustomPanelBackground === false
                ? 'transparent'
                : config.tabPanelBackground || '#ffffff',
        tabBarPlacement,
        tabMenuStyle,
        tabStyle: (config.tabStyle ?? 'standard') as TabVisualStyle,
        tabShowUnderline,
        tabIconSize: tabIconSize,
        tabGap,
        tabCustomSelection: !!config.tabCustomSelection,
        tabSelectionColor: config.tabSelectionColor || '#2563eb',
        tabCustomHover: !!config.tabCustomHover,
        tabHoverColor: config.tabHoverColor || '#e5e7eb',
        onSelectPreset: handleTabPresetSelect,
    };

    const tabStripBetween =
        showTabBar && tabBarPlacement === 'between-title-and-panel' ? (
            <div
                className="w-full min-w-0 overflow-x-hidden"
                style={{
                    marginTop: config.tabPanelMarginTop ?? 0,
                    marginBottom: config.tabPanelSpacing ?? 0,
                }}
            >
                <TableTabPanel {...tabBarPanelProps} />
            </div>
        ) : null;

    const tabStripLeft =
        showTabBar && tabBarPlacement === 'left-of-table' ? (
            <div
                className="shrink-0 self-stretch"
                style={{ marginRight: config.tabPanelSpacing ?? 0 }}
            >
                <TableTabPanel {...tabBarPanelProps} tabBarPlacement="left-of-table" />
            </div>
        ) : null;

    const tableQueryStateForModal = useMemo((): TableQueryState => {
        const visibleSet = new Set(visibleColumns);
        const columnWidthsPx = Object.fromEntries(
            Object.entries(columnWidths).filter(([k]) => visibleSet.has(k))
        );
        return {
            searchTerm,
            sortCriteria,
            filterCriteria,
            groupByColumn,
            activeColumns,
            visibleColumns,
            columnOrder,
            columnWidthsPx,
            columnWrapStates,
        };
    }, [
        searchTerm,
        sortCriteria,
        filterCriteria,
        groupByColumn,
        activeColumns,
        visibleColumns,
        columnOrder,
        columnWidths,
        columnWrapStates,
    ]);

    return (
        <div className="fade-in">
            {/* Print Consent Modal */}
            {showPrintConsent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Print Confirmation</h2>
                        <p className="text-gray-700 mb-6">
                            This action will take the data outside of the Briselle Platform limits. 
                            Are you sure you want to proceed with printing?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handlePrintCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePrintConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Consent Modal */}
            {showExportConsent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Export Confirmation</h2>
                        <p className="text-gray-700 mb-6">
                            This action will take the data outside of the Briselle Platform limits. 
                            Are you sure you want to proceed with exporting as {pendingExportFormat?.toUpperCase()}?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleExportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Input Modal */}
            {showEmailInput && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Send to Email</h2>
                        <p className="text-gray-700 mb-4">
                            Enter email addresses (comma-separated):
                        </p>
                        <input
                            type="text"
                            value={emailAddresses}
                            onChange={(e) => setEmailAddresses(e.target.value)}
                            placeholder="email1@example.com, email2@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-6"
                            autoFocus
                        />
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleEmailExportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEmailExportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connector Export Confirmation Modal */}
            {showConnectorExportConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Export to Connector</h2>
                        <p className="text-gray-700 mb-6">
                            This action will send the data to the connector. Are you sure you want to proceed?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleConnectorExportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConnectorExportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connector Import Confirmation Modal */}
            {showConnectorImportConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Import from Connector</h2>
                        <p className="text-gray-700 mb-6">
                            This action will import data from the connector. This may overwrite some existing data. Are you sure you want to proceed?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleConnectorImportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConnectorImportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Consent Modal */}
            {showImportConsent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Import Confirmation</h2>
                        <p className="text-gray-700 mb-6">
                            This action will bring data inside the Briselle Platform limits. 
                            Please ensure you have proper consent for the required data. 
                            This may overwrite some existing data. Are you sure you want to proceed with importing from {pendingImportFormat?.toUpperCase()}?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleImportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Field Mapping Modal */}
            {showImportMapping && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Map Import Fields</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Map the columns from your imported file to the table columns.
                        </p>
                        <div className="space-y-3 mb-6">
                            {Object.keys(importFieldMapping).map((csvHeader) => (
                                <div key={csvHeader} className="flex items-center space-x-4">
                                    <div className="w-1/3 text-sm font-medium text-gray-700">
                                        {csvHeader}
                                    </div>
                                    <div className="flex-1">
                                        <select
                                            value={importFieldMapping[csvHeader] || ''}
                                            onChange={(e) => {
                                                setImportFieldMapping(prev => ({
                                                    ...prev,
                                                    [csvHeader]: e.target.value
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">-- Select Column --</option>
                                            {Object.keys(fieldMappings).map(col => (
                                                <option key={col} value={col}>
                                                    {fieldMappings[col]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleImportMappingCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportMappingConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Import Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {shareViewParams.isShareView && !shareContentUnlocked && (
                <div className="fixed inset-0 z-[1200] bg-black/35 flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200 p-5">
                        {!shareConsentAccepted ? (
                            <>
                                <h3 className="text-base font-semibold text-gray-900">Shared Data Consent</h3>
                                <p className="text-sm text-gray-600 mt-2">
                                    This shared dataset may contain sensitive information. Continue only if you are authorized.
                                </p>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border border-gray-300 text-gray-700"
                                        onClick={() => {
                                            if (shareViewParams.shareToken) {
                                                sessionStorage.setItem(`share-consent-${shareViewParams.shareToken}`, '1');
                                            }
                                            setShareConsentAccepted(true);
                                        }}
                                    >
                                        I Accept
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-base font-semibold text-gray-900">Restricted Share Access</h3>
                                <p className="text-sm text-gray-600 mt-2">
                                    Enter username/email and password to open this shared view.
                                </p>
                                <div className="mt-3 space-y-2">
                                    <input
                                        type="text"
                                        value={shareCredentialUser}
                                        onChange={(e) => {
                                            setShareCredentialUser(e.target.value);
                                            setShareCredentialError(null);
                                        }}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        placeholder="Username or email"
                                    />
                                    <input
                                        type="password"
                                        value={shareCredentialPassword}
                                        onChange={(e) => {
                                            setShareCredentialPassword(e.target.value);
                                            setShareCredentialError(null);
                                        }}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        placeholder="Password"
                                    />
                                    {shareCredentialError && <p className="text-xs text-red-600">{shareCredentialError}</p>}
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded bg-primary text-white"
                                        onClick={submitShareCredentials}
                                    >
                                        Unlock
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Main content: table + optional chart panel */}
            {shareContentUnlocked && (
            <div className={cn(chartPanelOpen && "flex flex-row")}>
            <div
                id="printable-table-content"
                data-share-scope="title-to-footer"
                className={cn(chartPanelOpen && "flex-1 min-w-0")}
                style={shareViewParams.isShareView && shareViewParams.restrictCopy ? { userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
                onCopy={shareViewParams.isShareView && shareViewParams.restrictCopy ? (e) => e.preventDefault() : undefined}
                onCut={shareViewParams.isShareView && shareViewParams.restrictCopy ? (e) => e.preventDefault() : undefined}
                onKeyDown={shareViewParams.isShareView && shareViewParams.restrictCopy ? (e) => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x' || e.key === 's' || e.key === 'a')) e.preventDefault();
                } : undefined}
                onContextMenu={shareViewParams.isShareView && shareViewParams.restrictCopy ? (e) => e.preventDefault() : undefined}
            >
                {/* Title Section */}
            {config.enableTitle && (
                <div style={getTitleStyle()} className={config.enableTitleBackground ? 'mb-0' : 'mb-6'}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="page-title mb-0">{title}</h1>
                            {config.enableRecordCount && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {sortedData.length} record{sortedData.length !== 1 ? 's' : ''}
                                    {config.enableSortInfo && sortCriteria.length > 0 && (
                                        <span className="ml-2">
                                            • Sorted by {sortCriteria.map(s => `${fieldMappings[s.column]} (${s.order === 'asc' ? 'A-Z' : 'Z-A'})`).join(', ')}
                                        </span>
                                    )}
                                    {config.enableFilterInfo && filterCriteria.length > 0 && (
                                        <span className="ml-2">• {filterCriteria.length} filter{filterCriteria.length !== 1 ? 's' : ''} applied</span>
                                    )}
                                </p>
                            )}
                            {config.enableLastUpdated && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Last updated: {new Date().toLocaleString()}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            {config.enableNewButton && (
                                <button className="btn btn-primary" onClick={onNewButtonClick}>
                                    {config.newButtonType === 'icon' ? (
                                        <Plus size={16} />
                                    ) : (
                                        <>
                                            <Plus size={16} className="mr-2" /> New {title}
                                        </>
                                    )}
                                </button>
                            )}
                            {/* Settings and Preset when Table Panel is disabled */}
                            {!config.enableTablePanel && !shareViewParams.isShareView && (
                                <>
                                    {config.enablePresetSelector && (
                                        <div className="relative z-[110]" ref={dropdownRef}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowPresetDropdown(!showPresetDropdown);
                                                }}
                                                className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                            >
                                                <Bookmark size={16} />
                                                <ChevronDown size={14} className="ml-1" />
                                            </button>

                                            {showPresetDropdown && (
                                                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[800]">
                                                    <div className="py-1">
                                                        {presets.map((preset) => (
                                                            <button
                                                                key={preset.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    applyPreset(preset);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                                            >
                                                                {preset.name}
                                                                {preset.isDefault && <Star size={12} className="ml-2 text-yellow-500" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setIsTableSettingsOpen(true)}
                                        className="p-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        <Settings size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {tableCellSelectionEnabled &&
                cellRangeRect &&
                !cellRangeHasDraftRows &&
                !(shareViewParams.isShareView && shareViewParams.restrictCopy) && (
                <div
                    className="pointer-events-auto fixed bottom-6 left-1/2 z-[540] flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur-sm"
                    role="toolbar"
                    aria-label="Cell selection actions"
                >
                    <button
                        type="button"
                        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        title="Copy selection — choose format (plain, HTML, Markdown)"
                        onClick={() => openCellRangeCopyModal()}
                    >
                        <Copy size={18} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                        type="button"
                        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        title="Save selection as PNG to your downloads"
                        onClick={() => void captureSelectionAsPng()}
                    >
                        <Camera size={18} strokeWidth={2} aria-hidden />
                    </button>
                </div>
            )}

            {/* Tab strip (underline / icon style): between title & toolbar when configured */}
            {tabStripBetween}

            {/* Table Panel - outside card so transparent background shows page (same as Title Panel) */}
                {config.enableTablePanel && (!shareViewParams.isShareView || shareViewParams.panelAllowed) && (
                    <div style={{ marginBottom: `${config.tablePanelSpacing ?? 0}px` }}>
                    <TableActionPanel
                        enableTablePanel={config.enableTablePanel}
                        tablePanelBackground={config.tablePanelBackground || false}
                        tablePanelBackgroundColor={config.tablePanelBackgroundColor || '#ffffff'}
                        enableTooltips={config.enableTooltips === true}
                        // Search
                        enableSearch={config.enableSearch || false}
                        searchButtonType={config.searchButtonType || 'icon'}
                        searchButtonAlign={config.searchButtonAlign || 'right'}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        // Sort
                        enableSort={config.enableSort || false}
                        sortButtonType={config.sortButtonType || 'icon'}
                        sortButtonAlign={config.sortButtonAlign || 'right'}
                        sortCriteria={sortCriteria}
                        onSortCriteriaChange={setSortCriteria}
                        // Filter
                        enableFilter={config.enableFilter || false}
                        filterButtonType={config.filterButtonType || 'icon'}
                        filterButtonAlign={config.filterButtonAlign || 'right'}
                        filterCriteria={filterCriteria}
                        onFilterCriteriaChange={setFilterCriteria}
                        dateColumnKeys={dateColumnKeys}
                        // Group
                        enableGroup={config.enableGroup || false}
                        groupButtonType={config.groupButtonType || 'icon'}
                        groupButtonAlign={config.groupButtonAlign || 'right'}
                        groupByColumn={groupByColumn}
                        onGroupByColumnChange={setGroupByColumn}
                        // Column Visibility
                        enableColumnVisibility={config.enableColumnVisibility || false}
                        columnVisibilityButtonType={config.columnVisibilityButtonType || 'icon'}
                        columnVisibilityButtonAlign={config.columnVisibilityButtonAlign || 'right'}
                        allColumns={allColumns}
                        activeColumns={activeColumns}
                        visibleColumns={visibleColumns}
                        onActiveColumnsChange={(next) => {
                            setActiveColumns(next);
                            setColumnOrder(next);
                            setColumnWidths((prev) => {
                                const allow = new Set(next);
                                const o = { ...prev };
                                for (const k of Object.keys(o)) {
                                    if (!allow.has(k)) delete o[k];
                                }
                                return o;
                            });
                        }}
                        onVisibleColumnsChange={setVisibleColumns}
                        columnWidths={columnWidths}
                        onColumnWidthsChange={setColumnWidths}
                        columnWrapStates={columnWrapStates}
                        onToggleColumnWrapClip={handleWrapClipToggle}
                        onApplyColumnSettings={handlePersistColumnSettings}
                        // Freeze Pane
                        freezePaneType={config.freezePaneType || 'icon'}
                        freezePaneAlign={config.freezePaneAlign || 'right'}
                        enableFreezePaneRowHeader={config.enableFreezePaneRowHeader || false}
                        enablefreezePaneColumnIndex={config.enablefreezePaneColumnIndex || false}
                        freezePaneColumnIndexNo={config.freezePaneColumnIndexNo || 1}
                        maxColumnIndex={Math.max(1, activeColumns.length || 1)} // Max = number of active columns from columnVisibility configuration (min 1)
                        // Refresh
                        enableRefresh={config.enableRefresh || false}
                        refreshButtonType={config.refreshButtonType || 'icon'}
                        refreshButtonAlign={config.refreshButtonAlign || 'right'}
                        onRefreshClick={handleRefresh}
                        // Export
                        enableExport={config.enableExport || false}
                        exportButtonType={config.exportButtonType || 'icon'}
                        exportButtonAlign={config.exportButtonAlign || 'right'}
                        onExportClick={handleExportClick}
                        // Import
                        enableImport={config.enableImport || false}
                        importButtonType={config.importButtonType || 'icon'}
                        importButtonAlign={config.importButtonAlign || 'right'}
                        onImportClick={handleImportClick}
                        // Print
                        enablePrint={config.enablePrint || false}
                        printButtonType={config.printButtonType || 'icon'}
                        printButtonAlign={config.printButtonAlign || 'right'}
                        onPrintClick={handlePrintClick}
                        // Change Owner
                        enableChangeOwner={config.enableChangeOwner || false}
                        changeOwnerButtonType={config.changeOwnerButtonType || 'icon'}
                        changeOwnerButtonAlign={config.changeOwnerButtonAlign || 'right'}
                        onChangeOwnerClick={handleChangeOwnerClick}
                        // Chart
                        enableChart={config.enableChart || false}
                        chartButtonType={config.chartButtonType || 'icon'}
                        chartButtonAlign={config.chartButtonAlign || 'right'}
                        onChartClick={handleChartClick}
                        // Share
                        enableShare={config.enableShare || false}
                        shareButtonType={config.shareButtonType || 'icon'}
                        shareButtonAlign={config.shareButtonAlign || 'right'}
                        onShareClick={handleShareClick}
                        onCreateShareTokenSettings={handleCreateShareTokenSettings}
                        onDeleteShareToken={handleDeleteShareToken}
                        onDeleteAllShareTokens={handleDeleteAllShareTokens}
                        shareGeneratedLinks={shareGeneratedLinks}
                        activeTabIdForShare={currentTabIdForShare}
                        // Preset
                        enablePresetSelector={config.enablePresetSelector || false}
                        presetButtonType={config.presetButtonType || 'icon'}
                        presetButtonAlign={config.presetButtonAlign || 'right'}
                        presets={presets}
                activePresetId={activePresetId}
                        onPresetClick={handlePresetClick}
                        onPresetApply={applyPreset}
                        // Table View (density shortcut)
                        tableViewButtonType={config.tableViewButtonType || 'icon'}
                        tableViewButtonAlign={config.tableViewButtonAlign || 'right'}
                        currentTableView={config.tableView || 'default'}
                        onTableViewChange={handleTableViewChange}
                        // Table Layout Setup (replaces Table View in panel)
                        enableTableLayoutSetup={config.enableTableLayoutSetup ?? true}
                        tableLayoutSetupButtonType={config.tableLayoutSetupButtonType || config.tableViewButtonType || 'icon'}
                        tableLayoutSetupButtonAlign={config.tableLayoutSetupButtonAlign || config.tableViewButtonAlign || 'right'}
                        // Settings
                        settingsButtonType={config.settingsButtonType || 'icon'}
                        settingsButtonAlign={config.settingsButtonAlign || 'right'}
                        onSettingsClick={handleSettingsClick}
                        // Common
                        fieldMappings={fieldMappings}
                        preferredColumns={preferredColumns}
                        config={config}
                        onConfigChange={pushConfig}
                    />
                    </div>
                )}

            <div
                className={cn(
                    tabStripLeft ? 'flex flex-row items-stretch w-full min-w-0' : 'contents'
                )}
            >
                {tabStripLeft}
                <div className={cn(tabStripLeft ? 'flex-1 min-w-0' : 'contents')}>
            <div className="card" style={getTableStyle()}>
                {error && (
                    <div className="p-4 mx-4 mt-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                        <AlertTriangle className="shrink-0" size={18} />
                        <span>{error}</span>
                    </div>
                )}
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className={getThemeClasses()}>
                            {config.enableHeader && (
                                <thead className="bg-gray-100">
                                    <tr>
                                        {(config.enableRowSelection || config.enableRowNumber) && (() => {
                                            const checkboxFrozen = isCheckboxColumnFrozen();
                                            const rowHeaderSticky = tableFreezeHeaderEnabled;
                                            const checkboxHeaderStyle: React.CSSProperties = {
                                                width: checkboxColumnWidth ? `${checkboxColumnWidth}px` : undefined,
                                                minWidth: checkboxColumnWidth ? `${checkboxColumnWidth}px` : undefined,
                                                maxWidth: checkboxColumnWidth ? `${checkboxColumnWidth}px` : undefined,
                                                boxSizing: 'border-box',
                                            };
                                            if (rowHeaderSticky || checkboxFrozen) {
                                                checkboxHeaderStyle.position = 'sticky';
                                                checkboxHeaderStyle.backgroundColor = 'rgb(249 250 251)';
                                            }
                                            if (rowHeaderSticky) {
                                                checkboxHeaderStyle.top = 0;
                                            }
                                            if (checkboxFrozen) {
                                                checkboxHeaderStyle.left = 0;
                                                checkboxHeaderStyle.zIndex = FROZEN_HEADER_Z_BASE;
                                            } else if (rowHeaderSticky) {
                                                checkboxHeaderStyle.zIndex = 32;
                                            }
                                            return (
                                            <th 
                                                ref={(el) => checkboxColumnRef.current = el}
                                                className={cn(
                                                    'px-4 py-2 text-sm text-gray-700',
                                                    checkboxColumnRightBorderClass(
                                                        !!config.enableColumnDivider,
                                                        checkboxFrozen,
                                                        tableFreezeColumnEnabled,
                                                        config.freezePaneColumnIndexNo,
                                                    ),
                                                )}
                                                style={checkboxHeaderStyle}
                                            >
                                                {config.enableRowSelection && config.enableRowNumber ? (
                                                    <span className="flex items-center gap-1">
                                                        {config.enableMassSelection && (
                                                            <input
                                                                type="checkbox"
                                                                ref={(el) => {
                                                                    if (el) {
                                                                        const state = getHeaderCheckboxState();
                                                                        el.checked = state === 'checked';
                                                                        el.indeterminate = state === 'indeterminate';
                                                                    }
                                                                }}
                                                                onChange={handleSelectAllRows}
                                                            />
                                                        )}
                                                        <span className="text-xs text-gray-500 tabular-nums">#</span>
                                                    </span>
                                                ) : config.enableRowSelection && config.enableMassSelection ? (
                                                    <input
                                                        type="checkbox"
                                                        ref={(el) => {
                                                            if (el) {
                                                                const state = getHeaderCheckboxState();
                                                                el.checked = state === 'checked';
                                                                el.indeterminate = state === 'indeterminate';
                                                            }
                                                        }}
                                                        onChange={handleSelectAllRows}
                                                    />
                                                ) : config.enableRowNumber ? (
                                                    <span className="text-xs text-gray-500 tabular-nums">#</span>
                                                ) : null}
                                            </th>
                                            );
                                        })()}

                                        {config.enableRowActions && config.rowActionsPosition === 'left' && (
                                            <th
                                                className={`px-4 py-2 ${config.enableColumnDivider ? 'border-r border-gray-200' : ''}`}
                                                style={
                                                    tableFreezeHeaderEnabled
                                                        ? {
                                                              position: 'sticky',
                                                              top: 0,
                                                              zIndex: 29,
                                                              backgroundColor: 'rgb(249 250 251)',
                                                          }
                                                        : undefined
                                                }
                                            >
                                                Actions
                                            </th>
                                        )}
                                        {columnOrder
                                            .filter(col => visibleColumns.includes(col))
                                            .map((col, colIndex, arr) => {
                                                const isFrozen = isColumnFrozen(colIndex);
                                                const freezeIndex = config.freezePaneColumnIndexNo || 1;
                                                const shouldShowBorder =
                                                    tableFreezeColumnEnabled &&
                                                    freezeIndex >= 2 &&
                                                    colIndex === freezeIndex - 2;
                                                const freezeEdgeDivider =
                                                    !!config.enableColumnDivider && shouldShowBorder;
                                                const lightColDivider =
                                                    !!config.enableColumnDivider &&
                                                    colIndex < arr.length - 1 &&
                                                    !freezeEdgeDivider;
                                                const nextIsFrozen =
                                                    colIndex + 1 < arr.length && isColumnFrozen(colIndex + 1);
                                                const showFrozenLeftDivider =
                                                    isFrozen &&
                                                    ((colIndex > 0 && isColumnFrozen(colIndex - 1)) ||
                                                        (colIndex === 0 &&
                                                            (config.enableRowSelection || config.enableRowNumber) &&
                                                            isCheckboxColumnFrozen() &&
                                                            freezeIndex > 1));
                                                const leftOffset = isFrozen ? getFreezeLeftOffset(colIndex) : 0;
                                                
                                                return (
                                                <th
                                                    key={col}
                                                    ref={(el) => {
                                                        resizeRefs.current[col] = el;
                                                        headerCellRefs.current[col] = el;
                                                    }}
                                                    className={cn(
                                                        'px-4 py-2 text-left cursor-pointer relative group',
                                                        lightColDivider &&
                                                            (!isFrozen || !nextIsFrozen) &&
                                                            'border-r border-gray-200',
                                                        showFrozenLeftDivider && 'freeze-col-light-l',
                                                        freezeEdgeDivider && 'freeze-pane-seam',
                                                    )}
                                                    style={{ 
                                                        width: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                                        minWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                                        maxWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                                        boxSizing: 'border-box',
                                                        ...(isFrozen ? {
                                                            position: 'sticky',
                                                            left: `${leftOffset}px`,
                                                            ...(tableFreezeHeaderEnabled ? { top: 0 } : {}),
                                                            zIndex: FROZEN_HEADER_Z_BASE + 1 + colIndex,
                                                            backgroundColor: 'rgb(249 250 251)', // bg-gray-100
                                                        } : tableFreezeHeaderEnabled ? {
                                                            position: 'sticky',
                                                            top: 0,
                                                            zIndex:
                                                                tableFreezeColumnEnabled ? 27 : 28,
                                                            backgroundColor: 'rgb(249 250 251)',
                                                        } : {}),
                                                        ...(activeResizeColumn === col
                                                            ? {
                                                                  boxShadow: `inset -2px 0 0 0 ${inlineEditHighlightColor}`,
                                                              }
                                                            : config.enableColumnReorder &&
                                                                columnDragOverIndex === colIndex &&
                                                                draggedColumnIndex !== null &&
                                                                draggedColumnIndex !== colIndex
                                                              ? {
                                                                    boxShadow: `inset 2px 0 0 0 ${inlineEditHighlightColor}`,
                                                                }
                                                              : {}),
                                                    }}
                                                    onClick={() => handleSort(col)}
                                                    draggable={config.enableColumnReorder && activeResizeColumn === null}
                                                    onDragStart={(e) => handleColumnDragStart(e, colIndex)}
                                                    onDragOver={(e) => handleColumnDragOver(e, colIndex)}
                                                    onDrop={(e) => handleColumnDrop(e, colIndex)}
                                                    onDragEnd={handleColumnDragEnd}
                                                >
                                                    <div className="flex items-center pr-6" title={config.enableTooltips === true ? (fieldMappings[col] ?? col) : undefined}>
                                                        {config.enableColumnReorder && (
                                                            <div className="cursor-move text-gray-400 hover:text-gray-600 mr-2">
                                                                <GripVertical size={14} />
                                                            </div>
                                                        )}
                                                        {fieldMappings[col]}
                                                        {config.enableSort && sortCriteria.find(s => s.column === col) && (
                                                            <span>{sortCriteria.find(s => s.column === col)?.order === 'asc' ? ' ↑' : ' ↓'}</span>
                                                        )}
                                                    </div>
                                                    {/* Wrap/clip is controlled via Column Visibility dropdown (per-column settings). */}
                                                    {config.enableColumnResize && (
                                                        <div
                                                            className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-[5]"
                                                            aria-hidden
                                                            onMouseDown={(e) => handleMouseDown(e, col)}
                                                        />
                                                    )}
                                                </th>
                                                );
                                            })}

                                        {config.enableRowActions && config.rowActionsPosition !== 'left' && (
                                            <th
                                                className={`px-4 py-2 ${config.enableColumnDivider ? 'border-l border-gray-200' : ''}`}
                                                style={
                                                    tableFreezeHeaderEnabled
                                                        ? {
                                                              position: 'sticky',
                                                              top: 0,
                                                              zIndex: 29,
                                                              backgroundColor: 'rgb(249 250 251)',
                                                          }
                                                        : undefined
                                                }
                                            >
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                            )}

                            <tbody key={`tbody-${groupByColumn ? `grouped-${groupByColumn}` : 'ungrouped'}-${sortCriteria.map(s => `${s.column}-${s.order}`).join('-')}-${sortedData.length}-${sortedData[0] ? String(getTemplateRowIdentityKey(sortedData[0] as Record<string, unknown>) ?? 'row0') : 'empty'}`}>
                                {renderTableRows()}
                            </tbody>
                            <TableFooter
                                enableFooter={config.enableFooter || false}
                                enableTableTotals={config.enableTableTotals || false}
                                enablePagination={config.enablePagination || false}
                                pageSize={config.pageSize || 25}
                                pageSizeOptions={config.pageSizeOptions || [10, 25, 50, 100]}
                                totalRecords={sortedData.length}
                                currentPage={1}
                                onPageSizeChange={(size) => pushConfig({ ...config, pageSize: size })}
                            />
                        </table>

                        {sortedData.length === 0 && config.enableQuickAddRow === false && (
                            <div className="py-8 text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                                    <AlertTriangle size={24} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No Record Found</h3>
                                <p className="text-gray-500">Try adjusting your search or create a new record.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
                </div>
            </div>

            </div>
            {chartPanelOpen && (
                <ChartPanel
                    recordCount={sortedData.length}
                    data={sortedData}
                    dataColumns={columnOrder.filter((c) => visibleColumns.includes(c))}
                    fieldMappings={fieldMappings}
                    onClose={() => setChartPanelOpen(false)}
                />
            )}
            </div>
            )}

            {/* Bulk Actions Bar - Outside printable content so it doesn't print */}
            {config.enableBulkActions && selectedRows.length > 0 && (() => {
                const selectedRecords = selectedRows
                    .map((i) => sortedData[i])
                    .filter((r): r is Record<string, unknown> => r != null) as Record<string, unknown>[];
                const bulkOl = objectLoaderCrud;
                return (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-[520]">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                            {selectedRows.length} item{selectedRows.length !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center space-x-2">
                            {(config.bulkActionStyle === 'buttons' || config.bulkActionStyle === 'dropdown') ? (
                                <>
                                    {bulkOl && (
                                        <button
                                            type="button"
                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                            onClick={() => setObjectLoaderModal({ type: 'bulk_view', rows: selectedRecords })}
                                        >
                                            View
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                                        onClick={() => bulkOl && setObjectLoaderModal({ type: 'bulk_edit', rows: selectedRecords })}
                                        disabled={!bulkOl}
                                    >
                                        Edit
                                    </button>
                                    {bulkOl && !copyRestrictedByShare && (
                                        <button
                                            type="button"
                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                            onClick={() => setObjectLoaderModal({ type: 'bulk_copy', rows: selectedRecords })}
                                        >
                                            Copy
                                        </button>
                                    )}
                                    <button type="button" className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                                        Export
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                                        onClick={() =>
                                            bulkOl
                                                ? setObjectLoaderModal({ type: 'bulk_delete', rows: selectedRecords })
                                                : undefined
                                        }
                                        disabled={!bulkOl}
                                    >
                                        Delete
                                    </button>
                                </>
                            ) : (
                                <>
                                    {bulkOl && (
                                        <button
                                            type="button"
                                            className="p-2 text-gray-500 hover:text-primary border border-gray-300 rounded hover:bg-gray-50"
                                            title="View"
                                            onClick={() => setObjectLoaderModal({ type: 'bulk_view', rows: selectedRecords })}
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="p-2 text-gray-500 hover:text-primary border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                                        title="Edit"
                                        disabled={!bulkOl}
                                        onClick={() => bulkOl && setObjectLoaderModal({ type: 'bulk_edit', rows: selectedRecords })}
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-2 text-gray-500 hover:text-primary border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                                        title="Copy"
                                        disabled={!bulkOl || copyRestrictedByShare}
                                        onClick={() => bulkOl && !copyRestrictedByShare && setObjectLoaderModal({ type: 'bulk_copy', rows: selectedRecords })}
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-2 text-red-500 hover:text-red-700 border border-red-300 rounded hover:bg-red-50 disabled:opacity-40"
                                        title="Delete"
                                        disabled={!bulkOl}
                                        onClick={() => bulkOl && setObjectLoaderModal({ type: 'bulk_delete', rows: selectedRecords })}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedRows([])}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
                );
            })()}

            {objectLoaderCrud && (
                <ObjectLoaderRecordModals
                    state={objectLoaderModal}
                    onClose={() => setObjectLoaderModal(null)}
                    fieldMappings={fieldMappings}
                    columnOrder={columnOrder}
                    visibleColumns={visibleColumns}
                    crud={objectLoaderCrud}
                    onAfterMutation={() => {
                        onRefresh?.();
                        setSelectedRows([]);
                    }}
                />
            )}

            {/* Single painted seam on last frozen column / checkbox-only freeze — avoids double borders + hollow gaps when scrolling (no extra z-index on scroll cells). */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
.data-table td.freeze-pane-seam,
.data-table th.freeze-pane-seam {
  position: relative;
}
.data-table td.freeze-pane-seam::after,
.data-table th.freeze-pane-seam::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 2px;
  background-color: #d1d5db;
  z-index: 90;
  pointer-events: none;
}
/* Interior frozen–frozen: line on the higher-z cell’s left (::before), not right of lower-z (would be covered). */
.data-table td.freeze-col-light-l,
.data-table th.freeze-col-light-l {
  position: relative;
}
.data-table td.freeze-col-light-l::before,
.data-table th.freeze-col-light-l::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 1px;
  background-color: #e5e7eb;
  z-index: 95;
  pointer-events: none;
}
`,
                }}
            />

            <TableSettingsModal
                isOpen={isTableSettingsOpen}
                onSave={pushConfig}
                onClose={handleCloseTableSettings}
                currentConfig={config}
                presets={presets}
                onPresetsChange={setPresets}
                onPresetsRefresh={reloadPresetsFromDatabase}
                activePresetId={activePresetId}
                onPresetSelect={setActivePresetId}
                fieldMappings={fieldMappings}
                tableQueryState={tableQueryStateForModal}
                platformConfigScope={platformScope}
            />

            {cellRangeGridCopy && (
                <CopyGridClipboardModal
                    rows={cellRangeGridCopy.rows}
                    fieldMappings={fieldMappings}
                    columnOrder={columnOrder}
                    visibleColumns={visibleColumns}
                    columnKeysOverride={cellRangeGridCopy.cols}
                    title="Copy selection"
                    helperText="Column labels are included as the first row of the copied table. Choose a clipboard format below."
                    onClose={() => setCellRangeGridCopy(null)}
                />
            )}

        </div>
    );
}

