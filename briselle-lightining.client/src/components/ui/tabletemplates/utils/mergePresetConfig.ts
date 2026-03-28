/** Avoid circular import with ConfigurableListTemplate — keep in sync with TableConfig tab fields */
export type TableConfigTabMerge = Record<string, unknown>;

/**
 * Tab strip + tab chrome live at ObjectLoader document root (`config_json.objectTabBar`) when persisted.
 * Same keys are merged from the current page when switching presets so the UI does not wipe tabs.
 */
export const TAB_BAR_OBJECT_LOADER_KEYS = [
    'enableTabs',
    'tabList',
    'tabBarPlacement',
    'tabMenuStyle',
    'tabOrientation',
    'tabHeight',
    'tabAlignment',
    'tabLabelWidth',
    'tabPanelSpacing',
    'tabPanelMarginTop',
    'tabPanelBackground',
    'tabUseCustomPanelBackground',
    'tabPanelBackgroundColor',
    'tabCustomSelection',
    'tabSelectionColor',
    'tabCustomHover',
    'tabHoverColor',
    'tabStyle',
    'tabShowUnderline',
    'tabIconSize',
    'tabGap',
] as const;

/**
 * Apply preset table config but keep tab strip definition and tab appearance settings
 * (preset JSON in `presets.ts` often has `tabList: []` which would otherwise remove user tabs).
 */
export function mergePresetWithPreservedTabState<T extends TableConfigTabMerge>(prev: T, presetConfig: T): T {
    const next = { ...presetConfig } as T;
    for (const key of TAB_BAR_OBJECT_LOADER_KEYS) {
        const v = prev[key];
        if (v !== undefined && v !== null) {
            (next as Record<string, unknown>)[key] = v;
        }
    }
    return next;
}

/** Merge ObjectLoader-level tab bar snapshot onto a preset config (DB: `config_json.objectTabBar`). */
export function mergeObjectTabBarIntoConfig<T extends TableConfigTabMerge>(
    presetConfig: T,
    objectTabBar: Record<string, unknown> | undefined | null,
): T {
    if (!objectTabBar || typeof objectTabBar !== 'object' || Object.keys(objectTabBar).length === 0) {
        return { ...presetConfig } as T;
    }
    return { ...presetConfig, ...objectTabBar } as T;
}
