import React, { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Edit, Copy, Trash2, ChevronDown, X, Database } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { cn } from '../../../utils/helpers';
import { buildClipboardGridPayload } from './utils/clipboardGridTable';

export interface ObjectLoaderCrudOptions {
    sourceTable: string;
    idColumn: string;
    /**
     * When set, edited dynamic keys are stored under this JSON/JSONB column
     * instead of writing each key as a physical table column.
     */
    jsonValueColumn?: string;
    fieldTypeByKey?: Record<string, string>;
    readOnlyKeys?: string[];
    /**
     * When true (default), row Delete sets `sysStatusColumn` to `sysStatusInactiveValue` instead of removing the row.
     * Set false for hard DELETE.
     */
    softDelete?: boolean;
    /** Lifecycle column shared across ObjectLoader tables. Default `sys_status`. */
    sysStatusColumn?: string;
    /** List query keeps only rows equal to this value. Default `active`. */
    sysStatusActiveValue?: string | number;
    /** Written on soft delete. Default `inactive`. */
    sysStatusInactiveValue?: string | number;
    /**
     * When true (default), list fetches should filter `sysStatusColumn` = `sysStatusActiveValue`.
     * Default follows `softDelete`: filtering on when soft delete is enabled unless you override.
     */
    queryActiveOnly?: boolean;
}

/** Coerce string integers to number for PostgREST .eq on int/bigint/smallint columns. */
export function coercePostgrestNumericId(id: string | number): string | number {
    if (typeof id === 'number' && Number.isFinite(id)) return id;
    if (typeof id === 'string') {
        const t = id.trim();
        if (/^-?\d+$/.test(t)) {
            const n = Number(t);
            if (Number.isSafeInteger(n)) return n;
        }
        return id;
    }
    return id;
}

function coerceSysStatusScalar(v: string | number | undefined, fallback: string | number): string | number {
    const x = v ?? fallback;
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    if (typeof x === 'string') {
        const t = x.trim();
        if (/^-?\d+$/.test(t)) return parseInt(t, 10);
    }
    return x;
}

/** Resolved defaults for soft delete + list filtering (use in pages when building Supabase queries). */
export function resolveObjectLoaderCrudDefaults(crud: ObjectLoaderCrudOptions) {
    const softDelete = crud.softDelete !== false;
    const queryActiveOnly =
        crud.queryActiveOnly !== undefined ? crud.queryActiveOnly : softDelete;
    const sysStatusColumn = crud.sysStatusColumn ?? 'sys_status';
    return {
        softDelete,
        queryActiveOnly,
        sysStatusColumn,
        sysStatusActiveValue: coerceSysStatusScalar(crud.sysStatusActiveValue, 'active'),
        sysStatusInactiveValue: coerceSysStatusScalar(crud.sysStatusInactiveValue, 'inactive'),
    };
}

export function resolveRowRecordId(
    row: Record<string, unknown>,
    idColumn: string
): string | number | undefined {
    const pick = (k: string): unknown => {
        if (row[k] !== undefined && row[k] !== null) return row[k];
        const lower = k.toLowerCase();
        const found = Object.keys(row).find((rk) => rk.toLowerCase() === lower);
        if (found != null && row[found] !== undefined && row[found] !== null) return row[found];
        return undefined;
    };
    const v = pick(idColumn);
    if (v !== undefined) return v as string | number;
    const v2 = row.id;
    if (v2 !== undefined && v2 !== null) return v2 as string | number;
    return undefined;
}

export function getOrderedRecordKeys(
    row: Record<string, unknown>,
    fieldMappings: Record<string, string>,
    columnOrder: string[]
): string[] {
    const rowKeys = new Set(Object.keys(row));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of columnOrder) {
        if (fieldMappings[k] != null && rowKeys.has(k) && !seen.has(k)) {
            out.push(k);
            seen.add(k);
        }
    }
    for (const k of Object.keys(fieldMappings)) {
        if (rowKeys.has(k) && !seen.has(k)) {
            out.push(k);
            seen.add(k);
        }
    }
    for (const k of [...rowKeys].sort()) {
        if (!seen.has(k)) {
            out.push(k);
            seen.add(k);
        }
    }
    return out.filter((k) => !isRedundantDobjMirrorKey(k, row));
}

