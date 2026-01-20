import React from 'react';

interface LayoutSettingsSectionProps {
    config: {
        tableView: 'default' | 'card' | 'list' | 'kanban' | 'grid' | 'timeline' | 'calendar';
        density: 'compact' | 'standard' | 'comfortable' | 'spacious';
        enableRowActions: boolean;
        enabledRowActions: ('view' | 'edit' | 'copy' | 'delete')[];
        rowActionsPosition: 'left' | 'right';
        actionStyle: 'icons' | 'dropdown';
        showRowActionsOnHover: boolean;
    };
    onChange: (key: string, value: any) => void;
}

const LayoutSettingsSection: React.FC<LayoutSettingsSectionProps> = ({
    config,
    onChange,
}) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Layout Settings</h3>
            </div>

            {/* Table View - Section #1 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Table View</h4>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
                        <select 
                            className="input" 
                            value={config.tableView} 
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Table Density</label>
                            <select 
                                className="input" 
                                value={config.density} 
                                onChange={(e) => onChange('density', e.target.value)}
                            >
                                <option value="compact">Compact</option>
                                <option value="standard">Default</option>
                                <option value="comfortable">Comfortable</option>
                                <option value="spacious">Spacious</option>
                            </select>
                        </div>
                    )}
                    
                    {config.tableView === 'kanban' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Card Configuration</label>
                                <select className="input">
                                    <option>Select Header Field</option>
                                    <option>Name</option>
                                    <option>Status</option>
                                    <option>Priority</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Group By Field</label>
                                <select className="input">
                                    <option>Select Field</option>
                                    <option>Status</option>
                                    <option>Priority</option>
                                    <option>Assignee</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Row Actions - Section #2 */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Row Actions</h4>
                <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            checked={config.enableRowActions} 
                            onChange={(e) => onChange('enableRowActions', e.target.checked)} 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Enable Row Actions</span>
                    </label>
                    
                    {config.enableRowActions && (
                        <div className="ml-6 space-y-4 border-l-2 border-blue-200 pl-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Enable Row Action Buttons</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['view', 'edit', 'copy', 'delete'].map(action => (
                                        <label key={action} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={config.enabledRowActions.includes(action as any)}
                                                onChange={(e) => {
                                                    const updatedActions = e.target.checked
                                                        ? [...config.enabledRowActions, action as any]
                                                        : config.enabledRowActions.filter(a => a !== action);
                                                    onChange('enabledRowActions', updatedActions);
                                                }}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="capitalize">{action}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Position and Style</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Position</label>
                                        <select 
                                            className="input text-sm" 
                                            value={config.rowActionsPosition} 
                                            onChange={(e) => onChange('rowActionsPosition', e.target.value)}
                                        >
                                            <option value="left">Left</option>
                                            <option value="right">Right</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Style</label>
                                        <select 
                                            className="input text-sm" 
                                            value={config.actionStyle} 
                                            onChange={(e) => onChange('actionStyle', e.target.value)}
                                        >
                                            <option value="icons">Icons</option>
                                            <option value="dropdown">Menu</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <label className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={config.showRowActionsOnHover} 
                                    onChange={(e) => onChange('showRowActionsOnHover', e.target.checked)} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Show Actions on Hover</span>
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LayoutSettingsSection;