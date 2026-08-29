/** Stored on each field row under `attributes` in `dobj_configuration.fields`. */
export const ATTR_INCLUDE_TABLE_VIEW = 'includeInTableView';
export const ATTR_INCLUDE_INLINE_EDIT = 'includeInInlineEdit';

export function readIncludeInTableView(attrs: Record<string, unknown> | undefined): boolean {
    if (attrs == null) return true;
    const v = attrs.includeInTableView ?? attrs.include_in_table_view;
    if (v === false || v === 0) return false;
    if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
    }
    return true;
}

export function readIncludeInInlineEdit(attrs: Record<string, unknown> | undefined): boolean {
    if (attrs == null) return false;
    const v = attrs.includeInInlineEdit ?? attrs.include_in_inline_edit;
    if (v === true || v === 1) return true;
    if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
    }
    return false;
}

export function withDataViewDefaults(attrs: Record<string, unknown>): Record<string, unknown> {
    const next = { ...attrs };
    if (next[ATTR_INCLUDE_TABLE_VIEW] === undefined) next[ATTR_INCLUDE_TABLE_VIEW] = true;
    if (next[ATTR_INCLUDE_INLINE_EDIT] === undefined) next[ATTR_INCLUDE_INLINE_EDIT] = false;
    return next;
}
