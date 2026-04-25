import { Check, ChevronDown, ChevronRight, Pencil, Plus, Search, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import type { ObjectFieldDataType } from './objectDefinitionSchema';
import { FieldAttributesSectionedPanel } from './FieldAttributesSectionedPanel';
import {
    FieldDefinitionRowForm,
    getAutoNumberDisplayFormatFromObjectLabel,
    groupedFieldTypes,
    InlineFieldSwitch,
    supportsUniqueToggle,
    toUserDefinedApiName,
} from './fieldDataTypeModel';
import { getDefaultAttributesForFieldType, getFieldTypeMasterEntry, validateFieldAttributes } from './salesforceFieldTypeMaster';

type DbObjectRow = {
    sys_id: number;
    dobj_id?: number;
    dobj_name_display?: string | null;
    dobj_name_system?: string | null;
    dobj_description?: string | null;
    dobj_configuration?: unknown;
};

type ObjectField = {
    id: number;
    label: string;
    apiName: string;
    dataType: string;
    description: string;
    required: boolean;
    /** Row-level active flag (0/1 in JSON). */
    isactive: boolean;
    attributes: Record<string, unknown>;
};

type ObjectManagerModel = {
    id: string;
    sysId: number;
    label: string;
    apiName: string;
    description: string;
    fields: ObjectField[];
};

type NewFieldFormState = {
    label: string;
    apiName: string;
    dataType: ObjectFieldDataType;
    description: string;
    required: boolean;
    attributes: Record<string, unknown>;
};

const OBJECT_MANAGER_MENU = [
    'Details',
    'Fields & Relationships',
    'Page Layouts',
    'Buttons, Links, and Actions',
    'Compact Layouts',
    'Field Sets',
    'Object Limits',
    'Record Types',
    'Search Layouts',
];
function safeParseConfig(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw) as unknown;
            return typeof parsed === 'object' && parsed != null ? (parsed as Record<string, unknown>) : {};
        } catch {
            return {};
        }
    }
    return typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

/** Default indexed=true for identifier-style fields (ID + API name pattern). */
function shouldDefaultIndexed(f: {
    id: number;
    apiName: string;
    label: string;
    dataType: string;
}): boolean {
    if (f.id === 1) return true;
    const api = (f.apiName || '').toLowerCase();
    if (/_id_u$/.test(api) || api.endsWith('name_u')) return true;
    if (f.dataType === 'autoNumber') return true;
    const lab = (f.label || '').toLowerCase();
    if (/\bid\b/.test(lab) && lab.includes('name')) return true;
    return false;
}

function normalizeFieldRow(f: Record<string, unknown>): Record<string, unknown> {
    const id = Number(f.id ?? 0);
    const apiName = String(f.apiName ?? '');
    const label = String(f.label ?? '');
    const dataType = String(f.dataType ?? '');
    const attrs =
        typeof f.attributes === 'object' && f.attributes != null ? { ...(f.attributes as Record<string, unknown>) } : {};
    if (attrs.indexed === undefined) {
        attrs.indexed = shouldDefaultIndexed({ id, apiName, label, dataType });
    } else {
        attrs.indexed = attrs.indexed === true || attrs.indexed === 1;
    }
    const isactive = f.isactive === 0 || f.isactive === false ? 0 : 1;
    return { ...f, attributes: attrs, isactive };
}

function normalizeConfigurationFields(cfg: Record<string, unknown>): Record<string, unknown> {
    const raw = Array.isArray(cfg.fields) ? (cfg.fields as Array<Record<string, unknown>>) : [];
    return { ...cfg, fields: raw.map((row) => normalizeFieldRow(row)) };
}

