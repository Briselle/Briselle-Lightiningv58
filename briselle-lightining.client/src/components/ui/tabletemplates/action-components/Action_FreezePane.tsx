import React, { useState, useEffect, useRef } from 'react';
import { PanelsTopLeft } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface Action_FreezePaneProps {
    enableFreezePane: boolean;
    freezePaneType: 'icon' | 'button';
    freezePaneAlign: 'left' | 'right';
    enableFreezePaneRowHeader: boolean;
    enablefreezePaneColumnIndex: boolean;
    freezePaneColumnIndexNo: number;
    onConfigChange: (partial: any) => void;
    config: any;
    maxColumnIndex?: number; // Maximum column index (visible columns count + 1 for checkbox)
}

const ToggleSwitch = ({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
}) => (
    <button
        onClick={() => onChange(!checked)}
        className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            checked ? 'bg-blue-600' : 'bg-gray-300'
        )}
    >
        <span
            className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                checked ? 'translate-x-4' : 'translate-x-1'
            )}
        />
    </button>
);

const Action_FreezePane: React.FC<Action_FreezePaneProps> = ({
    enableFreezePane,
    freezePaneType,
    freezePaneAlign,
    enableFreezePaneRowHeader,
    enablefreezePaneColumnIndex,
    freezePaneColumnIndexNo,
    onConfigChange,
    config,
    maxColumnIndex,
}) => {
    const [showFreezePaneDropdown, setShowFreezePaneDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Clamp freezePaneColumnIndexNo when maxColumnIndex changes
    useEffect(() => {
        if (maxColumnIndex && maxColumnIndex > 0 && enablefreezePaneColumnIndex) {
            const currentIndex = freezePaneColumnIndexNo || 1;
            if (currentIndex > maxColumnIndex) {
                onConfigChange({
                    ...config,
                    freezePaneColumnIndexNo: maxColumnIndex,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxColumnIndex]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowFreezePaneDropdown(false);
            }
        };

        if (showFreezePaneDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFreezePaneDropdown]);

    // Close dropdown when another button is clicked
    useEffect(() => {
        const handleButtonClick = () => {
            setShowFreezePaneDropdown(false);
        };
        document.addEventListener('actionButtonClick', handleButtonClick);
        return () => {
            document.removeEventListener('actionButtonClick', handleButtonClick);
        };
    }, []);

    if (!enableFreezePane) return null;

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
                    setShowFreezePaneDropdown(prev => !prev);
                }}
            >
                {getButtonContent(
                    <PanelsTopLeft size={16} />,
                    'Freeze',
                    freezePaneType || 'icon'
                )}
            </button>

            {showFreezePaneDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64",
                        freezePaneAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Freeze Pane
                            </div>

                            {/* Clear All */}
                            <button
                                onClick={() => {
                                    console.log('[FreezePane] Clear All');
                                    onConfigChange({
                                        ...config,
                                        enableFreezePaneRowHeader: false,
                                        enablefreezePaneColumnIndex: false,
                                        freezePaneColumnIndexNo: 1, // Reset to default
                                    });
                                }}
                                className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="border-t border-gray-200" />

                        {/* Freeze Header */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                                Freeze Header
                            </span>
                            <ToggleSwitch
                                checked={enableFreezePaneRowHeader}
                                onChange={(value) => {
                                    console.log('[FreezePane] Header →', value);
                                    onConfigChange({
                                        ...config,
                                        enableFreezePaneRowHeader: value,
                                    });
                                }}
                            />
                        </div>

                        {/* Freeze Column */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                                Freeze Column
                            </span>
                            <div className="flex items-center gap-2">
                                {/* Column Index Input - shown when freeze column is enabled */}
                                {enablefreezePaneColumnIndex && (
                                    <div className="relative flex items-center">
                                        <label className="absolute -top-3 left-0 text-[10px] text-gray-500 whitespace-nowrap pointer-events-none">
                                            Index
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={maxColumnIndex && maxColumnIndex > 0 ? maxColumnIndex : undefined}
                                            step="1"
                                            value={freezePaneColumnIndexNo || 1}
                                            onChange={(e) => {
                                                const inputValue = e.target.value;
                                                // Allow empty string during typing
                                                if (inputValue === '') {
                                                    return;
                                                }
                                                const value = parseInt(inputValue, 10);
                                                // Check if it's a valid number
                                                if (isNaN(value)) {
                                                    return;
                                                }
                                                const maxVal = (maxColumnIndex && maxColumnIndex > 0) ? maxColumnIndex : 999; // Use 999 as fallback if maxColumnIndex is not set
                                                // Always clamp value between 1 and maxVal
                                                const clampedValue = Math.max(1, Math.min(value, maxVal));
                                                
                                                
                                                // Update with clamped value
                                                onConfigChange({
                                                    ...config,
                                                    freezePaneColumnIndexNo: clampedValue,
                                                });
                                            }}
                                            onKeyDown={(e) => {
                                                // Prevent arrow keys from exceeding bounds
                                                const currentValue = freezePaneColumnIndexNo || 1;
                                                const maxVal = (maxColumnIndex && maxColumnIndex > 0) ? maxColumnIndex : 999;
                                                if (e.key === 'ArrowUp' && currentValue >= maxVal) {
                                                    e.preventDefault();
                                                } else if (e.key === 'ArrowDown' && currentValue <= 1) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // Ensure value is within bounds on blur
                                                const value = parseInt(e.target.value, 10);
                                                const maxVal = (maxColumnIndex && maxColumnIndex > 0) ? maxColumnIndex : 999;
                                                if (isNaN(value) || value < 1) {
                                                    onConfigChange({
                                                        ...config,
                                                        freezePaneColumnIndexNo: 1,
                                                    });
                                                } else if (value > maxVal && maxVal > 0) {
                                                    onConfigChange({
                                                        ...config,
                                                        freezePaneColumnIndexNo: maxVal,
                                                    });
                                                }
                                            }}
                                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="1"
                                        />
                                    </div>
                                )}
                                <ToggleSwitch
                                    checked={enablefreezePaneColumnIndex}
                                    onChange={(value) => {
                                        console.log('[FreezePane] Column →', value);
                                        onConfigChange({
                                            ...config,
                                            enablefreezePaneColumnIndex: value,
                                            freezePaneColumnIndexNo: value ? (freezePaneColumnIndexNo || 1) : freezePaneColumnIndexNo,
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_FreezePane;