/**
 * In view/edit/copy, skip redundant mirror keys when the canonical column is present with the same value
 * (e.g. dobj_id vs sys_id, or optional entity-scope audit copies vs sys_*).
 */
function isRedundantDobjMirrorKey(key: string, row: Record<string, unknown>): boolean {
    switch (key) {
        case 'dobj_id':
            return row.sys_id != null && row.sys_id !== undefined;
        case 'dobj_created_at':
            return row.sys_created_ts != null && row.sys_created_ts !== undefined;
        case 'dobj_updated_at':
            return row.sys_updated_ts != null && row.sys_updated_ts !== undefined;
        case 'dobj_created_by_id':
            return row.sys_created_by_id != null && row.sys_created_by_id !== undefined;
        case 'dobj_modified_by_id':
            return row.sys_updated_by_id != null && row.sys_updated_by_id !== undefined;
        default:
            return false;
    }
}

export function labelForKey(key: string, fieldMappings: Record<string, string>): string {
    return fieldMappings[key] || key.replace(/_/g, ' ');
}

export function formatDisplayValue(v: unknown): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

export function buildCopyPlain(
    keys: string[],
    row: Record<string, unknown>,
    fieldMappings: Record<string, string>
): string {
    return keys.map((k) => `${labelForKey(k, fieldMappings)}: ${formatDisplayValue(row[k])}`).join('\n');
}

export function buildCopyTable(
    keys: string[],
    row: Record<string, unknown>,
    fieldMappings: Record<string, string>
): string {
    const lines = ['| Field | Value |', '| --- | --- |'];
    for (const k of keys) {
        const lab = labelForKey(k, fieldMappings).replace(/\|/g, '\\|');
        const val = formatDisplayValue(row[k]).replace(/\|/g, '\\|').replace(/\n/g, ' ');
        lines.push(`| ${lab} | ${val} |`);
    }
    return lines.join('\n');
}

function mergeReadOnlyKeys(idColumn: string, extra?: string[]): Set<string> {
    const s = new Set<string>([idColumn, ...(extra ?? [])]);
    return s;
}

function mergeReadOnlyKeysForEdit(crud: ObjectLoaderCrudOptions): Set<string> {
    const d = resolveObjectLoaderCrudDefaults(crud);
    const extra = [...(crud.readOnlyKeys ?? [])];
    if (d.softDelete) extra.push(d.sysStatusColumn);
    return mergeReadOnlyKeys(crud.idColumn, extra);
}

async function copyToClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
}

/** Match cell-range toolbar: TSV + HTML for rich paste (Excel, Word, mail). */
async function copyTsvAndHtmlToClipboard(tsv: string, html: string): Promise<void> {
    try {
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': new Blob([tsv], { type: 'text/plain' }),
                    'text/html': new Blob([html], { type: 'text/html' }),
                }),
            ]);
            return;
        }
    } catch {
        /* fall through */
    }
    try {
        await navigator.clipboard.writeText(tsv);
    } catch {
        await copyToClipboard(html);
    }
}

// ——— Row actions bar (replaces duplicated Link/button blocks) ———

export interface ObjectLoaderRowActionsBarProps {
    enabledActions: string[];
    actionStyleIsMenu: boolean;
    menuId: string;
    isMenuOpen: boolean;
    setOpenRowActionsMenuId: (id: string | null) => void;
    menuDropdownAlign: 'left' | 'right';
    baseUrl: string;
    rowLinkId: string | number;
    objectLoaderCrud?: ObjectLoaderCrudOptions | null;
    onObjectLoaderAction?: (action: 'view' | 'edit' | 'copy' | 'delete') => void;
    showRowActionsOnHover?: boolean;
    actionsTdClassName: string;
    customActionLabel?: string;
    customActionTitle?: string;
    onCustomAction?: (() => void) | undefined;
}

