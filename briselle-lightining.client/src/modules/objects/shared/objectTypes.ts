/** Platform object types stored in `dobj.object_type` / `dobj_configuration.objectType`. */
export type PlatformObjectType = 'list' | 'transaction' | 'hierarchy' | 'notionnest';

/** Values allowed by `public.dobj.ck_dobj_object_type` (see database/013, 015). */
export type DobjObjectTypeColumn = 'list' | 'transaction' | 'hierarchy' | 'notionnest';

export function isNotionNestObjectType(type: PlatformObjectType | string | null | undefined): boolean {
    const v = String(type ?? '').trim().toLowerCase();
    return (
        v === 'notionnest' ||
        v === 'notion_nest' ||
        v === 'notion-nest' ||
        v === 'notionnestpage' ||
        v === 'notion-nest-page' ||
        v === 'notion_nest_page'
    );
}

/** Maps UI/platform type to the `dobj.object_type` column. */
export function toDobjObjectTypeColumn(type: PlatformObjectType | string | null | undefined): DobjObjectTypeColumn {
    if (type === 'transaction') return 'transaction';
    if (type === 'hierarchy') return 'hierarchy';
    // To prevent "new row for relation 'dobj' violates check constraint 'ck_dobj_object_type'" errors
    // when database migrations haven't run or constraints are strict, we write 'list' to the DB column.
    // parsePlatformObjectType handles resolving 'notionnest' from dobj_configuration.objectType seamlessly.
    return 'list';
}

function readConfigObjectType(config: Record<string, unknown>): PlatformObjectType | null {
    const rawType =
        config.objectType ??
        config.object_type ??
        config.ObjectType ??
        config['Object Type'];
    if (typeof rawType !== 'string') return null;
    const v = rawType.trim().toLowerCase();
    if (v === 'transaction') return 'transaction';
    if (v === 'hierarchy' || v === 'parent_child' || v === 'parent&child') return 'hierarchy';
    if (isNotionNestObjectType(v)) return 'notionnest';
    if (v === 'list') return 'list';
    return null;
}

/** Reads object type from DB column + JSON config; column wins for transaction/hierarchy/notionnest. */
export function parsePlatformObjectType(
    config: Record<string, unknown>,
    rowObjectType?: string | null,
): PlatformObjectType {
    const fromCol = String(rowObjectType ?? '').trim().toLowerCase();
    const fromConfig = readConfigObjectType(config);

    if (fromCol === 'transaction' || fromCol === 'hierarchy' || isNotionNestObjectType(fromCol)) {
        if (fromCol === 'transaction') return 'transaction';
        if (fromCol === 'hierarchy') return 'hierarchy';
        return 'notionnest';
    }

    // Column is list/empty — use config when it specifies a non-list mode (e.g. NotionNest stored only in JSON)
    if (fromConfig && fromConfig !== 'list') return fromConfig;

    return fromConfig ?? 'list';
}

export function objectTypeOptionLabel(t: PlatformObjectType): string {
    switch (t) {
        case 'transaction':
            return 'Transaction';
        case 'hierarchy':
            return 'Hierarchy (Parent & Child)';
        case 'notionnest':
            return 'NotionNest (Pages)';
        default:
            return 'List';
    }
}