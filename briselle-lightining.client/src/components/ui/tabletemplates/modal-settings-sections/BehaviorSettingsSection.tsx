import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface BehaviorSettingsSectionProps {
    config: {
        enableSort: boolean;
        enableRowSelection: boolean;
        enableMassSelection: boolean;
        enableBulkActions: boolean;
        bulkActionStyle: 'icons' | 'dropdown';
        enableInlineEdit: string[];
    };
    onChange: (key: string, value: any) => void;
}

const BehaviorSettingsSection: React.FC<BehaviorSettingsSectionProps> = ({
    config,
    onChange,
}) => {
    const [newInlineEditField, setNewInlineEditField] = useState('');
    
    // Mock available fields - in real app, this would come from props or API
    const availableFields = [
        'dobj_name_display',
        'dobj_name_system', 
        'dobj_description',
        'dobj_status',
        'dobj_updated_at'
    ];

    const handleAddInlineEditField = () => {
        if (newInlineEditField && !config.enableInlineEdit.includes(newInlineEditField)) {
            onChange('enableInlineEdit', [...config.enableInlineEdit, newInlineEditField]);
            setNewInlineEditField('');
        }
    };

    const handleRemoveInlineEditField = (field: string) => {
        onChange('enableInlineEdit', config.enableInlineEdit.filter(f => f !== field));
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Behavior Settings</h3>
            </div>

            {/* Selection - Section #1 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Selection</h4>
                <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            checked={config.enableRowSelection} 
                            onChange={(e) => onChange('enableRowSelection', e.target.checked)} 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Enable Row Selection</span>
                    </label>
                    
                    {config.enableRowSelection && (
                        <div className="ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.enableMassSelection} 
                                    onChange={(e) => onChange('enableMassSelection', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Enable Mass Selection</span>
                            </label>
                            
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.enableBulkActions} 
                                    onChange={(e) => onChange('enableBulkActions', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Enable Bulk Actions</span>
                            </label>
                            
                            {config.enableBulkActions && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bulk Action Style</label>
                                    <select 
                                        className="input" 
                                        value={config.bulkActionStyle} 
                                        onChange={(e) => onChange('bulkActionStyle', e.target.value)}
                                    >
                                        <option value="icons">Icons</option>
                                        <option value="dropdown">Buttons</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Editing - Section #2 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Editing</h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Configure Inline Edit Columns</label>
                        
                        {/* Add Field Section */}
                        <div className="flex space-x-2 mb-3">
                            <select 
                                className="input flex-grow" 
                                value={newInlineEditField} 
                                onChange={(e) => setNewInlineEditField(e.target.value)}
                            >
                                <option value="">Select field for inline editing</option>
                                {availableFields
                                    .filter(field => !config.enableInlineEdit.includes(field))
                                    .map(field => (
                                        <option key={field} value={field}>
                                            {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </option>
                                    ))
                                }
                            </select>
                            <button 
                                onClick={handleAddInlineEditField}
                                disabled={!newInlineEditField}
                                className="btn btn-primary px-3"
                                title="Add field for inline editing"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        
                        {/* Selected Fields Table */}
                        {config.enableInlineEdit.length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {config.enableInlineEdit.map((field, index) => (
                                            <tr key={field} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-3 py-2 text-sm text-gray-900">
                                                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <button
                                                        onClick={() => handleRemoveInlineEditField(field)}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                        title="Remove field"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {config.enableInlineEdit.length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-lg bg-gray-50">
                                No fields selected for inline editing
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Checkbox View and Behavior */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-md font-semibold text-blue-800 mb-2">Checkbox View and Behavior</h4>
                <div className="text-sm text-blue-700 space-y-2">
                    <p>• When more than 1 row is loaded and only one row is selected, the header checkbox shows indeterminate state (-)</p>
                    <p>• When all rows are selected, the header checkbox shows checked state (✓)</p>
                    <p>• When Mass Selection is enabled, the header checkbox becomes active</p>
                    <p>• When Mass Selection is disabled, the header checkbox appears in inactive mode</p>
                </div>
            </div>
        </div>
    );
};

export default BehaviorSettingsSection;