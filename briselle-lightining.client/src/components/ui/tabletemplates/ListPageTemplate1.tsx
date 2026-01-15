import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, AlertTriangle, ExternalLink, Settings, Edit, Trash2 } from 'lucide-react';

interface Props {
    title: string;
    data: any[];
    fieldMappings: Record<string, string>;
    config: {
        enableSort?: boolean;
        enableHeader?: boolean;
        enableRowNumber?: boolean;
        enableRowSelection?: boolean;
        enableRowHoverHighlight?: boolean;
        enableStripedRows?: boolean;
    };
    loading?: boolean;
}

export default function ListPageTemplate1({ title, data, fieldMappings, config, loading }: Props) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

    const handleSort = (column: string) => {
        if (!config.enableSort) return;
        const newOrder = sortColumn === column && sortOrder === 'asc' ? 'desc' : 'asc';
        setSortColumn(column);
        setSortOrder(newOrder);
    };

    const toggleRowSelection = (index: number) => {
        const updated = new Set(selectedRows);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        updated.has(index) ? updated.delete(index) : updated.add(index);
        setSelectedRows(updated);
    };

    const filteredEntities = [...data].filter((row) => {
        const searchLower = searchTerm.toLowerCase();
        return Object.keys(fieldMappings).some((key) =>
            (row[key]?.toString().toLowerCase() ?? '').includes(searchLower)
        );
    });

    const sortedData = [...filteredEntities].sort((a, b) => {
        if (!sortColumn) return 0;
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortOrder === 'asc'
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
    });

    return (
        <div className="fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="page-title mb-0">{title}</h1>
                <button className="btn btn-primary">
                    <Plus size={16} className="mr-2" /> New {title}
                </button>
            </div>

            <div className="card mb-6">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 input"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className={`data-table ${!config.enableRowHoverHighlight ? 'no-hover' : ''}`}>
                            {config.enableHeader && (
                                <thead className="bg-gray-100">
                                    <tr>
                                        {config.enableRowSelection && <th className="px-4"><input type="checkbox" disabled /></th>}
                                        {config.enableRowNumber && <th className="px-4">#</th>}
                                        {Object.keys(fieldMappings).map((col) => (
                                            <th
                                                key={col}
                                                className="px-4 py-2 text-left cursor-pointer"
                                                onClick={() => handleSort(col)}
                                            >
                                                {fieldMappings[col]}
                                                {config.enableSort && sortColumn === col && (
                                                    <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                                                )}
                                            </th>
                                        ))}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                            )}

                            <tbody>
                                {sortedData.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className={config.enableRowHoverHighlight ? 'hover:bg-gray-100 transition-colors' : ''}
                                    >
                                        {config.enableRowSelection && (
                                            <td className="px-4 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.has(idx)}
                                                    onChange={() => toggleRowSelection(idx)}
                                                />
                                            </td>
                                        )}

                                        {config.enableRowNumber && (
                                            <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                                        )}

                                        {Object.keys(fieldMappings).map((col, colIndex) => (
                                            <td key={col} className="px-4 py-2 text-sm text-gray-700">
                                                <span className={colIndex === 0 ? 'font-medium' : ''}>
                                                    {row[col]?.toString() || '-'}
                                                </span>
                                                {colIndex === 0 && (row['isCustom'] === true || row['isCustom'] === 1) && (
                                                    <span className="ml-2 px-2 py-0.5 text-xs bg-accent text-white rounded-full">
                                                        Custom
                                                    </span>
                                                )}
                                            </td>
                                        ))}

                                        <td>
                                            <div className="flex space-x-2">
                                                <Link
                                                    to={`/data/${row.id}/config`}
                                                    className="p-1 text-gray-500 hover:text-primary"
                                                    title="Configure"
                                                >
                                                    <Settings size={16} />
                                                </Link>
                                                <Link
                                                    to={`/data/${row.id}`}
                                                    className="p-1 text-gray-500 hover:text-primary"
                                                    title="View Record"
                                                >
                                                    <ExternalLink size={16} />
                                                </Link>
                                                <Link
                                                    to={`/data/${row.id}/config`}
                                                    className="p-1 text-gray-500 hover:text-primary transition-colors"
                                                    title="Edit Record"
                                                >
                                                    <Edit size={16} />
                                                </Link>

                                                <Link
                                                    to={`/data/${row.id}/config`}
                                                    className="p-1 text-gray-500 hover:text-primary transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={16} />
                                                </Link>

                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {sortedData.length === 0 && (
                            <div className="py-8 text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                                    <AlertTriangle size={24} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No Record Found</h3>
                                <p className="text-gray-500">Try adjusting your search or create a new record.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
