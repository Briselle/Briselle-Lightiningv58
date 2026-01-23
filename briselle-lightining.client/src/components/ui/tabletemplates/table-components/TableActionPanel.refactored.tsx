import React from 'react';
import Action_Search from '../action-components/Action_Search';
import Action_Sort from '../action-components/Action_Sort';
import Action_Filter from '../action-components/Action_Filter';
import Action_Group from '../action-components/Action_Group';
import Action_ColumnVisibility from '../action-components/Action_ColumnVisibility';
import Action_FreezePane from '../action-components/Action_FreezePane';
import Action_Refresh from '../action-components/Action_Refresh';
import Action_Export from '../action-components/Action_Export';
import type { ExportFormat } from '../action-components/Action_Export';
import Action_Import from '../action-components/Action_Import';
import Action_Print from '../action-components/Action_Print';
import Action_ChangeOwner from '../action-components/Action_ChangeOwner';
import Action_Chart from '../action-components/Action_Chart';
import Action_Share from '../action-components/Action_Share';
import Action_Preset, { TablePreset } from '../action-components/Action_Preset';
import Action_TableView from '../action-components/Action_TableView';
import Action_TableLayoutSetup from '../action-components/Action_TableLayoutSetup';
import Action_Settings from '../action-components/Action_Settings';
import { SortCriteria } from '../action-components/Action_Sort';
import { FilterCriteria } from '../action-components/Action_Filter';
import { getButtonOrder, BUTTON_DEFINITIONS } from '../utils/actionPanelOrder';

interface TableActionPanelProps {
    enableTablePanel: boolean;
    tablePanelBackground: boolean;
    tablePanelBackgroundColor: string;
    
    // Search
    enableSearch: boolean;
    searchButtonType: 'icon' | 'button';
    searchButtonAlign: 'left' | 'right';
    searchTerm: string;
    onSearchChange: (value: string) => void;
    
    // Sort
    enableSort: boolean;
    sortButtonType: 'icon' | 'button';
    sortButtonAlign: 'left' | 'right';
    sortCriteria: SortCriteria[];
    onSortCriteriaChange: (criteria: SortCriteria[]) => void;
    
    // Filter
    enableFilter: boolean;
    filterButtonType: 'icon' | 'button';
    filterButtonAlign: 'left' | 'right';
    filterCriteria: FilterCriteria[];
    onFilterCriteriaChange: (criteria: FilterCriteria[]) => void;
    
    // Group
    enableGroup: boolean;
    groupButtonType: 'icon' | 'button';
    groupButtonAlign: 'left' | 'right';
    groupByColumn: string | null;
    onGroupByColumnChange: (column: string | null) => void;
    
    // Column Visibility
    enableColumnVisibility: boolean;
    columnVisibilityButtonType: 'icon' | 'button';
    columnVisibilityButtonAlign: 'left' | 'right';
    allColumns: string[];
    activeColumns: string[];
    visibleColumns: string[];
    onActiveColumnsChange: (columns: string[]) => void;
    onVisibleColumnsChange: (columns: string[]) => void;
    
    // Freeze Pane
    enableFreezePane: boolean;
    freezePaneType: 'icon' | 'button';
    freezePaneAlign: 'left' | 'right';
    enableFreezePaneRowHeader: boolean;
    enablefreezePaneColumnIndex: boolean;
    freezePaneColumnIndexNo: number;
    
    // Refresh
    enableRefresh: boolean;
    refreshButtonType: 'icon' | 'button';
    refreshButtonAlign: 'left' | 'right';
    onRefreshClick: () => void;
    
    // Export
    enableExport: boolean;
    exportButtonType: 'icon' | 'button';
    exportButtonAlign: 'left' | 'right';
    onExportClick: (format: ExportFormat) => void;
    
    // Import
    enableImport: boolean;
    importButtonType: 'icon' | 'button';
    importButtonAlign: 'left' | 'right';
    onImportClick: (format: 'csv' | 'excel' | 'connector') => void;
    
    // Print
    enablePrint: boolean;
    printButtonType: 'icon' | 'button';
    printButtonAlign: 'left' | 'right';
    onPrintClick: () => void;
    
    // Change Owner
    enableChangeOwner: boolean;
    changeOwnerButtonType: 'icon' | 'button';
    changeOwnerButtonAlign: 'left' | 'right';
    onChangeOwnerClick: () => void;
    
