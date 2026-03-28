import ConfigurableListTemplate, { TableConfig } from "../../components/ui/tabletemplates/ConfigurableListTemplate";
import { supabase } from '../../utils/supabase';
import { useEffect, useState } from "react";

const fieldMappings = {
    dobj_name_display: "Name",
    dobj_name_system: "API Name",
    dobj_description: "Description",
    dobj_status: "Status",
    dobj_updated_at: "Last Modified",
};

/** Normalize row keys to match fieldMappings (handles Supabase returning different casing or names). Preserves all original keys. */
function normalizeRowsToFieldMappings<T extends Record<string, unknown>>(
    rows: T[],
    mappingKeys: string[]
): Record<string, unknown>[] {
    if (!rows?.length) return [];
    return rows.map((row) => {
        const rowKeysLower = Object.fromEntries(
            Object.keys(row).map((k) => [k.toLowerCase(), k])
        );
        const out: Record<string, unknown> = { ...row };
        for (const key of mappingKeys) {
            if (row[key] !== undefined) continue;
            const lowerKey = rowKeysLower[key.toLowerCase()];
            if (lowerKey != null) out[key] = row[lowerKey];
        }
        return out;
    });
}

const defaultConfig: TableConfig = {
    // Core Features
    enableSort: true,
    enableHeader: true,
    enableRowNumber: false,
    enableRowSelection: true,
    enableMassSelection: true,
    enableRowHoverHighlight: true,
    enableStripedRows: false,
    enableRowDivider: true,
    enableColumnDivider: false,
    enableColumnResize: true,
    enableStickyHeader: false,
    enableFreezeFirstColumn: false,
    enableGroup: true,

    // Advanced Features
    enableSearch: true,
    enableFilter: true,
    enableExport: true,
    enableImport: true,
    enableRefresh: true,
    enablePagination: true,
    enableColumnVisibility: true,
    enableColumnReorder: true,
    enableInlineEdit: ['dobj_name_display', 'dobj_description'],
    enableRowActions: true,


    // Display Options
    enableWrapText: false,
    enableTooltips: true,
    enableRowReorder: true,

    // Title and Info Options
    enableTitle: true,
    enableNewButton: true,
    enableTitleBackground: true,
    titleBackgroundColor: '#ffffff',
    enablePresetSelector: true,
    enableRecordCount: true,
    enableSortInfo: true,
    enableFilterInfo: true,
    enableLastUpdated: true,
    titleTableSpacing: 0,

    // Table Panel Options
    enableTablePanel: true,
    tablePanelBackground: true,
    tablePanelBackgroundColor: '#ffffff',

    // Table Background Options
    tableBackground: false,
    tableBackgroundColor: '#ffffff',

    // Button Display Options with Alignment (All default to RIGHT)
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
    editActionButtonType: 'icon',
    editActionButtonAlign: 'right',
    chartActionButtonType: 'icon',
    chartActionButtonAlign: 'right',
    printActionButtonType: 'icon',
    printActionButtonAlign: 'right',
    ownerActionButtonType: 'icon',
    ownerActionButtonAlign: 'right',
    tableViewButtonType: 'icon',
    tableViewButtonAlign: 'right',
    settingsButtonType: 'icon',
    settingsButtonAlign: 'right',
    presetButtonType: 'icon',
    presetButtonAlign: 'right',
    groupButtonType: 'icon',
    groupButtonAlign: 'right',
    freezeColumnButtonType: 'icon',
    freezeColumnButtonAlign: 'right',
    freezeHeaderButtonType: 'icon',
    freezeHeaderButtonAlign: 'right',

    // Pagination Settings
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],

    // Theme and Styling
    theme: 'default',
    tableView: 'default',

    // Action Settings
    rowActionsPosition: 'right',
    showRowActionsOnHover: false,
    enabledRowActions: ['view', 'edit', 'copy', 'delete'],
    actionStyle: 'icons',
    actionStyleFlow: 'expand',

    // Additional Data Actions
    enablePrint: false,
    enableChangeOwner: false,
    enableChart: false,
    enableShare: false,
    enableEditAction: true,
    enableChartAction: true,
    enablePrintAction: true,
    enableOwnerAction: true,
    printButtonType: "icon",
    printButtonAlign: "right",
    changeOwnerButtonType: "icon",
    changeOwnerButtonAlign: "right",
    chartButtonType: "icon",
    chartButtonAlign: "right",
    shareButtonType: "icon",
    shareButtonAlign: "right",
    density: "compact",
    enableFooter: false,
    enableTableTotals: false,
    enableWrapClipOption: false,
    tablePanelSpacing: 0,
    newButtonType: "icon",
    tabPanelSpacing: 0,
    tabPanelBackgroundColor: "",
    enableTabs: false,
    tabHeight: "small",
    tabAlignment: "right",
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

    // Bulk Actions
    enableBulkActions: true,
    bulkActionStyle: 'icons'

};

export default function TempList() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<TableConfig>(defaultConfig);

    const fetchEntities = async () => {
        setLoading(true);
        setError(null);
        const { data: result, error: err } = await supabase.from("dobj").select("*");
        if (err) {
            console.error("Supabase fetch error:", err);
            setError(err.message || "Failed to load data from Supabase. Check table 'dobj' exists and RLS allows anon read.");
            setData([]);
        } else {
            const raw = result ?? [];
            const mappingKeys = Object.keys(fieldMappings);
            const normalized = normalizeRowsToFieldMappings(raw, mappingKeys);
            setData(normalized);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEntities();
    }, []);

    // Load saved config from localStorage
    useEffect(() => {
        const savedConfig = localStorage.getItem('tableConfig');
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                setConfig({ ...defaultConfig, ...parsedConfig });
            } catch (error) {
                console.error('Error loading saved config:', error);
            }
        }
    }, []);

    // Save config to localStorage when it changes
    const handleConfigChange = (newConfig: TableConfig) => {
        setConfig(newConfig);
        localStorage.setItem('tableConfig', JSON.stringify(newConfig));
    };

    const handleRefresh = () => {
        fetchEntities();
    };

    return (
        <ConfigurableListTemplate
            title="Objects"
            data={data}
            fieldMappings={fieldMappings}
            config={config}
            loading={loading}
            onConfigChange={handleConfigChange}
            onRefresh={handleRefresh}
            baseUrl="/objects"
            error={error}
        />
    );
}