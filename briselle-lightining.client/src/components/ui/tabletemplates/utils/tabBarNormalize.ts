/** Stored placement (alternate + current UI values). */
export type TabBarPlacementStored =
    | 'between-title-and-panel'
    | 'left-of-table'
    | 'horizontal'
    | 'vertical';

export function normalizeTabBarPlacement(raw: unknown): 'between-title-and-panel' | 'left-of-table' {
    if (raw === 'vertical' || raw === 'left-of-table') return 'left-of-table';
    return 'between-title-and-panel';
}

export type TabMenuStyleStored = 'icon' | 'both' | 'label' | string | undefined;

export function normalizeTabMenuStyle(raw: unknown): 'icon' | 'both' | 'label' {
    if (raw === 'both') return 'both';
    if (raw === 'label') return 'label';
    return 'icon';
}

/** Maps older tabStyle keys to current shape ids. */
export function normalizeTabShape(raw: unknown): string {
    const s = typeof raw === 'string' ? raw : 'standard';
    if (s === 'underline') return 'standard';
    if (s === 'rounded') return 'button';
    return s;
}

/**
 * When `tabShowUnderline` is unset, infer from older tabStyle:
 * underline/standard/default → true; other shapes → false.
 */
export function resolveTabShowUnderline(tabShowUnderline: unknown, tabStyle: unknown): boolean {
    if (tabShowUnderline === true) return true;
    if (tabShowUnderline === false) return false;
    const s = typeof tabStyle === 'string' ? tabStyle : '';
    if (!s || s === 'underline' || s === 'standard') return true;
    return false;
}

/** Canonical shape string saved to config (new UI values). */
export type TabShapeId =
    | 'standard'
    | 'pill'
    | 'button'
    | 'segmented'
    | 'trapezoid'
    | 'trapezoid-asymmetric'
    | 'minimal'
    | 'tags'
    | 'top-rounded';

/** Keep tab rows pointing at real preset ids from the table preset master list. */
export function sanitizeTabListPresetIds<T extends { id: string; presetId: string }>(
    tabs: T[] | undefined,
    presets: { id: string; isDefault?: boolean }[]
): T[] | undefined {
    if (!tabs?.length || !presets.length) return tabs;
    const ids = new Set(presets.map((p) => p.id));
    const fallback = presets.find((p) => p.isDefault) || presets[0];
    if (!fallback) return tabs;
    let dirty = false;
    const next = tabs.map((t) => {
        if (ids.has(t.presetId)) return t;
        dirty = true;
        return { ...t, presetId: fallback.id };
    });
    return dirty ? next : tabs;
}

export function canonicalTabStyleForSave(raw: unknown): TabShapeId {
    const n = normalizeTabShape(raw);
    const allowed: TabShapeId[] = [
        'standard',
        'pill',
        'button',
        'segmented',
        'trapezoid',
        'trapezoid-asymmetric',
        'minimal',
        'tags',
        'top-rounded',
    ];
    return (allowed.includes(n as TabShapeId) ? n : 'standard') as TabShapeId;
}
