import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface Action_TableLayoutSetupProps {
    enableTableLayoutSetup: boolean;
    tableLayoutSetupButtonType: 'icon' | 'button';
    tableLayoutSetupButtonAlign: 'left' | 'right';
    config: Record<string, unknown>;
    onConfigChange: (partial: Record<string, unknown>) => void;
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

    const update = (updates: Record<string, unknown>) => onConfigChange({ ...config, ...updates });

    const getButtonContent = (icon: React.ReactNode, text: string, buttonType: 'icon' | 'button') =>
        buttonType === 'button' ? <span className="flex items-center">{icon}<span className="ml-2">{text}</span></span> : icon;

    const gridClass = 'grid gap-2 sm:gap-4 items-center [grid-template-columns:minmax(0,1fr)_minmax(72px,auto)_minmax(72px,auto)]';
    const headerRowClass = `${gridClass} py-2 border-b border-gray-200`;
    const dataRowClass = `${gridClass} py-2 border-b border-gray-100 last:border-b-0`;

    const matrixRow = (featureName: string, rowControl?: React.ReactNode, columnControl?: React.ReactNode) => (
        <div key={featureName} className={dataRowClass}>
            <div className="text-sm font-medium text-gray-700 min-w-0">{featureName}</div>
            <div className="flex items-center justify-start min-w-0">{rowControl ?? null}</div>
            <div className="flex items-center justify-start min-w-0">{columnControl ?? null}</div>
        </div>
    );

    const cfg = config as Record<string, unknown>;

    const setTableBackground = (v: boolean) => update({ tableBackground: v });
    const setStripedRows = (v: boolean) => update({ enableStripedRows: v });
    const setRowDivider = (v: boolean) => update({ enableRowDivider: v });
    const setColumnDivider = (v: boolean) => update({ enableColumnDivider: v });
    const setRowReorder = (v: boolean) => update({ enableRowReorder: v });
    const setColumnReorder = (v: boolean) => update({ enableColumnReorder: v });
    const setRowResize = (v: boolean) => update({ enableRowResize: v });
    const setColumnResize = (v: boolean) => update({ enableColumnResize: v });
    const setRowHover = (v: boolean) => update({ enableRowHoverHighlight: v });
    const setColumnHover = (v: boolean) => update({ enableColumnHover: v });
    const setRowNumber = (v: boolean) => update({ enableRowNumber: v });
    const setRowSelection = (v: boolean) => update({ enableRowSelection: v });
    const setTableCellSelection = (v: boolean) => update({ enableTableCellSelection: v });
    const setRowActions = (v: boolean) => update({ enableRowActions: v });
    const setTableView = (value: string) => update({ tableView: value });
    const setTableBackgroundColor = (value: string) => update({ tableBackgroundColor: value });

    const tableBgToggle = React.createElement(Toggle, {
        checked: !!cfg.tableBackground,
        onChange: setTableBackground,
    });

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
                        'absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[380px] min-w-[360px]',
                        tableLayoutSetupButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Table Layout Setup</div>
                        <div className="space-y-0">
                            <div className={headerRowClass}>
                                <div className="text-xs font-medium text-gray-500 uppercase">Feature</div>
                                <div className="text-xs font-medium text-gray-500 uppercase">Row</div>
                                <div className="text-xs font-medium text-gray-500 uppercase">Column</div>
                            </div>
                            {matrixRow('Table Row View', (
                                <select
                                    className="text-sm border border-gray-300 rounded px-2 py-1 w-full max-w-[140px]"
                                    value={(cfg.tableView as string) || 'default'}
                                    onChange={(e) => setTableView(e.target.value)}
                                >
                                    <option value="default">Default</option>
                                    <option value="max-compact">Max-compact</option>
                                    <option value="compact">Compact</option>
                                    <option value="comfortable">Comfortable</option>
                                    <option value="spacious">Spacious</option>
                                </select>
                            ))}
                            {matrixRow('Striped Rows', <Toggle checked={!!cfg.enableStripedRows} onChange={setStripedRows} />)}
                            {matrixRow('Divider', <Toggle checked={!!cfg.enableRowDivider} onChange={setRowDivider} />, <Toggle checked={!!cfg.enableColumnDivider} onChange={setColumnDivider} />)}
                            {matrixRow('Re-order', <Toggle checked={!!cfg.enableRowReorder} onChange={setRowReorder} />, <Toggle checked={!!cfg.enableColumnReorder} onChange={setColumnReorder} />)}
                            {matrixRow('Resize', <Toggle checked={!!cfg.enableRowResize} onChange={setRowResize} />, <Toggle checked={!!cfg.enableColumnResize} onChange={setColumnResize} />)}
                            {matrixRow('Hover Highlight', <Toggle checked={!!cfg.enableRowHoverHighlight} onChange={setRowHover} />, <Toggle checked={!!cfg.enableColumnHover} onChange={setColumnHover} />)}
                            {matrixRow('Row Numbers', <Toggle checked={!!cfg.enableRowNumber} onChange={setRowNumber} />)}
                            {matrixRow('Row Selection', <Toggle checked={!!cfg.enableRowSelection} onChange={setRowSelection} />)}
                            {matrixRow(
                                'Cell selection (range)',
                                <Toggle
                                    checked={cfg.enableTableCellSelection !== false}
                                    onChange={setTableCellSelection}
                                />,
                            )}
                            {matrixRow('Row Actions', <Toggle checked={!!cfg.enableRowActions} onChange={setRowActions} />)}
                            {matrixRow('Table Background', tableBgToggle)}
                            {cfg.tableBackground && (
                                <div className={`${dataRowClass} border-t border-gray-100 pt-2 mt-1`}>
                                    <div className="text-sm text-gray-600">Background Color</div>
                                    <div className="flex items-center gap-2 [grid-column:2/-1]">
                                        <input
                                            type="color"
                                            value={(cfg.tableBackgroundColor as string) || '#ffffff'}
                                            onChange={(e) => setTableBackgroundColor(e.target.value)}
                                            className="w-8 h-8 rounded border border-gray-300 shrink-0"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setTableBackgroundColor('#ffffff')}
                                            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_TableLayoutSetup;
