import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface BehaviorSettingsSectionProps {
    config: Record<string, any>;
    onChange: (key: string, value: any) => void;
    modalHeaderFontSize?: number;
    modalContentFontSize?: number;
    /** Column keys to display labels (same as table); used for inline edit column list and labels */
    fieldMappings?: Record<string, string>;
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
            {open && <div className="px-4 pb-3 pt-1 border-t border-gray-100">{children}</div>}
        </div>
    );
}

const DEFAULT_INLINE_EDIT_FIELDS = [
    'dobj_name_display',
    'dobj_name_system',
    'dobj_description',
    'dobj_status',
    'sys_updated_ts',
];

const BehaviorSettingsSection: React.FC<BehaviorSettingsSectionProps> = ({
    config,
    onChange,
    modalHeaderFontSize = 16,
    modalContentFontSize = 14,
    fieldMappings,
}) => {
    const [newInlineEditField, setNewInlineEditField] = useState('');
    const [open, setOpen] = useState<Record<string, boolean>>({
        selection: true,
        rowActions: true,
        editing: true,
    });
    const toggle = (k: string) => () => setOpen((s) => ({ ...s, [k]: !s[k] }));

    const enabledRowActions = config.enabledRowActions ?? ['view', 'edit', 'copy', 'delete'];
    const availableFields = fieldMappings ? Object.keys(fieldMappings) : DEFAULT_INLINE_EDIT_FIELDS;

    const handleAddInlineEditField = () => {
        const current = config.enableInlineEdit ?? [];
        if (newInlineEditField && !current.includes(newInlineEditField)) {
            onChange('enableInlineEdit', [...current, newInlineEditField]);
            setNewInlineEditField('');
        }
    };

    const handleRemoveInlineEditField = (field: string) => {
        onChange('enableInlineEdit', (config.enableInlineEdit ?? []).filter((f: string) => f !== field));
    };

    const tableRowClass = 'grid grid-cols-[minmax(160px,1fr)_auto] gap-x-3 py-1.5 items-center';

    /** Display name for inline-edit field: use table label when fieldMappings provided, else strip prefix and title-case */
    const getFieldDisplayName = (field: string) => {
        if (fieldMappings?.[field]) return fieldMappings[field];
        const withoutPrefix = field.replace(/^[a-zA-Z0-9]+_/, '') || field;
        return withoutPrefix.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Behavior Settings</h3>
            </div>

            {/* Selection controls (row + cell range) */}
            <CollapsibleSection
                title="Selection controls"
                open={open.selection ?? false}
                onToggle={toggle('selection')}
                fontSize={modalHeaderFontSize}
            >
                <div className="flex flex-col gap-y-0.5">
                    <div className={tableRowClass}>
                        <span className="text-sm font-medium text-gray-700">Enable Row Selection</span>
                        <Toggle checked={!!config.enableRowSelection} onChange={(v) => onChange('enableRowSelection', v)} />
                    </div>
                    <div className={tableRowClass}>
                        <span className="text-sm font-medium text-gray-700">Select table cells (rows and columns)</span>
                        <Toggle
                            checked={config.enableTableCellSelection !== false}
                            onChange={(v) => onChange('enableTableCellSelection', v)}
                        />
                    </div>
                    <div className={tableRowClass}>
                        <span className="text-sm font-medium text-gray-700">Quick add row (+ at bottom / per group)</span>
                        <Toggle
                            checked={config.enableQuickAddRow !== false}
                            onChange={(v) => onChange('enableQuickAddRow', v)}
                        />
                    </div>
                    {config.enableRowSelection && (
                        <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto] gap-x-3 py-1.5 items-center">
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Enable Mass Selection</span>
                            <Toggle checked={!!config.enableMassSelection} onChange={(v) => onChange('enableMassSelection', v)} />
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Enable Bulk Actions</span>
                            <Toggle checked={!!config.enableBulkActions} onChange={(v) => onChange('enableBulkActions', v)} />
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Bulk Action Style</span>
                            <select
                                className="input text-sm w-full max-w-[100px]"
                                value={config.bulkActionStyle ?? 'icons'}
                                onChange={(e) => onChange('bulkActionStyle', e.target.value)}
                            >
                                <option value="icons">Icons</option>
                                <option value="buttons">Buttons</option>
                            </select>
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            {/* Row Actions - table-like rows */}
            <CollapsibleSection
                title="Row Actions"
                open={open.rowActions ?? false}
                onToggle={toggle('rowActions')}
                fontSize={modalHeaderFontSize}
            >
                <div className="flex flex-col gap-y-0.5">
                    <div className={tableRowClass}>
                        <span className="text-sm font-medium text-gray-700">Enable Row Actions</span>
                        <Toggle checked={!!config.enableRowActions} onChange={(v) => onChange('enableRowActions', v)} />
                    </div>
                    {config.enableRowActions && (
                        <>
                            <div className="grid grid-cols-[minmax(160px,1fr)_auto_auto_auto_auto] gap-x-3 py-1.5 items-center">
                                <span className="text-sm font-medium text-gray-700">Enabled action buttons</span>
                                {['view', 'edit', 'copy', 'delete'].map(action => (
                                    <div key={action} className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-600 capitalize shrink-0">{action}</span>
                                        <Toggle
                                            checked={(enabledRowActions as string[]).includes(action)}
                                            onChange={(on) => {
                                                const updated = on
                                                    ? [...(enabledRowActions as string[]), action]
                                                    : (enabledRowActions as string[]).filter((a: string) => a !== action);
                                                onChange('enabledRowActions', updated);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-[minmax(160px,1fr)_auto_minmax(64px,auto)_auto_minmax(48px,auto)_auto] gap-x-3 py-1.5 items-center">
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Show on hover</span>
                                <Toggle checked={!!config.showRowActionsOnHover} onChange={(v) => onChange('showRowActionsOnHover', v)} />
                                <span className="text-sm font-medium text-gray-700">Position</span>
                                <select
                                    className="input text-sm w-full max-w-[90px]"
                                    value={config.rowActionsPosition ?? 'right'}
                                    onChange={(e) => onChange('rowActionsPosition', e.target.value)}
                                >
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                </select>
                                <span className="text-sm font-medium text-gray-700">Style</span>
                                <select
                                    className="input text-sm w-full max-w-[90px]"
                                    value={config.actionStyle === 'dropdown' ? 'menu' : (config.actionStyle ?? 'icons')}
                                    onChange={(e) => onChange('actionStyle', e.target.value)}
                                >
                                    <option value="icons">Icons</option>
                                    <option value="menu">Menu</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </CollapsibleSection>

            {/* Editing - Collapsible accordion */}
            <CollapsibleSection
                title="Editing"
                open={open.editing ?? false}
                onToggle={toggle('editing')}
                fontSize={modalHeaderFontSize}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Configure Inline Edit Columns</label>
                        <div className="flex space-x-2 mb-3">
                            <select
                                className="input flex-grow"
                                value={newInlineEditField}
                                onChange={(e) => setNewInlineEditField(e.target.value)}
                            >
                                <option value="">Select field for inline editing</option>
                                {availableFields
                                    .filter(field => !(config.enableInlineEdit ?? []).includes(field))
                                    .map(field => (
                                        <option key={field} value={field}>
                                            {getFieldDisplayName(field)}
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
                        {(config.enableInlineEdit ?? []).length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(config.enableInlineEdit ?? []).map((field: string, index: number) => (
                                            <tr key={field} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-3 py-2 text-sm text-gray-900">
                                                    {getFieldDisplayName(field)}
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
                        {(config.enableInlineEdit ?? []).length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-lg bg-gray-50">
                                No fields selected for inline editing
                            </div>
                        )}
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default BehaviorSettingsSection;
