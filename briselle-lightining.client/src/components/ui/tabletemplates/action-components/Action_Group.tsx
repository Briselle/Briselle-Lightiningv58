import React, { useState, useEffect, useRef } from 'react';
import { Group, X } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface Action_GroupProps {
    enableGroup: boolean;
    groupButtonType: 'icon' | 'button';
    groupButtonAlign: 'left' | 'right';
    fieldMappings: Record<string, string>;
    groupByColumn: string | null;
    onGroupByColumnChange: (column: string | null) => void;
}

const Action_Group: React.FC<Action_GroupProps> = ({
    enableGroup,
    groupButtonType,
    groupButtonAlign,
    fieldMappings,
    groupByColumn,
    onGroupByColumnChange,
}) => {
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowGroupDropdown(false);
            }
        };

        if (showGroupDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showGroupDropdown]);

    // Close dropdown when another button is clicked
    useEffect(() => {
        const handleButtonClick = () => {
            setShowGroupDropdown(false);
        };
        document.addEventListener('actionButtonClick', handleButtonClick);
        return () => {
            document.removeEventListener('actionButtonClick', handleButtonClick);
        };
    }, []);

    if (!enableGroup) return null;

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
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    // Dispatch event to close other dropdowns
                    document.dispatchEvent(new CustomEvent('actionButtonClick'));
                    setShowGroupDropdown(prev => !prev);
                }}
                className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
            >
                {getButtonContent(
                    <Group size={16} />,
                    'Group',
                    groupButtonType || 'icon'
                )}
            </button>

            {showGroupDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-72",
                        groupButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Group
                            </div>

                            {groupByColumn && (
                                <button
                                    onClick={() => onGroupByColumnChange(null)}
                                    className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:border-gray-400"
                                    title="Clear grouping"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Active Group */}
                        {groupByColumn && (
                            <div className="mb-3">
                                <div className="text-xs font-medium text-gray-700 mb-2">
                                    Active group
                                </div>

                                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                                    <span className="text-sm text-purple-700">
                                        {fieldMappings[groupByColumn]}
                                    </span>

                                    <button
                                        onClick={() => onGroupByColumnChange(null)}
                                        className="text-purple-600 hover:text-purple-800"
                                        title="Remove grouping"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="border-t border-gray-200 my-3"></div>
                            </div>
                        )}

                        {/* Add Group */}
                        <div className="text-xs font-medium text-gray-700 mb-2">
                            Add group
                        </div>

                        <div className="space-y-2">
                            <select
                                id="group-field"
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                defaultValue=""
                            >
                                <option value="">Select field…</option>
                                {Object.entries(fieldMappings).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>

                            <button
                                disabled={!!groupByColumn}
                                onClick={() => {
                                    if (groupByColumn) return;

                                    const field = (document.getElementById('group-field') as HTMLSelectElement)?.value;

                                    if (field) {
                                        onGroupByColumnChange(field);
                                        (document.getElementById('group-field') as HTMLSelectElement).value = '';
                                    }
                                }}
                                className={cn(
                                    "w-full px-3 py-2 text-sm rounded",
                                    groupByColumn
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-primary text-white hover:bg-primary/90'
                                )}
                            >
                                Add group
                            </button>

                            {groupByColumn && (
                                <div className="text-xs text-gray-500">
                                    Only one group can be applied at a time.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_Group;