function toFields(config: Record<string, unknown>): ObjectField[] {
    const raw = Array.isArray(config.fields) ? (config.fields as Array<Record<string, unknown>>) : [];
    return raw
        .map((f) => {
            const attrs =
                typeof f.attributes === 'object' && f.attributes != null ? (f.attributes as Record<string, unknown>) : {};
            const indexed = attrs.indexed === true || attrs.indexed === 1;
            return {
                id: Number(f.id ?? 0),
                label: String(f.label ?? ''),
                apiName: String(f.apiName ?? ''),
                dataType: String(f.dataType ?? ''),
                description: String(f.description ?? ''),
                required: f.required === 1 || f.required === true,
                isactive: !(f.isactive === 0 || f.isactive === false),
                attributes: { ...attrs, indexed },
            };
        })
        .filter((f) => f.label.length > 0)
        .sort((a, b) => a.label.localeCompare(b.label));
}

function applyFieldPatchToConfig(
    cfg: Record<string, unknown>,
    fieldId: number,
    patch: { required?: boolean; isactive?: boolean },
): Record<string, unknown> {
    const fields = [...(Array.isArray(cfg.fields) ? (cfg.fields as Array<Record<string, unknown>>) : [])];
    const i = fields.findIndex((f) => Number(f.id) === fieldId);
    if (i === -1) return cfg;
    let row = { ...fields[i] };
    if (patch.required !== undefined) {
        row.required = patch.required ? 1 : 0;
        const attrs =
            typeof row.attributes === 'object' && row.attributes != null
                ? { ...(row.attributes as Record<string, unknown>) }
                : {};
        const dt = String(row.dataType ?? '') as ObjectFieldDataType;
        const m = getFieldTypeMasterEntry(dt);
        if (m?.attributeKeys.includes('required')) attrs.required = patch.required;
        row.attributes = attrs;
    }
    if (patch.isactive !== undefined) {
        row.isactive = patch.isactive ? 1 : 0;
    }
    row = normalizeFieldRow(row);
    fields[i] = row;
    return { ...cfg, fields };
}

