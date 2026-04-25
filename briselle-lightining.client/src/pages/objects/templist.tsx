import ConfigurableListTemplate, { TableConfig } from "../../components/ui/tabletemplates/ConfigurableListTemplate";
import { resolveObjectLoaderCrudDefaults } from "../../components/ui/tabletemplates/objectLoaderRecordModals";
import { supabase } from '../../utils/supabase';
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    buildDobjFieldMappings,
    buildDobjObjectLoaderCrud,
    normalizeRowsToFieldMappings,
    objectLoaderCrudBase,
} from "./dobjTableShared";

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
    enableWrapClipOption: true,
    customRowBadgeColumn: 'dobj_name_display',
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
    const [data, setData] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<TableConfig>(defaultConfig);

    const fieldMappings = useMemo(() => buildDobjFieldMappings(data), [data]);

    const objectLoaderCrud = useMemo(() => buildDobjObjectLoaderCrud(data), [data]);

    const fetchEntities = async () => {
        setLoading(true);
        setError(null);
        const listOpts = resolveObjectLoaderCrudDefaults(objectLoaderCrudBase);
        let q = supabase.from("dobj").select("*");
        if (listOpts.queryActiveOnly) {
            q = q.eq(listOpts.sysStatusColumn, listOpts.sysStatusActiveValue);
        }
        const { data: result, error: err } = await q;
        if (err) {
            console.error("Supabase fetch error:", err);
            setError(err.message || "Failed to load data from Supabase. Check table 'dobj' exists and RLS allows anon read.");
            setData([]);
        } else {
            const raw = (result ?? []) as Record<string, unknown>[];
            const mappingKeys = Object.keys(buildDobjFieldMappings(raw));
            const normalized = normalizeRowsToFieldMappings(raw, mappingKeys);
            setData(normalized);
        }
        setLoading(false);
    };

    const navigate = useNavigate();

    useEffect(() => {
        void fetchEntities();
    }, []);

    useEffect(() => {
        const savedConfig = localStorage.getItem("tableConfig");
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig) as Partial<TableConfig>;
                setConfig({ ...defaultConfig, ...parsedConfig });
            } catch (e) {
                console.error("Error loading saved config:", e);
            }
        }
    }, []);

    const handleConfigChange = (newConfig: TableConfig) => {
        setConfig(newConfig);
        localStorage.setItem("tableConfig", JSON.stringify(newConfig));
    };

    const handleRefresh = () => {
        void fetchEntities();
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
            objectLoaderCrud={objectLoaderCrud}
            onNewButtonClick={() => navigate("/objects/new")}
        />
    );
}