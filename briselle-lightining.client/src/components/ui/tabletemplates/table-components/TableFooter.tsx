import React from 'react';
import { cn } from '../../../../utils/helpers';

interface TableFooterProps {
    enableFooter: boolean;
    enableTableTotals: boolean;
    enablePagination: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
    totalRecords: number;
    currentPage?: number;
    onPageSizeChange?: (size: number) => void;
    onPageChange?: (page: number) => void;
}

const TableFooter: React.FC<TableFooterProps> = ({
    enableFooter,
    enableTableTotals,
    enablePagination,
    pageSize = 25,
    pageSizeOptions = [10, 25, 50, 100],
    totalRecords,
    currentPage = 1,
    onPageSizeChange,
    onPageChange,
}) => {
    if (!enableFooter) return null;

    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);

    return (
        <tfoot>
            <tr>
                <td
                    colSpan={100}
                    className="px-4 py-3 bg-gray-50 border-t border-gray-200"
                >
                    <div className="flex items-center justify-between">
                        {enablePagination && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span>
                                    Showing {startRecord}-{endRecord} of {totalRecords}
                                </span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                >
                                    {pageSizeOptions.map(size => (
                                        <option key={size} value={size}>
                                            {size} per page
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {enableTableTotals && (
                            <div className="text-sm text-gray-600">
                                Total Records: {totalRecords}
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        </tfoot>
    );
};

export default TableFooter;
