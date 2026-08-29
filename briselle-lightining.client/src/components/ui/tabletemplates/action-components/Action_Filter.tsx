import React, { useState, useEffect, useRef } from 'react';
import { Filter, X } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

export interface FilterCriteria {
    column: string;
    operator:
        | 'equals'
        | 'contains'
        | 'startsWith'
        | 'endsWith'
        | 'greaterThan'
        | 'lessThan'
        | 'notEquals'
        | 'dateBetween';
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
    dateColumnKeys?: string[];
}

const Action_Filter: React.FC<Action_FilterProps> = ({
    enableFilter,
    filterButtonType,
    filterButtonAlign,
    fieldMappings,
    filterCriteria,
    onFilterCriteriaChange,
    dateColumnKeys = [],
}) => {
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [selectedField, setSelectedField] = useState<string>('');
    const [selectedOperator, setSelectedOperator] = useState<FilterCriteria['operator']>('contains');
    const [textValue, setTextValue] = useState<string>('');

    const [datePreset, setDatePreset] = useState<
        | 'today'
        | 'yesterday'
        | 'day_before_yesterday'
        | 'this_week'
        | 'last_week'
        | 'week_before_last'
        | 'next_week'
        | 'this_month'
        | 'last_month'
        | 'month_before_last'
        | 'next_month'
        | 'this_quarter'
        | 'last_quarter'
        | 'quarter_before_last'
        | 'next_quarter'
        | 'this_year'
        | 'last_year'
        | 'year_before_last'
        | 'next_year'
        | 'custom_range'
    >('today');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');
    const [dateError, setDateError] = useState<string | null>(null);

    const isDateField = selectedField !== '' && dateColumnKeys.includes(selectedField);

    const pad2 = (n: number) => String(n).padStart(2, '0');

    const toDateOnly = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

    const startOfISOWeek = (d: Date) => {
        // ISO week starts Monday.
        const day = d.getDay(); // 0 Sun - 6 Sat
        const diff = day === 0 ? -6 : 1 - day;
        return startOfDay(addDays(d, diff));
    };
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const startOfQuarter = (d: Date) => {
        const q = Math.floor(d.getMonth() / 3);
        return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    };
    const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);

    const getDateRange = (): { startISO: string; endISO: string; label: string } | null => {
        const now = new Date();
        if (datePreset === 'custom_range') {
            if (!customStart || !customEnd) return null;
            const s = new Date(`${customStart}T00:00:00`);
            const e = new Date(`${customEnd}T00:00:00`);
            if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
            if (s.getTime() > e.getTime()) return null;
            return { startISO: toDateOnly(startOfDay(s)), endISO: toDateOnly(startOfDay(e)), label: 'Custom Range' };
        }
        const today = startOfDay(now);
        switch (datePreset) {
            case 'today':
                return { startISO: toDateOnly(today), endISO: toDateOnly(today), label: 'Today' };
            case 'yesterday':
                return {
                    startISO: toDateOnly(startOfDay(addDays(today, -1))),
                    endISO: toDateOnly(startOfDay(addDays(today, -1))),
                    label: 'Yesterday',
                };
            case 'day_before_yesterday':
                return {
                    startISO: toDateOnly(startOfDay(addDays(today, -2))),
                    endISO: toDateOnly(startOfDay(addDays(today, -2))),
                    label: 'The day before yesterday',
                };
            case 'this_week': {
                const s = startOfISOWeek(today);
                const e = addDays(s, 6);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'This Week' };
            }
            case 'last_week': {
                const s = startOfISOWeek(addDays(today, -7));
                const e = addDays(s, 6);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'Last Week' };
            }
            case 'week_before_last': {
                const s = startOfISOWeek(addDays(today, -14));
                const e = addDays(s, 6);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'Week Before Last' };
            }
            case 'next_week': {
                const s = startOfISOWeek(addDays(today, 7));
                const e = addDays(s, 6);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'Next Week' };
            }
            case 'this_month': {
                const s = startOfMonth(today);
                const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'This Month' };
            }
            case 'last_month': {
                // Subtract months (not days) to avoid "same-month" bug.
                const s = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
                const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'Last Month' };
            }
            case 'month_before_last': {
                // Two months back (not days back).
                const s = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 2, 1));
                const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'Month Before Last' };
            }
            case 'next_month': {
                const s = startOfMonth(new Date(today.getFullYear(), today.getMonth() + 1, 1));
                const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'Next Month' };
            }
            case 'this_quarter': {
                const s = startOfQuarter(today);
                const e = new Date(s.getFullYear(), s.getMonth() + 3, 0);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'This Quarter' };
            }
            case 'last_quarter': {
                const prev = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                const s = startOfQuarter(prev);
                const e = new Date(s.getFullYear(), s.getMonth() + 3, 0);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'Last Quarter' };
            }
            case 'quarter_before_last': {
                const prev = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                const s = startOfQuarter(prev);
                const e = new Date(s.getFullYear(), s.getMonth() + 3, 0);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'The Quarter Before Last' };
            }
            case 'next_quarter': {
                const next = new Date(today.getFullYear(), today.getMonth() + 3, 1);
                const s = startOfQuarter(next);
                const e = new Date(s.getFullYear(), s.getMonth() + 3, 0);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'Next Quarter' };
            }
            case 'this_year': {
                const s = startOfYear(today);
                const e = new Date(today.getFullYear(), 11, 31);
                return { startISO: toDateOnly(s), endISO: toDateOnly(startOfDay(e)), label: 'This Year' };
            }
            case 'last_year': {
                const y = today.getFullYear() - 1;
                const s = new Date(y, 0, 1);
                const e = new Date(y, 11, 31);
                return { startISO: toDateOnly(startOfDay(s)), endISO: toDateOnly(startOfDay(e)), label: 'Last Year' };
            }
            case 'year_before_last': {
                const y = today.getFullYear() - 2;
                const s = new Date(y, 0, 1);
                const e = new Date(y, 11, 31);
                return { startISO: toDateOnly(startOfDay(s)), endISO: toDateOnly(startOfDay(e)), label: 'The Year Before Last' };
            }
            case 'next_year': {
                const y = today.getFullYear() + 1;
                const s = new Date(y, 0, 1);
                const e = new Date(y, 11, 31);
                return { startISO: toDateOnly(startOfDay(s)), endISO: toDateOnly(startOfDay(e)), label: 'Next Year' };
            }
            default:
                return null;
        }
    };

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
                                            {fieldMappings[filter.column]}{' '}
                                            {filter.operator === 'dateBetween' ? 'between' : filter.operator}{' '}
                                            {filter.operator === 'dateBetween'
                                                ? (() => {
                                                      const [s, e] = filter.value.split(',');
                                                      const sFmt = s ? String(s).slice(0, 10) : '';
                                                      const eFmt = e ? String(e).slice(0, 10) : '';
                                                      return `"${sFmt}" and "${eFmt}"`;
                                                  })()
                                                : `"${filter.value}"`}
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
                                value={selectedField}
                                onChange={(e) => {
                                    setSelectedField(e.target.value);
                                    setTextValue('');
                                    setDateError(null);
                                }}
                            >
                                <option value="">Select field…</option>
                                {Object.entries(fieldMappings).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>

                            {isDateField ? (
                                <>
                                    <select
                                        id="filter-date-preset"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        value={datePreset}
                                        onChange={(e) => {
                                            setDatePreset(e.target.value as any);
                                            setDateError(null);
                                        }}
                                    >
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="day_before_yesterday">The day before Yesterday</option>
                                        <option value="this_week">This Week</option>
                                        <option value="last_week">Last Week</option>
                                        <option value="week_before_last">Week Before Last</option>
                                        <option value="next_week">Next Week</option>
                                        <option value="this_month">This Month</option>
                                        <option value="last_month">Last Month</option>
                                        <option value="month_before_last">Month Before Last</option>
                                        <option value="next_month">Next Month</option>
                                        <option value="this_quarter">This Quarter</option>
                                        <option value="last_quarter">Last Quarter</option>
                                        <option value="quarter_before_last">The Quarter Before Last</option>
                                        <option value="next_quarter">Next Quarter</option>
                                        <option value="this_year">This Year</option>
                                        <option value="last_year">Last Year</option>
                                        <option value="year_before_last">The Year Before Last</option>
                                        <option value="next_year">Next Year</option>
                                        <option value="custom_range">CUSTOM RANGE</option>
                                    </select>

                                    {datePreset === 'custom_range' && (
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <input
                                                    type="date"
                                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                                    value={customStart}
                                                    onChange={(e) => {
                                                        setCustomStart(e.target.value);
                                                        setDateError(null);
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="date"
                                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                                    value={customEnd}
                                                    onChange={(e) => {
                                                        setCustomEnd(e.target.value);
                                                        setDateError(null);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {dateError && <p className="text-xs text-red-600">{dateError}</p>}
                                </>
                            ) : (
                                <>
                                    <select
                                        id="filter-operator"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        value={selectedOperator}
                                        onChange={(e) => {
                                            setSelectedOperator(e.target.value as any);
                                            setDateError(null);
                                        }}
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
                                        value={textValue}
                                        placeholder="Filter value…"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        onChange={(e) => setTextValue(e.target.value)}
                                    />
                                </>
                            )}

                            <button
                                onClick={() => {
                                    if (!selectedField) return;

                                    if (isDateField) {
                                        const range = getDateRange();
                                        if (!range) {
                                            setDateError('Please select valid dates for the chosen range.');
                                            return;
                                        }
                                        const value = `${range.startISO},${range.endISO}`;
                                        addFilterCriteria(selectedField, 'dateBetween', value);
                                        setSelectedField('');
                                        setTextValue('');
                                        setDatePreset('today');
                                        setCustomStart('');
                                        setCustomEnd('');
                                        setDateError(null);
                                        setSelectedOperator('contains');
                                        return;
                                    }

                                    if (textValue.trim()) {
                                        addFilterCriteria(selectedField, selectedOperator, textValue.trim());
                                        setSelectedField('');
                                        setTextValue('');
                                        setDateError(null);
                                        setSelectedOperator('contains');
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
