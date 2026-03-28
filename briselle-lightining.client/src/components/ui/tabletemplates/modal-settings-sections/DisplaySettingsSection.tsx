import React, { useMemo, useState } from 'react';
import { GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../../../utils/helpers';
import { getButtonOrder, BUTTON_DEFINITIONS } from '../utils/actionPanelOrder';

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                checked ? 'bg-blue-600' : 'bg-gray-200',
                disabled && 'opacity-50 cursor-not-allowed'
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
    id,
    title,
    open,
    onToggle,
    children,
    fontSize,
}: {
    id: string;
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

function TableBodyOptionsSection({
    config,
    onChange,
    modalHeaderFontSize,
}: {
    config: Record<string, any>;
    onChange: (key: string, value: any) => void;
    modalHeaderFontSize: number;
}) {
    const [open, setOpen] = useState<Record<string, boolean>>({
        freeze: true, tableView: true, divider: false, reorder: false, resize: false, hover: false, index: false, wrap: false, background: true,
    });
    const toggle = (k: string) => () => setOpen((s) => ({ ...s, [k]: !s[k] }));

    const row = (label: string, rowControl?: React.ReactNode, colControl?: React.ReactNode) => (
        <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100 last:border-b-0">
            <div className="text-sm font-medium text-gray-700">{label}</div>
            <div className="flex items-center">{rowControl ?? null}</div>
            <div className="flex items-center">{colControl ?? null}</div>
        </div>
    );

    return (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="text-md font-semibold text-gray-800 mb-3" style={{ fontSize: `${modalHeaderFontSize}px` }}>Table Body Options</h4>
            <div className="space-y-2">
                <CollapsibleSection id="freeze" title="Enable Freeze Pane" open={open.freeze ?? false} onToggle={toggle('freeze')} fontSize={modalHeaderFontSize}>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-700">Enable Freeze Pane</span>
                            <Toggle checked={!!config.enableFreezePane} onChange={(v) => onChange('enableFreezePane', v)} />
                        </div>
                        {config.enableFreezePane && (
                            <>
                                <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100">
                                    <div className="text-sm font-medium text-gray-500 uppercase">Feature</div>
                                    <div className="text-sm font-medium text-gray-500 uppercase">Row</div>
                                    <div className="text-sm font-medium text-gray-500 uppercase">Column</div>
                                </div>
                                {row('Freeze Pane', <Toggle checked={!!config.enableFreezePaneRowHeader} onChange={(v) => onChange('enableFreezePaneRowHeader', v)} />, <Toggle checked={!!config.enablefreezePaneColumnIndex} onChange={(v) => onChange('enablefreezePaneColumnIndex', v)} />)}
                            </>
                        )}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection id="tableView" title="Table View" open={open.tableView ?? false} onToggle={toggle('tableView')} fontSize={modalHeaderFontSize}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Table Row View</span>
                            <select className="input text-sm border border-gray-300 rounded w-40" value={config.tableView || 'default'} onChange={(e) => onChange('tableView', e.target.value)}>
                                <option value="default">Default</option>
                                <option value="compact">Compact</option>
                                <option value="comfortable">Comfortable</option>
                                <option value="spacious">Spacious</option>
                            </select>
                        </div>
                        {row('Striped Rows', <Toggle checked={!!config.enableStripedRows} onChange={(v) => onChange('enableStripedRows', v)} />, null)}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection id="divider" title="Divider" open={open.divider ?? false} onToggle={toggle('divider')} fontSize={modalHeaderFontSize}>
                    <div className="space-y-1">
                        <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100">
                            <div className="text-sm font-medium text-gray-500 uppercase">Feature</div>
                            <div className="text-sm font-medium text-gray-500 uppercase">Row</div>
                            <div className="text-sm font-medium text-gray-500 uppercase">Column</div>
                        </div>
                        {row('Divider', <Toggle checked={!!config.enableRowDivider} onChange={(v) => onChange('enableRowDivider', v)} />, <Toggle checked={!!config.enableColumnDivider} onChange={(v) => onChange('enableColumnDivider', v)} />)}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection id="reorder" title="Re-order" open={open.reorder ?? false} onToggle={toggle('reorder')} fontSize={modalHeaderFontSize}>
                    <div className="space-y-1">
                        <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100">
                            <div className="text-sm font-medium text-gray-500 uppercase">Feature</div>
                            <div className="text-sm font-medium text-gray-500 uppercase">Row</div>
                            <div className="text-sm font-medium text-gray-500 uppercase">Column</div>
                        </div>
                        {row('Re-order', <Toggle checked={!!config.enableRowReorder} onChange={(v) => onChange('enableRowReorder', v)} />, <Toggle checked={!!config.enableColumnReorder} onChange={(v) => onChange('enableColumnReorder', v)} />)}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection id="resize" title="Resize" open={open.resize ?? false} onToggle={toggle('resize')} fontSize={modalHeaderFontSize}>
                    <div className="space-y-1">
                        <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100">
                            <div className="text-sm font-medium text-gray-500 uppercase">Feature</div>
                            <div className="text-sm font-medium text-gray-500 uppercase">Row</div>
                            <div className="text-sm font-medium text-gray-500 uppercase">Column</div>
                        </div>
                        {row('Resize', <Toggle checked={!!config.enableRowResize} onChange={(v) => onChange('enableRowResize', v)} />, <Toggle checked={!!config.enableColumnResize} onChange={(v) => onChange('enableColumnResize', v)} />)}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection id="hover" title="Hover Highlight" open={open.hover ?? false} onToggle={toggle('hover')} fontSize={modalHeaderFontSize}>
                    <div className="space-y-1">
                        <div className="grid grid-cols-3 gap-4 items-center py-2 border-b border-gray-100">
                            <div className="text-sm font-medium text-gray-500 uppercase">Feature</div>
                            <div className="text-sm font-medium text-gray-500 uppercase">Row</div>
                            <div className="text-sm font-medium text-gray-500 uppercase">Column</div>
                        </div>
                        {row('Hover', <Toggle checked={!!config.enableRowHoverHighlight} onChange={(v) => onChange('enableRowHoverHighlight', v)} />, <Toggle checked={!!config.enableColumnHover} onChange={(v) => onChange('enableColumnHover', v)} />)}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection id="index" title="Index" open={open.index ?? false} onToggle={toggle('index')} fontSize={modalHeaderFontSize}>
                    {row('Row Numbers', <Toggle checked={!!config.enableRowNumber} onChange={(v) => onChange('enableRowNumber', v)} />, null)}
                </CollapsibleSection>
                <CollapsibleSection id="wrap" title="Wrap & Clip" open={open.wrap ?? false} onToggle={toggle('wrap')} fontSize={modalHeaderFontSize}>
                    {row('Enable Wrap & Clip Option', <Toggle checked={!!config.enableWrapClipOption} onChange={(v) => onChange('enableWrapClipOption', v)} />, null)}
                </CollapsibleSection>
                <CollapsibleSection id="background" title="Table Background" open={open.background ?? false} onToggle={toggle('background')} fontSize={modalHeaderFontSize}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700">Table Background</span>
                            <Toggle checked={!!config.tableBackground} onChange={(v) => onChange('tableBackground', v)} />
                        </div>
                        {config.tableBackground && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-600">Background Color</span>
                                <input type="color" value={config.tableBackgroundColor || '#ffffff'} onChange={(e) => onChange('tableBackgroundColor', e.target.value)} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" />
                                <button type="button" onClick={() => onChange('tableBackgroundColor', '#ffffff')} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">Clear</button>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
}

interface DisplaySettingsSectionProps {
    config: {
        tabPanelBackground: boolean;
        enableTabs: boolean;
        enableTitle: boolean;
        enableNewButton: boolean;
        enableTitleBackground: boolean;
        titleBackgroundColor: string;
        titleTableSpacing: number;
        enableRecordCount: boolean;
        enableSortInfo: boolean;
        enableFilterInfo: boolean;
        enableLastUpdated: boolean;
        enableTablePanel: boolean;
        tablePanelBackground: boolean;
        tablePanelBackgroundColor: string;
        searchButtonType: 'icon' | 'button';
        searchButtonAlign: 'left' | 'right';
        sortButtonType: 'icon' | 'button';
        sortButtonAlign: 'left' | 'right';
        filterButtonType: 'icon' | 'button';
        filterButtonAlign: 'left' | 'right';
        columnVisibilityButtonType: 'icon' | 'button';
        columnVisibilityButtonAlign: 'left' | 'right';
        refreshButtonType: 'icon' | 'button';
        refreshButtonAlign: 'left' | 'right';
        exportButtonType: 'icon' | 'button';
        exportButtonAlign: 'left' | 'right';
        importButtonType: 'icon' | 'button';
        importButtonAlign: 'left' | 'right';
        printButtonType: 'icon' | 'button';
        printButtonAlign: 'left' | 'right';
        changeOwnerButtonType: 'icon' | 'button';
        changeOwnerButtonAlign: 'left' | 'right';
        chartButtonType: 'icon' | 'button';
        chartButtonAlign: 'left' | 'right';
        shareButtonType: 'icon' | 'button';
        shareButtonAlign: 'left' | 'right';
        groupButtonType: 'icon' | 'button';
        groupButtonAlign: 'left' | 'right';
        presetButtonType: 'icon' | 'button';
        presetButtonAlign: 'left' | 'right';
        tableViewButtonType: 'icon' | 'button';
        tableViewButtonAlign: 'left' | 'right';
        settingsButtonType: 'icon' | 'button';
        settingsButtonAlign: 'left' | 'right';
        enableSearch: boolean;
        enableFilter: boolean;
        enableSort: boolean;
        enableColumnVisibility: boolean;
        enableRefresh: boolean;
        enableExport: boolean;
        enableImport: boolean;
        enablePrint: boolean;
        enableChangeOwner: boolean;
        enableChart: boolean;
        enableShare: boolean;
        enableGroup: boolean;
        enablePresetSelector: boolean;
        enableColumnResize: boolean;
        enableColumnReorder: boolean;
        enableRowReorder: boolean;
        enableRowHoverHighlight: boolean;
        enableRowDivider: boolean;
        enableRowNumber: boolean;
        enableStripedRows: boolean;
        enableColumnDivider: boolean;
        enableWrapText: boolean;
        enableTooltips: boolean;
        tableBackground: boolean;
        tableBackgroundColor: string;
        enableHeader: boolean;
        enableFooter: boolean;
        enablePagination: boolean;
        enableTableTotals: boolean;
        enableWrapClipOption: boolean;
        tablePanelSpacing: number;
        newButtonType: 'icon' | 'button';
        tabPanelSpacing: number;
        tabPanelBackgroundColor: string;
        // Freeze Pane
        enableFreezePane?: boolean;
        freezePaneType?: 'icon' | 'button';
        freezePaneAlign?: 'left' | 'right';

        // Freeze options
        enableFreezePaneRowHeader?: boolean;
        enablefreezePaneColumnIndex?: boolean;
        enableColumnHover?: boolean;
        enableRowResize?: boolean;

        // Button order (sync with Action Panel UI)
        actionPanelButtonOrder?: string[];
    };
    modalHeaderFontSize: number;
    modalContentFontSize: number;
    onChange: (key: string, value: any) => void;
    /** When provided, Configure button in Tab Panel section will switch modal to this tab */
    onNavigateToTab?: (tabId: string) => void;
}

const DisplaySettingsSection: React.FC<DisplaySettingsSectionProps> = ({
    config,
    modalHeaderFontSize,
    modalContentFontSize,
    onChange,
    onNavigateToTab,
}) => {
    const [displaySectionOpen, setDisplaySectionOpen] = useState({ titlePanel: true, tabPanel: true, tablePanel: true, tablePanelEnablement: true, tablePanelActions: true, bodyAndFooter: true, tableBody: true, tableFooter: true });
    const toggleDisplaySection = (k: 'titlePanel' | 'tabPanel' | 'tablePanel' | 'tablePanelEnablement' | 'tablePanelActions' | 'bodyAndFooter' | 'tableBody' | 'tableFooter') => () =>
        setDisplaySectionOpen((s) => ({ ...s, [k]: !s[k] }));

    const orderKeys = useMemo(() => getButtonOrder(config), [config.actionPanelButtonOrder]);
    const buttonOrder = useMemo(
        () => orderKeys.map((key) => ({ key, ...BUTTON_DEFINITIONS[key]! })).filter((b) => b.typeKey),
        [orderKeys]
    );

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (dragIndex === dropIndex) return;
        const keys = [...orderKeys];
        const [dragged] = keys.splice(dragIndex, 1);
        keys.splice(dropIndex, 0, dragged);
        onChange('actionPanelButtonOrder', keys);
    };

   
    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200" style={{ fontSize: `${modalHeaderFontSize}px` }}>Display Settings</h3>
            </div>

            {/* Title Panel Options - Section #1: Toggle + Collapsible like Table Body Options */}
            <div className="space-y-2">
                <CollapsibleSection id="titlePanel" title="Title Panel Options" open={displaySectionOpen.titlePanel} onToggle={toggleDisplaySection('titlePanel')} fontSize={modalHeaderFontSize}>
                    {/* Table-like grid: column 1 = label, column 2 = control/content, column 3 = toggle */}
                    <div className="grid gap-0 border border-gray-200 rounded-lg overflow-hidden" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto' }}>
                        {/* Row 1 */}
                        <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Enable Title Panel</div>
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0">
                            {config.enableTitle && (
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <span>Title-Table Spacing (px)</span>
                                    <input type="number" value={config.titleTableSpacing} onChange={(e) => onChange('titleTableSpacing', Number(e.target.value))} className="input w-16 h-8 text-sm text-center" min={0} max={50} />
                                </label>
                            )}
                        </div>
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                            <Toggle checked={!!config.enableTitle} onChange={(v) => onChange('enableTitle', v)} />
                        </div>
                        {config.enableTitle && (
                            <>
                                {/* Row 2 */}
                                <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Enable &quot;+New&quot; Button</div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0">
                                    {config.enableNewButton && (
                                        <select className="input text-sm w-40" value={config.newButtonType || 'icon'} onChange={(e) => onChange('newButtonType', e.target.value)}>
                                            <option value="icon">Icon Only (+)</option>
                                            <option value="button">Button (+ Object)</option>
                                        </select>
                                    )}
                                </div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                                    <Toggle checked={!!config.enableNewButton} onChange={(v) => onChange('enableNewButton', v)} />
                                </div>
                                {/* Row 3 */}
                                <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Enable Title Background</div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0">
                                    {config.enableTitleBackground && (
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={config.titleBackgroundColor || '#ffffff'} onChange={(e) => onChange('titleBackgroundColor', e.target.value)} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" />
                                            <button type="button" onClick={() => onChange('titleBackgroundColor', '#ffffff')} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">Clear</button>
                                        </div>
                                    )}
                                </div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                                    <Toggle checked={!!config.enableTitleBackground} onChange={(v) => onChange('enableTitleBackground', v)} />
                                </div>
                                {/* Row 4: four cells in content area, then one toggle column cell spanning or we make it 4+1 columns - use 2 rows for row 4 so we have 4 label+toggle pairs */}
                                <div className="col-span-3 grid gap-0 border-b border-gray-100" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                    <div className="px-3 py-2 flex items-center justify-between gap-2 border-r border-gray-100">
                                        <span className="text-sm text-gray-700">Show Records</span>
                                        <Toggle checked={!!config.enableRecordCount} onChange={(v) => onChange('enableRecordCount', v)} />
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-between gap-2 border-r border-gray-100">
                                        <span className="text-sm text-gray-700">Show Sort</span>
                                        <Toggle checked={!!config.enableSortInfo} onChange={(v) => onChange('enableSortInfo', v)} />
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-between gap-2 border-r border-gray-100">
                                        <span className="text-sm text-gray-700">Show Filter</span>
                                        <Toggle checked={!!config.enableFilterInfo} onChange={(v) => onChange('enableFilterInfo', v)} />
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-between gap-2">
                                        <span className="text-sm text-gray-700">Last Updated</span>
                                        <Toggle checked={!!config.enableLastUpdated} onChange={(v) => onChange('enableLastUpdated', v)} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </CollapsibleSection>
            </div>

            {/* Tab Panel Options - Collapsible, same structure as Title Panel */}
            <div className="space-y-2">
                <CollapsibleSection id="tabPanel" title="Tab Panel Options" open={displaySectionOpen.tabPanel} onToggle={toggleDisplaySection('tabPanel')} fontSize={modalHeaderFontSize}>
                    <div className="grid gap-0 border border-gray-200 rounded-lg overflow-hidden" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto' }}>
                        {/* Row 1: Enable Tab Panel | Tab Panel Spacing (px) | Toggle */}
                        <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Enable Tab Panel</div>
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <span>Tab Panel Spacing (px)</span>
                                <input type="number" value={config.tabPanelSpacing ?? 0} onChange={(e) => onChange('tabPanelSpacing', Number(e.target.value))} className="input w-16 h-8 text-sm text-center" min={0} max={50} />
                            </label>
                        </div>
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                            <Toggle checked={!!config.enableTabs} onChange={(v) => onChange('enableTabs', v)} />
                        </div>
                        {/* Row 2: Configure → button navigates to Tab Configuration tab */}
                        <div className="text-sm text-gray-700 px-3 py-2 flex items-center">Configure</div>
                        <div className="px-3 py-2 flex items-center min-w-0">
                            {onNavigateToTab ? (
                                <button type="button" onClick={() => onNavigateToTab('tabs')} className="btn btn-secondary text-sm">
                                    Open Tab Configuration
                                </button>
                            ) : (
                                <span className="text-sm text-gray-500">Open Table Settings → Tabs to configure.</span>
                            )}
                        </div>
                        <div className="px-3 py-2" />
                    </div>
                </CollapsibleSection>
            </div>

            {/* Table Panel Options - Parent collapsible with two sub accordions: Enablement + Actions */}
            <div className="space-y-2">
                <CollapsibleSection
                    id="tablePanel"
                    title="Table Panel Options"
                    open={displaySectionOpen.tablePanel}
                    onToggle={toggleDisplaySection('tablePanel')}
                    fontSize={modalHeaderFontSize}
                >
                    <div className="space-y-4">
                        {/* Sub 1: Table Panel Enablement - toggles for panel, background, tooltips */}
                        <CollapsibleSection id="tablePanelEnablement" title="Table Panel Enablement" open={displaySectionOpen.tablePanelEnablement} onToggle={toggleDisplaySection('tablePanelEnablement')} fontSize={modalHeaderFontSize}>
                            <div className="grid gap-0 border border-gray-200 rounded-lg overflow-hidden" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr) auto' }}>
                                <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Enable Table Panel</div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0">
                                    {config.enableTablePanel && (
                                        <label className="flex items-center gap-2 text-sm text-gray-700">
                                            <span>Table Panel Spacing (px)</span>
                                            <input type="number" value={config.tablePanelSpacing ?? 0} onChange={(e) => onChange('tablePanelSpacing', Number(e.target.value))} className="input w-16 h-8 text-sm text-center" min={0} max={50} />
                                        </label>
                                    )}
                                </div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                                    <Toggle checked={!!config.enableTablePanel} onChange={(v) => onChange('enableTablePanel', v)} />
                                </div>
                                <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Table Panel Background</div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0">
                                    {config.enableTablePanel && config.tablePanelBackground && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm text-gray-600">Color</span>
                                            <input type="color" value={config.tablePanelBackgroundColor || '#ffffff'} onChange={(e) => onChange('tablePanelBackgroundColor', e.target.value)} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" />
                                            <button type="button" onClick={() => onChange('tablePanelBackgroundColor', '#ffffff')} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">Clear</button>
                                        </div>
                                    )}
                                </div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                                    <Toggle checked={!!config.tablePanelBackground} onChange={(v) => onChange('tablePanelBackground', v)} />
                                </div>
                                <div className="text-sm text-gray-700 px-3 py-2 flex items-center">Tooltips</div>
                                <div className="px-3 py-2 flex items-center min-w-0" />
                                <div className="px-3 py-2 flex items-center justify-end">
                                    <Toggle checked={!!config.enableTooltips} onChange={(v) => onChange('enableTooltips', v)} />
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* Sub 2: Table Panel Actions - button display types & alignment */}
                        <CollapsibleSection id="tablePanelActions" title="Table Panel Actions" open={displaySectionOpen.tablePanelActions} onToggle={toggleDisplaySection('tablePanelActions')} fontSize={modalHeaderFontSize}>
                            <div className="space-y-2">
                                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-2">
                                    <span>Enable</span>
                                    <span>Feature</span>
                                    <span>Type</span>
                                    <span>Align</span>
                                    <span>Order</span>
                                </div>
                                {buttonOrder.map((button, index) => {
                                    const isEnabled = config[button.enableKey as keyof typeof config] as boolean;
                                    const frozenEnableOnly = !!(button as { frozenEnableOnly?: boolean }).frozenEnableOnly;
                                    const enableChecked = frozenEnableOnly ? true : isEnabled;
                                    const enableDisabled = !!button.disabled;
                                    const typeAlignDisabled = frozenEnableOnly ? false : !isEnabled;
                                    return (
                                        <div
                                            key={button.key}
                                            className="grid grid-cols-5 gap-2 items-center py-2 border-b border-gray-100 last:border-b-0 bg-white rounded px-2 border border-gray-200"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, index)}
                                        >
                                            <div className="flex justify-center">
                                                <input type="checkbox" checked={enableChecked} disabled={enableDisabled} onChange={(e) => !frozenEnableOnly && onChange(button.enableKey, e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">{button.label}</span>
                                            <select className="input text-sm border border-gray-300 rounded" value={config[button.typeKey as keyof typeof config] as string} onChange={(e) => onChange(button.typeKey, e.target.value)} disabled={typeAlignDisabled}>
                                                <option value="icon">Icon</option>
                                                <option value="button">Button</option>
                                            </select>
                                            <select className="input text-sm border border-gray-300 rounded" value={config[button.alignKey as keyof typeof config] as string} onChange={(e) => onChange(button.alignKey, e.target.value)} disabled={typeAlignDisabled}>
                                                <option value="left">Left</option>
                                                <option value="right">Right</option>
                                            </select>
                                            <div className="flex justify-center">
                                                <button className="p-1 text-gray-400 hover:text-gray-600 cursor-move disabled:cursor-not-allowed disabled:opacity-50" title="Drag to reorder" disabled={typeAlignDisabled || frozenEnableOnly}>
                                                    <GripVertical size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleSection>
                    </div>
                </CollapsibleSection>
            </div>

            {/* Table Body & Footer - Super collapsible: Table Body (intact) + Table Footer (sub collapsible with enable toggle) */}
            <div className="space-y-2">
                <CollapsibleSection id="bodyAndFooter" title="Table Body & Footer Options" open={displaySectionOpen.bodyAndFooter} onToggle={toggleDisplaySection('bodyAndFooter')} fontSize={modalHeaderFontSize}>
                    <div className="space-y-4">
                        {/* Table Body Options - sub collapsible (content intact as-is) */}
                        <CollapsibleSection id="tableBody" title="Table Body Options" open={displaySectionOpen.tableBody} onToggle={toggleDisplaySection('tableBody')} fontSize={modalHeaderFontSize}>
                            <TableBodyOptionsSection config={config} onChange={onChange} modalHeaderFontSize={modalHeaderFontSize} />
                        </CollapsibleSection>

                        {/* Table Footer Options - sub collapsible with enable toggle row like Title/Tab Panel */}
                        <CollapsibleSection id="tableFooter" title="Table Footer Options" open={displaySectionOpen.tableFooter} onToggle={toggleDisplaySection('tableFooter')} fontSize={modalHeaderFontSize}>
                            <div className="grid gap-0 border border-gray-200 rounded-lg overflow-hidden" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto' }}>
                                {/* Row: Enable Table Footer | (empty) | Toggle */}
                                <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Enable Table Footer</div>
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0" />
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                                    <Toggle checked={!!config.enableFooter} onChange={(v) => onChange('enableFooter', v)} />
                                </div>
                                {config.enableFooter && (
                                    <>
                                        <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Enable Pagination</div>
                                        <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0" />
                                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                                            <Toggle checked={!!config.enablePagination} onChange={(v) => onChange('enablePagination', v)} />
                                        </div>
                                        <div className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100 flex items-center">Enable Table Totals by Column</div>
                                        <div className="px-3 py-2 border-b border-gray-100 flex items-center min-w-0" />
                                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-end">
                                            <Toggle checked={!!config.enableTableTotals} onChange={(v) => onChange('enableTableTotals', v)} />
                                        </div>
                                        <div className="col-span-3 px-3 py-2 text-sm text-gray-600">
                                            Page size, page number, and column totals will be visible in the footer.
                                        </div>
                                    </>
                                )}
                            </div>
                        </CollapsibleSection>
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
};




export default DisplaySettingsSection;

