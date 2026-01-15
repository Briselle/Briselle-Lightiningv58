import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

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

    };
    modalHeaderFontSize: number;
    modalContentFontSize: number;
    onChange: (key: string, value: any) => void;
}

const DisplaySettingsSection: React.FC<DisplaySettingsSectionProps> = ({
    config,
    modalHeaderFontSize,
    modalContentFontSize,
    onChange,
}) => {
    const [buttonOrder, setButtonOrder] = useState([
        { key: 'search', label: 'Search', typeKey: 'searchButtonType', alignKey: 'searchButtonAlign', enableKey: 'enableSearch' },
        { key: 'sort', label: 'Sort', typeKey: 'sortButtonType', alignKey: 'sortButtonAlign', enableKey: 'enableSort' },
        { key: 'filter', label: 'Filter', typeKey: 'filterButtonType', alignKey: 'filterButtonAlign', enableKey: 'enableFilter' },
        { key: 'columnVisibility', label: 'Hide Fields', typeKey: 'columnVisibilityButtonType', alignKey: 'columnVisibilityButtonAlign', enableKey: 'enableColumnVisibility' },
        { key: 'refresh', label: 'Refresh', typeKey: 'refreshButtonType', alignKey: 'refreshButtonAlign', enableKey: 'enableRefresh' },
        { key: 'export', label: 'Export', typeKey: 'exportButtonType', alignKey: 'exportButtonAlign', enableKey: 'enableExport' },
        { key: 'import', label: 'Import', typeKey: 'importButtonType', alignKey: 'importButtonAlign', enableKey: 'enableImport' },
        { key: 'print', label: 'Print', typeKey: 'printButtonType', alignKey: 'printButtonAlign', enableKey: 'enablePrint' },
        { key: 'changeOwner', label: 'Change Owner', typeKey: 'changeOwnerButtonType', alignKey: 'changeOwnerButtonAlign', enableKey: 'enableChangeOwner' },
        { key: 'chart', label: 'Chart', typeKey: 'chartButtonType', alignKey: 'chartButtonAlign', enableKey: 'enableChart' },
        { key: 'share', label: 'Share', typeKey: 'shareButtonType', alignKey: 'shareButtonAlign', enableKey: 'enableShare' },
        { key: 'group', label: 'Group', typeKey: 'groupButtonType', alignKey: 'groupButtonAlign', enableKey: 'enableGroup' },
        { key: 'freezePane', label: 'Freeze Pane', typeKey: 'freezePaneType', alignKey: 'freezePaneAlign', enableKey: 'enableFreezePane' },
        { key: 'preset', label: 'Preset', typeKey: 'presetButtonType', alignKey: 'presetButtonAlign', enableKey: 'enablePresetSelector', disabled: true },
        { key: 'tableView', label: 'Table View', typeKey: 'tableViewButtonType', alignKey: 'tableViewButtonAlign', enableKey: 'enableTableView' },
        { key: 'settings', label: 'Settings', typeKey: 'settingsButtonType', alignKey: 'settingsButtonAlign', enableKey: 'enableSettings', disabled: true },
    ]);


    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
        
        if (dragIndex !== dropIndex) {
            const newOrder = [...buttonOrder];
            const [draggedItem] = newOrder.splice(dragIndex, 1);
            newOrder.splice(dropIndex, 0, draggedItem);
            setButtonOrder(newOrder);
        }
    };

   
    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200" style={{ fontSize: `${modalHeaderFontSize}px` }}>Display Settings</h3>
            </div>

            {/* Title Panel Options - Section #1 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3" style={{ fontSize: `${modalHeaderFontSize}px` }}>Title Panel Options</h4>
                <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            checked={config.enableTitle} 
                            onChange={(e) => onChange('enableTitle', e.target.checked)} 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Enable Title Panel</span>
                    </label>
                    
                    {config.enableTitle && (
                        <div className="ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.enableNewButton} 
                                    onChange={(e) => onChange('enableNewButton', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Enable "+New" Button</span>
                            </label>
                            
                            {config.enableNewButton && (
                                <div className="ml-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Button Type</label>
                                    <select 
                                        className="input" 
                                        value={config.newButtonType || 'button'} 
                                        onChange={(e) => onChange('newButtonType', e.target.value)}
                                    >
                                        <option value="icon">Icon Only (+)</option>
                                        <option value="button">Button (+ Object)</option>
                                    </select>
                                </div>
                            )}
                            
                            {/* Row 1: Records, Sort, Filter */}
                            <div className="grid grid-cols-3 gap-4">
                                <label className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        checked={config.enableRecordCount} 
                                        onChange={(e) => onChange('enableRecordCount', e.target.checked)} 
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Show Records</span>
                                </label>
                                
                                <label className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        checked={config.enableSortInfo} 
                                        onChange={(e) => onChange('enableSortInfo', e.target.checked)} 
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Show Sort</span>
                                </label>
                                
                                <label className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        checked={config.enableFilterInfo} 
                                        onChange={(e) => onChange('enableFilterInfo', e.target.checked)} 
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Show Filter</span>
                                </label>
                            </div>
                            
                            {/* Row 2: Last Updated */}
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.enableLastUpdated} 
                                    onChange={(e) => onChange('enableLastUpdated', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Last Updated Timestamp</span>
                            </label>
                            
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.enableTitleBackground} 
                                    onChange={(e) => onChange('enableTitleBackground', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Title Background</span>
                            </label>
                            
                            {config.enableTitleBackground && (
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="color" 
                                        value={config.titleBackgroundColor} 
                                        onChange={(e) => onChange('titleBackgroundColor', e.target.value)} 
                                        className="w-8 h-8 rounded border border-gray-300"
                                    />
                                    <button 
                                        onClick={() => onChange('titleBackgroundColor', '#ffffff')}
                                        className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title-Table Spacing (px)</label>
                                <input 
                                    type="number" 
                                    value={config.titleTableSpacing} 
                                    onChange={(e) => onChange('titleTableSpacing', Number(e.target.value))} 
                                    className="input w-20" 
                                    min="0"
                                    max="50"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Panel Configuration - Section #2.5 */}
            {config.enableTabs && (
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Tab Panel Configuration</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tab Panel Spacing (px)</label>
                            <input 
                                type="number" 
                                value={config.tabPanelSpacing || 0} 
                                onChange={(e) => onChange('tabPanelSpacing', Number(e.target.value))} 
                                className="input w-20" 
                                min="0"
                                max="50"
                            />
                        </div>
                        
                        <label className="flex items-center space-x-2">
                            <input 
                                type="checkbox" 
                                checked={config.tabPanelBackground} 
                                onChange={(e) => onChange('tabPanelBackground', e.target.checked)} 
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Tab Panel Background</span>
                        </label>
                        
                        {config.tabPanelBackground && (
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="color" 
                                    value={config.tabPanelBackgroundColor || '#ffffff'} 
                                    onChange={(e) => onChange('tabPanelBackgroundColor', e.target.value)} 
                                    className="w-8 h-8 rounded border border-gray-300"
                                />
                                <button 
                                    onClick={() => onChange('tabPanelBackgroundColor', '#ffffff')}
                                    className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Enable Tabs Control */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="flex items-center space-x-2">
                    <input 
                        type="checkbox" 
                        checked={config.enableTabs} 
                        onChange={(e) => onChange('enableTabs', e.target.checked)} 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-blue-800">Enable Tabs</span>
                </label>
                <p className="text-sm text-blue-700 mt-2">
                    Enabling tabs will add a "Tabs" menu to the settings and show tab panel configuration options.
                </p>
            </div>

            {/* Table Panel Configuration - Section #2 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Table Panel Configuration</h4>
                <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            checked={config.enableTablePanel} 
                            onChange={(e) => onChange('enableTablePanel', e.target.checked)} 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Enable Table Panel</span>
                    </label>
                    
                    {config.enableTablePanel && (
                        <div className="ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.tablePanelBackground} 
                                    onChange={(e) => onChange('tablePanelBackground', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Table Panel Background</span>
                            </label>
                            
                            {config.tablePanelBackground && (
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="color" 
                                        value={config.tablePanelBackgroundColor || '#ffffff'} 
                                        onChange={(e) => onChange('tablePanelBackgroundColor', e.target.value)} 
                                        className="w-8 h-8 rounded border border-gray-300"
                                    />
                                    <button 
                                        onClick={() => onChange('tablePanelBackgroundColor', '#ffffff')}
                                        className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Table Panel Spacing (px)</label>
                                <input 
                                    type="number" 
                                    value={config.tablePanelSpacing || 0} 
                                    onChange={(e) => onChange('tablePanelSpacing', Number(e.target.value))} 
                                    className="input w-20" 
                                    min="0"
                                    max="50"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Button Display Types & Alignment - Section #3 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Button Display Types & Alignment</h4>
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
                                    <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        disabled={button.disabled}
                                        onChange={(e) => onChange(button.enableKey, e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                </div>
                                <span className="text-sm font-medium text-gray-700">{button.label}</span>
                                <select 
                                    className="input text-sm border border-gray-300 rounded" 
                                    value={config[button.typeKey as keyof typeof config] as string} 
                                    onChange={(e) => onChange(button.typeKey, e.target.value)}
                                    disabled={!isEnabled}
                                >
                                    <option value="icon">Icon</option>
                                    <option value="button">Button</option>
                                </select>
                                <select 
                                    className="input text-sm border border-gray-300 rounded" 
                                    value={config[button.alignKey as keyof typeof config] as string} 
                                    onChange={(e) => onChange(button.alignKey, e.target.value)}
                                    disabled={!isEnabled}
                                >
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                </select>
                                <div className="flex justify-center">
                                    <button
                                        className="p-1 text-gray-400 hover:text-gray-600 cursor-move"
                                        title="Drag to reorder"
                                        disabled={!isEnabled}
                                    >
                                        <GripVertical size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table Body Options - Section #4 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Table Body Options</h4>
        
                  
            </div>

            {/* Table Footer Options - Section #5 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3" style={{ fontSize: `${modalHeaderFontSize}px` }}>Table Footer Options</h4>
                <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            checked={config.enableFooter} 
                            onChange={(e) => onChange('enableFooter', e.target.checked)} 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Enable Table Footer</span>
                    </label>
                    
                    {config.enableFooter && (
                        <div className="ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.enablePagination} 
                                    onChange={(e) => onChange('enablePagination', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Enable Pagination</span>
                            </label>
                            
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.enableTableTotals} 
                                    onChange={(e) => onChange('enableTableTotals', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Enable Table Totals by Column</span>
                            </label>
                            
                            <p className="text-sm text-gray-600">Page size, page number, and column totals will be visible in the footer</p>
                        </div>

                    )}

                </div>
            </div>
        </div>
    );
};




export default DisplaySettingsSection;

