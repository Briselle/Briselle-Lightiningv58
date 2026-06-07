import React, { useState } from 'react';
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
}) => {
    const [showFreezePaneDropdown, setShowFreezePaneDropdown] = useState(false);

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
        <div className="relative">
            <button
                className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                onClick={(e) => {
                    e.stopPropagation();
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

                        {/* Freeze First Column */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                                Freeze First Column
                            </span>
                            <ToggleSwitch
                                checked={enablefreezePaneColumnIndex}
                                onChange={(value) => {
                                    console.log('[FreezePane] Column →', value);
                                    onConfigChange({
                                        ...config,
                                        enablefreezePaneColumnIndex: value,
                                    });
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_FreezePane;
