import { useState } from 'react';
import { X, Save, Palette, RotateCcw, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { TableConfig } from './ConfigurableListTemplate';

interface TablePreset {
    id: string;
    name: string;
    config: TableConfig;
    isDefault?: boolean;
}

interface Props {
    config: TableConfig;
    onConfigChange: (newConfig: TableConfig) => void;
    onClose: () => void;
    fieldMappings: Record<string, string>;
    presets: TablePreset[];
    onPresetsChange: (presets: TablePreset[]) => void;
}

export default function TableSettingsModal({
    config,
    onConfigChange,
    onClose,
    fieldMappings,
    presets,
    onPresetsChange
}: Props) {
    const [activeTab, setActiveTab] = useState('display');
    const [localConfig, setLocalConfig] = useState<TableConfig>({ ...config });
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [editingPreset, setEditingPreset] = useState<string | null>(null);
    const [presetJson, setPresetJson] = useState<string>('');
    const [inlineEditableColumns, setInlineEditableColumns] = useState<string[]>(
        localConfig.enableInlineEdit || []
    );

    const handleSave = () => {
        onConfigChange({ ...localConfig, enableInlineEdit: inlineEditableColumns });
        onClose();
    };

    const handleReset = () => {
        setLocalConfig({ ...config });
        setInlineEditableColumns(config.enableInlineEdit || []);
    };

    const updateConfig = (updates: Partial<TableConfig>) => {
        setLocalConfig(prev => ({ ...prev, ...updates }));
    };

    const saveCurrentAsPreset = () => {
        const presetName = prompt('Enter preset name:');
        if (presetName) {
            const newPreset = {
                id: Date.now().toString(),
                name: presetName,
                config: { ...localConfig, enableInlineEdit: inlineEditableColumns }
            };
            const updatedPresets = [...presets, newPreset];
            onPresetsChange(updatedPresets);
            localStorage.setItem('tablePresets', JSON.stringify(updatedPresets));
        }
    };

    const applyPreset = (presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (preset) {
            setLocalConfig(preset.config);
            setInlineEditableColumns(preset.config.enableInlineEdit || []);
            setSelectedPreset(presetId);
        }
    };

    const deletePreset = (presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (preset?.isDefault) return;

        const updatedPresets = presets.filter(p => p.id !== presetId);
        onPresetsChange(updatedPresets);
        localStorage.setItem('tablePresets', JSON.stringify(updatedPresets));

        if (selectedPreset === presetId) {
            setSelectedPreset('');
        }
    };

    const editPresetJson = (presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (preset && !preset.isDefault) {
            setEditingPreset(presetId);
            setPresetJson(JSON.stringify(preset.config, null, 2));
        }
    };

    const savePresetJson = () => {
        try {
            const parsedConfig = JSON.parse(presetJson);
            const updatedPresets = presets.map(p =>
                p.id === editingPreset
                    ? { ...p, config: parsedConfig }
                    : p
            );
            onPresetsChange(updatedPresets);
            localStorage.setItem('tablePresets', JSON.stringify(updatedPresets));
            setEditingPreset(null);
            setPresetJson('');
        } catch (error) {
            alert('Invalid JSON format. Please check your configuration.');
        }
    };

    const ColorPicker = ({
        value,
        onChange,
        defaultColor = '#ffffff'
    }: {
        value?: string;
        onChange: (color: string) => void;
        defaultColor?: string;
    }) => (
        <div className="flex items-center space-x-2">
            <input
                type="color"
                value={value || defaultColor}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <button
                onClick={() => onChange('')}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                title="Clear color"
            >
                Clear
            </button>
        </div>
    );

    const toggleInlineEditColumn = (column: string) => {
        setInlineEditableColumns(prev =>
            prev.includes(column)
                ? prev.filter(col => col !== column)
                : [...prev, column]
        );
    };

    const addInlineEditColumn = (column: string) => {
        if (column && !inlineEditableColumns.includes(column)) {
            setInlineEditableColumns(prev => [...prev, column]);
        }
    };

    const removeInlineEditColumn = (column: string) => {
        setInlineEditableColumns(prev => prev.filter(col => col !== column));
    };

    const tabs = [
        { id: 'display', label: 'Display' },
        { id: 'layout', label: 'Layout' },
        { id: 'behavior', label: 'Behavior' },
        { id: 'data', label: 'Data' },
        { id: 'theme', label: 'Theme' },
        { id: 'presets', label: 'Presets' }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Table Settings</h2>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleReset}
                            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            <RotateCcw size={16} className="mr-2" />
                            Reset
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'display' && (
                        <div className="space-y-6">
                            {/* Title Panel Options */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Title Panel Options</h3>
                                <div className="space-y-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableTitle || false}
                                            onChange={(e) => updateConfig({ enableTitle: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Enable Title Panel
                                    </label>

                                    {localConfig.enableTitle && (
                                        <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={localConfig.enableNewButton || false}
                                                    onChange={(e) => updateConfig({ enableNewButton: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                Enable "+New Object" Button
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={localConfig.enableRecordCount || false}
                                                    onChange={(e) => updateConfig({ enableRecordCount: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                Show Record Count
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={localConfig.enableSortInfo || false}
                                                    onChange={(e) => updateConfig({ enableSortInfo: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                Show Sort Info
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={localConfig.enableFilterInfo || false}
                                                    onChange={(e) => updateConfig({ enableFilterInfo: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                Show Filter Info
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={localConfig.enableLastUpdated || false}
                                                    onChange={(e) => updateConfig({ enableLastUpdated: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                Show Last Updated
                                            </label>

                                            <div className="flex items-center space-x-3">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={localConfig.enableTitleBackground || false}
                                                        onChange={(e) => updateConfig({ enableTitleBackground: e.target.checked })}
                                                        className="mr-2"
                                                    />
                                                    Title Background
                                                </label>
                                                {localConfig.enableTitleBackground && (
                                                    <ColorPicker
                                                        value={localConfig.titleBackgroundColor}
                                                        onChange={(color) => updateConfig({ titleBackgroundColor: color })}
                                                        defaultColor="#ffffff"
                                                    />
                                                )}
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <label className="text-sm font-medium">Title-Table Spacing:</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="32"
                                                    value={localConfig.titleTableSpacing || 0}
                                                    onChange={(e) => updateConfig({ titleTableSpacing: parseInt(e.target.value) })}
                                                    className="flex-1"
                                                />
                                                <span className="text-sm text-gray-500 w-12">{localConfig.titleTableSpacing || 0}px</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Table Panel Options */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Table Panel Options</h3>

                                {/* Table Panel Configuration */}
                                <div className="mb-6">
                                    <h4 className="text-md font-medium mb-3">Table Panel Configuration</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={localConfig.enableTablePanel || false}
                                                onChange={(e) => updateConfig({ enableTablePanel: e.target.checked })}
                                                className="mr-2"
                                            />
                                            Enable Table Panel
                                        </label>

                                        {localConfig.enableTablePanel && (
                                            <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
                                                <div className="flex items-center space-x-3">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={localConfig.tablePanelBackground !== false}
                                                            onChange={(e) => updateConfig({ tablePanelBackground: e.target.checked })}
                                                            className="mr-2"
                                                        />
                                                        Panel Background
                                                    </label>
                                                    {localConfig.tablePanelBackground !== false && (
                                                        <ColorPicker
                                                            value={localConfig.tablePanelBackgroundColor}
                                                            onChange={(color) => updateConfig({ tablePanelBackgroundColor: color })}
                                                            defaultColor="#ffffff"
                                                        />
                                                    )}
                                                </div>

                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={localConfig.enablePresetSelector !== false}
                                                        onChange={(e) => updateConfig({ enablePresetSelector: e.target.checked })}
                                                        className="mr-2"
                                                    />
                                                    Preset Selector
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Button Display Types & Alignment */}
                                {localConfig.enableTablePanel && (
                                    <div className="mb-6">
                                        <h4 className="text-md font-medium mb-3">Button Display Types & Alignment</h4>
                                        <div className="space-y-3">
                                            {[
                                                { key: 'search', label: 'Search', enableKey: 'enableSearch', options: ['icon', 'button'] },
                                                { key: 'sort', label: 'Sort', enableKey: 'enableSort', options: ['icon', 'button'] },
                                                { key: 'filter', label: 'Filter', enableKey: 'enableFilter', options: ['icon', 'button'] },
                                                { key: 'columnVisibility', label: 'Column Visibility', enableKey: 'enableColumnVisibility', options: ['icon', 'button'] },
                                                { key: 'refresh', label: 'Refresh', enableKey: 'enableRefresh', options: ['icon', 'button'] },
                                                { key: 'export', label: 'Export', enableKey: 'enableExport', options: ['icon', 'button'] },
                                                { key: 'import', label: 'Import', enableKey: 'enableImport', options: ['icon', 'button'] },
                                                { key: 'group', label: 'Group', enableKey: 'enableGroup', options: ['icon', 'button'] },
                                                { key: 'tableView', label: 'Table View', enableKey: null, options: ['icon', 'button'] },
                                                { key: 'settings', label: 'Settings', enableKey: null, options: ['icon', 'button'] },
                                                { key: 'preset', label: 'Preset', enableKey: 'enablePresetSelector', options: ['icon', 'button'] }
                                            ].map(({ key, label, enableKey, options }) => (
                                                <div key={key} className="flex items-center justify-between p-3 border border-gray-100 rounded">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        {enableKey && (
                                                            <input
                                                                type="checkbox"
                                                                checked={localConfig[enableKey as keyof TableConfig] as boolean || false}
                                                                onChange={(e) => updateConfig({ [enableKey]: e.target.checked })}
                                                                className="mr-2"
                                                            />
                                                        )}
                                                        <span className="text-sm font-medium min-w-0 flex-1">{label}</span>
                                                    </div>

                                                    <div className="flex space-x-2">
                                                        <select
                                                            value={localConfig[`${key}ButtonType` as keyof TableConfig] as string || 'icon'}
                                                            onChange={(e) => updateConfig({ [`${key}ButtonType`]: e.target.value })}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                                                        >
                                                            {options.map(option => (
                                                                <option key={option} value={option}>
                                                                    {option === 'icon' ? 'Icon' : 'Button'}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        <select
                                                            value={localConfig[`${key}ButtonAlign` as keyof TableConfig] as string || 'right'}
                                                            onChange={(e) => updateConfig({ [`${key}ButtonAlign`]: e.target.value })}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm w-16"
                                                        >
                                                            <option value="left">Left</option>
                                                            <option value="right">Right</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Table Body Options */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Table Body Options</h3>

                                {/* Freeze Pane */}
                                <div className="mb-4">
                                    <label className="flex items-center mb-2">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableStickyHeader || false}
                                            onChange={(e) => {
                                                const enabled = e.target.checked;
                                                updateConfig({
                                                    enableStickyHeader: enabled,
                                                    enableFreezeFirstColumn: enabled,
                                                    enableStickyHeader: enabled
                                                });
                                            }}
                                            className="mr-2"
                                        />
                                        Enable Freeze Pane
                                    </label>

                                    {localConfig.enableStickyHeader && (
                                        <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={localConfig.enableStickyHeader || false}
                                                    onChange={(e) => updateConfig({ enableStickyHeader: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                Freeze Header
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={localConfig.enableFreezeFirstColumn || false}
                                                    onChange={(e) => updateConfig({ enableFreezeFirstColumn: e.target.checked })}
                                                    className="mr-2"
                                                />
                                                Freeze First Column
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Column Management */}
                                <div className="mb-4">
                                    <h4 className="text-md font-medium mb-3">Column Management</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={localConfig.enableColumnResize || false}
                                                onChange={(e) => updateConfig({ enableColumnResize: e.target.checked })}
                                                className="mr-2"
                                            />
                                            Enable Column Resize
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={localConfig.enableColumnReorder || false}
                                                onChange={(e) => updateConfig({ enableColumnReorder: e.target.checked })}
                                                className="mr-2"
                                            />
                                            Enable Column Reorder
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={localConfig.enableRowReorder || false}
                                                onChange={(e) => updateConfig({ enableRowReorder: e.target.checked })}
                                                className="mr-2"
                                            />
                                            Enable Row Reorder
                                        </label>
                                    </div>
                                </div>

                                {/* Other Table Body Options */}
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableRowHoverHighlight || false}
                                            onChange={(e) => updateConfig({ enableRowHoverHighlight: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Row Hover Highlight
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableStripedRows || false}
                                            onChange={(e) => updateConfig({ enableStripedRows: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Striped Rows
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableRowDivider || false}
                                            onChange={(e) => updateConfig({ enableRowDivider: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Row Dividers
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableColumnDivider || false}
                                            onChange={(e) => updateConfig({ enableColumnDivider: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Column Dividers
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableRowNumber || false}
                                            onChange={(e) => updateConfig({ enableRowNumber: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Row Numbers
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableWrapText || false}
                                            onChange={(e) => updateConfig({ enableWrapText: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Wrap Text
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableTooltips || false}
                                            onChange={(e) => updateConfig({ enableTooltips: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Tooltips
                                    </label>
                                </div>

                                {/* Table Background */}
                                <div className="mt-4 flex items-center space-x-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.tableBackground || false}
                                            onChange={(e) => updateConfig({ tableBackground: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Table Background
                                    </label>
                                    {localConfig.tableBackground && (
                                        <ColorPicker
                                            value={localConfig.tableBackgroundColor}
                                            onChange={(color) => updateConfig({ tableBackgroundColor: color })}
                                            defaultColor="#ffffff"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Table Footer Options */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Table Footer Options</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enablePagination || false}
                                            onChange={(e) => updateConfig({ enablePagination: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Enable Pagination
                                    </label>

                                    {localConfig.enablePagination && (
                                        <div className="flex items-center space-x-2">
                                            <label className="text-sm">Page Size:</label>
                                            <select
                                                value={localConfig.pageSize || 25}
                                                onChange={(e) => updateConfig({ pageSize: parseInt(e.target.value) })}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                            >
                                                <option value={10}>10</option>
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div className="space-y-6">
                            {/* Table View */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Table View</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {['default', 'compact', 'comfortable', 'spacious'].map((view) => (
                                        <label key={view} className="flex items-center">
                                            <input
                                                type="radio"
                                                name="tableView"
                                                value={view}
                                                checked={localConfig.tableView === view}
                                                onChange={(e) => updateConfig({ tableView: e.target.value as any })}
                                                className="mr-2"
                                            />
                                            {view.charAt(0).toUpperCase() + view.slice(1)}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Row Actions */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Row Actions</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableRowActions || false}
                                            onChange={(e) => updateConfig({ enableRowActions: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Enable Row Actions
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.showRowActionsOnHover || false}
                                            onChange={(e) => updateConfig({ showRowActionsOnHover: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Show Actions on Hover
                                    </label>
                                </div>

                                {localConfig.enableRowActions && (
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center space-x-4">
                                            <label className="text-sm font-medium">Position:</label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="rowActionsPosition"
                                                    value="left"
                                                    checked={localConfig.rowActionsPosition === 'left'}
                                                    onChange={(e) => updateConfig({ rowActionsPosition: e.target.value as any })}
                                                    className="mr-1"
                                                />
                                                Left
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="rowActionsPosition"
                                                    value="right"
                                                    checked={localConfig.rowActionsPosition === 'right'}
                                                    onChange={(e) => updateConfig({ rowActionsPosition: e.target.value as any })}
                                                    className="mr-1"
                                                />
                                                Right
                                            </label>
                                        </div>

                                        <div className="flex items-center space-x-4">
                                            <label className="text-sm font-medium">Style:</label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="actionStyle"
                                                    value="icons"
                                                    checked={localConfig.actionStyle === 'icons'}
                                                    onChange={(e) => updateConfig({ actionStyle: e.target.value as any })}
                                                    className="mr-1"
                                                />
                                                Icons
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="actionStyle"
                                                    value="menu"
                                                    checked={localConfig.actionStyle === 'menu'}
                                                    onChange={(e) => updateConfig({ actionStyle: e.target.value as any })}
                                                    className="mr-1"
                                                />
                                                Menu
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'behavior' && (
                        <div className="space-y-6">
                            {/* Selection */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Selection</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableRowSelection || false}
                                            onChange={(e) => updateConfig({ enableRowSelection: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Enable Row Selection
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableMassSelection || false}
                                            onChange={(e) => updateConfig({ enableMassSelection: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Enable Mass Selection
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.enableBulkActions || false}
                                            onChange={(e) => updateConfig({ enableBulkActions: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Enable Bulk Actions
                                    </label>
                                </div>

                                {/* Bulk Actions Configuration */}
                                {localConfig.enableBulkActions && (
                                    <div className="mt-4 space-y-3 border-l-2 border-gray-200 pl-4">
                                        <div className="flex items-center space-x-4">
                                            <label className="text-sm font-medium">Bulk Action Style:</label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="bulkActionStyle"
                                                    value="icons"
                                                    checked={localConfig.bulkActionStyle === 'icons'}
                                                    onChange={(e) => updateConfig({ bulkActionStyle: e.target.value as any })}
                                                    className="mr-1"
                                                />
                                                Icons
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="bulkActionStyle"
                                                    value="buttons"
                                                    checked={localConfig.bulkActionStyle === 'buttons'}
                                                    onChange={(e) => updateConfig({ bulkActionStyle: e.target.value as any })}
                                                    className="mr-1"
                                                />
                                                Buttons
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Editing */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Editing</h3>
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Inline Editable Columns:</label>

                                    {/* Table format for inline editable columns */}
                                    <div className="border border-gray-200 rounded">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Editable</th>
                                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {inlineEditableColumns.map((column) => (
                                                    <tr key={column}>
                                                        <td className="px-3 py-2 text-sm text-gray-900">{fieldMappings[column] || column}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={true}
                                                                onChange={() => removeInlineEditColumn(column)}
                                                                className="text-primary"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                onClick={() => removeInlineEditColumn(column)}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Add field dropdown */}
                                    <div className="flex items-center space-x-2">
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    addInlineEditColumn(e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="">Add field for inline editing...</option>
                                            {Object.entries(fieldMappings)
                                                .filter(([key]) => !inlineEditableColumns.includes(key))
                                                .map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                        </select>
                                        <button
                                            onClick={() => {
                                                const select = document.querySelector('select') as HTMLSelectElement;
                                                if (select?.value) {
                                                    addInlineEditColumn(select.value);
                                                    select.value = '';
                                                }
                                            }}
                                            className="px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-6">
                            {/* Relationships Section - Empty for now */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Relationships</h3>
                                <p className="text-gray-500 text-sm">
                                    Relationship configuration will be available here in future updates.
                                    This will allow you to define parent-child relationships between tables.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'theme' && (
                        <div className="space-y-6">
                            {/* Theme Selection */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Table Themes</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        {
                                            id: 'default',
                                            name: 'Default',
                                            description: 'Clean and simple design with standard colors',
                                            colors: ['#f8f9fa', '#ffffff', '#6c757d']
                                        },
                                        {
                                            id: 'professional',
                                            name: 'Professional',
                                            description: 'Corporate look with mint blue accents',
                                            colors: ['#e0f2fe', '#0891b2', '#164e63']
                                        },
                                        {
                                            id: 'modern',
                                            name: 'Modern',
                                            description: 'Contemporary design with mint green highlights',
                                            colors: ['#ecfdf5', '#10b981', '#065f46']
                                        },
                                        {
                                            id: 'minimal',
                                            name: 'Minimal',
                                            description: 'Ultra-clean design with subtle mint yellow touches',
                                            colors: ['#fefce8', '#eab308', '#713f12']
                                        },
                                        {
                                            id: 'executive',
                                            name: 'Executive',
                                            description: 'Premium dark theme with gold accents',
                                            colors: ['#1f2937', '#374151', '#f59e0b']
                                        },
                                        {
                                            id: 'corporate',
                                            name: 'Corporate',
                                            description: 'Traditional business theme with navy blue',
                                            colors: ['#eff6ff', '#1e40af', '#1e3a8a']
                                        },
                                        {
                                            id: 'finance',
                                            name: 'Finance',
                                            description: 'Professional financial theme with emerald accents',
                                            colors: ['#f0fdf4', '#059669', '#064e3b']
                                        },
                                        {
                                            id: 'tech',
                                            name: 'Tech',
                                            description: 'Modern technology theme with purple highlights',
                                            colors: ['#faf5ff', '#7c3aed', '#581c87']
                                        },
                                        {
                                            id: 'healthcare',
                                            name: 'Healthcare',
                                            description: 'Clean medical theme with teal accents',
                                            colors: ['#f0fdfa', '#0d9488', '#134e4a']
                                        }
                                    ].map((theme) => (
                                        <label key={theme.id} className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="theme"
                                                value={theme.id}
                                                checked={localConfig.theme === theme.id}
                                                onChange={(e) => updateConfig({ theme: e.target.value as any })}
                                                className="mr-3 mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium">{theme.name}</h4>
                                                    <div className="flex space-x-1">
                                                        {theme.colors.map((color, index) => (
                                                            <div
                                                                key={index}
                                                                className="w-4 h-4 rounded-full border border-gray-300"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">{theme.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'presets' && (
                        <div className="space-y-6">
                            {/* Preset Management */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium mb-4">Saved Presets</h3>
                                <div className="space-y-3">
                                    {presets.map((preset) => (
                                        <div key={preset.id} className="flex items-center justify-between p-3 border border-gray-100 rounded">
                                            <div className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="selectedPreset"
                                                    value={preset.id}
                                                    checked={selectedPreset === preset.id}
                                                    onChange={() => {
                                                        setSelectedPreset(preset.id);
                                                        applyPreset(preset.id);
                                                    }}
                                                    className="mr-3"
                                                />
                                                <div>
                                                    <h4 className="font-medium">{preset.name}</h4>
                                                    {preset.isDefault && (
                                                        <span className="text-xs text-blue-600">Default</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                {!preset.isDefault && (
                                                    <>
                                                        <button
                                                            onClick={() => editPresetJson(preset.id)}
                                                            className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                                        >
                                                            <Edit size={14} className="mr-1" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deletePreset(preset.id)}
                                                            className="flex items-center px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                                                        >
                                                            <Trash2 size={14} className="mr-1" />
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* JSON Editor */}
                            {editingPreset && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <h3 className="text-lg font-medium mb-4">Edit Preset JSON</h3>
                                    <textarea
                                        value={presetJson}
                                        onChange={(e) => setPresetJson(e.target.value)}
                                        className="w-full h-64 p-3 border border-gray-300 rounded font-mono text-sm"
                                        placeholder="Enter JSON configuration..."
                                    />
                                    <div className="mt-3 flex space-x-2">
                                        <button
                                            onClick={savePresetJson}
                                            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                                        >
                                            Save JSON
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingPreset(null);
                                                setPresetJson('');
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={saveCurrentAsPreset}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        <Plus size={16} className="mr-2" />
                        Save Current Settings as Preset
                    </button>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                        >
                            <Save size={16} className="mr-2" />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
