import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TabItem } from '../table-components/TableTabPanel';

interface TabSettingsSectionProps {
    config: {
        enableTabs: boolean;
        tabHeight: 'small' | 'medium' | 'large';
        tabAlignment: 'left' | 'right' | 'center';
        tabOrientation: 'horizontal' | 'vertical';
        tabLabelWidth: number;
        tabCustomSelection: boolean;
        tabSelectionColor: string;
        tabCustomHover: boolean;
        tabHoverColor: string;
        tabPanelBackground: string;
        tabList: TabItem[];
    };
    customPresets: any[];
    onChange: (key: string, value: any) => void;
}

const defaultPresets = [
    { id: 'default', name: 'Default' },
    { id: 'salesforce', name: 'Salesforce Classic' },
    { id: 'minimal', name: 'Minimal' },
    { id: 'professional', name: 'Professional' },
];

const TabSettingsSection: React.FC<TabSettingsSectionProps> = ({
    config,
    customPresets,
    onChange,
}) => {
    const [newTabLabel, setNewTabLabel] = useState('');
    const [newTabPreset, setNewTabPreset] = useState('');

    const handleAddTab = () => {
        if (newTabLabel && newTabPreset) {
            const newTab: TabItem = {
                id: `tab-${Date.now()}`,
                label: newTabLabel,
                presetId: newTabPreset,
            };
            onChange('tabList', [...config.tabList, newTab]);
            setNewTabLabel('');
            setNewTabPreset('');
        }
    };

    const handleDeleteTab = (id: string) => {
        if (window.confirm('Are you sure you want to remove this tab?')) {
            onChange('tabList', config.tabList.filter(tab => tab.id !== id));
        }
    };

    const salesforceColors = [
        '#0176d3', '#014486', '#032d60', '#0d9dda', '#16325c',
        '#5eb4ff', '#1b96ff', '#0070d2', '#005fb2', '#004c99'
    ];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Tab Configuration</h3>
            </div>

            {/* Enable Tabs */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center space-x-2">
                    <input 
                        type="checkbox" 
                        checked={config.enableTabs} 
                        onChange={(e) => onChange('enableTabs', e.target.checked)} 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-gray-800">Enable Tabs</span>
                </label>
            </div>

            {config.enableTabs && (
                <>
                    {/* Tab Configuration */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Tab Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tab Height</label>
                                <select 
                                    className="input" 
                                    value={config.tabHeight} 
                                    onChange={(e) => onChange('tabHeight', e.target.value)}
                                >
                                    <option value="small">Small (20px)</option>
                                    <option value="medium">Medium (26px)</option>
                                    <option value="large">Large (30px)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tab Alignment</label>
                                <select 
                                    className="input" 
                                    value={config.tabAlignment} 
                                    onChange={(e) => onChange('tabAlignment', e.target.value)}
                                >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tab Orientation</label>
                                <select 
                                    className="input" 
                                    value={config.tabOrientation} 
                                    onChange={(e) => onChange('tabOrientation', e.target.value)}
                                >
                                    <option value="horizontal">Horizontal</option>
                                    <option value="vertical">Vertical</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tab Label Width (px)</label>
                                <input 
                                    type="number" 
                                    min="100" 
                                    max="200" 
                                    value={config.tabLabelWidth} 
                                    onChange={(e) => onChange('tabLabelWidth', Number(e.target.value))} 
                                    className="input" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tab Behaviors */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Tab Behaviors</h4>
                        <div className="space-y-4">
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.tabCustomSelection} 
                                    onChange={(e) => onChange('tabCustomSelection', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Custom Selection Color</span>
                            </label>
                            
                            {config.tabCustomSelection && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Selection Color</label>
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="color" 
                                            value={config.tabSelectionColor} 
                                            onChange={(e) => onChange('tabSelectionColor', e.target.value)} 
                                            className="w-8 h-8 rounded border border-gray-300"
                                        />
                                        <div className="flex space-x-1">
                                            {salesforceColors.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => onChange('tabSelectionColor', color)}
                                                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                    style={{ backgroundColor: color }}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => onChange('tabSelectionColor', '#0176d3')}
                                            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.tabCustomHover} 
                                    onChange={(e) => onChange('tabCustomHover', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Custom Hover Color</span>
                            </label>
                            
                            {config.tabCustomHover && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hover Color</label>
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="color" 
                                            value={config.tabHoverColor} 
                                            onChange={(e) => onChange('tabHoverColor', e.target.value)} 
                                            className="w-8 h-8 rounded border border-gray-300"
                                        />
                                        <div className="flex space-x-1">
                                            {salesforceColors.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => onChange('tabHoverColor', color)}
                                                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                    style={{ backgroundColor: color }}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => onChange('tabHoverColor', '#014486')}
                                            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tab Panel Background</label>
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="color" 
                                        value={config.tabPanelBackground} 
                                        onChange={(e) => onChange('tabPanelBackground', e.target.value)} 
                                        className="w-8 h-8 rounded border border-gray-300"
                                    />
                                    <button 
                                        onClick={() => onChange('tabPanelBackground', '#ffffff')}
                                        className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab List */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Tab List</h4>
                        
                        {/* Add New Tab */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <input 
                                type="text" 
                                placeholder="Tab Label" 
                                value={newTabLabel} 
                                onChange={(e) => setNewTabLabel(e.target.value)} 
                                className="input" 
                            />
                            <select 
                                className="input" 
                                value={newTabPreset} 
                                onChange={(e) => setNewTabPreset(e.target.value)}
                            >
                                <option value="">Select Preset</option>
                                <optgroup label="Default Presets">
                                    {defaultPresets.map(preset => (
                                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                                    ))}
                                </optgroup>
                                {customPresets.length > 0 && (
                                    <optgroup label="Custom Presets">
                                        {customPresets.map(preset => (
                                            <option key={preset.id} value={preset.id}>{preset.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <button 
                                onClick={handleAddTab} 
                                disabled={!newTabLabel || !newTabPreset}
                                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={16} className="mr-1" /> Add
                            </button>
                        </div>
                        
                        {/* Tab List Display */}
                        {config.tabList.length > 0 ? (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Preset</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {config.tabList.map((tab, index) => (
                                            <tr key={tab.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-3 py-2 text-sm font-medium text-gray-900">{tab.label}</td>
                                                <td className="px-3 py-2 text-sm text-gray-600">{tab.presetId}</td>
                                                <td className="px-3 py-2">
                                                    <button
                                                        onClick={() => handleDeleteTab(tab.id)}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                        title="Remove tab"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-lg bg-gray-50">
                                No tabs added yet. Add a tab above to get started.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default TabSettingsSection;