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

const ChartPanel: React.FC<ChartPanelProps> = ({
    recordCount,
    data,
    dataColumns,
    fieldMappings,
    onClose,
}) => {
    const cols = dataColumns.slice(0, 5);
    const { rows, headers } = pivotRows(data, cols);
    const vHeights = barHeights(data, cols);
    const hWidths = hBarWidths(data, cols);

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-lg w-[400px] min-w-[320px] shrink-0">
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

                {/* Pivot-style table (3 columns) */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Data (pivot)</h4>
                    <div className="rounded border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    {headers.map((h, i) => (
                                        <th key={i} className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                                            {fieldMappings[h] || h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={i} className="border-b border-gray-100 last:border-b-0">
                                        {r.map((c, j) => (
                                            <td key={j} className="px-3 py-2 text-gray-800">{String(c)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
