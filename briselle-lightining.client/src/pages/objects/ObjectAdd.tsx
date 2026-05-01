import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { ensureObjectLoaderPlatformConfigRow } from '../../components/ui/tabletemplates/utils/configService';
import type { ObjectFieldDataType, ObjectFieldDefinition } from './objectDefinitionSchema';
import { getObjectIconNode, normalizeObjectIconKey, type ObjectIconKey } from '../../utils/objectIconCatalog';
import { UiIconPickerSelect } from '../../utils/uiIconPickerCatalog';
import { FieldAttributesSectionedPanel } from './FieldAttributesSectionedPanel';
import {
    FieldDefinitionRowForm,
    getAutoNumberDisplayFormatFromObjectLabel,
    groupedFieldTypes,
    supportsUniqueToggle,
    toUserDefinedApiName,
} from './fieldDataTypeModel';
import { getDefaultAttributesForFieldType, getFieldTypeMasterEntry, validateFieldAttributes } from './salesforceFieldTypeMaster';

type FieldErrors = Record<string, string>;
type ObjectType = 'list' | 'transaction' | 'hierarchy';

function createField(overrides?: Partial<ObjectFieldDefinition>): ObjectFieldDefinition {
    const dataType = overrides?.dataType ?? 'text';
    const defaults = getDefaultAttributesForFieldType(dataType);
    const base: ObjectFieldDefinition = {
        id: crypto.randomUUID(),
        label: '',
        apiName: '',
        dataType,
        required: false,
        attributes: { ...defaults, indexed: false },
    };
    return {
        ...base,
        ...overrides,
        attributes: { ...base.attributes, ...overrides?.attributes },
    };
}

function mergeAttributesForValidation(field: ObjectFieldDefinition): Record<string, unknown> {
    const m = getFieldTypeMasterEntry(field.dataType);
    const attrs = { ...field.attributes };
    if (m?.attributeKeys.includes('required')) attrs.required = field.required;
    return attrs;
}

const MANDATORY_FIRST_FIELD_ID = 'mandatory-first-field';

const MANDATORY_FIRST_FIELD_TYPES: ObjectFieldDataType[] = ['autoNumber', 'text'];

function createMandatoryFirstField(objectLabelForPrefix: string): ObjectFieldDefinition {
    const dataType: ObjectFieldDataType = 'autoNumber';
    const defaults = getDefaultAttributesForFieldType(dataType);
    if (!String(defaults.displayFormat ?? '').trim()) {
        defaults.displayFormat = getAutoNumberDisplayFormatFromObjectLabel(objectLabelForPrefix);
    }
    return {
        id: MANDATORY_FIRST_FIELD_ID,
        label: 'Name',
        apiName: 'name_u',
        dataType,
        required: true,
        attributes: { ...defaults, indexed: true },
    };
}

