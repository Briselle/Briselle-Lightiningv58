import { TablePreset } from '../action-components/Action_Preset';
import { TableConfig } from '../ConfigurableListTemplate';
import { DEFAULT_ACTION_PANEL_ORDER } from './actionPanelOrder';
import { CANONICAL_DEFAULT_TAB_ITEM } from './canonicalObjectLoaderDefaults';
import { TAB_BAR_OBJECT_LOADER_KEYS } from './mergePresetConfig';

/**
 * Code-level failover preset — only the Default is kept in code.
 * All presets (including Default) are loaded from the database (platform_config table).
 * This code default is used ONLY when the database fetch fails.
 */
export const DEFAULT_PRESETS: TablePreset[] = [
    {
        id: 'default',
        name: 'Default',
        presetId: 'default',
        iconKey: 'preset',
        isDefault: true,
        config: {
                "theme": "default",
                "tableView": "default",
                "density": "standard",
                "enableHeader": true,
                "enableFooter": true,
                "enableRowNumber": true,
                "enableStripedRows": true,
                "enableRowDivider": true,
                "enableColumnDivider": true,
                "enableColumnResize": true,
                "enableColumnReorder": true,
                "enableRowReorder": true,
                "enableRowResize": true,
                "enableColumnHover": true,
                "enableWrapClipOption": true,
                "enableWrapText": true,
                "enableTableTotals": true,
                "enablePagination": true,
                "enableRowHoverHighlight": true,
                "enableRowSelection": true,
                "enableMassSelection": true,
                "enableRowActions": true,
                "enableRecordCount": true,
                "enableSortInfo": true,
                "enableFilterInfo": true,
                "enableLastUpdated": true,
                "enableTitle": true,
                "enableNewButton": true,
                "newButtonType": "icon",
                "enableTitleBackground": true,
                "titleBackgroundColor": "#ffffff",
                "titleTableSpacing": 0,
                "enableTablePanel": true,
                "tablePanelBackground": true,
                "tablePanelBackgroundColor": "#ffffff",
                "tablePanelSpacing": 0,
                "tableBackground": true,
                "tableBackgroundColor": "#ffffff",
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
                "tabList": [{ ...CANONICAL_DEFAULT_TAB_ITEM }],
                "tabBarPlacement": "between-title-and-panel",
                "tabMenuStyle": "icon-and-label",
                "tabStyle": "underline",
                "tabShowUnderline": true,
                "tabIconSize": 16,
                "tabGap": 0,
                "tabUseCustomPanelBackground": false,
                "tabPanelMarginTop": 0,
                "enablePresetSelector": true,
                "presetButtonType": "icon",
                "presetButtonAlign": "right",
                "enableSearch": true,
                "searchButtonType": "icon",
                "searchButtonAlign": "right",
                "searchQuery": "",
                "enableSort": true,
                "sortButtonType": "icon",
                "sortButtonAlign": "right",
                "enableFilter": true,
                "filterButtonType": "icon",
                "filterButtonAlign": "right",
                "enableGroup": true,
                "groupButtonType": "icon",
                "groupButtonAlign": "right",
                "enableColumnVisibility": true,
                "columnVisibilityButtonType": "icon",
                "columnVisibilityButtonAlign": "right",
                "enableRefresh": true,
                "refreshButtonType": "icon",
                "refreshButtonAlign": "right",
                "enableExport": true,
                "exportButtonType": "icon",
                "exportButtonAlign": "right",
                "enableImport": true,
                "importButtonType": "icon",
                "importButtonAlign": "right",
                "enablePrint": true,
                "printButtonType": "icon",
                "printButtonAlign": "right",
                "enableChangeOwner": true,
                "changeOwnerButtonType": "icon",
                "changeOwnerButtonAlign": "right",
                "enableChart": true,
                "chartButtonType": "icon",
                "chartButtonAlign": "right",
                "enableShare": true,
                "shareButtonType": "icon",
                "shareButtonAlign": "right",
                "shareLinkActive": false,
                "shareLinkUrl": "",
                "shareActionPanelViewAllowed": false,
                "shareRestrictCopy": false,
                "shareShowAllFieldsExpanded": false,
                "shareRestrictByPasswordOrDomain": false,
                "shareRestrictEmail": "",
                "actionPanelButtonOrder": DEFAULT_ACTION_PANEL_ORDER,
                "tableViewButtonType": "icon",
                "tableViewButtonAlign": "right",
                "settingsButtonType": "icon",
                "settingsButtonAlign": "right",
                "enableFreezePane": true,
                "freezePaneType": "icon",
                "freezePaneAlign": "right",
                "enableFreezePaneRowHeader": true,
                "enablefreezePaneColumnIndex": true,
                "enableTableLayoutSetup": true,
                "tableLayoutSetupButtonType": "icon",
                "tableLayoutSetupButtonAlign": "right",
                "enableSettings": true,
                "freezePaneColumnIndexNo": 1,
                "enableTooltips": true,
                "enableInlineEdit": [],
                "enableBulkActions": true,
                "editActionButtonType": "icon",
                "editActionButtonAlign": "right",
                "chartActionButtonType": "icon",
                "chartActionButtonAlign": "right",
                "printActionButtonType": "icon",
                "printActionButtonAlign": "right",
                "ownerActionButtonType": "icon",
                "ownerActionButtonAlign": "right",
                "pageSize": 25,
                "pageSizeOptions": [10, 25, 50, 100],
                "rowActionsPosition": "right",
                "showRowActionsOnHover": false,
                "enabledRowActions": ["view", "edit", "copy", "delete"],
                "actionStyle": "icons",
                "actionStyleFlow": "expand",
                "bulkActionStyle": "icons",
                "enableEditAction": true,
                "enableChartAction": true,
                "enablePrintAction": true,
                "enableOwnerAction": true,
                "visibleColumns": [],
                "columnOrder": [],
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
            const parsed = JSON.parse(stored) as unknown;
            if (!Array.isArray(parsed)) return [];
            return parsed.map((preset) => {
                if (!preset || typeof preset !== 'object') return preset as TablePreset;
                const rec = preset as TablePreset;
                const cfg = (rec.config && typeof rec.config === 'object')
                    ? { ...(rec.config as Record<string, unknown>) }
                    : {};
                for (const key of TAB_BAR_OBJECT_LOADER_KEYS) {
                    delete cfg[key];
                }
                return { ...rec, config: cfg as TableConfig };
            });
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
        const sanitized = presets.map((preset) => {
            const cfg = (preset.config && typeof preset.config === 'object')
                ? { ...(preset.config as Record<string, unknown>) }
                : {};
            for (const key of TAB_BAR_OBJECT_LOADER_KEYS) {
                delete cfg[key];
            }
            return { ...preset, config: cfg as TableConfig };
        });
        localStorage.setItem('customTablePresets', JSON.stringify(sanitized));
    } catch (error) {
        console.error('Error saving custom presets to storage:', error);
    }
};
