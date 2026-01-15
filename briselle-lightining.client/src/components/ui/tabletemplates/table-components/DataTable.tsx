import React, { useRef, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Edit, Trash2, AlertTriangle, Copy, Eye, GripVertical, MoreHorizontal } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface DataTableProps {
    data: any[];
    fieldMappings: Record<string, string>;
    visibleColumns: string[];
    columnOrder: string[];
    columnWidths: Record<string, number>;
    sortColumn: string | null;
    sortOrder: 'asc' | 'desc';
    selectedRows: Set<number>;
    baseUrl: string;
    config: {
        [x: string]: any;
        enableHeader: boolean;
        enableRowSelection: boolean;
        enableMassSelection: boolean;
        enableRowNumber: boolean;
        enableRowActions: boolean;
        enabledRowActions: ('view' | 'edit' | 'copy' | 'delete')[];
        enableRowHoverHighlight: boolean;
        enableStripedRows: boolean;
        enableRowDivider: boolean;
        enableColumnDivider: boolean;
        enableColumnResize: boolean;
        enableColumnReorder: boolean;
        enableRowReorder: boolean;
        enableWrapText: boolean;
        enableWrapClipOption: boolean;
        enableFreezePaneRowHeader: boolean;
        enablefreezePaneColumnIndex: boolean;
        freezePaneColumnIndexNo: number;



        enableSort: boolean;
        enableTooltips: boolean;
        theme: string;
        density: string;
        rowActionsPosition: 'left' | 'right';
        showRowActionsOnHover: boolean;
        enableRowHoverHighlight: boolean;
        enableRowDivider: boolean;
    };
    onSort: (column: string) => void;
    onRowSelect: (index: number) => void;
    onSelectAll: () => void;
    onColumnResize: (column: string, width: number) => void;
    onColumnReorder: (draggedColumn: string, targetColumn: string) => void;
    onRowReorder: (draggedIndex: number, targetIndex: number) => void;
    onWrapClipToggle: (column: string) => void;
}

const freezePaneColumnIndexNo = 3;



