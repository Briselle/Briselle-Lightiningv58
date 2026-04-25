import React from 'react';
import { X } from 'lucide-react';

interface ChartPanelProps {
    recordCount: number;
    data: any[];
    /** Ordered visible column keys (from columnOrder filtered by visibleColumns) */
    dataColumns: string[];
    fieldMappings: Record<string, string>;
    onClose: () => void;
}

/** Dummy pivot: col0 | col1 | col2 (first 3 visible columns), first 10 rows */
function pivotRows(data: any[], cols: string[], limit = 10): { rows: any[][]; headers: string[] } {
    const headers = cols.slice(0, 3);
    const rows = data.slice(0, limit).map(row => headers.map(h => row[h] ?? ''));
    return { rows, headers };
}

/** Dummy vertical bar chart: 5 bars from first numeric-like or length values */
function barHeights(data: any[], cols: string[]): number[] {
    const vals: number[] = [];
    for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i];
        let n = 0;
        for (const c of cols) {
            const v = row[c];
            if (typeof v === 'number' && !Number.isNaN(v)) n += v;
            else if (v != null) n += String(v).length;
        }
        vals.push(Math.max(1, n));
    }
    const max = Math.max(1, ...vals);
    return vals.map(v => Math.round((v / max) * 100));
}

/** Dummy horizontal bar chart: same logic, 5 items */
function hBarWidths(data: any[], cols: string[]): number[] {
    return barHeights(data, cols);
}

function toBoolLike(v: unknown): boolean | null {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : null;
    if (typeof v === 'string') {
        const t = v.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'custom'].includes(t)) return true;
        if (['false', '0', 'no', 'n', 'standard'].includes(t)) return false;
    }
    return null;
}

function toActiveLike(v: unknown): 'active' | 'inactive' | null {
    if (v == null) return null;
    const t = String(v).trim().toLowerCase();
    if (['active', 'enabled', 'open', '1', 'true'].includes(t)) return 'active';
    if (['inactive', 'disabled', 'closed', '0', 'false'].includes(t)) return 'inactive';
    return null;
}