export default function ObjectDetail() {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [model, setModel] = useState<ObjectManagerModel | null>(null);
    const [objectConfig, setObjectConfig] = useState<Record<string, unknown>>({});
    const objectConfigRef = useRef(objectConfig);
    objectConfigRef.current = objectConfig;
    const modelRef = useRef(model);
    modelRef.current = model;
    const [quickFind, setQuickFind] = useState('');
    const [showAddFieldPanel, setShowAddFieldPanel] = useState(false);
    const [savingField, setSavingField] = useState(false);
    const [newFieldError, setNewFieldError] = useState<string | null>(null);
    const [editFieldError, setEditFieldError] = useState<string | null>(null);
    const [fieldApiNameTouched, setFieldApiNameTouched] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
    const [expandedFieldId, setExpandedFieldId] = useState<number | null>(null);
    const [editFieldApiNameTouched, setEditFieldApiNameTouched] = useState(false);
    const [newField, setNewField] = useState<NewFieldFormState>({
        label: '',
        apiName: '',
        dataType: 'text',
        description: '',
        required: false,
        attributes: { ...getDefaultAttributesForFieldType('text'), indexed: false },
    });
    const [editField, setEditField] = useState<NewFieldFormState>({
        label: '',
        apiName: '',
        dataType: 'text',
        description: '',
        required: false,
        attributes: getDefaultAttributesForFieldType('text'),
    });
    const typeGroups = useMemo(() => groupedFieldTypes(), []);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!id) {
                setError('Object id is missing.');
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('dobj')
                .select('sys_id,dobj_id,dobj_name_display,dobj_name_system,dobj_description,dobj_configuration')
                .or(`sys_id.eq.${id},dobj_id.eq.${id}`)
                .limit(1)
                .maybeSingle<DbObjectRow>();

            if (cancelled) return;
            if (fetchError) {
                setError(fetchError.message || 'Unable to load object definition.');
                setLoading(false);
                return;
            }
            if (!data) {
                setError('Object not found.');
                setLoading(false);
                return;
            }

            const cfgRaw = safeParseConfig(data.dobj_configuration);
            const cfg = normalizeConfigurationFields(cfgRaw);
            const fields = toFields(cfg);

            setModel({
                id: String(data.dobj_id ?? data.sys_id ?? id),
                sysId: Number(data.sys_id),
                label: data.dobj_name_display || 'Object',
                apiName: data.dobj_name_system || '',
                description: data.dobj_description || '',
                fields,
            });
            setObjectConfig(cfg);
            setLoading(false);
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        if (fieldApiNameTouched) return;
        setNewField((prev) => ({ ...prev, apiName: toUserDefinedApiName(prev.label) }));
    }, [fieldApiNameTouched, newField.label]);

    useEffect(() => {
        if (editFieldApiNameTouched) return;
        setEditField((prev) => ({ ...prev, apiName: toUserDefinedApiName(prev.label) }));
    }, [editField.label, editFieldApiNameTouched]);

    const startEditField = (field: ObjectField) => {
        setExpandedFieldId(null);
        setEditingFieldId(field.id);
        setEditFieldApiNameTouched(false);
        setEditFieldError(null);
        const dt = field.dataType as ObjectFieldDataType;
        const mergedAttr = {
            ...getDefaultAttributesForFieldType(dt),
            ...field.attributes,
            isactive: field.isactive,
            description: String(field.attributes.description ?? field.description ?? ''),
        };
        setEditField({
            label: field.label,
            apiName: field.apiName,
            dataType: dt,
            description: field.description,
            required: field.required,
            attributes: mergedAttr,
        });
    };

    const cancelEditField = () => {
        setEditingFieldId(null);
        setEditFieldError(null);
        setEditFieldApiNameTouched(false);
    };

    const toggleExpandField = (fieldId: number) => {
        setExpandedFieldId((prev) => (prev === fieldId ? null : fieldId));
    };

    const persistConfiguration = async (nextConfig: Record<string, unknown>, logKey: string) => {
        const m = modelRef.current;
        if (!m) return false;
        setSavingField(true);
        const { error: updateError } = await supabase
            .from('dobj')
            .update({ dobj_configuration: nextConfig })
            .eq('sys_id', m.sysId);
        if (updateError) {
            setSavingField(false);
            return false;
        }
        const updatedFields = toFields(nextConfig);
        setObjectConfig(nextConfig);
        setModel((prev) => (prev ? { ...prev, fields: updatedFields } : prev));
        setSavingField(false);
        return true;
    };

    const handleToggleFieldRequired = async (fieldId: number, required: boolean) => {
        if (!modelRef.current || savingField) return;
        const nextConfig = applyFieldPatchToConfig(objectConfigRef.current, fieldId, { required });
        await persistConfiguration(nextConfig, 'H12');
    };

    const handleToggleFieldActive = async (fieldId: number, active: boolean) => {
        if (!modelRef.current || savingField) return;
        const nextConfig = applyFieldPatchToConfig(objectConfigRef.current, fieldId, { isactive: active });
        await persistConfiguration(nextConfig, 'H13');
    };

    const visibleFields = useMemo(() => {
        const q = quickFind.trim().toLowerCase();
        if (!q) return model?.fields ?? [];
        return (model?.fields ?? []).filter((f) =>
            `${f.label} ${f.apiName} ${f.dataType} ${f.description}`.toLowerCase().includes(q),
        );
    }, [model?.fields, quickFind]);

    const handleSaveNewField = async () => {
        if (!model) return;
        const label = newField.label.trim();
        const apiName = toUserDefinedApiName(newField.apiName || newField.label);
        if (!label) {
            setNewFieldError('Field label is required.');
            return;
        }
        if (!apiName) {
            setNewFieldError('Field API name is required.');
            return;
        }

        const currentFields = Array.isArray(objectConfig.fields)
            ? (objectConfig.fields as Array<Record<string, unknown>>)
            : [];
        const maxId = currentFields.reduce(
            (acc, f) => Math.max(acc, Number(f.id) || 0),
            0,
        );
        const nextId = maxId + 1;
        const mergedAttrs = { ...newField.attributes };
        const entry = getFieldTypeMasterEntry(newField.dataType);
        if (entry?.attributeKeys.includes('required')) {
            mergedAttrs.required = newField.required;
        }
        mergedAttrs.indexed = mergedAttrs.indexed === true || mergedAttrs.indexed === 1;
        const attributeErrors = validateFieldAttributes(newField.dataType, mergedAttrs);
        if (attributeErrors.length > 0) {
            setNewFieldError(attributeErrors[0]);
            return;
        }

        const newFieldEntry: Record<string, unknown> = {
            version: 1,
            id: nextId,
            dataType: newField.dataType,
            label,
            apiName,
            description: String(mergedAttrs.description ?? '').trim(),
            required: newField.required ? 1 : 0,
            isdeleted: 0,
            isactive: 1,
            isCustom: 1,
            order: nextId,
            attributes: mergedAttrs,
        };

        const nextConfig: Record<string, unknown> = {
            ...objectConfig,
            obj_id: Number(objectConfig.obj_id ?? model.sysId),
            version: Number(objectConfig.version ?? 1),
            fields: [...currentFields, newFieldEntry],
        };

        setSavingField(true);
        setNewFieldError(null);

        const { error: updateError } = await supabase
            .from('dobj')
            .update({ dobj_configuration: nextConfig })
            .eq('sys_id', model.sysId);

        if (updateError) {
            setSavingField(false);
            setNewFieldError(updateError.message || 'Unable to save new field.');
            return;
        }

        const updatedFields = toFields(nextConfig);
        setObjectConfig(nextConfig);
        setModel((prev) => (prev ? { ...prev, fields: updatedFields } : prev));
        setShowAddFieldPanel(false);
        setSavingField(false);
        setFieldApiNameTouched(false);
        setNewField({
            label: '',
            apiName: '',
            dataType: 'text',
            description: '',
            required: false,
            attributes: { ...getDefaultAttributesForFieldType('text'), indexed: false },
        });

    };

    const handleSaveEditedField = async () => {
        if (!model || editingFieldId == null) return;
        const label = editField.label.trim();
        const apiName = toUserDefinedApiName(editField.apiName || editField.label);
        if (!label) {
            setEditFieldError('Field label is required.');
            return;
        }
        if (!apiName) {
            setEditFieldError('Field API name is required.');
            return;
        }
        const currentFields = Array.isArray(objectConfig.fields)
            ? (objectConfig.fields as Array<Record<string, unknown>>)
            : [];
        const targetIndex = currentFields.findIndex((f) => Number(f.id ?? 0) === editingFieldId);
        if (targetIndex === -1) {
            setEditFieldError('Field not found for edit.');
            return;
        }

        const mergedAttrs = { ...editField.attributes };
        const rowActive = !(mergedAttrs.isactive === false || mergedAttrs.isactive === 0);
        delete mergedAttrs.isactive;
        const entry = getFieldTypeMasterEntry(editField.dataType);
        if (entry?.attributeKeys.includes('required')) {
            mergedAttrs.required = editField.required;
        }
        mergedAttrs.indexed = mergedAttrs.indexed === true || mergedAttrs.indexed === 1;
        const attributeErrors = validateFieldAttributes(editField.dataType, mergedAttrs);
        if (attributeErrors.length > 0) {
            setEditFieldError(attributeErrors[0]);
            return;
        }

        const updated = { ...currentFields[targetIndex] };
        updated.dataType = editField.dataType;
        updated.label = label;
        updated.apiName = apiName;
        updated.description = String(mergedAttrs.description ?? '').trim();
        updated.required = editField.required ? 1 : 0;
        updated.isactive = rowActive ? 1 : 0;
        updated.attributes = mergedAttrs;

        const nextFields = [...currentFields];
        nextFields[targetIndex] = normalizeFieldRow(updated);
        const nextConfig: Record<string, unknown> = {
            ...objectConfig,
            fields: nextFields,
        };

        setSavingField(true);
        setEditFieldError(null);
        const { error: updateError } = await supabase
            .from('dobj')
            .update({ dobj_configuration: nextConfig })
            .eq('sys_id', model.sysId);

        if (updateError) {
            setSavingField(false);
            setEditFieldError(updateError.message || 'Unable to update field.');
            return;
        }

        const updatedFields = toFields(nextConfig);
        setObjectConfig(nextConfig);
        setModel((prev) => (prev ? { ...prev, fields: updatedFields } : prev));
        setSavingField(false);
        setEditingFieldId(null);
        setEditFieldApiNameTouched(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (error || !model) {
        return (
            <div className="text-center py-10">
                <h2 className="text-xl font-medium text-gray-900">{error || 'Object not found'}</h2>
                <Link to="/objects" className="btn btn-primary mt-4">
                    Back to Objects
                </Link>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                Setup &gt; Object Manager
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">{model.label}</h1>

            <div className="border border-gray-200 bg-white">
                <div className="grid grid-cols-[240px_1fr] min-h-[560px]">
                    <aside className="border-r border-gray-200 bg-gray-50">
                        {OBJECT_MANAGER_MENU.map((item) => (
                            <div
                                key={item}
                                className={`px-4 py-2.5 text-sm border-l-2 ${
                                    item === 'Fields & Relationships'
                                        ? 'border-primary bg-blue-50 text-gray-900 font-medium'
                                        : 'border-transparent text-gray-700'
                                }`}
                            >
                                {item}
                            </div>
                        ))}
                    </aside>

                    <section className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Fields &amp; Relationships</h2>
                                <p className="text-xs text-gray-500">
                                    {visibleFields.length} items, Sorted by Field Label
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary py-1.5 px-3 text-sm"
                                    onClick={() => {
                                        setShowAddFieldPanel((prev) => !prev);
                                        setNewFieldError(null);
                                    }}
                                >
                                    {showAddFieldPanel ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
                                    {showAddFieldPanel ? 'Close' : 'Add Field'}
                                </button>
                                <div className="relative w-64">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={quickFind}
                                        onChange={(e) => setQuickFind(e.target.value)}
                                        placeholder="Quick Find"
                                        className="input pl-8 py-1.5 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {showAddFieldPanel && (
                            <div className="mb-3 border border-gray-200 rounded bg-gray-50 p-3">
                                <FieldDefinitionRowForm
                                    fieldLabel={newField.label}
                                    fieldApiName={newField.apiName}
                                    dataType={newField.dataType}
                                    onLabelChange={(v) => setNewField((prev) => ({ ...prev, label: v }))}
                                    onApiNameChange={(raw) => {
                                        setFieldApiNameTouched(true);
                                        setNewField((prev) => ({ ...prev, apiName: toUserDefinedApiName(raw) }));
                                    }}
                                    onDataTypeChange={(nextDataType) => {
                                        const defaults = getDefaultAttributesForFieldType(nextDataType);
                                        if (nextDataType === 'autoNumber' && !String(defaults.displayFormat ?? '').trim()) {
                                            defaults.displayFormat = getAutoNumberDisplayFormatFromObjectLabel(
                                                modelRef.current?.label,
                                            );
                                        }
                                        const m = getFieldTypeMasterEntry(nextDataType);
                                        setNewField((prev) => {
                                            const prevIndexed =
                                                prev.attributes.indexed === true || prev.attributes.indexed === 1;
                                            const nextRequired = nextDataType === 'autoNumber';
                                            return {
                                                ...prev,
                                                dataType: nextDataType,
                                                required: nextRequired,
                                                attributes: {
                                                    ...defaults,
                                                    ...(m?.attributeKeys.includes('required')
                                                        ? { required: nextRequired }
                                                        : {}),
                                                    indexed: prevIndexed,
                                                },
                                            };
                                        });
                                    }}
                                    typePicker={{ variant: 'grouped', groups: typeGroups }}
                                    dataTypeDescription={getFieldTypeMasterEntry(newField.dataType)?.description ?? null}
                                    apiNameFieldLabel="Field Name (API) *"
                                    requiredMode="interactive"
                                    required={newField.required}
                                    onRequiredChange={(v) =>
                                        setNewField((prev) => ({
                                            ...prev,
                                            required: v,
                                            attributes: {
                                                ...prev.attributes,
                                                required: v,
                                            },
                                        }))
                                    }
                                    indexed={
                                        newField.attributes.indexed === true || newField.attributes.indexed === 1
                                    }
                                    onIndexedChange={(v) =>
                                        setNewField((prev) => ({
                                            ...prev,
                                            attributes: { ...prev.attributes, indexed: v },
                                        }))
                                    }
                                    unique={newField.attributes.unique === true || newField.attributes.unique === 1}
                                    onUniqueChange={(v) =>
                                        setNewField((prev) => ({
                                            ...prev,
                                            attributes: { ...prev.attributes, unique: v },
                                        }))
                                    }
                                />
                                <div className="mt-2 border-t border-gray-200 pt-2">
                                    <FieldAttributesSectionedPanel
                                        dataType={newField.dataType}
                                        attributes={newField.attributes}
                                        omitKeys={new Set(['required'])}
                                        onChange={(key, v) =>
                                            setNewField((prev) => ({
                                                ...prev,
                                                attributes: { ...prev.attributes, [key]: v },
                                            }))
                                        }
                                        compact
                                        scrollable
                                        objectLabel={model.label}
                                    />
                                </div>
                                {newFieldError && <p className="text-xs text-red-600 mt-2">{newFieldError}</p>}
                                <div className="mt-2 flex justify-end">
                                    <button
                                        type="button"
                                        className="btn btn-primary py-1.5 px-3 text-sm"
                                        onClick={() => void handleSaveNewField()}
                                        disabled={savingField}
                                    >
                                        {savingField ? 'Saving...' : 'Save Field'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="overflow-auto border border-gray-200">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Field Label</th>
                                        <th>Field Name</th>
                                        <th>Data Type</th>
                                        <th>Required</th>
                                        <th>Status</th>
                                        <th>Indexed</th>
                                        <th className="text-right w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleFields.map((field) => {
                                        const isEditing = editingFieldId === field.id;
                                        const isExpanded = expandedFieldId === field.id && !isEditing;
                                        const indexed = field.attributes.indexed === true || field.attributes.indexed === 1;
                                        const quickToggleDisabled = savingField || editingFieldId !== null;
                                        const attrsReadonlyJson = JSON.stringify(
                                            Object.fromEntries(
                                                Object.entries(field.attributes).sort(([a], [b]) => a.localeCompare(b)),
                                            ),
                                            null,
                                            2,
                                        );

                                        return (
                                            <Fragment key={field.id}>
                                                <tr>
                                                    {isEditing ? (
                                                        <>
                                                            <td className="text-primary font-medium">{editField.label}</td>
                                                            <td className="font-mono text-xs">{editField.apiName}</td>
                                                            <td>{editField.dataType}</td>
                                                            <td>
                                                                <InlineFieldSwitch
                                                                    checked={editField.required}
                                                                    disabled
                                                                    ariaLabel={`Required: ${editField.label}`}
                                                                    onChange={() => {}}
                                                                />
                                                            </td>
                                                            <td>
                                                                <InlineFieldSwitch
                                                                    checked={
                                                                        editField.attributes.isactive !== false &&
                                                                        editField.attributes.isactive !== 0
                                                                    }
                                                                    disabled
                                                                    ariaLabel={`Status: ${editField.label}`}
                                                                    onChange={() => {}}
                                                                />
                                                            </td>
                                                            <td>
                                                                {editField.attributes.indexed === true ||
                                                                editField.attributes.indexed === 1 ? (
                                                                    <Check size={14} className="text-gray-700" aria-label="Indexed" />
                                                                ) : (
                                                                    <span className="text-gray-400">—</span>
                                                                )}
                                                            </td>
                                                            <td className="text-right">
                                                                <div className="ml-auto flex min-w-[4.25rem] max-w-[8rem] items-center justify-end gap-1">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary py-1 px-2 text-xs"
                                                                        onClick={() => void handleSaveEditedField()}
                                                                        disabled={savingField}
                                                                    >
                                                                        {savingField ? 'Saving...' : 'Save'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-secondary py-1 px-2 text-xs"
                                                                        onClick={cancelEditField}
                                                                        disabled={savingField}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="text-primary font-medium">{field.label}</td>
                                                            <td className="font-mono text-xs">{field.apiName}</td>
                                                            <td>{field.dataType}</td>
                                                            <td>
                                                                <InlineFieldSwitch
                                                                    checked={field.required}
                                                                    disabled={quickToggleDisabled}
                                                                    ariaLabel={`Required: ${field.label}`}
                                                                    onChange={(v) =>
                                                                        void handleToggleFieldRequired(field.id, v)
                                                                    }
                                                                />
                                                            </td>
                                                            <td>
                                                                <InlineFieldSwitch
                                                                    checked={field.isactive}
                                                                    disabled={quickToggleDisabled}
                                                                    ariaLabel={`Status: ${field.label}`}
                                                                    onChange={(v) =>
                                                                        void handleToggleFieldActive(field.id, v)
                                                                    }
                                                                />
                                                            </td>
                                                            <td>
                                                                {indexed ? (
                                                                    <Check size={14} className="text-gray-700" aria-label="Indexed" />
                                                                ) : (
                                                                    <span className="text-gray-400">—</span>
                                                                )}
                                                            </td>
                                                            <td className="text-right">
                                                                <div className="ml-auto flex min-w-[4.25rem] max-w-[5.5rem] items-center justify-between gap-1">
                                                                    <button
                                                                        type="button"
                                                                        className="p-1.5 text-gray-500 hover:text-primary rounded hover:bg-gray-100"
                                                                        title="Edit field"
                                                                        onClick={() => startEditField(field)}
                                                                    >
                                                                        <Pencil size={15} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100"
                                                                        title="View attributes"
                                                                        aria-expanded={isExpanded}
                                                                        onClick={() => toggleExpandField(field.id)}
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown size={16} />
                                                                        ) : (
                                                                            <ChevronRight size={16} />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={7} className="bg-gray-50 align-top">
                                                            <div className="p-2 space-y-2">
                                                                <div>
                                                                    <p className="text-[10px] font-semibold text-gray-600 mb-0.5">
                                                                        Description
                                                                    </p>
                                                                    <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-snug">
                                                                        {(() => {
                                                                            const fromRow = field.description?.trim();
                                                                            const fromAttr = String(
                                                                                field.attributes.description ?? '',
                                                                            ).trim();
                                                                            const t = fromRow || fromAttr;
                                                                            return t || '—';
                                                                        })()}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-semibold text-gray-600 mb-0.5">
                                                                        Attributes (read-only)
                                                                    </p>
                                                                    <pre className="text-[10px] font-mono bg-white border border-gray-200 rounded p-1.5 overflow-auto max-h-56 whitespace-pre-wrap text-gray-800 leading-snug">
                                                                        {attrsReadonlyJson}
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                {isEditing && (
                                                    <tr>
                                                        <td colSpan={7} className="bg-gray-50">
                                                            <div className="p-1.5 space-y-2">
                                                                <FieldDefinitionRowForm
                                                                    fieldLabel={editField.label}
                                                                    fieldApiName={editField.apiName}
                                                                    dataType={editField.dataType}
                                                                    onLabelChange={(v) =>
                                                                        setEditField((prev) => ({ ...prev, label: v }))
                                                                    }
                                                                    onApiNameChange={(raw) => {
                                                                        setEditFieldApiNameTouched(true);
                                                                        setEditField((prev) => ({
                                                                            ...prev,
                                                                            apiName: toUserDefinedApiName(raw),
                                                                        }));
                                                                    }}
                                                                    onDataTypeChange={(nextDataType) => {
                                                                        const defaults = getDefaultAttributesForFieldType(nextDataType);
                                                                        if (nextDataType === 'autoNumber' && !String(defaults.displayFormat ?? '').trim()) {
                                                                            defaults.displayFormat =
                                                                                getAutoNumberDisplayFormatFromObjectLabel(
                                                                                    modelRef.current?.label,
                                                                                );
                                                                        }
                                                                        const m = getFieldTypeMasterEntry(nextDataType);
                                                                        setEditField((prev) => {
                                                                            const prevIndexed =
                                                                                prev.attributes.indexed === true ||
                                                                                prev.attributes.indexed === 1;
                                                                            const prevActive =
                                                                                prev.attributes.isactive !== false &&
                                                                                prev.attributes.isactive !== 0;
                                                                            const nextRequired = nextDataType === 'autoNumber';
                                                                            return {
                                                                                ...prev,
                                                                                dataType: nextDataType,
                                                                                required: nextRequired,
                                                                                attributes: {
                                                                                    ...defaults,
                                                                                    ...(m?.attributeKeys.includes('required')
                                                                                        ? { required: nextRequired }
                                                                                        : {}),
                                                                                    indexed: prevIndexed,
                                                                                    isactive: prevActive,
                                                                                },
                                                                            };
                                                                        });
                                                                    }}
                                                                    typePicker={{ variant: 'grouped', groups: typeGroups }}
                                                                    dataTypeDescription={
                                                                        getFieldTypeMasterEntry(editField.dataType)?.description ??
                                                                        null
                                                                    }
                                                                    apiNameFieldLabel="Field Name (API) *"
                                                                    requiredMode="interactive"
                                                                    required={editField.required}
                                                                    leadingToggle={{
                                                                        label: 'Status',
                                                                        checked:
                                                                            editField.attributes.isactive !== false &&
                                                                            editField.attributes.isactive !== 0,
                                                                        ariaLabel: 'Status',
                                                                        onChange: (v) =>
                                                                            setEditField((prev) => ({
                                                                                ...prev,
                                                                                attributes: {
                                                                                    ...prev.attributes,
                                                                                    isactive: v,
                                                                                },
                                                                            })),
                                                                    }}
                                                                    onRequiredChange={(v) =>
                                                                        setEditField((prev) => ({
                                                                            ...prev,
                                                                            required: v,
                                                                            attributes: { ...prev.attributes, required: v },
                                                                        }))
                                                                    }
                                                                    indexed={
                                                                        editField.attributes.indexed === true ||
                                                                        editField.attributes.indexed === 1
                                                                    }
                                                                    onIndexedChange={(v) =>
                                                                        setEditField((prev) => ({
                                                                            ...prev,
                                                                            attributes: { ...prev.attributes, indexed: v },
                                                                        }))
                                                                    }
                                                                    unique={
                                                                        editField.attributes.unique === true ||
                                                                        editField.attributes.unique === 1
                                                                    }
                                                                    onUniqueChange={(v) =>
                                                                        setEditField((prev) => ({
                                                                            ...prev,
                                                                            attributes: { ...prev.attributes, unique: v },
                                                                        }))
                                                                    }
                                                                />
                                                                <FieldAttributesSectionedPanel
                                                                    dataType={editField.dataType}
                                                                    attributes={editField.attributes}
                                                                    omitKeys={new Set(['required'])}
                                                                    onChange={(key, v) =>
                                                                        setEditField((prev) => ({
                                                                            ...prev,
                                                                            attributes: { ...prev.attributes, [key]: v },
                                                                        }))
                                                                    }
                                                                    compact
                                                                    scrollable
                                                                    objectLabel={model.label}
                                                                />
                                                                {editFieldError && (
                                                                    <p className="text-xs text-red-600 mt-2">{editFieldError}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}