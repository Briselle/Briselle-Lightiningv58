import React, { useState } from 'react';
import { Save, Trash2, AlertTriangle, Edit, Eye } from 'lucide-react';

interface PresetSettingsSectionProps {
    selectedPreset: string;
    customPresets: any[];
    onPresetChange: (presetId: string) => void;
    onSavePreset: () => void;
    onDeletePreset: (id: string) => void;
    onFactoryReset: () => void;
}

const defaultPresets = [
    { id: 'default', name: 'Default', description: 'Standard table configuration' },
    { id: 'salesforce', name: 'Salesforce Classic', description: 'Salesforce Lightning inspired design' },
    { id: 'minimal', name: 'Minimal', description: 'Clean and simple layout' },
    { id: 'professional', name: 'Professional', description: 'Business-focused styling' },
];

const PresetSettingsSection: React.FC<PresetSettingsSectionProps> = ({
    selectedPreset,
    customPresets,
    onPresetChange,
    onSavePreset,
    onDeletePreset,
    onFactoryReset,
}) => {
    const [showJsonEditor, setShowJsonEditor] = useState<string | null>(null);
    const [jsonContent, setJsonContent] = useState('');

    const handleEditJson = (preset: any) => {
        setJsonContent(JSON.stringify(preset.config || {}, null, 2));
        setShowJsonEditor(preset.id);
    };

    const handleSaveJson = () => {
        try {
            const parsedConfig = JSON.parse(jsonContent);
            // Here you would update the preset with the new config
            console.log('Updated config:', parsedConfig);
            setShowJsonEditor(null);
        } catch (error) {
            alert('Invalid JSON format');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Preset Management</h3>
            </div>

            {/* Current Preset Selection */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Select Preset</h4>
                <select 
                    className="input w-full" 
                    value={selectedPreset} 
                    onChange={(e) => onPresetChange(e.target.value)}
                >
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
            </div>

            {/* Save Current Settings */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-md font-semibold text-blue-800 mb-2">Save Current Settings</h4>
                <p className="text-sm text-blue-700 mb-3">
                    Save your current table configuration as a new preset. Note: Tab panel and Title panel settings are not included in presets.
                </p>
                <button onClick={onSavePreset} className="btn btn-primary">
                    <Save size={16} className="mr-2" /> Save Current as New Preset
                </button>
            </div>

            {/* Saved Presets */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Saved Presets</h4>
                
                {/* Default Presets */}
                <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Default Presets</h5>
                    <div className="space-y-2">
                        {defaultPresets.map(preset => (
                            <div key={preset.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex-grow">
                                    <div className="font-medium text-sm text-gray-900">{preset.name}</div>
                                    <div className="text-xs text-gray-500">{preset.description}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Default</span>
                                    <button
                                        onClick={() => onPresetChange(preset.id)}
                                        className={`px-3 py-1 text-xs rounded ${
                                            selectedPreset === preset.id
                                                ? 'bg-blue-100 text-blue-600'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {selectedPreset === preset.id ? 'Active' : 'Select'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Presets */}
                {customPresets.length > 0 && (
                    <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Custom Presets</h5>
                        <div className="space-y-2">
                            {customPresets.map(preset => (
                                <div key={preset.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                    <div className="flex-grow">
                                        <div className="font-medium text-sm text-gray-900">{preset.name}</div>
                                        <div className="text-xs text-gray-500">Custom preset</div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleEditJson(preset)}
                                            className="p-1 text-gray-500 hover:text-blue-600"
                                            title="Edit JSON"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDeletePreset(preset.id)}
                                            className="p-1 text-gray-500 hover:text-red-600"
                                            title="Delete preset"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onPresetChange(preset.id)}
                                            className={`px-3 py-1 text-xs rounded ${
                                                selectedPreset === preset.id
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {selectedPreset === preset.id ? 'Active' : 'Select'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {customPresets.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                        No custom presets created yet
                    </div>
                )}
            </div>

            {/* Factory Reset */}

            {/* JSON Editor Modal */}
            {showJsonEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Edit Preset JSON</h3>
                            <button 
                                onClick={() => setShowJsonEditor(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <textarea
                                value={jsonContent}
                                onChange={(e) => setJsonContent(e.target.value)}
                                className="w-full h-full font-mono text-sm border border-gray-300 rounded p-3 resize-none"
                                placeholder="Enter JSON configuration..."
                            />
                        </div>
                        <div className="flex justify-end space-x-3 mt-4">
                            <button 
                                onClick={() => setShowJsonEditor(null)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveJson}
                                className="btn btn-primary"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PresetSettingsSection;