export default function ObjectAdd() {
    const navigate = useNavigate();
    const [label, setLabel] = useState('');
    const [apiName, setApiName] = useState('');
    const [apiNameTouched, setApiNameTouched] = useState(false);
    const [description, setDescription] = useState('');
    const [firstField, setFirstField] = useState<ObjectFieldDefinition>(() => createMandatoryFirstField(''));
    const [fields, setFields] = useState<ObjectFieldDefinition[]>([]);
    const [fieldApiNameTouched, setFieldApiNameTouched] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<FieldErrors>({});
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    /** Stored in `dobj_configuration.objectType`; default is list. */
    const [objectType, setObjectType] = useState<ObjectType>('list');
    const [objectIcon, setObjectIcon] = useState<ObjectIconKey>('table');

    const typeGroups = useMemo(() => groupedFieldTypes(), []);
    const mandatoryFirstTypeOptions = useMemo(
        () => MANDATORY_FIRST_FIELD_TYPES.map((id) => getFieldTypeMasterEntry(id)).filter(Boolean) as NonNullable<
            ReturnType<typeof getFieldTypeMasterEntry>
        >[],
        [],
    );
    const firstFieldAttrErrorKeys = useMemo(
        () => Object.keys(errors).filter((k) => k.startsWith('firstField_attr_')),
        [errors],
    );

    useEffect(() => {
        if (!apiNameTouched) {
            setApiName(toUserDefinedApiName(label));
        }
    }, [apiNameTouched, label]);

    useEffect(() => {
        if (fieldApiNameTouched[MANDATORY_FIRST_FIELD_ID]) return;
        setFirstField((prev) => ({ ...prev, apiName: toUserDefinedApiName(prev.label) }));
    }, [fieldApiNameTouched, firstField.label]);

    /** Keep auto-number display prefix aligned with object label when still empty. */
    useEffect(() => {
        if (firstField.dataType !== 'autoNumber') return;
        setFirstField((prev) => {
            if (String(prev.attributes.displayFormat ?? '').trim()) return prev;
            const nextFmt = getAutoNumberDisplayFormatFromObjectLabel(label);
            return { ...prev, attributes: { ...prev.attributes, displayFormat: nextFmt } };
        });
    }, [label, firstField.dataType]);

    const buildConfigurationPayload = (objId: number) => {
        const m0 = getFieldTypeMasterEntry(firstField.dataType);
        const attrs0 = { ...firstField.attributes };
        const rowDescription0 = String(attrs0.description ?? '').trim();
        if ('description' in attrs0) delete attrs0.description;
        if (m0?.attributeKeys.includes('required')) attrs0.required = true;
        attrs0.indexed = attrs0.indexed === true || attrs0.indexed === 1;

        const normalizedFields: Array<Record<string, unknown>> = [
            {
                version: 1,
                id: 1,
                dataType: firstField.dataType,
                label: firstField.label.trim(),
                apiName: firstField.apiName.trim(),
                description: rowDescription0,
                required: 1,
                isdeleted: 0,
                isactive: 1,
                isCustom: 0,
                order: 1,
                attributes: attrs0,
            },
            ...fields.map((f, index) => {
                const m = getFieldTypeMasterEntry(f.dataType);
                const attrs = { ...f.attributes };
                if ('description' in attrs) delete attrs.description;
                if (m?.attributeKeys.includes('required')) attrs.required = f.required;
                attrs.indexed = attrs.indexed === true || attrs.indexed === 1;
                return {
                    version: 1,
                    id: index + 2,
                    dataType: f.dataType,
                    label: f.label,
                    apiName: f.apiName,
                    description: String(f.attributes?.description ?? ''),
                    required: f.required ? 1 : 0,
                    isdeleted: 0,
                    isactive: 1,
                    isCustom: 1,
                    order: index + 2,
                    attributes: attrs,
                };
            }),
        ];

        if (objectType === 'hierarchy') {
            const ensureLinkField = (apiName: string, labelText: string) => {
                const exists = normalizedFields.some((f) => String(f.apiName ?? '').trim() === apiName);
                if (exists) return;
                normalizedFields.push({
                    version: 1,
                    id: normalizedFields.length + 1,
                    dataType: 'text',
                    label: labelText,
                    apiName,
                    description: `${labelText} link field for hierarchy object relationship.`,
                    required: 0,
                    isdeleted: 0,
                    isactive: 1,
                    isCustom: 1,
                    order: normalizedFields.length + 1,
                    attributes: {
                        indexed: true,
                        defaultValue: '',
                    },
                });
            };
            ensureLinkField('parent_id_u', 'Parent ID');
            ensureLinkField('child_id_u', 'Child ID');
        }

        normalizedFields.forEach((field, index) => {
            field.id = index + 1;
            field.order = index + 1;
        });

        return {
            obj_id: objId,
            version: 1,
            fields: normalizedFields,
            objectType,
            objectIcon,
            objectLabel: label.trim(),
            objectApiName: apiName.trim(),
            objectDescription: description.trim(),
        } as Record<string, unknown>;
    };

    const updateField = (id: string, patch: Partial<ObjectFieldDefinition>) => {
        setFields((prev) =>
            prev.map((f) => {
                if (f.id !== id) return f;
                const nextField = { ...f, ...patch };
                return nextField;
            }),
        );
    };

    const updateFieldAttribute = (id: string, key: string, value: unknown) => {
        setFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, attributes: { ...f.attributes, [key]: value } } : f)),
        );
    };

    const addField = () => {
        const newField = createField();
        setFields((prev) => [...prev, newField]);
        setFieldApiNameTouched((prev) => ({ ...prev, [newField.id]: false }));
    };
    const removeField = (id: string) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
        setFieldApiNameTouched((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const validate = () => {
        const nextErrors: FieldErrors = {};
        if (!label.trim()) nextErrors.label = 'Object label is required.';
        if (!apiName.trim()) nextErrors.apiName = 'Object API name is required.';
        fields.forEach((field, idx) => {
            if (!field.label.trim()) nextErrors[`field_${idx}_label`] = 'Field label is required.';
            if (!field.apiName.trim()) nextErrors[`field_${idx}_apiName`] = 'Field API name is required.';
            if (!field.dataType) nextErrors[`field_${idx}_dataType`] = 'Data type is required.';
            const merged = mergeAttributesForValidation(field);
            const attrMsgs = validateFieldAttributes(field.dataType, merged);
            attrMsgs.forEach((msg, i) => {
                nextErrors[`field_${idx}_attr_${i}`] = msg;
            });
        });
        if (!firstField.label.trim()) nextErrors.firstFieldLabel = 'First field label is required.';
        if (!firstField.apiName.trim()) nextErrors.firstFieldApiName = 'First field API name is required.';
        if (!MANDATORY_FIRST_FIELD_TYPES.includes(firstField.dataType)) {
            nextErrors.firstFieldType = 'First field type must be Auto Number or Text.';
        }
        const merged0 = mergeAttributesForValidation({ ...firstField, required: true });
        validateFieldAttributes(firstField.dataType, merged0).forEach((msg, i) => {
            nextErrors[`firstField_attr_${i}`] = msg;
        });

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSave = async () => {
        setSaveError(null);
        if (!validate()) return;
        setSaving(true);
        const nowIso = new Date().toISOString();
        const { data: lastRows, error: lastError } = await supabase
            .from('dobj')
            .select('sys_id')
            .order('sys_id', { ascending: false })
            .limit(1);
        if (lastError) {
            setSaving(false);
            setSaveError(lastError.message || 'Unable to read last System ID.');
            return;
        }
        const lastIdRaw = lastRows?.[0]?.sys_id;
        const lastIdNum = Number(lastIdRaw);
        const baseSystemId = 1000000001;
        const nextSystemId = Number.isFinite(lastIdNum) && lastIdNum >= baseSystemId ? lastIdNum + 1 : baseSystemId;

        const configurationPayload = buildConfigurationPayload(nextSystemId);
        const payload = {
            sys_id: nextSystemId,
            entity_id: 1000000000,
            sys_status: 1,
            sys_created_ts: nowIso,
            sys_updated_ts: nowIso,
            sys_created_by_id: 1212,
            sys_updated_by_id: 1212,
            dobj_name_display: label.trim(),
            dobj_name_system: apiName.trim(),
            dobj_description: description.trim() || null,
            dobj_type: 'custom',
            object_type: objectType,
            dobj_status: 1,
            isCustom: 1,
            dobj_configuration: configurationPayload,
        };
        const { data: insertedRows, error } = await supabase
            .from('dobj')
            .insert(payload)
            .select('sys_id,dobj_id,dobj_status,dobj_configuration')
            .limit(1);
        setSaving(false);
        if (error) {
            setSaveError(error.message || 'Failed to save object configuration.');
            return;
        }
        const inserted = insertedRows?.[0] as { sys_id?: number; dobj_id?: number | null } | undefined;
        const scopeDobjId = Number(inserted?.dobj_id ?? inserted?.sys_id ?? nextSystemId);
        const pcResult = await ensureObjectLoaderPlatformConfigRow(1000000000, scopeDobjId);
        const pcError = pcResult.error;
        if (pcError) {
            console.warn('[ObjectAdd] platform_config seed failed:', pcError);
        }
        navigate('/objects');
    };

    const cardCls = 'card p-4 border border-gray-200 bg-white shadow-sm';
    const sectionTitle = 'text-sm font-semibold text-gray-800';

    return (
        <div className="fade-in space-y-4 text-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Link
                        to="/objects"
                        className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 shrink-0"
                        title="Back"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="page-title mb-0 text-lg">New Object</h1>
                        <p className="text-xs text-gray-500 truncate">
                            Fields &amp; Relationships — compact layout aligned with the Objects master template.
                        </p>
                    </div>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm py-1.5">
                    <Save size={16} className="mr-1.5" />
                    {saving ? 'Saving...' : 'Save Object'}
                </button>
            </div>

            <div className={cardCls}>
                <h2 className={sectionTitle}>Object Basic Data</h2>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Object Label *</label>
                        <input
                            className="input text-sm py-1.5"
                            value={label}
                            onChange={(e) => {
                                setLabel(e.target.value);
                            }}
                        />
                        {errors.label && <p className="text-[11px] text-red-600 mt-0.5">{errors.label}</p>}
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Object API Name *</label>
                        <input
                            className="input text-sm py-1.5 font-mono"
                            value={apiName}
                            onChange={(e) => {
                                setApiNameTouched(true);
                                setApiName(toUserDefinedApiName(e.target.value));
                            }}
                        />
                        {errors.apiName && <p className="text-[11px] text-red-600 mt-0.5">{errors.apiName}</p>}
                    </div>
                </div>
                <div className="mt-3">
                    <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Description</label>
                    <textarea className="input text-sm py-1.5 min-h-[64px]" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="mt-4">
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                        <div className="flex flex-col gap-0.5 min-w-[9rem] w-[min(100%,11rem)] shrink-0">
                            <label className="text-[11px] font-medium text-gray-600">Object Type</label>
                            <select
                                className="input text-sm py-1.5 w-full"
                                value={objectType}
                                onChange={(e) => setObjectType(e.target.value as ObjectType)}
                            >
                                <option value="list">List</option>
                                <option value="transaction">Transaction</option>
                                <option value="hierarchy">Hierarchy (Parent &amp; Child)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-[10rem] flex-1 max-w-md">
                            <label className="text-[11px] font-medium text-gray-600">Object Icon</label>
                            <UiIconPickerSelect
                                showSearch={false}
                                wrapperClassName="w-full max-w-none"
                                className="w-full"
                                value={objectIcon}
                                onChange={(k) => setObjectIcon(normalizeObjectIconKey(k))}
                            />
                        </div>
                        <div className="inline-flex items-center gap-2 text-gray-700 rounded border border-gray-200 px-3 py-2 shrink-0">
                            {getObjectIconNode(objectIcon, 18)}
                            <span className="text-sm">Preview</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1.5">
                        Transaction: failed submissions freeze this record attempt. Hierarchy: Parent ID and Child ID
                        fields are auto-added in schema on save.
                    </p>
                </div>
            </div>

            <div className={cardCls}>
                <h2 className={sectionTitle}>Mandatory First Field</h2>
                <p className="text-[11px] text-gray-500 mt-1">
                    Same layout as Fields &amp; Relationships — Auto Number or Text only (name field pattern). Always
                    required.
                </p>
                <div className="mt-3 border border-gray-200 rounded-md p-3 bg-gray-50/50">
                    <FieldDefinitionRowForm
                        fieldLabel={firstField.label}
                        fieldApiName={firstField.apiName}
                        dataType={firstField.dataType}
                        onLabelChange={(nextLabel) => {
                            if (!fieldApiNameTouched[MANDATORY_FIRST_FIELD_ID]) {
                                setFirstField((prev) => ({
                                    ...prev,
                                    label: nextLabel,
                                    apiName: toUserDefinedApiName(nextLabel),
                                }));
                                return;
                            }
                            setFirstField((prev) => ({ ...prev, label: nextLabel }));
                        }}
                        onApiNameChange={(raw) => {
                            setFieldApiNameTouched((prev) => ({ ...prev, [MANDATORY_FIRST_FIELD_ID]: true }));
                            setFirstField((prev) => ({
                                ...prev,
                                apiName: toUserDefinedApiName(raw),
                            }));
                        }}
                        onDataTypeChange={(dt) => {
                            const nextDefaults = getDefaultAttributesForFieldType(dt);
                            if (dt === 'autoNumber' && !String(nextDefaults.displayFormat ?? '').trim()) {
                                nextDefaults.displayFormat = getAutoNumberDisplayFormatFromObjectLabel(label);
                            }
                            const m = getFieldTypeMasterEntry(dt);
                            const attrs: Record<string, unknown> = { ...nextDefaults };
                            if (m?.attributeKeys.includes('required')) attrs.required = true;
                            const prevIndexed =
                                firstField.attributes.indexed === true || firstField.attributes.indexed === 1;
                            attrs.indexed = prevIndexed;
                            const prevUnique =
                                firstField.attributes.unique === true || firstField.attributes.unique === 1;
                            if (supportsUniqueToggle(dt)) attrs.unique = prevUnique;
                            setFirstField((prev) => ({
                                ...prev,
                                dataType: dt,
                                required: true,
                                attributes: attrs,
                            }));
                        }}
                        typePicker={{ variant: 'flat', entries: mandatoryFirstTypeOptions }}
                        dataTypeDescription={getFieldTypeMasterEntry(firstField.dataType)?.description ?? null}
                        errors={{
                            label: errors.firstFieldLabel,
                            apiName: errors.firstFieldApiName,
                            dataType: errors.firstFieldType,
                        }}
                        requiredMode="locked-on"
                        indexed={firstField.attributes.indexed === true || firstField.attributes.indexed === 1}
                        onIndexedChange={(v) =>
                            setFirstField((prev) => ({
                                ...prev,
                                attributes: { ...prev.attributes, indexed: v },
                            }))
                        }
                        unique={firstField.attributes.unique === true || firstField.attributes.unique === 1}
                        onUniqueChange={(v) =>
                            setFirstField((prev) => ({
                                ...prev,
                                attributes: { ...prev.attributes, unique: v },
                            }))
                        }
                        columnLayout="wideDataType"
                    />
                    <FieldAttributesSectionedPanel
                        dataType={firstField.dataType}
                        attributes={firstField.attributes}
                        omitKeys={new Set(['required'])}
                        onChange={(key, v) =>
                            setFirstField((prev) => ({
                                ...prev,
                                attributes: { ...prev.attributes, [key]: v },
                            }))
                        }
                        className="mt-2 border-t border-gray-200 pt-2"
                        compact
                        scrollable
                        objectLabel={label}
                    />
                    {firstFieldAttrErrorKeys.length > 0 ? (
                        <ul className="mt-2 space-y-0.5">
                            {firstFieldAttrErrorKeys.map((k) => (
                                <li key={k} className="text-[11px] text-red-600">
                                    {errors[k]}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            </div>

            <div className={cardCls}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className={sectionTitle}>Fields &amp; Relationships</h2>
                    <button type="button" className="btn btn-primary text-sm py-1.5" onClick={addField}>
                        <Plus size={16} className="mr-1.5" />
                        Add Field
                    </button>
                </div>

                {fields.map((field, idx) => {
                    const master = getFieldTypeMasterEntry(field.dataType);
                    const attrErrorKeys = Object.keys(errors).filter((k) => k.startsWith(`field_${idx}_attr_`));

                    return (
                        <div key={field.id} className="mt-3 border border-gray-200 rounded-md p-3 bg-gray-50/50">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Field {idx + 1}</span>
                                <button
                                    type="button"
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    onClick={() => removeField(field.id)}
                                    title="Remove field"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <FieldDefinitionRowForm
                                fieldLabel={field.label}
                                fieldApiName={field.apiName}
                                dataType={field.dataType}
                                onLabelChange={(nextLabel) => {
                                    if (!fieldApiNameTouched[field.id]) {
                                        updateField(field.id, {
                                            label: nextLabel,
                                            apiName: toUserDefinedApiName(nextLabel),
                                        });
                                        return;
                                    }
                                    updateField(field.id, { label: nextLabel });
                                }}
                                onApiNameChange={(raw) => {
                                    setFieldApiNameTouched((prev) => ({ ...prev, [field.id]: true }));
                                    updateField(field.id, { apiName: toUserDefinedApiName(raw) });
                                }}
                                onDataTypeChange={(dt) => {
                                    const nextDefaults = getDefaultAttributesForFieldType(dt);
                                    if (dt === 'autoNumber' && !String(nextDefaults.displayFormat ?? '').trim()) {
                                        nextDefaults.displayFormat = getAutoNumberDisplayFormatFromObjectLabel(label);
                                    }
                                    const m = getFieldTypeMasterEntry(dt);
                                    const attrs: Record<string, unknown> = { ...nextDefaults };
                                    const nextRequired = dt === 'autoNumber';
                                    if (m?.attributeKeys.includes('required')) attrs.required = nextRequired;
                                    const prevIndexed =
                                        field.attributes.indexed === true || field.attributes.indexed === 1;
                                    attrs.indexed = prevIndexed;
                                    updateField(field.id, { dataType: dt, required: nextRequired, attributes: attrs });
                                }}
                                typePicker={{ variant: 'grouped', groups: typeGroups }}
                                dataTypeDescription={master?.description ?? null}
                                errors={{
                                    label: errors[`field_${idx}_label`],
                                    apiName: errors[`field_${idx}_apiName`],
                                    dataType: errors[`field_${idx}_dataType`],
                                }}
                                requiredMode="interactive"
                                required={field.required}
                                onRequiredChange={(v) => updateField(field.id, { required: v })}
                                indexed={field.attributes.indexed === true || field.attributes.indexed === 1}
                                onIndexedChange={(v) => updateFieldAttribute(field.id, 'indexed', v)}
                                unique={field.attributes.unique === true || field.attributes.unique === 1}
                                onUniqueChange={(v) => updateFieldAttribute(field.id, 'unique', v)}
                                columnLayout="wideDataType"
                            />

                            <FieldAttributesSectionedPanel
                                dataType={field.dataType}
                                attributes={field.attributes}
                                omitKeys={new Set(['required'])}
                                onChange={(key, v) => updateFieldAttribute(field.id, key, v)}
                                className="mt-2 border-t border-gray-200 pt-2"
                                compact
                                scrollable
                                objectLabel={label}
                            />

                            {attrErrorKeys.length > 0 ? (
                                <ul className="mt-2 space-y-0.5">
                                    {attrErrorKeys.map((k) => (
                                        <li key={k} className="text-[11px] text-red-600">
                                            {errors[k]}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {saveError && (
                <div className={cardCls}>
                    <p className="text-sm text-red-600">{saveError}</p>
                </div>
            )}
        </div>
    );
}