export function ObjectLoaderRowActionsBar({
    enabledActions,
    actionStyleIsMenu,
    menuId,
    isMenuOpen,
    setOpenRowActionsMenuId,
    menuDropdownAlign,
    baseUrl,
    rowLinkId,
    objectLoaderCrud,
    onObjectLoaderAction,
    showRowActionsOnHover,
    actionsTdClassName,
    customActionLabel,
    customActionTitle,
    onCustomAction,
}: ObjectLoaderRowActionsBarProps) {
    const useOl = !!(objectLoaderCrud && onObjectLoaderAction);
    const close = () => setOpenRowActionsMenuId(null);

    const fire = (a: 'view' | 'edit' | 'copy' | 'delete') => {
        onObjectLoaderAction?.(a);
        close();
    };

    const viewEl = useOl ? (
        <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 w-full text-left"
            onClick={() => fire('view')}
        >
            <ExternalLink size={14} /> View
        </button>
    ) : (
        <Link
            to={`${baseUrl}/${rowLinkId}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100"
            onClick={close}
        >
            <ExternalLink size={14} /> View
        </Link>
    );

    const editEl = useOl ? (
        <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 w-full text-left"
            onClick={() => fire('edit')}
        >
            <Edit size={14} /> Edit
        </button>
    ) : (
        <Link
            to={`${baseUrl}/${rowLinkId}/edit`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100"
            onClick={close}
        >
            <Edit size={14} /> Edit
        </Link>
    );

    const viewIcon = useOl ? (
        <button type="button" className="p-1 text-gray-500 hover:text-primary" title="View" onClick={() => fire('view')}>
            <ExternalLink size={16} />
        </button>
    ) : (
        <Link to={`${baseUrl}/${rowLinkId}`} className="p-1 text-gray-500 hover:text-primary" title="View">
            <ExternalLink size={16} />
        </Link>
    );

    const editIcon = useOl ? (
        <button type="button" className="p-1 text-gray-500 hover:text-primary" title="Edit" onClick={() => fire('edit')}>
            <Edit size={16} />
        </button>
    ) : (
        <Link to={`${baseUrl}/${rowLinkId}/edit`} className="p-1 text-gray-500 hover:text-primary" title="Edit">
            <Edit size={16} />
        </Link>
    );

    const copyMenuBtn = (
        <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 text-left"
            onClick={() => (useOl ? fire('copy') : close())}
        >
            <Copy size={14} /> Copy
        </button>
    );

    const deleteMenuBtn = (
        <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 text-red-600 text-left"
            onClick={() => (useOl ? fire('delete') : close())}
        >
            <Trash2 size={14} /> Delete
        </button>
    );

    const customMenuBtn =
        onCustomAction && customActionLabel ? (
            <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 text-left"
                onClick={() => {
                    onCustomAction();
                    close();
                }}
            >
                <Database size={14} /> {customActionLabel}
            </button>
        ) : null;

    return (
        <td className={actionsTdClassName}>
            <div
                className={cn(
                    'flex space-x-2',
                    showRowActionsOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''
                )}
            >
                {actionStyleIsMenu ? (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setOpenRowActionsMenuId(isMenuOpen ? null : menuId)}
                            className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 text-sm"
                        >
                            Actions <ChevronDown size={14} />
                        </button>
                        {isMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={close} />
                                <div
                                    className={cn(
                                        'absolute top-full mt-1 py-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[140px]',
                                        menuDropdownAlign === 'left' ? 'left-0' : 'right-0'
                                    )}
                                >
                                    {enabledActions.includes('view') && viewEl}
                                    {enabledActions.includes('edit') && editEl}
                                    {enabledActions.includes('copy') && copyMenuBtn}
                                    {enabledActions.includes('delete') && deleteMenuBtn}
                                    {customMenuBtn}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {enabledActions.includes('view') && viewIcon}
                        {enabledActions.includes('edit') && editIcon}
                        {enabledActions.includes('copy') &&
                            (useOl ? (
                                <button
                                    type="button"
                                    className="p-1 text-gray-500 hover:text-primary"
                                    title="Copy"
                                    onClick={() => fire('copy')}
                                >
                                    <Copy size={16} />
                                </button>
                            ) : (
                                <button type="button" className="p-1 text-gray-500 hover:text-primary" title="Copy">
                                    <Copy size={16} />
                                </button>
                            ))}
                        {enabledActions.includes('delete') &&
                            (useOl ? (
                                <button
                                    type="button"
                                    className="p-1 text-gray-500 hover:text-red-600"
                                    title="Delete"
                                    onClick={() => fire('delete')}
                                >
                                    <Trash2 size={16} />
                                </button>
                            ) : (
                                <button type="button" className="p-1 text-gray-500 hover:text-red-600" title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            ))}
                        {onCustomAction && customActionLabel ? (
                            <button
                                type="button"
                                className="p-1 text-gray-500 hover:text-primary"
                                title={customActionTitle ?? customActionLabel}
                                onClick={onCustomAction}
                            >
                                <Database size={16} />
                            </button>
                        ) : null}
                    </>
                )}
            </div>
        </td>
    );
}

// Fix: non-OL copy icon was empty onClick - user can't copy without OL; leave as no-op button

// ——— Modal state ———

export type ObjectLoaderRecordModalState =
    | { type: 'view'; row: Record<string, unknown> }
    | { type: 'edit'; row: Record<string, unknown> }
    | { type: 'copy'; row: Record<string, unknown> }
    | { type: 'delete'; row: Record<string, unknown> }
    | { type: 'bulk_view'; rows: Record<string, unknown>[] }
    | { type: 'bulk_copy'; rows: Record<string, unknown>[] }
    | { type: 'bulk_edit'; rows: Record<string, unknown>[] }
    | { type: 'bulk_delete'; rows: Record<string, unknown>[] }
    | null;

interface RecordModalsProps {
    state: ObjectLoaderRecordModalState;
    onClose: () => void;
    fieldMappings: Record<string, string>;
    columnOrder: string[];
    visibleColumns: string[];
    crud: ObjectLoaderCrudOptions;
    onAfterMutation: () => void;
}

function ModalFrame({
    title,
    children,
    footer,
    onClose,
}: {
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button type="button" className="p-1 rounded hover:bg-gray-100 text-gray-500" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-auto flex-1 px-4 py-3">{children}</div>
                {footer && <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>
    );
}

export function ObjectLoaderRecordModals({
    state,
    onClose,
    fieldMappings,
    columnOrder,
    visibleColumns,
    crud,
    onAfterMutation,
}: RecordModalsProps) {
    if (!state) return null;

    if (state.type === 'view') {
        const keys = getOrderedRecordKeys(state.row, fieldMappings, columnOrder);
        return (
            <ModalFrame title="Record" onClose={onClose} footer={<FooterClose onClose={onClose} />}>
                <RecordViewTable row={state.row} keys={keys} fieldMappings={fieldMappings} />
            </ModalFrame>
        );
    }

    if (state.type === 'bulk_view') {
        return (
            <ModalFrame
                title={`${state.rows.length} selected records`}
                onClose={onClose}
                footer={<FooterClose onClose={onClose} />}
            >
                <div className="space-y-6">
                    {state.rows.map((row, i) => {
                        const keys = getOrderedRecordKeys(row, fieldMappings, columnOrder);
                        const id = resolveRowRecordId(row, crud.idColumn);
                        return (
                            <div key={`${id ?? i}`} className="border border-gray-200 rounded-md overflow-hidden">
                                <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                                    Record {i + 1} · {crud.idColumn}: {String(id ?? '—')}
                                </div>
                                <RecordViewTable row={row} keys={keys} fieldMappings={fieldMappings} />
                            </div>
                        );
                    })}
                </div>
            </ModalFrame>
        );
    }

    if (state.type === 'copy' || state.type === 'bulk_copy') {
        const rows = state.type === 'copy' ? [state.row] : state.rows;
        return (
            <CopyGridClipboardModal
                rows={rows}
                fieldMappings={fieldMappings}
                columnOrder={columnOrder}
                visibleColumns={visibleColumns}
                onClose={onClose}
            />
        );
    }

    if (state.type === 'delete') {
        const id = resolveRowRecordId(state.row, crud.idColumn);
        const d = resolveObjectLoaderCrudDefaults(crud);
        const idForEq = id !== undefined && id !== null ? coercePostgrestNumericId(id) : id;
        return (
            <DeleteConfirmModal
                title={d.softDelete ? 'Remove from list?' : 'Delete record?'}
                message={
                    d.softDelete
                        ? `This will set ${d.sysStatusColumn} to "${String(d.sysStatusInactiveValue)}" for ${crud.idColumn}=${id}. The row stays in the database but disappears from this view.`
                        : `This will permanently delete ${crud.idColumn}=${id}. This cannot be undone.`
                }
                confirmLabel={d.softDelete ? 'Remove' : 'Delete'}
                onConfirm={async () => {
                    if (idForEq === undefined || idForEq === null) {
                        alert(`Missing ${crud.idColumn} on this row; cannot update.`);
                        return;
                    }
                    if (d.softDelete) {
                        const patch = { [d.sysStatusColumn]: d.sysStatusInactiveValue };
                        // Do not chain .select() here: if RLS SELECT only allows active rows, the updated row
                        // disappears from RETURNING and looks like 0 rows even when UPDATE succeeded.
                        const { error } = await supabase
                            .from(crud.sourceTable)
                            .update(patch)
                            .eq(crud.idColumn, idForEq);
                        if (error) {
                            alert(error.message);
                            return;
                        }
                    } else {
                        const { error } = await supabase
                            .from(crud.sourceTable)
                            .delete()
                            .eq(crud.idColumn, idForEq);
                        if (error) {
                            alert(error.message);
                            return;
                        }
                    }
                    onAfterMutation();
                    onClose();
                }}
                onClose={onClose}
            />
        );
    }

    if (state.type === 'bulk_delete') {
        const ids = state.rows
            .map((r) => resolveRowRecordId(r, crud.idColumn))
            .filter((x): x is string | number => x !== undefined && x !== null)
            .map((x) => coercePostgrestNumericId(x));
        if (ids.length === 0) {
            return (
                <ModalFrame title="Cannot delete" onClose={onClose} footer={<FooterClose onClose={onClose} />}>
                    <p className="text-sm text-gray-700">Selected rows are missing {crud.idColumn}; nothing was updated.</p>
                </ModalFrame>
            );
        }
        const d = resolveObjectLoaderCrudDefaults(crud);
        return (
            <DeleteConfirmModal
                title={d.softDelete ? `Remove ${ids.length} from list?` : `Delete ${ids.length} records?`}
                message={
                    d.softDelete
                        ? `Selected rows will be marked ${d.sysStatusColumn}="${String(d.sysStatusInactiveValue)}" and hidden from this list.`
                        : 'Selected rows will be removed from the database. This cannot be undone.'
                }
                confirmLabel={d.softDelete ? 'Remove all' : 'Delete'}
                onConfirm={async () => {
                    if (d.softDelete) {
                        const patch = { [d.sysStatusColumn]: d.sysStatusInactiveValue };
                        const { error } = await supabase.from(crud.sourceTable).update(patch).in(crud.idColumn, ids);
                        if (error) {
                            alert(error.message);
                            return;
                        }
                    } else {
                        const { error } = await supabase.from(crud.sourceTable).delete().in(crud.idColumn, ids);
                        if (error) {
                            alert(error.message);
                            return;
                        }
                    }
                    onAfterMutation();
                    onClose();
                }}
                onClose={onClose}
            />
        );
    }

    if (state.type === 'edit') {
        return (
            <EditRecordModal
                row={state.row}
                fieldMappings={fieldMappings}
                columnOrder={columnOrder}
                crud={crud}
                onClose={onClose}
                onSaved={() => {
                    onAfterMutation();
                    onClose();
                }}
            />
        );
    }

    if (state.type === 'bulk_edit') {
        return (
            <BulkEditModal
                rows={state.rows}
                fieldMappings={fieldMappings}
                columnOrder={columnOrder}
                crud={crud}
                onClose={onClose}
                onSaved={() => {
                    onAfterMutation();
                    onClose();
                }}
            />
        );
    }

    return null;
}

function FooterClose({ onClose }: { onClose: () => void }) {
    return (
        <button type="button" className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800" onClick={onClose}>
            Close
        </button>
    );
}

function RecordViewTable({
    row,
    keys,
    fieldMappings,
}: {
    row: Record<string, unknown>;
    keys: string[];
    fieldMappings: Record<string, string>;
}) {
    return (
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left font-semibold text-gray-700 px-3 py-2 w-2/5 border-r border-gray-200">Field</th>
                    <th className="text-left font-semibold text-gray-700 px-3 py-2">Value</th>
                </tr>
            </thead>
            <tbody>
                {keys.map((k) => (
                    <tr key={k} className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="text-gray-600 px-3 py-2 align-top border-r border-gray-100 font-medium">
                            {labelForKey(k, fieldMappings)}
                        </td>
                        <td className="text-gray-900 px-3 py-2 align-top break-words whitespace-pre-wrap">{formatDisplayValue(row[k])}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

type GridCopyFormat = 'plain' | 'html' | 'markdown';

export type CopyGridClipboardModalProps = {
    rows: Record<string, unknown>[];
    fieldMappings: Record<string, string>;
    columnOrder: string[];
    visibleColumns: string[];
    /** When set (e.g. rectangular cell selection), these keys define columns in order. */
    columnKeysOverride?: string[];
    title?: string;
    helperText?: string;
    onClose: () => void;
};

/**
 * Grid copy UI: plain TSV, HTML+TSV clipboard, or Markdown — shared by row/bulk copy and cell-range toolbar.
 */
export function CopyGridClipboardModal({
    rows,
    fieldMappings,
    columnOrder,
    visibleColumns,
    columnKeysOverride,
    title: titleProp,
    helperText,
    onClose,
}: CopyGridClipboardModalProps) {
    const formatRadioName = useId();
    const [gridFormat, setGridFormat] = useState<GridCopyFormat>('plain');
    const [copied, setCopied] = useState(false);

    const gridCols = useMemo(() => {
        if (columnKeysOverride && columnKeysOverride.length > 0) {
            return columnKeysOverride.filter((c) => fieldMappings[c] != null);
        }
        return columnOrder.filter((c) => visibleColumns.includes(c) && fieldMappings[c] != null);
    }, [columnKeysOverride, columnOrder, visibleColumns, fieldMappings]);

    const gridPayload = useMemo(() => {
        if (rows.length === 0 || gridCols.length === 0) return null;
        return buildClipboardGridPayload(rows, gridCols, fieldMappings);
    }, [rows, gridCols, fieldMappings]);

    const preview = useMemo(() => {
        if (!gridPayload) return '';
        if (gridFormat === 'plain') return gridPayload.tsv;
        if (gridFormat === 'html') return gridPayload.html;
        return gridPayload.markdown;
    }, [gridPayload, gridFormat]);

    const handleCopy = async () => {
        if (!gridPayload) return;
        try {
            if (gridFormat === 'html') {
                await copyTsvAndHtmlToClipboard(gridPayload.tsv, gridPayload.html);
            } else if (gridFormat === 'markdown') {
                await copyToClipboard(gridPayload.markdown);
            } else {
                await copyToClipboard(gridPayload.tsv);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert('Clipboard not available.');
        }
    };

    const title =
        titleProp ?? (rows.length === 1 ? 'Copy record' : `Copy ${rows.length} records`);

    const blurb =
        helperText ??
        'Visible columns only, same grid as cell selection copy (headers included). Choose format:';

    return (
        <ModalFrame
            title={title}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200" onClick={onClose}>
                        Close
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                        onClick={handleCopy}
                        disabled={!gridPayload}
                    >
                        {copied ? 'Copied!' : 'Copy to clipboard'}
                    </button>
                </>
            }
        >
            <div className="space-y-4 text-sm text-gray-800">
                <p className="text-xs text-gray-600">{blurb}</p>
                <fieldset className="space-y-2">
                    <legend className="font-semibold text-gray-900 mb-2">Format</legend>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={formatRadioName}
                            checked={gridFormat === 'plain'}
                            onChange={() => setGridFormat('plain')}
                        />
                        Option 1 — Plain text (tab-separated)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={formatRadioName}
                            checked={gridFormat === 'html'}
                            onChange={() => setGridFormat('html')}
                        />
                        Option 2 — HTML table (TSV + HTML on clipboard for Excel / Word / email)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={formatRadioName}
                            checked={gridFormat === 'markdown'}
                            onChange={() => setGridFormat('markdown')}
                        />
                        Option 3 — Table (Markdown)
                    </label>
                </fieldset>
                {!gridPayload && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        No visible columns to copy. Show at least one column in the grid.
                    </p>
                )}
                <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Preview</div>
                    {gridFormat === 'html' && gridPayload ? (
                        <div
                            className="copy-grid-html-preview text-xs bg-white border border-gray-200 rounded p-3 max-h-48 overflow-auto [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_th]:border [&_th]:border-gray-200 [&_th]:p-2 [&_th]:bg-gray-50"
                            dangerouslySetInnerHTML={{ __html: gridPayload.html }}
                        />
                    ) : (
                        <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                            {preview}
                        </pre>
                    )}
                </div>
            </div>
        </ModalFrame>
    );
}

function DeleteConfirmModal({
    title,
    message,
    confirmLabel = 'Delete',
    onConfirm,
    onClose,
}: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}) {
    const [busy, setBusy] = useState(false);
    return (
        <ModalFrame
            title={title}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200" onClick={onClose} disabled={busy}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        disabled={busy}
                        onClick={async () => {
                            setBusy(true);
                            try {
                                await onConfirm();
                            } finally {
                                setBusy(false);
                            }
                        }}
                    >
                        {confirmLabel}
                    </button>
                </>
            }
        >
            <p className="text-sm text-gray-700">{message}</p>
        </ModalFrame>
    );
}

function coerceInputValue(raw: string, original: unknown): unknown {
    if (original === null || original === undefined) {
        if (raw === '') return null;
    }
    if (typeof original === 'number') {
        const n = Number(raw);
        return Number.isNaN(n) ? raw : n;
    }
    if (typeof original === 'boolean') {
        return raw === 'true' || raw === '1';
    }
    if (typeof original === 'object') {
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }
    return raw;
}

function splitPhoneValue(raw: string): { code: string; number: string } {
    const value = String(raw ?? '').trim();
    if (!value) return { code: '', number: '' };
    const [left, ...rest] = value.split('-');
    if (rest.length === 0) {
        return left.startsWith('+') ? { code: left, number: '' } : { code: '', number: left };
    }
    return { code: left, number: rest.join('-') };
}

function composePhoneValue(code: string, number: string): string {
    const c = String(code ?? '').trim();
    const n = String(number ?? '').trim();
    if (!c && !n) return '';
    if (!c) return n;
    if (!n) return c;
    return `${c}-${n}`;
}

function validateEmailValue(value: string): string | null {
    if (!value) return null;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(value)) return 'Enter a valid email address (example: user@domain.com).';
    return null;
}

function validateUrlValue(value: string): string | null {
    if (!value) return null;
    const urlRegex = /^(https?:\/\/)?(www\.)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([\/?#][^\s]*)?$/i;
    if (!urlRegex.test(value)) return 'Enter a valid URL (example: https://www.domain.com).';
    return null;
}

function validatePhoneValue(value: string): string | null {
    if (!value) return null;
    const phoneRegex = /^\+\d{1,4}-[0-9][0-9\s-]{4,19}$/;
    if (!phoneRegex.test(value)) return 'Enter phone as +<countrycode>-<number> (example: +91-289889832).';
    return null;
}

function EditRecordModal({
    row,
    fieldMappings,
    columnOrder,
    crud,
    onClose,
    onSaved,
}: {
    row: Record<string, unknown>;
    fieldMappings: Record<string, string>;
    columnOrder: string[];
    crud: ObjectLoaderCrudOptions;
    onClose: () => void;
    onSaved: () => void;
}) {
    const keys = getOrderedRecordKeys(row, fieldMappings, columnOrder);
    const readOnly = mergeReadOnlyKeysForEdit(crud);
    const [values, setValues] = useState<Record<string, string>>(() => {
        const o: Record<string, string> = {};
        for (const k of keys) {
            const v = row[k];
            if (typeof v === 'object' && v !== null) o[k] = JSON.stringify(v, null, 2);
            else o[k] = v === null || v === undefined ? '' : String(v);
        }
        return o;
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const id = resolveRowRecordId(row, crud.idColumn);

    const save = async () => {
        setErr(null);
        const patch: Record<string, unknown> = {};
        for (const k of keys) {
            if (readOnly.has(k)) continue;
            const typed = crud.fieldTypeByKey?.[k];
            const rawValue = String(values[k] ?? '');
            const validationError =
                typed === 'email'
                    ? validateEmailValue(rawValue)
                    : typed === 'url'
                      ? validateUrlValue(rawValue)
                      : typed === 'phone'
                        ? validatePhoneValue(rawValue)
                        : null;
            if (validationError) {
                setErr(`${labelForKey(k, fieldMappings)}: ${validationError}`);
                return;
            }
            patch[k] = coerceInputValue(values[k] ?? '', row[k]);
        }
        const finalPatch: Record<string, unknown> = crud.jsonValueColumn
            ? { [crud.jsonValueColumn]: patch }
            : patch;
        if (id === undefined || id === null) {
            setErr(`Missing ${crud.idColumn}; cannot save.`);
            return;
        }
        setSaving(true);
        const { error } = await supabase
            .from(crud.sourceTable)
            .update(finalPatch)
            .eq(crud.idColumn, coercePostgrestNumericId(id));
        setSaving(false);
        if (error) {
            setErr(error.message);
            return;
        }
        onSaved();
    };

    return (
        <ModalFrame
            title="Edit record"
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={save}
                        disabled={saving}
                    >
                        Save
                    </button>
                </>
            }
        >
            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {keys.map((k) => {
                    const ro = readOnly.has(k);
                    const long =
                        typeof row[k] === 'object' ||
                        (typeof values[k] === 'string' && (values[k].length > 80 || values[k].includes('\n')));
                    return (
                        <div key={k}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{labelForKey(k, fieldMappings)}</label>
                            {ro ? (
                                <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">{values[k]}</div>
                            ) : crud.fieldTypeByKey?.[k] === 'phone' ? (
                                <div className="grid grid-cols-[120px_1fr] gap-2">
                                    <input
                                        type="text"
                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                        placeholder="+91"
                                        value={splitPhoneValue(values[k] ?? '').code}
                                        onChange={(e) =>
                                            setValues((p) => ({
                                                ...p,
                                                [k]: composePhoneValue(e.target.value, splitPhoneValue(p[k] ?? '').number),
                                            }))
                                        }
                                    />
                                    <input
                                        type="text"
                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                        placeholder="289889832"
                                        value={splitPhoneValue(values[k] ?? '').number}
                                        onChange={(e) =>
                                            setValues((p) => ({
                                                ...p,
                                                [k]: composePhoneValue(splitPhoneValue(p[k] ?? '').code, e.target.value),
                                            }))
                                        }
                                    />
                                </div>
                            ) : long ? (
                                <textarea
                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 font-mono"
                                    rows={4}
                                    value={values[k] ?? ''}
                                    onChange={(e) => setValues((p) => ({ ...p, [k]: e.target.value }))}
                                />
                            ) : (
                                <input
                                    type="text"
                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                                    value={values[k] ?? ''}
                                    onChange={(e) => setValues((p) => ({ ...p, [k]: e.target.value }))}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </ModalFrame>
    );
}

function BulkEditModal({
    rows,
    fieldMappings,
    columnOrder,
    crud,
    onClose,
    onSaved,
}: {
    rows: Record<string, unknown>[];
    fieldMappings: Record<string, string>;
    columnOrder: string[];
    crud: ObjectLoaderCrudOptions;
    onClose: () => void;
    onSaved: () => void;
}) {
    const keys = useMemo(() => {
        const readOnly = mergeReadOnlyKeysForEdit(crud);
        const s = new Set<string>();
        for (const r of rows) {
            for (const k of getOrderedRecordKeys(r, fieldMappings, columnOrder)) {
                if (!readOnly.has(k)) s.add(k);
            }
        }
        return [...s].filter((k) => fieldMappings[k] != null || rows.some((r) => r[k] !== undefined));
    }, [rows, fieldMappings, columnOrder, crud]);

    const [values, setValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const ids = rows
        .map((r) => resolveRowRecordId(r, crud.idColumn))
        .filter((x): x is string | number => x !== undefined && x !== null)
        .map((x) => coercePostgrestNumericId(x));

    const save = async () => {
        setErr(null);
        const patch: Record<string, unknown> = {};
        for (const k of keys) {
            const raw = values[k];
            if (raw === undefined || raw === '') continue;
            const sample = rows.find((r) => r[k] !== undefined)?.[k];
            patch[k] = coerceInputValue(raw, sample ?? '');
        }
        if (Object.keys(patch).length === 0) {
            setErr('Enter at least one field to update.');
            return;
        }
        setSaving(true);
        const { error } = await supabase.from(crud.sourceTable).update(patch).in(crud.idColumn, ids);
        setSaving(false);
        if (error) {
            setErr(error.message);
            return;
        }
        onSaved();
    };

    return (
        <ModalFrame
            title={`Bulk edit (${rows.length} records)`}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={save}
                        disabled={saving}
                    >
                        Apply to all
                    </button>
                </>
            }
        >
            <p className="text-xs text-gray-500 mb-3">
                Only non-empty fields are written. Every selected row gets the same values for those fields.
            </p>
            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {keys.map((k) => (
                    <div key={k}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{labelForKey(k, fieldMappings)}</label>
                        <input
                            type="text"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                            placeholder="Leave empty to skip"
                            value={values[k] ?? ''}
                            onChange={(e) => setValues((p) => ({ ...p, [k]: e.target.value }))}
                        />
                    </div>
                ))}
            </div>
        </ModalFrame>
    );
}