const ChartPanel: React.FC<ChartPanelProps> = ({
    recordCount,
    data,
    dataColumns,
    fieldMappings,
    onClose,
}) => {
    const cols = dataColumns.slice(0, 5);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const { rows, headers } = pivotRows(data, cols);
    const vHeights = barHeights(data, cols);
    const hWidths = hBarWidths(data, cols);

    const allColumns = Array.from(
        new Set([
            ...dataColumns,
            ...(data.length > 0 ? Object.keys(data[0] ?? {}) : []),
        ]),
    );
    const customKey =
        allColumns.find((c) => c.toLowerCase() === 'iscustom') ??
        allColumns.find((c) => c.toLowerCase().includes('custom')) ??
        null;
    const statusKey =
        allColumns.find((c) => c.toLowerCase() === 'dobj_status') ??
        allColumns.find((c) => c.toLowerCase() === 'status') ??
        allColumns.find((c) => c.toLowerCase().includes('status')) ??
        null;

    const matrixCounts = { t_a: 0, t_i: 0, f_a: 0, f_i: 0, unresolvedCustom: 0, unresolvedStatus: 0 };
    if (customKey && statusKey) {
        for (const row of data) {
            const custom = toBoolLike(row?.[customKey]);
            const status = toActiveLike(row?.[statusKey]);
            if (custom == null) matrixCounts.unresolvedCustom += 1;
            if (status == null) matrixCounts.unresolvedStatus += 1;
            if (custom === true && status === 'active') matrixCounts.t_a += 1;
            if (custom === true && status === 'inactive') matrixCounts.t_i += 1;
            if (custom === false && status === 'active') matrixCounts.f_a += 1;
            if (custom === false && status === 'inactive') matrixCounts.f_i += 1;
        }
    }

    const pivotRowsForUi = [
        { customLabel: 'True', active: matrixCounts.t_a, inactive: matrixCounts.t_i, total: matrixCounts.t_a + matrixCounts.t_i },
        { customLabel: 'False', active: matrixCounts.f_a, inactive: matrixCounts.f_i, total: matrixCounts.f_a + matrixCounts.f_i },
    ];
    const colTotals = {
        active: matrixCounts.t_a + matrixCounts.f_a,
        inactive: matrixCounts.t_i + matrixCounts.f_i,
        grand: matrixCounts.t_a + matrixCounts.t_i + matrixCounts.f_a + matrixCounts.f_i,
    };
    const hasPivotKeys = Boolean(customKey && statusKey);

    React.useEffect(() => {
        const chartEl = rootRef.current;
        const actionPanelEl = document.querySelector('.relative.z-\\[110\\].px-4.py-2.border-b.border-gray-200') as HTMLElement | null;
        const chartStyle = chartEl ? window.getComputedStyle(chartEl) : null;
        const actionStyle = actionPanelEl ? window.getComputedStyle(actionPanelEl) : null;
        const chartRect = chartEl?.getBoundingClientRect() ?? null;
        const actionRect = actionPanelEl?.getBoundingClientRect() ?? null;
        const overlap =
            chartRect && actionRect
                ? !(chartRect.left >= actionRect.right || chartRect.right <= actionRect.left || chartRect.top >= actionRect.bottom || chartRect.bottom <= actionRect.top)
                : null;
    }, [recordCount, data.length, dataColumns.length]);

    return (
        <div ref={rootRef} className="relative z-[220] flex flex-col h-full bg-white border-l border-gray-200 shadow-lg w-[400px] min-w-[320px] shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Charts</h3>
                <button
                    onClick={onClose}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Record count card */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Record count</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{recordCount}</p>
                </div>

                {/* Matrix pivot table: custom(true/false) x status(active/inactive) */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Data (pivot)</h4>
                    <div className="rounded border border-gray-200 overflow-hidden">
                        {hasPivotKeys ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                                            {fieldMappings[customKey!] || customKey}
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-gray-700 border-b border-gray-200">
                                            Active
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-gray-700 border-b border-gray-200">
                                            Inactive
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-gray-700 border-b border-gray-200">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pivotRowsForUi.map((r) => (
                                        <tr key={r.customLabel} className="border-b border-gray-100 last:border-b-0">
                                            <td className="px-3 py-2 text-gray-800">{r.customLabel}</td>
                                            <td className="px-3 py-2 text-gray-800 text-right">{r.active}</td>
                                            <td className="px-3 py-2 text-gray-800 text-right">{r.inactive}</td>
                                            <td className="px-3 py-2 text-gray-900 font-medium text-right">{r.total}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50 border-t border-gray-200">
                                        <td className="px-3 py-2 text-gray-900 font-semibold">Total</td>
                                        <td className="px-3 py-2 text-gray-900 font-semibold text-right">{colTotals.active}</td>
                                        <td className="px-3 py-2 text-gray-900 font-semibold text-right">{colTotals.inactive}</td>
                                        <td className="px-3 py-2 text-gray-900 font-bold text-right">{colTotals.grand}</td>
                                    </tr>
                                </tbody>
                            </table>
                        ) : (
                            <div className="px-3 py-3 text-sm text-amber-700 bg-amber-50">
                                Could not build pivot matrix. Required columns for custom/status were not detected.
                            </div>
                        )}
                    </div>
                </div>

                {/* Dummy vertical bar chart */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Bar chart</h4>
                    <div className="flex items-end gap-2 h-32">
                        {vHeights.map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 min-w-[24px] bg-blue-500 rounded-t"
                                style={{ height: `${h}%` }}
                                title={`${h}%`}
                            />
                        ))}
                    </div>
                </div>

                {/* Dummy horizontal bar chart */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Horizontal bar chart</h4>
                    <div className="space-y-2">
                        {hWidths.map((w, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-6">{i + 1}</span>
                                <div className="flex-1 h-5 bg-gray-200 rounded overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded"
                                        style={{ width: `${w}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-500 w-8">{w}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChartPanel;
