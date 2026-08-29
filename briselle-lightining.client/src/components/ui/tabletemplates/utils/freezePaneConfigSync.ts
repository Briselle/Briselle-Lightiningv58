/**
 * Keeps `enableFreezePane` aligned with row/column sub-flags (settings + action panel + saved JSON).
 * Does not affect action-panel button visibility (that is controlled separately).
 */
export type FreezePaneConfigSlice = {
    enableFreezePane?: boolean;
    enableFreezePaneRowHeader?: boolean;
    enablefreezePaneColumnIndex?: boolean;
    freezePaneColumnIndexNo?: number;
};

export function applyFreezePaneConsistency<T extends FreezePaneConfigSlice>(cfg: T): T {
    const out = { ...cfg };
    if (out.enableFreezePane === false) {
        out.enableFreezePaneRowHeader = false;
        out.enablefreezePaneColumnIndex = false;
        return out;
    }
    const row = !!out.enableFreezePaneRowHeader;
    const col = !!out.enablefreezePaneColumnIndex;
    if (row || col) {
        out.enableFreezePane = true;
    } else {
        out.enableFreezePane = false;
    }
    return out;
}