    // Chart
    enableChart: boolean;
    chartButtonType: 'icon' | 'button';
    chartButtonAlign: 'left' | 'right';
    onChartClick: () => void;
    
    // Share
    enableShare: boolean;
    shareButtonType: 'icon' | 'button';
    shareButtonAlign: 'left' | 'right';
    onShareClick: () => void;
    
    // Preset
    enablePresetSelector: boolean;
    presetButtonType: 'icon' | 'button';
    presetButtonAlign: 'left' | 'right';
    presets: TablePreset[];
    activePresetId?: string;
    onPresetClick: () => void;
    onPresetApply: (preset: TablePreset) => void;
    
    // Table View (legacy, kept for backward compat)
    tableViewButtonType?: 'icon' | 'button';
    tableViewButtonAlign?: 'left' | 'right';
    currentTableView?: 'default' | 'compact' | 'comfortable' | 'spacious';
    onTableViewChange?: (view: 'default' | 'compact' | 'comfortable' | 'spacious') => void;
    
    // Table Layout Setup (replaces Table View in panel)
    enableTableLayoutSetup?: boolean;
    tableLayoutSetupButtonType?: 'icon' | 'button';
    tableLayoutSetupButtonAlign?: 'left' | 'right';
    
    // Settings
    settingsButtonType: 'icon' | 'button';
    settingsButtonAlign: 'left' | 'right';
    onSettingsClick: () => void;
    
    // Common
    fieldMappings: Record<string, string>;
    config: any;
    onConfigChange: (partial: any) => void;
}

