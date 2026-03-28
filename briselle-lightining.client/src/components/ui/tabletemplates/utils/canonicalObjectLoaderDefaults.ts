/**
 * Protected Default tab row for ObjectLoader — never replaced by user saves in DB.
 * Keep in sync with code default preset `tabList` entry for presetId "default".
 */
export interface CanonicalTabItem {
    id: string;
    label: string;
    presetId: string;
    iconKey?: string;
    customIcon?: string;
}

export const CANONICAL_DEFAULT_TAB_ITEM: CanonicalTabItem = {
    id: 'tab-default',
    label: 'Default',
    presetId: 'default',
    iconKey: 'list',
};

export function isProtectedDefaultTab(tab: { id?: string; presetId?: string } | null | undefined): boolean {
    if (!tab) return false;
    return tab.presetId === 'default' || tab.id === CANONICAL_DEFAULT_TAB_ITEM.id;
}

/**
 * Ensure exactly one canonical Default tab (first). Drops user-edited rows that pointed at default preset.
 */
export function injectCanonicalDefaultTab<T extends { id: string; presetId: string }>(tabList: unknown): T[] {
    const raw = Array.isArray(tabList) ? tabList : [];
    const rest = raw.filter(
        (t: T) => t && t.presetId !== 'default' && t.id !== CANONICAL_DEFAULT_TAB_ITEM.id,
    ) as T[];
    return [{ ...(CANONICAL_DEFAULT_TAB_ITEM as T) }, ...rest];
}
