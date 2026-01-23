import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface Action_TableLayoutSetupProps {
    enableTableLayoutSetup: boolean;
    tableLayoutSetupButtonType: 'icon' | 'button';
    tableLayoutSetupButtonAlign: 'left' | 'right';
    config: Record<string, any>;
    onConfigChange: (partial: Record<string, any>) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                checked ? 'bg-blue-600' : 'bg-gray-200'
            )}
        >
            <span
                className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow mt-0.5 transition-transform',
                    checked ? 'translate-x-4' : 'translate-x-0.5'
                )}
            />
        </button>
    );
}

const Action_TableLayoutSetup: React.FC<Action_TableLayoutSetupProps> = ({
    enableTableLayoutSetup,
    tableLayoutSetupButtonType,
    tableLayoutSetupButtonAlign,
    config,
    onConfigChange,
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
        };
        if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    useEffect(() => {
        const close = () => setShowDropdown(false);
        document.addEventListener('actionButtonClick', close);
        return () => document.removeEventListener('actionButtonClick', close);
    }, []);

    if (!enableTableLayoutSetup) return null;

    const update = (updates: Record<string, any>) => onConfigChange({ ...config, ...updates });

    const getButtonContent = (icon: React.ReactNode, text: string, buttonType: 'icon' | 'button') =>
        buttonType === 'button' ? <span className="flex items-center">{icon}<span className="ml-2">{text}</span></span> : icon;

    const section = (title: string, children: React.ReactNode) => (
        <div className="mb-3 last:mb-0">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{title}</div>
            <div className="space-y-2">{children}</div>
        </div>
    );

    const row = (label: string, control: React.ReactNode) => (
        <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{label}</span>
            {control}
        </div>
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('actionButtonClick'));
                    setShowDropdown((b) => !b);
                }}
                className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
            >
                {getButtonContent(<LayoutGrid size={16} />, 'Layout', tableLayoutSetupButtonType || 'icon')}
            </button>
            {showDropdown && (
                <div
                    className={cn(
                        'absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-72',
                        tableLayoutSetupButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Table Layout Setup</div>
                        {section('View', (
                            <>
                                {row('Table Row View', (
                                    <select
                                        className="text-sm border border-gray-300 rounded px-2 py-1 w-36"
                                        value={config.tableView || 'default'}
                                        onChange={(e) => update({ tableView: e.target.value })}
                                    >
                                        <option value="default">Default</option>
                                        <option value="compact">Compact</option>
                                        <option value="comfortable">Comfortable</option>
                                        <option value="spacious">Spacious</option>
                                    </select>
                                ))}
                                {row('Striped Rows', <Toggle checked={!!config.enableStripedRows} onChange={(v) => update({ enableStripedRows: v })} />)}
                            </>
                        ))}
                        {section('Divider', (
                            <>
                                {row('Row', <Toggle checked={!!config.enableRowDivider} onChange={(v) => update({ enableRowDivider: v })} />)}
                                {row('Column', <Toggle checked={!!config.enableColumnDivider} onChange={(v) => update({ enableColumnDivider: v })} />)}
                            </>
                        ))}
                        {section('Re-order', (
                            <>
                                {row('Row', <Toggle checked={!!config.enableRowReorder} onChange={(v) => update({ enableRowReorder: v })} />)}
                                {row('Column', <Toggle checked={!!config.enableColumnReorder} onChange={(v) => update({ enableColumnReorder: v })} />)}
                            </>
                        ))}
                        {section('Resize', (
                            <>
                                {row('Row', <Toggle checked={!!config.enableRowResize} onChange={(v) => update({ enableRowResize: v })} />)}
                                {row('Column', <Toggle checked={!!config.enableColumnResize} onChange={(v) => update({ enableColumnResize: v })} />)}
                            </>
                        ))}
                        {section('Hover Highlight', (
                            <>
                                {row('Row', <Toggle checked={!!config.enableRowHoverHighlight} onChange={(v) => update({ enableRowHoverHighlight: v })} />)}
                                {row('Column', <Toggle checked={!!config.enableColumnHover} onChange={(v) => update({ enableColumnHover: v })} />)}
                            </>
                        ))}
                        {section('Index', (
                            row('Row Numbers', (
                                <Toggle checked={!!config.enableRowNumber} onChange={(v) => update({ enableRowNumber: v })} />
                            ))
                        ))}
                        {section('Table Background', (
                            <>
                                {row('Table Background', (
                                    <Toggle checked={!!config.tableBackground} onChange={(v) => update({ tableBackground: v })} />
                                ))}
                                {config.tableBackground && (
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                        <input
                                            type="color"
                                            value={config.tableBackgroundColor || '#ffffff'}
                                            onChange={(e) => update({ tableBackgroundColor: e.target.value })}
                                            className="w-8 h-8 rounded border border-gray-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => update({ tableBackgroundColor: '#ffffff' })}
                                            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_TableLayoutSetup;