const TableActionPanel: React.FC<TableActionPanelProps> = (props) => {
    const {
        enableTablePanel,
        tablePanelBackground,
        tablePanelBackgroundColor,
        config,
    } = props;

    if (!enableTablePanel) return null;

    const order = getButtonOrder(config ?? {});

    const leftButtons: React.ReactNode[] = [];
    const rightButtons: React.ReactNode[] = [];

    const addButton = (component: React.ReactNode | null, align: 'left' | 'right') => {
        if (!component) return;
        if (align === 'left') leftButtons.push(component);
        else rightButtons.push(component);
    };

    const align = (key: string): 'left' | 'right' =>
        (config?.[BUTTON_DEFINITIONS[key]?.alignKey ?? ''] as 'left' | 'right') || 'right';

    const buttons: Record<string, React.ReactNode> = {
        search: <Action_Search key="search" enableSearch={props.enableSearch} searchButtonType={props.searchButtonType} searchButtonAlign={props.searchButtonAlign} searchTerm={props.searchTerm} onSearchChange={props.onSearchChange} />,
        sort: <Action_Sort key="sort" enableSort={props.enableSort} sortButtonType={props.sortButtonType} sortButtonAlign={props.sortButtonAlign} fieldMappings={props.fieldMappings} sortCriteria={props.sortCriteria} onSortCriteriaChange={props.onSortCriteriaChange} />,
        filter: <Action_Filter key="filter" enableFilter={props.enableFilter} filterButtonType={props.filterButtonType} filterButtonAlign={props.filterButtonAlign} fieldMappings={props.fieldMappings} filterCriteria={props.filterCriteria} onFilterCriteriaChange={props.onFilterCriteriaChange} />,
        group: <Action_Group key="group" enableGroup={props.enableGroup} groupButtonType={props.groupButtonType} groupButtonAlign={props.groupButtonAlign} fieldMappings={props.fieldMappings} groupByColumn={props.groupByColumn} onGroupByColumnChange={props.onGroupByColumnChange} />,
        columnVisibility: <Action_ColumnVisibility key="columnVisibility" enableColumnVisibility={props.enableColumnVisibility} columnVisibilityButtonType={props.columnVisibilityButtonType} columnVisibilityButtonAlign={props.columnVisibilityButtonAlign} fieldMappings={props.fieldMappings} allColumns={props.allColumns} activeColumns={props.activeColumns} visibleColumns={props.visibleColumns} onActiveColumnsChange={props.onActiveColumnsChange} onVisibleColumnsChange={props.onVisibleColumnsChange} />,
        freezePane: <Action_FreezePane key="freezePane" enableFreezePane={props.enableFreezePane} freezePaneType={props.freezePaneType} freezePaneAlign={props.freezePaneAlign} enableFreezePaneRowHeader={props.enableFreezePaneRowHeader} enablefreezePaneColumnIndex={props.enablefreezePaneColumnIndex} freezePaneColumnIndexNo={props.freezePaneColumnIndexNo} onConfigChange={props.onConfigChange} config={props.config} />,
        refresh: <Action_Refresh key="refresh" enableRefresh={props.enableRefresh} refreshButtonType={props.refreshButtonType} refreshButtonAlign={props.refreshButtonAlign} onRefreshClick={props.onRefreshClick} />,
        export: <Action_Export key="export" enableExport={props.enableExport} exportButtonType={props.exportButtonType} exportButtonAlign={props.exportButtonAlign} onExportClick={props.onExportClick} />,
        import: <Action_Import key="import" enableImport={props.enableImport} importButtonType={props.importButtonType} importButtonAlign={props.importButtonAlign} onImportClick={props.onImportClick} />,
        print: <Action_Print key="print" enablePrint={props.enablePrint} printButtonType={props.printButtonType} printButtonAlign={props.printButtonAlign} onPrintClick={props.onPrintClick} />,
        changeOwner: <Action_ChangeOwner key="changeOwner" enableChangeOwner={props.enableChangeOwner} changeOwnerButtonType={props.changeOwnerButtonType} changeOwnerButtonAlign={props.changeOwnerButtonAlign} onChangeOwnerClick={props.onChangeOwnerClick} />,
        chart: <Action_Chart key="chart" enableChart={props.enableChart} chartButtonType={props.chartButtonType} chartButtonAlign={props.chartButtonAlign} onChartClick={props.onChartClick} />,
        share: (
            <Action_Share
                key="share"
                enableShare={props.enableShare}
                shareButtonType={props.shareButtonType}
                shareButtonAlign={props.shareButtonAlign}
                onShareClick={props.onShareClick}
                shareLinkActive={config?.shareLinkActive}
                shareLinkUrl={config?.shareLinkUrl}
                shareActionPanelViewAllowed={config?.shareActionPanelViewAllowed ?? false}
                shareRestrictCopy={config?.shareRestrictCopy ?? false}
                shareShowAllFieldsExpanded={config?.shareShowAllFieldsExpanded ?? false}
                shareRestrictByPasswordOrDomain={config?.shareRestrictByPasswordOrDomain ?? false}
                shareRestrictEmail={config?.shareRestrictEmail ?? ''}
                config={config}
                onConfigChange={props.onConfigChange}
            />
        ),
        preset: <Action_Preset key="preset" enablePresetSelector={props.enablePresetSelector} presetButtonType={props.presetButtonType} presetButtonAlign={props.presetButtonAlign} presets={props.presets} activePresetId={props.activePresetId} onPresetClick={props.onPresetClick} onPresetApply={props.onPresetApply} />,
        tableView: <Action_TableView key="tableView" tableViewButtonType={props.tableViewButtonType ?? 'icon'} tableViewButtonAlign={props.tableViewButtonAlign ?? 'right'} currentTableView={props.currentTableView ?? 'default'} onTableViewChange={props.onTableViewChange ?? (() => {})} />,
        tableLayoutSetup: (
            <Action_TableLayoutSetup
                key="tableLayoutSetup"
                enableTableLayoutSetup={props.enableTableLayoutSetup ?? true}
                tableLayoutSetupButtonType={props.tableLayoutSetupButtonType ?? config?.tableLayoutSetupButtonType ?? 'icon'}
                tableLayoutSetupButtonAlign={props.tableLayoutSetupButtonAlign ?? config?.tableLayoutSetupButtonAlign ?? 'right'}
                config={config ?? {}}
                onConfigChange={props.onConfigChange}
            />
        ),
        settings: <Action_Settings key="settings" settingsButtonType={props.settingsButtonType} settingsButtonAlign={props.settingsButtonAlign} onSettingsClick={props.onSettingsClick} />,
    };

    order.forEach((key) => {
        const comp = buttons[key];
        if (comp) addButton(comp, align(key));
    });

    return (
        <div
            className="px-4 py-2 border-b border-gray-200 flex items-center justify-between bg-white"
            style={{
                backgroundColor: tablePanelBackground ? tablePanelBackgroundColor : '#ffffff',
                minHeight: '48px'
            }}
        >
            <div className="flex items-center space-x-2">
                {leftButtons}
            </div>

            <div className="flex items-center space-x-2">
                {rightButtons}
            </div>
        </div>
    );
};

export default TableActionPanel;
