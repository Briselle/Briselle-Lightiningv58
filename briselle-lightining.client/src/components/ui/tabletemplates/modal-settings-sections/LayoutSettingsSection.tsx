import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface LayoutSettingsSectionProps {
    config: Record<string, any>;
    onChange: (key: string, value: any) => void;
    modalHeaderFontSize?: number;
    modalContentFontSize?: number;
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

function CollapsibleSection({
    title,
    open,
    onToggle,
    children,
    fontSize,
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    fontSize?: number;
}) {
    return (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
            >
                <span className="font-medium text-gray-800">{title}</span>
                {open ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
            </button>
            {open && <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">{children}</div>}
        </div>
    );
}

const LayoutSettingsSection: React.FC<LayoutSettingsSectionProps> = ({
    config,
    onChange,
    modalHeaderFontSize = 16,
    modalContentFontSize = 14,
}) => {
    const [open, setOpen] = useState<Record<string, boolean>>({
        tableView: true,
        tableLayoutSetup: true,
    });
    const toggle = (k: string) => () => setOpen((s) => ({ ...s, [k]: !s[k] }));

    const gridClass = 'grid gap-2 sm:gap-4 items-center [grid-template-columns:minmax(0,1fr)_minmax(72px,auto)_minmax(72px,auto)]';
    const headerRowClass = `${gridClass} py-2 border-b border-gray-200`;
    const dataRowClass = `${gridClass} py-2 border-b border-gray-100 last:border-b-0`;

    const matrixRow = (featureName: string, rowControl?: React.ReactNode, columnControl?: React.ReactNode) => (
        <div className={dataRowClass}>
            <div className="text-sm font-medium text-gray-700 min-w-0">{featureName}</div>
            <div className="flex items-center justify-start min-w-0">{rowControl ?? null}</div>
            <div className="flex items-center justify-start min-w-0">{columnControl ?? null}</div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Layout Settings</h3>
            </div>

            {/* Table View - Collapsible accordion, View Type + Density in single row */}
            <CollapsibleSection
                title="Table View"
                open={open.tableView ?? false}
                onToggle={toggle('tableView')}
                fontSize={modalHeaderFontSize}
            >
                <div className="grid grid-cols-2 gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">View Type</label>
                        <select
                            className="input w-full"
                            value={config.tableView ?? 'default'}
                            onChange={(e) => onChange('tableView', e.target.value)}
                        >
                            <option value="default">Table</option>
                            <option value="kanban">Kanban</option>
                            <option value="grid">Grid</option>
                            <option value="card">Card</option>
                            <option value="timeline">Timeline</option>
                            <option value="calendar">Calendar</option>
                            <option value="list">Timeline List</option>
                        </select>
                    </div>
                    {config.tableView === 'default' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Table Density</label>
                            <select
                                className="input w-full"
                                value={config.density ?? 'standard'}
                                onChange={(e) => onChange('density', e.target.value)}
                            >
                                <option value="compact">Compact</option>
                                <option value="standard">Default</option>
                                <option value="comfortable">Comfortable</option>
                                <option value="spacious">Spacious</option>
                            </select>
                        </div>
                    )}
                </div>
                {config.tableView === 'kanban' && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Card Configuration</label>
                            <select className="input w-full">
                                <option>Select Header Field</option>
                                <option>Name</option>
                                <option>Status</option>
                                <option>Priority</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group By Field</label>
                            <select className="input w-full">
                                <option>Select Field</option>
                                <option>Status</option>
                                <option>Priority</option>
                                <option>Assignee</option>
                            </select>
                        </div>
                    </div>
                )}
            </CollapsibleSection>

            {/* Table Layout Setup - All options from dropdown as collapsible accordion */}
            <CollapsibleSection
                title="Table Layout Setup"
                open={open.tableLayoutSetup ?? false}
                onToggle={toggle('tableLayoutSetup')}
                fontSize={modalHeaderFontSize}
            >
                <div className="space-y-0">
                    <div className={headerRowClass}>
                        <div className="text-xs font-medium text-gray-500 uppercase">Feature</div>
                        <div className="text-xs font-medium text-gray-500 uppercase">Row</div>
                        <div className="text-xs font-medium text-gray-500 uppercase">Column</div>
                    </div>
                    {matrixRow('Table Row View', (
                        <select
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-full max-w-[140px]"
                            value={(config.density as string) || 'standard'}
                            onChange={(e) => onChange('density', e.target.value)}
                        >
                            <option value="compact">Compact</option>
                            <option value="standard">Default</option>
                            <option value="comfortable">Comfortable</option>
                            <option value="spacious">Spacious</option>
                        </select>
                    ))}
                    {matrixRow('Striped Rows', <Toggle checked={!!config.enableStripedRows} onChange={(v) => onChange('enableStripedRows', v)} />)}
                    {matrixRow('Divider', <Toggle checked={!!config.enableRowDivider} onChange={(v) => onChange('enableRowDivider', v)} />, <Toggle checked={!!config.enableColumnDivider} onChange={(v) => onChange('enableColumnDivider', v)} />)}
                    {matrixRow('Re-order', <Toggle checked={!!config.enableRowReorder} onChange={(v) => onChange('enableRowReorder', v)} />, <Toggle checked={!!config.enableColumnReorder} onChange={(v) => onChange('enableColumnReorder', v)} />)}
                    {matrixRow('Resize', <Toggle checked={!!config.enableRowResize} onChange={(v) => onChange('enableRowResize', v)} />, <Toggle checked={!!config.enableColumnResize} onChange={(v) => onChange('enableColumnResize', v)} />)}
                    {matrixRow('Hover Highlight', <Toggle checked={!!config.enableRowHoverHighlight} onChange={(v) => onChange('enableRowHoverHighlight', v)} />, <Toggle checked={!!config.enableColumnHover} onChange={(v) => onChange('enableColumnHover', v)} />)}
                    {matrixRow('Row Numbers', <Toggle checked={!!config.enableRowNumber} onChange={(v) => onChange('enableRowNumber', v)} />)}
                    {matrixRow('Row Selection', <Toggle checked={!!config.enableRowSelection} onChange={(v) => onChange('enableRowSelection', v)} />)}
                    {matrixRow(
                        'Cell selection (range)',
                        <Toggle
                            checked={config.enableTableCellSelection !== false}
                            onChange={(v) => onChange('enableTableCellSelection', v)}
                        />,
                    )}
                    {matrixRow('Row Actions', <Toggle checked={!!config.enableRowActions} onChange={(v) => onChange('enableRowActions', v)} />)}
                    {matrixRow('Table Background', <Toggle checked={!!config.tableBackground} onChange={(v) => onChange('tableBackground', v)} />)}
                    {config.tableBackground && (
                        <div className={`${dataRowClass} border-t border-gray-100 pt-2 mt-1`}>
                            <div className="text-sm text-gray-600">Background Color</div>
                            <div className="flex items-center gap-2 [grid-column:2/-1]">
                                <input
                                    type="color"
                                    value={(config.tableBackgroundColor as string) || '#ffffff'}
                                    onChange={(e) => onChange('tableBackgroundColor', e.target.value)}
                                    className="w-8 h-8 rounded border border-gray-300 shrink-0"
                                />
                                <button
                                    type="button"
                                    onClick={() => onChange('tableBackgroundColor', '#ffffff')}
                                    className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default LayoutSettingsSection;
