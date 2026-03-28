import React, { useState } from 'react';
import { Save, Trash2, Edit, Eye, FileJson, GripVertical } from 'lucide-react';
import { TablePreset } from '../../action-components/Action_Preset';
import { TableConfig } from '../../ConfigurableListTemplate';
import { getDefaultPreset } from '../utils/presets';
import { TAB_ICON_CUSTOM_KEY, TabBarIcon, TabIconPickerSelect } from '../utils/tabBarIcons';
import type { TableQueryState } from '../utils/tableUserViewStorage';
import { appendPresetToDB, removePresetFromDB, updateSinglePresetInDB, savePresetOrderToDB, DB_ENTITY_ID, DB_DOBJ_ID } from '../utils/configService';

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
    /** Embeds as `savedQueryState` on the new preset (preset-level defaults for query UI) */
    currentTableQueryState?: TableQueryState | null;
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
    currentTableQueryState,
    onPresetSelect,
    modalHeaderFontSize,
    modalContentFontSize,
}) => {
    const [showJsonEditor, setShowJsonEditor] = useState<string | null>(null);
    const [jsonContent, setJsonContent] = useState('');
    const [editingPreset, setEditingPreset] = useState<TablePreset | null>(null);
    const [editingNameId, setEditingNameId] = useState<string | null>(null);
    const [editingNameValue, setEditingNameValue] = useState<string>('');
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetIconKey, setNewPresetIconKey] = useState('preset');
    const [newPresetCustomIcon, setNewPresetCustomIcon] = useState('');

    const handleEditJson = (preset: TablePreset) => {
        setJsonContent(JSON.stringify(preset.config || {}, null, 2));
        setEditingPreset(preset);
        setShowJsonEditor(preset.id);
    };

    const handleSaveJson = () => {
        try {
            const parsedConfig = JSON.parse(jsonContent);
            if (!editingPreset) return;
            if (editingPreset.id === 'default') {
                alert(
                    'The Default preset is protected and cannot be overwritten in the database. Save your changes as a new preset, or use Restore Default (code → database) in Table Settings → Tabs.'
                );
                return;
            }

            const updatedPreset: TablePreset = { ...editingPreset, config: parsedConfig };

            const updated = allPresets.map((p) => (p.id === editingPreset.id ? updatedPreset : p));
            onPresetsChange?.(updated);

            if (onConfigChange) onConfigChange(parsedConfig);
            if (onPresetSelect) onPresetSelect(editingPreset.id);

            // Push only this preset's config to DB
            updateSinglePresetInDB(editingPreset.id, { config: parsedConfig }).then(({ error }) => {
                if (error) alert(error);
            });

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
        if (editingNameId === 'default') {
            alert('The Default preset name is protected.');
            setEditingNameId(null);
            return;
        }

        const updated = allPresets.map((p) => (p.id === editingNameId ? { ...p, name: trimmed } : p));
        onPresetsChange?.(updated);

        // Push rename to DB
        updateSinglePresetInDB(editingNameId, { name: trimmed }).then(({ error }) => {
            if (error) console.warn('[PresetSettings] DB rename failed:', error);
        });

        setEditingNameId(null);
    };

    const cancelEditingName = () => {
        setEditingNameId(null);
    };

    const handleSaveCurrentAsPreset = async () => {
        if (!currentConfig) {
            alert('No current configuration to save');
            return;
        }

        const trimmedName = newPresetName.trim();
        if (trimmedName.length <= 3) {
            alert('Preset name must be more than 3 characters.');
            return;
        }
        if (trimmedName.length >= 30) {
            alert('Preset name must be less than 30 characters.');
            return;
        }

        const systemIds = new Set(systemPresets.map((p) => p.id));
        const duplicate = [...systemPresets, ...customPresets].find(
            (p) => (p?.name || '').toLowerCase() === trimmedName.toLowerCase()
        );
        let customOnly = customPresets.filter((p) => !systemIds.has(p.id));

        if (duplicate) {
            if (systemIds.has(duplicate.id)) {
                alert(
                    `The name "${trimmedName}" is already used by a built-in preset. Please choose a different name.`
                );
                return;
            }
            if (
                !confirm(
                    `A custom preset named "${trimmedName}" already exists. Replace it with your current settings?`
                )
            ) {
                alert('Save cancelled. No changes were made.');
                return;
            }
            customOnly = customOnly.filter((p) => p.id !== duplicate.id);
        }
        
        // Get default preset structure to ensure all parameters are included
        const defaultPreset = getDefaultPreset();
        
        // Merge current config on top of default preset config structure
        // This ensures all parameters from default preset are included,
        // with current config values overriding where they exist
        const DEFAULT_TAB = { id: 'tab-default', label: 'Default', presetId: 'default', iconKey: 'list' };
        const mergedTabList = currentConfig?.tabList?.length
            ? (currentConfig.tabList.some((t: any) => t.presetId === 'default') ? currentConfig.tabList : [DEFAULT_TAB, ...currentConfig.tabList])
            : [DEFAULT_TAB];

        const completeConfig: TableConfig = {
            ...defaultPreset.config,
            ...currentConfig,
            tabList: mergedTabList,
            ...(currentTableQueryState ? { savedQueryState: currentTableQueryState } : {}),
        };
        
        const newPresetId = `custom-${Date.now()}`;
        const newPreset: TablePreset = {
            id: newPresetId,
            presetId: newPresetId,
            name: trimmedName,
            config: completeConfig,
            isDefault: false,
            iconKey: newPresetIconKey,
            customIcon: newPresetIconKey === TAB_ICON_CUSTOM_KEY ? newPresetCustomIcon.trim() || undefined : undefined,
        };

        const { success, error: dbError } = await appendPresetToDB(newPreset);
        if (!success) {
            console.error('[PresetSettings] DB append failed:', dbError);
            alert(
                `Preset was not saved to the database.\n\n${
                    dbError || 'Unknown error'
                }\n\nCheck the browser console and ensure platform_config has a row for entity ${DB_ENTITY_ID}, dobj ${DB_DOBJ_ID}, config_type 3.`
            );
            return;
        }

        const updatedPresets = [...systemPresets, ...customOnly, newPreset];
        onPresetsChange?.(updatedPresets);

        if (onPresetSelect) {
            onPresetSelect(newPreset.id);
        }
        if (onConfigChange) {
            onConfigChange(newPreset.config);
        }

        setNewPresetName('');
        setNewPresetIconKey('preset');
        setNewPresetCustomIcon('');
        alert(`Preset "${trimmedName}" saved successfully!`);
    };

    const allPresets = [...systemPresets, ...customPresets];

    const handlePresetDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handlePresetDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handlePresetDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (dragIndex === dropIndex) return;
        const reordered = [...allPresets];
        const [dragged] = reordered.splice(dragIndex, 1);
        reordered.splice(dropIndex, 0, dragged);
        onPresetsChange?.(reordered);

        // Push reorder to DB
        savePresetOrderToDB(reordered, selectedPreset || 'default').then(({ error }) => {
            if (error) console.warn('[PresetSettings] DB reorder failed:', error);
        });
    };

    const handlePresetIconUpdate = (preset: TablePreset, iconKey: string, customIcon: string) => {
        if (preset.id === 'default') {
            alert('The Default preset icon is protected.');
            return;
        }
        const c = iconKey === TAB_ICON_CUSTOM_KEY ? customIcon.trim() : '';
        const next: TablePreset = {
            ...preset,
            iconKey,
            customIcon: c || undefined,
        };
        const updated = allPresets.map((p) => (p.id === preset.id ? next : p));
        onPresetsChange?.(updated);

        // Push icon change to DB
        updateSinglePresetInDB(preset.id, { iconKey, customIcon: c || 'none' }).then(({ error }) => {
            if (error) console.warn('[PresetSettings] DB icon update failed:', error);
        });
    };

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
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        maxLength={29}
                        placeholder="Input Preset Name"
                        className="input h-9 text-sm min-w-[180px] flex-[1_1_240px]"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                        <TabBarIcon
                            iconKey={newPresetIconKey}
                            customIcon={newPresetCustomIcon}
                            size={18}
                        />
                        <TabIconPickerSelect
                            value={newPresetIconKey}
                            onChange={setNewPresetIconKey}
                            showSearch={false}
                            dense={true}
                        />
                        {newPresetIconKey === TAB_ICON_CUSTOM_KEY && (
                            <input
                                type="text"
                                className="input h-9 text-sm w-[100px]"
                                placeholder="Emoji"
                                value={newPresetCustomIcon}
                                onChange={(e) => setNewPresetCustomIcon(e.target.value)}
                                maxLength={8}
                            />
                        )}
                    </div>
                    <button
                        onClick={handleSaveCurrentAsPreset}
                        className="btn btn-primary shrink-0"
                        disabled={newPresetName.trim().length === 0 || newPresetName.trim().length >= 30}
                        title="Save current configuration as new preset"
                    >
                        <Save size={16} className="mr-2" /> Save as Preset
                    </button>
                </div>
            </div>

            {/* Presets Table */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">All Presets</h4>
                
                {allPresets.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 w-[40%] text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Preset Name</th>
                                    <th className="px-4 py-3 w-[14%] text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Icon</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Actions</th>
                                    <th className="px-2 py-3 w-[48px] text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                        {allPresets.map((preset, presetIdx) => (
                                    <tr 
                                        key={preset.id} 
                                        className={`hover:bg-gray-50 ${selectedPreset === preset.id ? 'bg-blue-50' : ''}`}
                                        draggable
                                        onDragStart={(e) => handlePresetDragStart(e, presetIdx)}
                                        onDragOver={handlePresetDragOver}
                                        onDrop={(e) => handlePresetDrop(e, presetIdx)}
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
                                                    className="cursor-text whitespace-nowrap"
                                                    title={preset.name}
                                                >
                                                    {preset.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded ${
                                                preset.isDefault 
                                                    ? 'bg-gray-100 text-gray-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {preset.isDefault ? 'System Defined' : 'Custom'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2 min-w-[200px] max-w-[280px]">
                                                <TabBarIcon
                                                    iconKey={preset.iconKey || 'preset'}
                                                    customIcon={preset.customIcon}
                                                    size={18}
                                                />
                                                <TabIconPickerSelect
                                                    value={preset.iconKey || 'preset'}
                                                    onChange={(key) =>
                                                        handlePresetIconUpdate(preset, key, preset.customIcon || '')
                                                    }
                                                    showSearch={false}
                                                    dense={true}
                                                />
                                                {(preset.iconKey || 'preset') === TAB_ICON_CUSTOM_KEY && (
                                                    <input
                                                        type="text"
                                                        className="input h-9 text-xs w-[88px]"
                                                        placeholder="Emoji"
                                                        value={preset.customIcon || ''}
                                                        onChange={(e) =>
                                                            handlePresetIconUpdate(
                                                                preset,
                                                                TAB_ICON_CUSTOM_KEY,
                                                                e.target.value
                                                            )
                                                        }
                                                        maxLength={8}
                                                    />
                                                )}
                                            </div>
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
                                                <button
                                                    onClick={() => {
                                                        if (preset.isDefault) return;
                                                        if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
                                                            onDeletePreset(preset.id);
                                                        }
                                                    }}
                                                    disabled={preset.isDefault}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        preset.isDefault
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                    title={preset.isDefault ? 'System preset cannot be deleted' : 'Delete preset'}
                                                >
                                                    <Trash2 size={16} className={preset.isDefault ? 'line-through' : ''} />
                                                </button>
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
                                        <td className="px-2 py-3 text-center">
                                            <button
                                                className="p-1 text-gray-400 hover:text-gray-600 cursor-move"
                                                title="Drag to reorder"
                                            >
                                                <GripVertical size={16} />
                                            </button>
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
