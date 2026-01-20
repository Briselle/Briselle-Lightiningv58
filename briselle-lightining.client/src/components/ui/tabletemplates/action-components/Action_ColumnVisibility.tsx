import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface Action_ColumnVisibilityProps {
    enableColumnVisibility: boolean;
    columnVisibilityButtonType: 'icon' | 'button';
    columnVisibilityButtonAlign: 'left' | 'right';
    fieldMappings: Record<string, string>;
    allColumns: string[];
    activeColumns: string[];
    visibleColumns: string[];
    onActiveColumnsChange: (columns: string[]) => void;
    onVisibleColumnsChange: (columns: string[]) => void;
}

const Action_ColumnVisibility: React.FC<Action_ColumnVisibilityProps> = ({
    enableColumnVisibility,
    columnVisibilityButtonType,
    columnVisibilityButtonAlign,
    fieldMappings,
    allColumns,
    activeColumns,
    visibleColumns,
    onActiveColumnsChange,
    onVisibleColumnsChange,
}) => {
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowColumnDropdown(false);
            }
        };

        if (showColumnDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showColumnDropdown]);

    // Close dropdown when another button is clicked
    useEffect(() => {
        const handleButtonClick = () => {
            setShowColumnDropdown(false);
        };
        document.addEventListener('actionButtonClick', handleButtonClick);
        return () => {
            document.removeEventListener('actionButtonClick', handleButtonClick);
        };
    }, []);

    if (!enableColumnVisibility) return null;

    const toggleColumnVisibility = (key: string) => {
        const newVisibleColumns = visibleColumns.includes(key)
            ? visibleColumns.filter(col => col !== key)
            : [...visibleColumns, key];
        
        // Minimum 1 visible column must remain
        if (newVisibleColumns.length === 0) return;
        
        onVisibleColumnsChange(newVisibleColumns);
    };

    const removeColumn = (key: string) => {
        if (activeColumns.length === 1) return;
        
        onActiveColumnsChange(activeColumns.filter(col => col !== key));
        onVisibleColumnsChange(visibleColumns.filter(col => col !== key));
    };

    const addColumn = (key: string) => {
        if (activeColumns.includes(key)) return;
        
        onActiveColumnsChange([...activeColumns, key]);
        onVisibleColumnsChange([...visibleColumns, key]);
    };

    const resetColumns = () => {
        if (!allColumns.length) return;
        onActiveColumnsChange([allColumns[0]]);
        onVisibleColumnsChange([allColumns[0]]);
    };

    const loadAllColumns = () => {
        onActiveColumnsChange(allColumns);
        onVisibleColumnsChange(allColumns);
    };

    const getPreferredColumns = () => {
        return Object.entries(fieldMappings)
            .filter(([, value]) => typeof value === 'object' && (value as any).preferred)
            .map(([key]) => key);
    };

    const loadPreferredColumns = () => {
        const preferred = getPreferredColumns();
        if (!preferred.length) {
            alert('No preferred columns found');
            return;
        }
        onActiveColumnsChange(preferred);
        onVisibleColumnsChange(preferred);
    };

    const moveActiveColumn = (key: string, direction: 'up' | 'down') => {
        const index = activeColumns.indexOf(key);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= activeColumns.length) return;

        const next = [...activeColumns];
        [next[index], next[newIndex]] = [next[newIndex], next[index]];
        onActiveColumnsChange(next);

        // Keep visibleColumns order in sync
        const visIndex = visibleColumns.indexOf(key);
        if (visIndex !== -1) {
            const visNext = [...visibleColumns];
            const visNewIndex = direction === 'up' ? visIndex - 1 : visIndex + 1;
            if (visNewIndex >= 0 && visNewIndex < visibleColumns.length) {
                [visNext[visIndex], visNext[visNewIndex]] = [visNext[visNewIndex], visNext[visIndex]];
                onVisibleColumnsChange(visNext);
            }
        }
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
                    setShowColumnDropdown(prev => !prev);
                }}
            >
                {getButtonContent(
                    <Eye size={16} />,
                    'Columns',
                    columnVisibilityButtonType || 'icon'
                )}
            </button>

            {showColumnDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-72",
                        columnVisibilityButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Columns
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        loadAllColumns();
                                    }}
                                    className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-400"
                                >
                                    Load All
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        loadPreferredColumns();
                                    }}
                                    className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-400"
                                >
                                    Preferred
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        resetColumns();
                                    }}
                                    className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-400"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Active columns in view */}
                        <div className="mb-3">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                                Active columns in view
                            </div>

                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {activeColumns.map((key, index) => {
                                    const isOnlyOne = activeColumns.length === 1;
                                    const isVisible = visibleColumns.includes(key);

                                    return (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between p-2 bg-blue-50 rounded"
                                        >
                                            <span className="text-sm text-blue-700">
                                                {fieldMappings[key] ?? key}
                                            </span>

                                            <div className="flex items-center gap-2">
                                                {/* Eye toggle */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleColumnVisibility(key);
                                                    }}
                                                    disabled={isOnlyOne && isVisible}
                                                    className={cn(
                                                        isOnlyOne && isVisible
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-blue-600 hover:text-blue-800'
                                                    )}
                                                    title="Show / Hide column"
                                                >
                                                    {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>

                                                {/* Close */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeColumn(key);
                                                    }}
                                                    disabled={isOnlyOne}
                                                    className={cn(
                                                        isOnlyOne
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-blue-600 hover:text-blue-800'
                                                    )}
                                                    title="Remove column"
                                                >
                                                    <X size={14} />
                                                </button>

                                                {/* Move up */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveActiveColumn(key, 'up');
                                                    }}
                                                    disabled={index === 0}
                                                    className="text-gray-500 hover:text-primary disabled:text-gray-300"
                                                    title="Move up"
                                                >
                                                    <ChevronUp size={14} />
                                                </button>

                                                {/* Move down */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveActiveColumn(key, 'down');
                                                    }}
                                                    disabled={index === activeColumns.length - 1}
                                                    className="text-gray-500 hover:text-primary disabled:text-gray-300"
                                                    title="Move down"
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="border-t border-gray-200 my-3"></div>
                        </div>

                        {/* Add column */}
                        <div className="text-xs font-medium text-gray-700 mb-2">
                            Add column
                        </div>

                        <select
                            id="add-column-select"
                            className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">Select column…</option>
                            {allColumns
                                .filter(col => !activeColumns.includes(col))
                                .map(col => (
                                    <option key={col} value={col}>
                                        {fieldMappings[col] ?? col}
                                    </option>
                                ))}
                        </select>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const el = document.getElementById('add-column-select') as HTMLSelectElement;
                                if (el?.value) {
                                    addColumn(el.value);
                                    el.value = '';
                                }
                            }}
                            className="w-full px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90"
                        >
                            Add Column
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_ColumnVisibility;
