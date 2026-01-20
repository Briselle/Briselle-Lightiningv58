import React, { useState, useEffect, useRef } from 'react';
import { Filter, X } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

export interface FilterCriteria {
    column: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'notEquals';
    value: string;
    logic: 'AND' | 'OR';
}

interface Action_FilterProps {
    enableFilter: boolean;
    filterButtonType: 'icon' | 'button';
    filterButtonAlign: 'left' | 'right';
    fieldMappings: Record<string, string>;
    filterCriteria: FilterCriteria[];
    onFilterCriteriaChange: (criteria: FilterCriteria[]) => void;
}

const Action_Filter: React.FC<Action_FilterProps> = ({
    enableFilter,
    filterButtonType,
    filterButtonAlign,
    fieldMappings,
    filterCriteria,
    onFilterCriteriaChange,
}) => {
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowFilterDropdown(false);
            }
        };

        if (showFilterDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFilterDropdown]);

    // Close dropdown when another button is clicked
    useEffect(() => {
        const handleButtonClick = () => {
            setShowFilterDropdown(false);
        };
        document.addEventListener('actionButtonClick', handleButtonClick);
        return () => {
            document.removeEventListener('actionButtonClick', handleButtonClick);
        };
    }, []);

    if (!enableFilter) return null;

    const addFilterCriteria = (column: string, operator: FilterCriteria['operator'], value: string, logic: 'AND' | 'OR' = 'AND') => {
        onFilterCriteriaChange([...filterCriteria, { column, operator, value, logic }]);
    };

    const removeFilterCriteria = (index: number) => {
        onFilterCriteriaChange(filterCriteria.filter((_, i) => i !== index));
    };

    const clearFilters = () => {
        onFilterCriteriaChange([]);
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
                    setShowFilterDropdown(!showFilterDropdown);
                }}
            >
                {getButtonContent(
                    <Filter size={16} />,
                    'Filter',
                    filterButtonType || 'icon'
                )}
            </button>

            {showFilterDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-80",
                        filterButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Filter
                            </div>

                            {filterCriteria.length > 0 && (
                                <button
                                    onClick={clearFilters}
                                    className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                    title="Clear all filters"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Active Filters */}
                        {filterCriteria.length > 0 && (
                            <div className="mb-3">
                                <div className="text-xs font-medium text-gray-700 mb-2">
                                    Active filters
                                </div>

                                {filterCriteria.map((filter, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded"
                                    >
                                        <span className="text-sm text-blue-700">
                                            {fieldMappings[filter.column]} {filter.operator} "{filter.value}"
                                        </span>

                                        <button
                                            onClick={() => removeFilterCriteria(index)}
                                            className="text-blue-500 hover:text-blue-700"
                                            title="Remove filter"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}

                                <div className="border-t border-gray-200 my-3"></div>
                            </div>
                        )}

                        {/* Add Filter */}
                        <div className="text-xs font-medium text-gray-700 mb-2">
                            Add filter
                        </div>

                        <div className="space-y-2">
                            <select
                                id="filter-field"
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
                                id="filter-operator"
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                defaultValue="contains"
                            >
                                <option value="contains">Contains</option>
                                <option value="equals">Equals</option>
                                <option value="startsWith">Starts with</option>
                                <option value="endsWith">Ends with</option>
                                <option value="notEquals">Not equals</option>
                                <option value="greaterThan">Greater than</option>
                                <option value="lessThan">Less than</option>
                            </select>

                            <input
                                id="filter-value"
                                type="text"
                                placeholder="Filter value…"
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            />

                            <button
                                onClick={() => {
                                    const field = (document.getElementById('filter-field') as HTMLSelectElement)?.value;
                                    const operator = (document.getElementById('filter-operator') as HTMLSelectElement)?.value as FilterCriteria['operator'];
                                    const value = (document.getElementById('filter-value') as HTMLInputElement)?.value;

                                    if (field && value) {
                                        addFilterCriteria(field, operator, value);
                                        (document.getElementById('filter-field') as HTMLSelectElement).value = '';
                                        (document.getElementById('filter-value') as HTMLInputElement).value = '';
                                    }
                                }}
                                className="w-full px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90"
                            >
                                Add filter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_Filter;
