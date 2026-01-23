/**
 * Single source of truth for Action Panel button order.
 * Used by DisplaySettingsSection (Button Display Types & Alignment) and TableActionPanel.
 * Order here matches the UI order; drag-drop in Display Settings updates config.actionPanelButtonOrder.
 */

export const DEFAULT_ACTION_PANEL_ORDER: string[] = [
    'search',
    'sort',
    'filter',
    'group',
    'columnVisibility',
    'freezePane',
    'refresh',
    'export',
    'import',
    'print',
    'changeOwner',
    'chart',
    'share',
    'preset',
    'tableLayoutSetup',
    'settings',
];

export interface ButtonDefinition {
    key: string;
    label: string;
    typeKey: string;
    alignKey: string;
    enableKey: string;
    disabled?: boolean;
    /** When true: enable checkbox is checked+disabled (frozen); type/align remain editable */
    frozenEnableOnly?: boolean;
}

export const BUTTON_DEFINITIONS: Record<string, Omit<ButtonDefinition, 'key'>> = {
    search: { label: 'Search', typeKey: 'searchButtonType', alignKey: 'searchButtonAlign', enableKey: 'enableSearch' },
    sort: { label: 'Sort', typeKey: 'sortButtonType', alignKey: 'sortButtonAlign', enableKey: 'enableSort' },
    filter: { label: 'Filter', typeKey: 'filterButtonType', alignKey: 'filterButtonAlign', enableKey: 'enableFilter' },
    group: { label: 'Group', typeKey: 'groupButtonType', alignKey: 'groupButtonAlign', enableKey: 'enableGroup' },
    columnVisibility: { label: 'Hide Fields', typeKey: 'columnVisibilityButtonType', alignKey: 'columnVisibilityButtonAlign', enableKey: 'enableColumnVisibility' },
    freezePane: { label: 'Freeze Pane', typeKey: 'freezePaneType', alignKey: 'freezePaneAlign', enableKey: 'enableFreezePane' },
    refresh: { label: 'Refresh', typeKey: 'refreshButtonType', alignKey: 'refreshButtonAlign', enableKey: 'enableRefresh' },
    export: { label: 'Export', typeKey: 'exportButtonType', alignKey: 'exportButtonAlign', enableKey: 'enableExport' },
    import: { label: 'Import', typeKey: 'importButtonType', alignKey: 'importButtonAlign', enableKey: 'enableImport' },
    print: { label: 'Print', typeKey: 'printButtonType', alignKey: 'printButtonAlign', enableKey: 'enablePrint' },
    changeOwner: { label: 'Change Owner', typeKey: 'changeOwnerButtonType', alignKey: 'changeOwnerButtonAlign', enableKey: 'enableChangeOwner' },
    chart: { label: 'Chart', typeKey: 'chartButtonType', alignKey: 'chartButtonAlign', enableKey: 'enableChart' },
    share: { label: 'Share', typeKey: 'shareButtonType', alignKey: 'shareButtonAlign', enableKey: 'enableShare' },
    preset: { label: 'Preset', typeKey: 'presetButtonType', alignKey: 'presetButtonAlign', enableKey: 'enablePresetSelector', disabled: true },
    tableView: { label: 'Table View', typeKey: 'tableViewButtonType', alignKey: 'tableViewButtonAlign', enableKey: 'enableTableView' },
    tableLayoutSetup: { label: 'Table Layout Setup', typeKey: 'tableLayoutSetupButtonType', alignKey: 'tableLayoutSetupButtonAlign', enableKey: 'enableTableLayoutSetup' },
    settings: { label: 'Settings', typeKey: 'settingsButtonType', alignKey: 'settingsButtonAlign', enableKey: 'enableSettings', disabled: true, frozenEnableOnly: true },
};

export function getButtonOrder(config: { actionPanelButtonOrder?: string[] }): string[] {
    const order = config?.actionPanelButtonOrder;
    if (Array.isArray(order) && order.length > 0) {
        const valid = order.filter((k) => k in BUTTON_DEFINITIONS);
        const missing = DEFAULT_ACTION_PANEL_ORDER.filter((k) => !valid.includes(k));
        return [...valid, ...missing];
    }
    return [...DEFAULT_ACTION_PANEL_ORDER];
}
