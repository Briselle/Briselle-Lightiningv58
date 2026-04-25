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
    enableRowReorder: true,

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
    enableBulkActions: true,
    enableGroup: true,

    // New Button Features (Required)
    enablePrint: false,
    enableChangeOwner: false,
    enableChart: false,
    enableShare: false,

    // Display Options
    enableWrapText: false,
    enableTooltips: true,

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

    // Button Display Options with Alignment
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
    printButtonType: 'icon',
    printButtonAlign: 'right',
    changeOwnerButtonType: 'icon',
    changeOwnerButtonAlign: 'right',
    chartButtonType: 'icon',
    chartButtonAlign: 'right',
    shareButtonType: 'icon',
    shareButtonAlign: 'right',
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

    // Freeze Pane
    enableFreezePane: true,
    freezePaneType: 'icon',
    freezePaneAlign: 'right',
    enableFreezePaneRowHeader: false,
    enablefreezePaneColumnIndex: false,
    freezePaneColumnIndexNo: 1, // Required field

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
    bulkActionStyle: 'icons',

    // Additional Data Actions
    enableEditAction: true,
    enableChartAction: true,
    enablePrintAction: true,
    enableOwnerAction: true,

    // Table Footer (Required)
    enableFooter: false,
    enableTableTotals: false,

    // Additional Options (Required)
    enableWrapClipOption: true,
    customRowBadgeColumn: 'dobj_name_display',
    tablePanelSpacing: 0,
    newButtonType: 'icon',
    tabPanelSpacing: 0,
    tabPanelBackgroundColor: '',

    // Tab Configuration (Required)
    enableTabs: false,
    tabHeight: 'small',
    tabAlignment: 'left',
    tabOrientation: 'horizontal',
    tabShowUnderline: true,
    tabLabelWidth: 0,
    tabCustomSelection: false,
    tabSelectionColor: '',
    tabCustomHover: false,
    tabHoverColor: '',
    tabPanelBackground: '',
    tabList: [],

    // Column Management
    visibleColumns: undefined,
    columnOrder: undefined,
};

export default function TempList2() {
    const navigate = useNavigate();
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
            setError(err.message || "Failed to load data from Supabase.");
            setData([]);
        } else {
            const raw = (result ?? []) as Record<string, unknown>[];
            const mappingKeys = Object.keys(buildDobjFieldMappings(raw));
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
        const savedConfig = localStorage.getItem('tableConfig2');
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
        localStorage.setItem('tableConfig2', JSON.stringify(newConfig));
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
            objectLoaderCrud={objectLoaderCrud}
            onNewButtonClick={() => navigate('/objects/new')}
        />
    );
}
