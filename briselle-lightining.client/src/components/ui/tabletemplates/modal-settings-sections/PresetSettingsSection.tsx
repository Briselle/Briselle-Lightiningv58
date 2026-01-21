import React, { useState } from 'react';
import { Save, Trash2, Edit, Eye, FileJson } from 'lucide-react';
import { TablePreset } from '../../action-components/Action_Preset';
import { TableConfig } from '../../ConfigurableListTemplate';

interface PresetSettingsSectionProps {
    selectedPreset: string;
    systemPresets?: TablePreset[];
    customPresets: TablePreset[];
    onPresetChange: (presetId: string) => void;
    onSavePreset: () => void;
    onDeletePreset: (id: string) => void;
    onFactoryReset: () => void;
    onPresetsChange?: (presets: TablePreset[]) => void;
    onConfigChange?: (config: TableConfig) => void; // Callback to update config when JSON is edited
    currentConfig?: TableConfig; // Current config to save as new preset
    onPresetSelect?: (presetId: string) => void;
    modalHeaderFontSize?: number;
    modalContentFontSize?: number;
}

const PresetSettingsSection: React.FC<PresetSettingsSectionProps> = ({
    selectedPreset,
    systemPresets = [],
    customPresets,
    onPresetChange,
    onSavePreset,
    onDeletePreset,
    onFactoryReset,
    onPresetsChange,
    onConfigChange,
    currentConfig,
    onPresetSelect,
    modalHeaderFontSize,
    modalContentFontSize,
}) => {
    const [showJsonEditor, setShowJsonEditor] = useState<string | null>(null);
    const [jsonContent, setJsonContent] = useState('');
    const [editingPreset, setEditingPreset] = useState<TablePreset | null>(null);
    const [editingNameId, setEditingNameId] = useState<string | null>(null);
    const [editingNameValue, setEditingNameValue] = useState<string>('');

    const handleEditJson = (preset: TablePreset) => {
        setJsonContent(JSON.stringify(preset.config || {}, null, 2));
        setEditingPreset(preset);
        setShowJsonEditor(preset.id);
    };

    const handleSaveJson = () => {
        try {
            const parsedConfig = JSON.parse(jsonContent);
            
            if (!editingPreset) return;
            
            // Update the preset with new config
            const updatedPreset: TablePreset = {
                ...editingPreset,
                config: parsedConfig
            };
            
            // Update presets list
            if (onPresetsChange) {
                // Keep system presets untouched; update only matching preset
                const systemIds = new Set(systemPresets.map(p => p.id));
                const updatedCustom = customPresets.map(p =>
                    p.id === editingPreset.id ? updatedPreset : p
                );
                const updatedPresets = [
                    ...systemPresets,
                    ...updatedCustom
                ].filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
                onPresetsChange(updatedPresets);
            }
            
            // Apply the updated config to the UI immediately
            if (onConfigChange) {
                onConfigChange(parsedConfig);
            }
            if (onPresetSelect) {
                onPresetSelect(editingPreset.id);
            }
            
            // If this is a custom preset, save to localStorage
            if (!editingPreset.isDefault) {
                const updatedCustomPresets = customPresets.map(p => 
                    p.id === editingPreset.id ? updatedPreset : p
                );
                localStorage.setItem('customTablePresets', JSON.stringify(updatedCustomPresets));
            }
            
            setShowJsonEditor(null);
            setEditingPreset(null);
        } catch (error) {
            alert('Invalid JSON format. Please check your JSON syntax.');
            console.error('JSON parse error:', error);
        }
    };

    const startEditingName = (preset: TablePreset) => {
        setEditingNameId(preset.id);
        setEditingNameValue(preset.name);
    };

    const commitEditingName = () => {
        if (!editingNameId) return;
        const trimmed = editingNameValue.trim();
        if (!trimmed) {
            setEditingNameId(null);
            return;
        }

        // Update presets list - system presets can't be renamed in storage, but can be renamed in memory for this session
        const systemIds = new Set(systemPresets.map(p => p.id));
        const updateName = (p: TablePreset) => p.id === editingNameId ? { ...p, name: trimmed } : p;

        // For system presets, we update in memory only (they'll reset on refresh)
        // For custom presets, we persist to localStorage
        const updatedSystem = systemPresets.map(updateName);
        const updatedCustom = customPresets.map(updateName);
        const updatedPresets = [...updatedSystem, ...updatedCustom].filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);

        // Always update parent to sync name across components
        if (onPresetsChange) {
            onPresetsChange(updatedPresets);
        }

        // Persist custom preset rename to localStorage
        const updatedCustomOnly = updatedCustom.filter(p => !systemIds.has(p.id));
        if (updatedCustomOnly.length > 0) {
            localStorage.setItem('customTablePresets', JSON.stringify(updatedCustomOnly));
        }

        setEditingNameId(null);
    };

    const cancelEditingName = () => {
        setEditingNameId(null);
    };

    const handleSaveCurrentAsPreset = () => {
        if (!currentConfig) {
            alert('No current configuration to save');
            return;
        }
        
        const presetName = prompt('Enter preset name:');
        if (!presetName || !presetName.trim()) {
            return;
        }
        
        const trimmedName = presetName.trim();
        
        // Check for duplicate names
        const allPresets = [...systemPresets, ...customPresets];
        if (allPresets.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
            if (!confirm(`A preset named "${trimmedName}" already exists. Overwrite it?`)) {
                return;
            }
            // Remove existing preset with same name
            const existingPreset = allPresets.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
            if (existingPreset) {
                const systemIds = new Set(systemPresets.map(p => p.id));
                const filteredCustom = customPresets.filter(p => p.id !== existingPreset.id && !systemIds.has(p.id));
                const updatedPresets = [...systemPresets, ...filteredCustom];
                if (onPresetsChange) {
                    onPresetsChange(updatedPresets);
                }
                const updatedCustomOnly = updatedPresets.filter(p => !systemIds.has(p.id));
                localStorage.setItem('customTablePresets', JSON.stringify(updatedCustomOnly));
            }
        }
        
        const newPresetId = `custom-${Date.now()}`;
        const newPreset: TablePreset = {
            id: newPresetId,
            presetId: newPresetId,
            name: trimmedName,
            config: { ...currentConfig },
            isDefault: false
        };
        
        // Build new preset list without duplicates; never duplicate system presets
        const systemIds = new Set(systemPresets.map(p => p.id));
        const filteredCustom = customPresets.filter(p => p.id !== newPreset.id && !systemIds.has(p.id));
        const updatedPresets = [
            ...systemPresets,
            ...filteredCustom,
            newPreset
        ];

        // Update parent component - this syncs to action panel
        if (onPresetsChange) {
            onPresetsChange(updatedPresets);
        }
        
        // Save to localStorage (only custom presets)
        const updatedCustomPresets = updatedPresets.filter(p => !systemIds.has(p.id));
        localStorage.setItem('customTablePresets', JSON.stringify(updatedCustomPresets));
        
        // Set as active preset and apply config
        if (onPresetSelect) {
            onPresetSelect(newPreset.id);
        }
        if (onConfigChange) {
            onConfigChange(newPreset.config);
        }

        alert(`Preset "${trimmedName}" saved successfully!`);
    };

    const allPresets = [...systemPresets, ...customPresets];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Preset Management</h3>
            </div>

            {/* Save Current Settings */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2" style={{ fontSize: `${modalHeaderFontSize || 16}px` }}>Save Current Settings</h4>
                <p className="text-sm text-blue-700 mb-3" style={{ fontSize: `${modalContentFontSize || 14}px` }}>
                    Save your current table configuration as a new preset. This will create a new JSON preset that you can edit later.
                </p>
                <button onClick={handleSaveCurrentAsPreset} className="btn btn-primary">
                    <Save size={16} className="mr-2" /> Save Current as New Preset
                </button>
            </div>

            {/* Presets Table */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">All Presets</h4>
                
                {allPresets.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Preset Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Type</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                        {allPresets.map(preset => (
                                    <tr 
                                        key={preset.id} 
                                        className={`hover:bg-gray-50 ${selectedPreset === preset.id ? 'bg-blue-50' : ''}`}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {editingNameId === preset.id ? (
                                                <input
                                                    value={editingNameValue}
                                                    onChange={(e) => setEditingNameValue(e.target.value)}
                                                    onBlur={commitEditingName}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') commitEditingName();
                                                        if (e.key === 'Escape') cancelEditingName();
                                                    }}
                                                    autoFocus
                                                    className="w-full border border-blue-300 rounded px-2 py-1 text-sm"
                                                />
                                            ) : (
                                                <span
                                                    onDoubleClick={() => startEditingName(preset)}
                                                    className="cursor-text"
                                                >
                                                    {preset.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            <span className={`px-2 py-1 text-xs rounded ${
                                                preset.isDefault 
                                                    ? 'bg-gray-100 text-gray-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {preset.isDefault ? 'System Defined' : 'Custom'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {selectedPreset === preset.id ? (
                                                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Active</span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => startEditingName(preset)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Rename preset"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleEditJson(preset)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Edit JSON"
                                                >
                                                    <FileJson size={16} />
                                                </button>
                                                {!preset.isDefault && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
                                                                onDeletePreset(preset.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete preset"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onPresetChange(preset.id)}
                                                    className={`px-3 py-1 text-xs rounded transition-colors ${
                                                        selectedPreset === preset.id
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {selectedPreset === preset.id ? 'Active' : 'Select'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No presets available
                    </div>
                )}
            </div>

            {/* JSON Editor Modal */}
            {showJsonEditor && editingPreset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowJsonEditor(null)}>
                    <div 
                        className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Edit Preset JSON</h3>
                                <p className="text-sm text-gray-500 mt-1">Editing: <strong>{editingPreset.name}</strong></p>
                                <p className="text-xs text-gray-400 mt-1">Changes will be applied immediately to the UI</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowJsonEditor(null);
                                    setEditingPreset(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex-grow overflow-hidden mb-4">
                            <textarea
                                value={jsonContent}
                                onChange={(e) => setJsonContent(e.target.value)}
                                className="w-full h-full font-mono text-sm border border-gray-300 rounded p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter JSON configuration..."
                                spellCheck={false}
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                                <strong>Note:</strong> Changes will update the UI immediately. Custom presets will be saved to localStorage.
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button 
                                    onClick={() => {
                                        setShowJsonEditor(null);
                                        setEditingPreset(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveJson}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    <Save size={16} className="inline mr-2" />
                                    Save & Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PresetSettingsSection;
