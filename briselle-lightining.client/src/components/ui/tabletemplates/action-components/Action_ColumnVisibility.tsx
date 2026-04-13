import React, { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { Eye, EyeOff, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

const MIN_COL_PX = 80;
const MAX_COL_PX = 4000;

/** Width in px; placeholder “Auto” when empty. Unit “px” to the right of the input. */
const ColumnWidthPxInput: React.FC<{
    colKey: string;
    widthPx?: number;
    onCommit: (px: number | null) => void;
}> = ({ colKey, widthPx, onCommit }) => {
    const [text, setText] = useState(widthPx != null ? String(widthPx) : '');

    useEffect(() => {
        setText(widthPx != null ? String(widthPx) : '');
    }, [widthPx, colKey]);

    return (
        <div className="flex flex-row items-center gap-0.5 shrink-0">
            <input
                type="number"
                min={MIN_COL_PX}
                max={MAX_COL_PX}
                placeholder="Auto"
                className={cn(
                    'h-[1.375rem] w-[2.592rem] min-w-[2.592rem] shrink-0 rounded border border-gray-300 bg-white px-1 py-0',
                    'text-xs tabular-nums text-gray-800 text-center outline-none ring-0 focus:border-gray-400 focus:ring-1 focus:ring-gray-300',
                    'placeholder:text-gray-400 placeholder:font-normal',
                    '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                )}
                value={text}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                    e.stopPropagation();
                    const v = e.target.value;
                    setText(v);
                    const t = v.trim();
                    if (t === '') {
                        onCommit(null);
                        return;
                    }
                    const n = Number(t);
                    if (Number.isFinite(n) && n >= MIN_COL_PX && n <= MAX_COL_PX) {
                        onCommit(Math.round(n));
                    }
                }}
                onBlur={() => {
                    const t = text.trim();
                    if (!t) {
                        onCommit(null);
                        setText('');
                        return;
                    }
                    const n = Number(t);
                    if (!Number.isFinite(n)) {
                        setText(widthPx != null ? String(widthPx) : '');
                        return;
                    }
                    const c = Math.min(MAX_COL_PX, Math.max(MIN_COL_PX, Math.round(n)));
                    setText(String(c));
                    onCommit(c);
                }}
                title="Automatic column width when empty. Or enter pixels (80–4000)."
                aria-label="Column width in pixels; leave empty for automatic width"
            />
            <span className="text-xs text-gray-600 whitespace-nowrap leading-none" title="pixels">
                px
            </span>
        </div>
    );
};

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
    columnWidths: Record<string, number>;
    onColumnWidthsChange: Dispatch<SetStateAction<Record<string, number>>>;
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
    columnWidths,
    onColumnWidthsChange,
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
        onColumnWidthsChange((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const MIN_PX = 80;
    const MAX_PX = 4000;

    const commitColumnWidthPx = (key: string, raw: string) => {
        const t = raw.trim();
        if (!t) {
            onColumnWidthsChange((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            return;
        }
        const num = Number(t);
        if (!Number.isFinite(num)) return;
        const clamped = Math.min(MAX_PX, Math.max(MIN_PX, Math.round(num)));
        onColumnWidthsChange((prev) => ({ ...prev, [key]: clamped }));
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
                        'absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[22.4rem] max-w-[95vw]',
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
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">
                                    Active columns in view
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onActiveColumnsChange(activeColumns);
                                        onVisibleColumnsChange(visibleColumns);
                                        setShowColumnDropdown(false);
                                    }}
                                    className="text-xs px-2 py-1 bg-primary text-white rounded hover:opacity-90"
                                >
                                    Apply
                                </button>
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {activeColumns.map((key, index) => {
                                    const isOnlyOne = activeColumns.length === 1;
                                    const isVisible = visibleColumns.includes(key);

                                    return (
                                        <div
                                            key={key}
                                            className="flex items-start gap-2 p-2 bg-blue-50 rounded min-w-0"
                                        >
                                            <span className="text-sm text-blue-700 min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug pr-1">
                                                {fieldMappings[key] ?? key}
                                            </span>

                                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end self-start pt-0.5">
                                                {isVisible ? (
                                                    <ColumnWidthPxInput
                                                        colKey={key}
                                                        widthPx={columnWidths[key]}
                                                        onCommit={(px) => commitWidthForKey(key, px)}
                                                    />
                                                ) : (
                                                    <span className="text-xs text-gray-400 w-[3.42rem] shrink-0 text-center leading-[1.375rem]">
                                                        —
                                                    </span>
                                                )}

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
                                                    type="button"
                                                >
                                                    <X size={14} />
                                                </button>

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
                                                    type="button"
                                                >
                                                    {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveActiveColumn(key, 'up');
                                                    }}
                                                    disabled={index === 0}
                                                    className="text-gray-500 hover:text-primary disabled:text-gray-300"
                                                    title="Move up"
                                                    type="button"
                                                >
                                                    <ChevronUp size={14} />
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveActiveColumn(key, 'down');
                                                    }}
                                                    disabled={index === activeColumns.length - 1}
                                                    className="text-gray-500 hover:text-primary disabled:text-gray-300"
                                                    title="Move down"
                                                    type="button"
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
