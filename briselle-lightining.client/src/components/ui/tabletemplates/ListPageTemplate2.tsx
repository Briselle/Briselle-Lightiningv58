import {useState, useRef } from 'react';
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
        enableMassSelection?: boolean;
        enableRowHoverHighlight?: boolean;
        enableStripedRows?: boolean;
        enableRowDivider?: boolean;
        enableColumnResize?: boolean;
        enableColumnDivider?: boolean;
     
    };
    loading?: boolean;
}

export default function ListPageTemplate1({ title, data, fieldMappings, config, loading }: Props) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSort = (column: string) => {
        if (!config.enableSort) return;
        const newOrder = sortColumn === column && sortOrder === 'asc' ? 'desc' : 'asc';
        setSortColumn(column);
        setSortOrder(newOrder);
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

    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const toggleRowSelection = (index: number) => {
        setSelectedRows((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    const handleSelectAllRows = () => {
        if (selectedRows.length === data.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(data.map((_, i) => i));
        }
    };
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const resizeRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const handleMouseDown = (
        e: React.MouseEvent<HTMLDivElement>,
        col: string
    ) => {
        if (!config.enableColumnResize) return;

        const startX = e.clientX;
        const startWidth = columnWidths[col] || (resizeRefs.current[col]?.offsetWidth ?? 150);

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            setColumnWidths((prev) => ({ ...prev, [col]: newWidth }));
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };




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
                            <table className={`data-table 
                                ${!config.enableRowHoverHighlight ? 'no-hover' : ''}`}
                            >
                            {config.enableHeader && (
                                <thead className="bg-gray-100">
                                    <tr>
                                            {config.enableRowSelection && (
                                                <th className={`px-4 py-2 text-sm text-gray-700 
                                                ${config.enableColumnDivider ? 'border-r border-gray-200' : ''}
                                                `}>
                                                    <input
                                                        type="checkbox"
                                                        onChange={handleSelectAllRows}
                                                        checked={selectedRows.length === data.length && data.length > 0}
                                                        disabled={!config.enableMassSelection}
                                                    />
                                                </th>
                                            )}

                                            {config.enableRowNumber && <th className={`px-4 py-2 text-sm text-gray-700 
                                                ${config.enableColumnDivider ? 'border-r border-gray-200' : ''}
                                                `}>#</th>}
                                            {Object.keys(fieldMappings).map((col, colIndex, arr) => (
                                                <th
                                                    key={col}
                                                    className={`px-4 py-2 text-left cursor-pointer relative group 
                                                            ${config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : ''}`}

                                                    style={{ width: columnWidths[col] ? `${columnWidths[col]}px` : 'auto' }}
                                                    ref={(el) => (resizeRefs.current[col] = el)}

                                                    onClick={() => handleSort(col)}
                                                >
                                                    {fieldMappings[col]}
                                                    {config.enableSort && sortColumn === col && (
                                                        <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                                                    )}
                                                    {config.enableColumnResize && (
                                                        <div
                                                            className="absolute top-0 right-0 h-full w-1 cursor-col-resize"
                                                            onMouseDown={(e) => handleMouseDown(e, col)}
                                                        />
                                                    )}
                                                </th>
                                            ))}

                                            <th className={`px-4 py-2 ${config.enableColumnDivider ? 'border-l border-gray-200' : ''}`}>Actions</th>
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
                                            <td className={`px-4 py-2 text-sm text-gray-700 
                                                ${config.enableColumnDivider ? 'border-r border-gray-200' : ''}
                                                `}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.includes(idx)}
                                                    onChange={() => toggleRowSelection(idx)}
                                                />
                                            </td>
                                        )}

                                        {config.enableRowNumber && (
                                            <td
                                                className={`px-4 py-2 text-sm text-gray-700 
                                                ${config.enableColumnDivider ? 'border-r border-gray-200' : ''}
                                                `} >{idx + 1}</td>
                                        )}

                                        {Object.keys(fieldMappings).map((col, colIndex, arr) => (
                                            <td
                                                key={col}

                                                className={`px-4 py-2 text-sm text-gray-700 ${config.enableColumnDivider && colIndex < arr.length - 1
                                                        ? 'border-r border-gray-200'
                                                        : ''
                                                    }`}
                                            >
                                                <span className={colIndex === 0 ? 'font-medium' : ''}>
                                                    {row[col]?.toString() || '-'}
                                                </span>
                                                {colIndex === 0 &&
                                                    (row['isCustom'] === true || row['isCustom'] === 1) && (
                                                        <span className="ml-2 px-2 py-0.5 text-xs bg-accent text-white rounded-full">
                                                            Custom
                                                        </span>
                                                    )}
                                            </td>
                                        ))}



                                        <td className={`px-4 py-2 text-sm text-gray-700 
                                         ${!config.enableRowDivider ? '!border-b-0' : ''}
                                         ${config.enableStripedRows && idx % 2 === 1 ? 'bg-gray-50' : ''}
                                         ${config.enableColumnDivider ? 'border-l border-gray-200' : ''}
                                        `}>
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
