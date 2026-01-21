import { TablePreset } from '../action-components/Action_Preset';
import { TableConfig } from '../ConfigurableListTemplate';

/**
 * Single source of truth for all table presets
 * This file contains both system-defined and default presets
 * Future: Can be extended to fetch from database
 */
export const DEFAULT_PRESETS: TablePreset[] = [
    {
        id: 'default',
        name: 'Default',
        presetId: 'default',
        isDefault: true,
        config: {
            
                // ==============================
                // CORE TABLE BEHAVIOR
                // ==============================
                "theme": "default",
                "tableView": "default",
              
                // ==============================
                // STRUCTURE & LAYOUT
                // ==============================
                "enableHeader": true,
                "enableFooter": true,
                "enableRowNumber": true,
                "enableStripedRows": true,
                "enableRowDivider": true,
                "enableColumnDivider": true,
                "enableColumnResize": true,
                "enableColumnReorder": true,
                "enableRowReorder": true,
                "enableWrapClipOption": true,
                "enableWrapText": true,
                "enableTableTotals": true,
                "enablePagination": true,
              
                // ==============================
                // ROW & INTERACTION
                // ==============================
                "enableRowHoverHighlight": true,
                "enableRowSelection": true,
                "enableMassSelection": true,
                "enableRowActions": true,
              
                // ==============================
                // INFO & META
                // ==============================
                "enableRecordCount": true,
                "enableSortInfo": true,
                "enableFilterInfo": true,
                "enableLastUpdated": true,
              
                // ==============================
                // TITLE BAR
                // ==============================
                "enableTitle": true,
                "enableNewButton": true,
                "newButtonType": "icon",
                "enableTitleBackground": true,
                "titleBackgroundColor": "#ffffff",
                "titleTableSpacing": 0,
              
                // ==============================
                // TABLE PANEL & BACKGROUND
                // ==============================
                "enableTablePanel": true,
                "tablePanelBackground": true,
                "tablePanelBackgroundColor": "#ffffff",
                "tablePanelSpacing": 0,
              
                "tableBackground": true,
                "tableBackgroundColor": "#ffffff",
              
                // ==============================
                // TABS
                // ==============================
                "enableTabs": true,
                "tabHeight": "small",
                "tabAlignment": "left",
                "tabOrientation": "horizontal",
                "tabLabelWidth": 0,
                "tabCustomSelection": true,
                "tabSelectionColor": "",
                "tabCustomHover": true,
                "tabHoverColor": "",
                "tabPanelSpacing": 0,
                "tabPanelBackgroundColor": "",
                "tabPanelBackground": "",
                "tabList": [],
              
                // ==============================
                // PRESETS
                // ==============================
                "enablePresetSelector": true,
                "presetButtonType": "icon",
                "presetButtonAlign": "right",
              
                // ==============================
                // SEARCH
                // ==============================
                "enableSearch": true,
                "searchButtonType": "icon",
                "searchButtonAlign": "right",
              
                // ==============================
                // SORT
                // ==============================
                "enableSort": true,
                "sortButtonType": "icon",
                "sortButtonAlign": "right",
              
                // ==============================
                // FILTER
                // ==============================
                "enableFilter": true,
                "filterButtonType": "icon",
                "filterButtonAlign": "right",
              
                // ==============================
                // GROUPING
                // ==============================
                "enableGroup": true,
                "groupButtonType": "icon",
                "groupButtonAlign": "right",
              
                // ==============================
                // COLUMN VISIBILITY
                // ==============================
                "enableColumnVisibility": true,
                "columnVisibilityButtonType": "icon",
                "columnVisibilityButtonAlign": "right",
              
                // ==============================
                // REFRESH
                // ==============================
                "enableRefresh": true,
                "refreshButtonType": "icon",
                "refreshButtonAlign": "right",
              
                // ==============================
                // EXPORT
                // ==============================
                "enableExport": true,
                "exportButtonType": "icon",
                "exportButtonAlign": "right",
              
                // ==============================
                // IMPORT
                // ==============================
                "enableImport": true,
                "importButtonType": "icon",
                "importButtonAlign": "right",
              
                // ==============================
                // PRINT
                // ==============================
                "enablePrint": true,
                "printButtonType": "icon",
                "printButtonAlign": "right",
              
                // ==============================
                // OWNERSHIP
                // ==============================
                "enableChangeOwner": true,
                "changeOwnerButtonType": "icon",
                "changeOwnerButtonAlign": "right",
              
                // ==============================
                // ANALYTICS
                // ==============================
                "enableChart": true,
                "chartButtonType": "icon",
                "chartButtonAlign": "right",
              
                // ==============================
                // SHARING
                // ==============================
                "enableShare": true,
                "shareButtonType": "icon",
                "shareButtonAlign": "right",
              
                // ==============================
                // VIEW & SETTINGS
                // ==============================
                "tableViewButtonType": "icon",
                "tableViewButtonAlign": "right",
              
                "settingsButtonType": "icon",
                "settingsButtonAlign": "right",
              
                // ==============================
                // FREEZE PANE
                // ==============================
                "enableFreezePane": true,
                "freezePaneType": "icon",
                "freezePaneAlign": "right",
                "enableFreezePaneRowHeader": true,
                "enablefreezePaneColumnIndex": true,
                "freezePaneColumnIndexNo": 1,
              
                // ==============================
                // UX ENHANCEMENTS
                // ==============================
                "enableTooltips": true
              }
              
        }
    ,
    {
        id: 'all-icons-right',
        name: 'All Icons Right',
        presetId: 'all-icons-right',
        isDefault: false,
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
        }
    },
    {
        id: 'all-buttons-right',
        name: 'All Buttons Right',
        presetId: 'all-buttons-right',
        isDefault: false,
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
        }
    },
    {
        id: 'left-aligned-modern',
        name: 'Left Aligned Modern',
        presetId: 'left-aligned-modern',
        isDefault: false,
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
        }
    },
    {
        id: 'compact-minimal',
        name: 'Compact Minimal',
        presetId: 'compact-minimal',
        isDefault: false,
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
        }
    },
    {
        id: 'data-analyst',
        name: 'Data Analyst',
        presetId: 'data-analyst',
        isDefault: false,
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
        }
    }
];

/**
 * Get the default preset (always the first one with isDefault: true)
 */
export const getDefaultPreset = (): TablePreset => {
    return DEFAULT_PRESETS.find(p => p.isDefault) || DEFAULT_PRESETS[0];
};

/**
 * Get all system-defined presets (isDefault: true)
 */
export const getSystemPresets = (): TablePreset[] => {
    return DEFAULT_PRESETS.filter(p => p.isDefault);
};

/**
 * Get all custom presets (isDefault: false)
 */
export const getCustomPresets = (): TablePreset[] => {
    return DEFAULT_PRESETS.filter(p => !p.isDefault);
};

/**
 * Get all presets (system + custom)
 */
export const getAllPresets = (): TablePreset[] => {
    return DEFAULT_PRESETS;
};

/**
 * Load custom presets from localStorage
 * Future: Can be extended to fetch from database
 */
export const loadCustomPresetsFromStorage = (): TablePreset[] => {
    try {
        const stored = localStorage.getItem('customTablePresets');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading custom presets from storage:', error);
    }
    return [];
};

/**
 * Save custom presets to localStorage
 * Future: Can be extended to save to database
 */
export const saveCustomPresetsToStorage = (presets: TablePreset[]): void => {
    try {
        localStorage.setItem('customTablePresets', JSON.stringify(presets));
    } catch (error) {
        console.error('Error saving custom presets to storage:', error);
    }
};
