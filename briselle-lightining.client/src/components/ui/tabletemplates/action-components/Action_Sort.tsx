import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpDown, SortAsc, SortDesc, X } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

export interface SortCriteria {
    column: string;
    order: 'asc' | 'desc';
}

interface Action_SortProps {
    enableSort: boolean;
    sortButtonType: 'icon' | 'button';
    sortButtonAlign: 'left' | 'right';
    fieldMappings: Record<string, string>;
    sortCriteria: SortCriteria[];
    onSortCriteriaChange: (criteria: SortCriteria[]) => void;
}

const Action_Sort: React.FC<Action_SortProps> = ({
    enableSort,
    sortButtonType,
    sortButtonAlign,
    fieldMappings,
    sortCriteria,
    onSortCriteriaChange,
}) => {
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSortDropdown(false);
            }
        };

        if (showSortDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSortDropdown]);

    // Close dropdown when another button is clicked (handled by parent)
    useEffect(() => {
        const handleButtonClick = () => {
            setShowSortDropdown(false);
        };
        document.addEventListener('actionButtonClick', handleButtonClick);
        return () => {
            document.removeEventListener('actionButtonClick', handleButtonClick);
        };
    }, []);

    if (!enableSort) return null;

    const addSortCriteria = (column: string, order: 'asc' | 'desc') => {
        const existingIndex = sortCriteria.findIndex(s => s.column === column);
        if (existingIndex >= 0) {
            const newCriteria = [...sortCriteria];
            newCriteria[existingIndex].order = order;
            onSortCriteriaChange(newCriteria);
        } else {
            if (sortCriteria.length >= 3) return;
            onSortCriteriaChange([...sortCriteria, { column, order }]);
        }
    };

    const removeSortCriteria = (column: string) => {
        onSortCriteriaChange(sortCriteria.filter(s => s.column !== column));
    };

    const clearSort = () => {
        onSortCriteriaChange([]);
    };

    const getButtonContent = (icon: React.ReactNode, text: string, buttonType: 'icon' | 'button') => {
        if (buttonType === 'button') {
            return (
                <span className="flex items-center">
                    {icon}
                    <span className="ml-2">{text}</span>
                </span>
            );
        }
        return icon;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                onClick={(e) => {
                    e.stopPropagation();
                    // Dispatch event to close other dropdowns
                    document.dispatchEvent(new CustomEvent('actionButtonClick'));
                    setShowSortDropdown(!showSortDropdown);
                }}
            >
                {getButtonContent(
                    <ArrowUpDown size={16} />,
                    'Sort',
                    sortButtonType || 'icon'
                )}
            </button>

            {showSortDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-72",
                        sortButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                            Sort
                        </div>

                        {/* Active Sorts */}
                        {sortCriteria.length > 0 && (
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs font-medium text-gray-700 mb-2">
                                        Active Sort
                                    </div>

                                    {sortCriteria.length > 0 && (
                                        <button
                                            onClick={clearSort}
                                            className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                            title="Clear all sorting"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>

                                {sortCriteria.map((sort) => (
                                    <div
                                        key={sort.column}
                                        className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded"
                                    >
                                        <span className="text-sm text-blue-700">
                                            {fieldMappings[sort.column]}
                                        </span>

                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => addSortCriteria(sort.column, 'asc')}
                                                className={cn(
                                                    "p-1 rounded",
                                                    sort.order === 'asc'
                                                        ? 'bg-blue-200 text-blue-800'
                                                        : 'text-gray-500 hover:bg-blue-100'
                                                )}
                                                title="Ascending"
                                            >
                                                <SortAsc size={14} />
                                            </button>

                                            <button
                                                onClick={() => addSortCriteria(sort.column, 'desc')}
                                                className={cn(
                                                    "p-1 rounded",
                                                    sort.order === 'desc'
                                                        ? 'bg-blue-200 text-blue-800'
                                                        : 'text-gray-500 hover:bg-blue-100'
                                                )}
                                                title="Descending"
                                            >
                                                <SortDesc size={14} />
                                            </button>

                                            <button
                                                onClick={() => removeSortCriteria(sort.column)}
                                                className="p-1 text-blue-600 hover:text-blue-800"
                                                title="Remove"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="border-t border-gray-200 my-3"></div>
                            </div>
                        )}

                        {/* Add Sort */}
                        <div className="text-xs font-medium text-gray-700 mb-2">
                            Add sort
                        </div>

                        <div className="space-y-2">
                            <select
                                id="sort-field"
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            >
                                <option value="">Select field…</option>
                                {Object.entries(fieldMappings).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>

                            <select
                                id="sort-order"
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                defaultValue="asc"
                            >
                                <option value="asc">A → Z</option>
                                <option value="desc">Z → A</option>
                            </select>

                            <button
                                onClick={() => {
                                    if (sortCriteria.length >= 3) return;

                                    const field = (document.getElementById('sort-field') as HTMLSelectElement)?.value;
                                    const order = (document.getElementById('sort-order') as HTMLSelectElement)?.value as 'asc' | 'desc';

                                    if (field) {
                                        addSortCriteria(field, order);
                                        (document.getElementById('sort-field') as HTMLSelectElement).value = '';
                                        (document.getElementById('sort-order') as HTMLSelectElement).value = 'asc';
                                    }
                                }}
                                disabled={sortCriteria.length >= 3}
                                className={cn(
                                    "w-full px-3 py-2 text-sm rounded transition-colors",
                                    sortCriteria.length >= 3
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-primary text-white hover:bg-primary/90'
                                )}
                                title={sortCriteria.length >= 3 ? 'Maximum of 3 sort fields allowed' : 'Add sort'}
                            >
                                Add sort
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_Sort;