const DataTable: React.FC<DataTableProps> = ({
    data,
    fieldMappings,
    visibleColumns,
    columnOrder,
    columnWidths,
    sortColumn,
    sortOrder,
    selectedRows,
    baseUrl,
    config,
    onSort,
    onRowSelect,
    onSelectAll,
    onColumnResize,
    onColumnReorder,
    onRowReorder,
    onWrapClipToggle,
}) => {
    const resizeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [columnWrapStates, setColumnWrapStates] = useState<Record<string, 'wrap' | 'clip'>>({});

    const handleMouseDown = useCallback((
        e: React.MouseEvent<HTMLDivElement>,
        col: string
    ) => {
        if (!config.enableColumnResize) return;

        const startX = e.clientX;
        const startWidth = resizeRefs.current[col]?.offsetWidth || 150;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = Math.max(50, startWidth + (e.clientX - startX));
            onColumnResize(col, newWidth);
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [config.enableColumnResize, onColumnResize]);

    const getDensityClass = (density: string) => {
        switch (density) {
            case 'compact': return 'compact';
            case 'comfortable': return 'comfortable';
            case 'spacious': return 'spacious';
            default: return '';
        }
    };

    const getThemeClass = (theme: string) => {
        switch (theme) {
            case 'professional': return 'theme-professional';
            case 'modern': return 'theme-modern';
            case 'minimal': return 'theme-minimal';
            case 'executive': return 'theme-executive';
            case 'corporate': return 'theme-corporate';
            case 'finance': return 'theme-finance';
            case 'tech': return 'theme-tech';
            default: return '';
        }
    };

    const filteredColumns = columnOrder.filter(col => visibleColumns.includes(col));

    const getFreezeLeftOffset = (targetIndex: number) => {
        let left = 0;

        // Selection column
        if (config.enableRowSelection) left += 48;

        // Row number column
        if (config.enableRowNumber) left += 48;

        // Reorder column
        if (config.enableRowReorder) left += 32;

        // Data columns before the frozen one
        for (let i = 0; i < targetIndex; i++) {
            const colKey = filteredColumns[i];
            left += columnWidths[colKey] ?? 150;
        }

        return left;
    };
    useEffect(() => {
        console.log('[DataTable] Received freeze config:', {
            enableFreezePaneColumn1: config.enableFreezePaneColumn1,
            freezePaneColumnIndex: config.freezePaneColumnIndex,
        });
    }, [
        config.enableFreezePaneColumn1,
        config.freezePaneColumnIndex,
    ]);

    
    return (
        console.log('[DataTable] Vairables Check:', {
            enableFreezePaneColumnIndex: config.enableFreezePaneColumnIndex,
            freezePaneColumnIndexNo: config.freezePaneColumnIndexNo,
        }),
        <div className="overflow-x-auto custom-scrollbar relative">
            '<table className={cn(
                "data-table w-full",
                getThemeClass(config.theme),
                getDensityClass(config.density),
                config.enableStripedRows && 'data-table-striped',

               
                // ✅ Freeze Pane (CORRECT FLAGS)
                config.enableFreezePaneRowHeader && 'freeze-header',
                config.enableRowSelection && 'has-selection',
                config.enableRowNumber && 'has-row-number',
                config.enableRowReorder && 'has-reorder'
            )}
             
            >
                {config.enableHeader && (
                    <thead className="bg-gray-100">
                        <tr>
                            {config.enableRowSelection && (
                                <th className={cn("px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider",

                                    config.enableColumnDivider && 'border-r border-gray-200')}>
                                    <input
                                        type="checkbox"
                                        onChange={onSelectAll}
                                        checked={selectedRows.size === data.length && data.length > 0}
                                        ref={(input) => {
                                            if (input) {
                                                input.indeterminate = selectedRows.size > 0 && selectedRows.size < data.length;
                                            }
                                        }}
                                        disabled={!config.enableMassSelection}
                                    />
                                </th>
                            )}
                            {config.enableRowNumber && (
                                <th className={cn("px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider", config.enableColumnDivider && 'border-r border-gray-200')}>#</th>
                            )}
                            {config.enableRowReorder && (
                                <th className={cn("px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider", config.enableColumnDivider && 'border-r border-gray-200')}>
                                    {/* Row reorder header - no icon needed */}
                                </th>
                            )}
                                {filteredColumns.map((col, colIndex, arr) => (
                                    console.log(
                                        '[FreezeDebug]',
                                        'col:', col,
                                        'dataIndex:', colIndex,
                                        'freezeIndex:', freezePaneColumnIndexNo
                                    ),

                                    <th
                                        key={col}
                                        className={cn("group",
                                            "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group",



                                            config.enableSort && "cursor-pointer",
                                            config.enableColumnDivider && colIndex < arr.length - 1 && 'border-r border-gray-200',
                                            config.enableWrapText ? 'whitespace-normal' : 'whitespace-nowrap'
                                        )}
                                            style={{
                                                width: columnWidths[col] ? `${columnWidths[col]}px` : 'auto',

                                                ...(config.enablefreezePaneColumnIndex &&
                                                    colIndex === config.freezePaneColumnIndexNo - 1
                                                    ? {
                                                        position: 'sticky',
                                                        left: getFreezeLeftOffset(colIndex),
                                                        zIndex: 20,
                                                        background: 'inherit',
                                                        borderRight: '2px solid #d1d5db',
                                                    }
                                                    : undefined)
                                            }}
                                    onClick={() => config.enableSort && onSort(col)}
                                    draggable={config.enableColumnReorder}
                                    onDragStart={(e) => e.dataTransfer.setData('columnId', col)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => onColumnReorder(e.dataTransfer.getData('columnId'), col)}
                                    ref={(el) => (resizeRefs.current[col] = el)}
                                    title={config.enableTooltips ? fieldMappings[col] : undefined}
                                >
                                    {config.enableColumnReorder && (
                                        <GripVertical size={12} className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                    <span className={config.enableColumnReorder ? 'ml-4' : ''}>{fieldMappings[col]}</span>
                                    {config.enableSort && sortColumn === col && (
                                        <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                                    )}
                                    {config.enableWrapClipOption && (
                                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onWrapClipToggle(col);
                                                }}
                                                title={`${columnWrapStates[col] === 'wrap' ? 'Clip' : 'Wrap'} text`}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 6h18M3 12h15a3 3 0 1 1 0 6h-4"/>
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                    {config.enableColumnResize && (
                                        <div
                                            className="absolute top-0 right-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100 hover:bg-blue-400 transition-opacity"
                                            onMouseDown={(e) => handleMouseDown(e, col)}
                                            title="Wrap/Clip text"
                                        />
                                    )}
                                </th>
                            ))}
                            {config.enableRowActions && (
                                <th className={cn("px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider", config.enableColumnDivider && 'border-l border-gray-200')}>
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                )}

                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={filteredColumns.length + (config.enableRowSelection ? 1 : 0) + (config.enableRowNumber ? 1 : 0) + (config.enableRowReorder ? 1 : 0) + (config.enableRowActions ? 1 : 0)} className="py-8 text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                                    <AlertTriangle size={24} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No Record Found</h3>
                                <p className="text-gray-500">Try adjusting your search or create a new record.</p>
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => (
                            <tr
                                key={row.id || idx}
                                className={cn("group",
                                    config.enableRowHoverHighlight && 'hover:bg-blue-50 transition-colors',
                                    config.enableStripedRows && idx % 2 === 1 && 'bg-gray-50',
                                    config.enableRowDivider ? 'border-b border-gray-200' : 'border-b-0'
                                )}
                                draggable={config.enableRowReorder}
                                onDragStart={(e) => e.dataTransfer.setData('rowIndex', String(idx))}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => onRowReorder(Number(e.dataTransfer.getData('rowIndex')), idx)}
                            >
                                {config.enableRowSelection && (
                                    <td className={cn("px-4 py-2 text-sm text-gray-700", 
                                        config.enableColumnDivider && 'border-r border-gray-200',
                                        config.enableRowDivider && 'border-b border-gray-200'
                                    )}>
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(idx)}
                                            onChange={() => onRowSelect(idx)}
                                        />
                                    </td>
                                )}
                                {config.enableRowNumber && (
                                    <td className={cn("px-3 py-2 text-sm text-gray-500", 
                                        config.enableColumnDivider && 'border-r border-gray-200',
                                        config.enableRowDivider && 'border-b border-gray-200'
                                    )}>
                                        {idx + 1}
                                    </td>
                                )}
                                {config.enableRowReorder && (
                                    <td className={cn("px-2 py-2 text-sm text-gray-500", 
                                        config.enableColumnDivider && 'border-r border-gray-200',
                                        config.enableRowDivider && 'border-b border-gray-200'
                                    )}>
                                        <GripVertical size={14} className="text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </td>
                                )}
                                {filteredColumns.map((col, colIndex, arr) => (
                                    <td
                                        key={col}
                                        className={cn(
                                            "px-3 py-2 text-sm text-gray-900",

                                            
                                            config.enableColumnDivider && colIndex < arr.length - 1 && 'border-r border-gray-200',
                                            config.enableRowDivider ? 'border-b border-gray-200' : 'border-b-0',
                                            columnWrapStates[col] === 'wrap' ? 'whitespace-normal' : 'whitespace-nowrap overflow-hidden'
                                        )}
                                        style={
                                            config.enablefreezePaneColumnIndex &&
                                                colIndex === config.freezePaneColumnIndexNo - 1
                                                ? {
                                                    position: 'sticky',
                                                    left: `${getFreezeLeftOffset(colIndex)}px`,
                                                    zIndex: 10,
                                                    background: 'inherit',
                                                    borderRight: '2px solid #d1d5db'
                                                }
                                                : undefined
                                        }
                                        title={config.enableTooltips ? row[col]?.toString() : undefined}
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
                                {config.enableRowActions && (
                                    <td className={cn("px-3 py-2 text-sm text-gray-700", 
                                        config.enableColumnDivider && 'border-l border-gray-200',
                                        config.enableRowDivider && 'border-b border-gray-200'
                                    )}>
                                        <div className={cn("flex space-x-1", {
                                            'opacity-0 group-hover:opacity-100 transition-opacity': config.showRowActionsOnHover
                                        })}>
                                            {config.enabledRowActions.includes('view') && (
                                                <Link
                                                    to={`${baseUrl}/${row.id}`}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
                                                    title="View Record"
                                                >
                                                    <Eye size={14} />
                                                </Link>
                                            )}
                                            {config.enabledRowActions.includes('edit') && (
                                                <Link
                                                    to={`${baseUrl}/${row.id}/edit`}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
                                                    title="Edit Record"
                                                >
                                                    <Edit size={14} />
                                                </Link>
                                            )}
                                            {config.enabledRowActions.includes('copy') && (
                                                <button
                                                    onClick={() => console.log('Copy', row.id)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
                                                    title="Copy Record"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            )}
                                            {config.enabledRowActions.includes('delete') && (
                                                <button
                                                    onClick={() => console.log('Delete', row.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}

                </tbody>
                
                {/* Table Footer */}
                {config.enableFooter && (
                    <tfoot>
                        <tr>
                            <td colSpan={filteredColumns.length + (config.enableRowSelection ? 1 : 0) + (config.enableRowNumber ? 1 : 0) + (config.enableRowReorder ? 1 : 0) + (config.enableRowActions ? 1 : 0)} 
                                className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    {config.enablePagination && (
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <span>Showing 1-{Math.min(config.pageSize, data.length)} of {data.length}</span>
                                            <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                                                {config.pageSizeOptions.map(size => (
                                                    <option key={size} value={size}>{size} per page</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {config.enableTableTotals && (
                                        <div className="text-sm text-gray-600">
                                            Total Records: {data.length}
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>'

        </div>
    );
};



export default DataTable;

function useEffect(arg0: () => void, arg1: any[]) {
    throw new Error('Function not implemented.');
}
