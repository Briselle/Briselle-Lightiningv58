import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';
import { ensureObjectLoaderPlatformConfigRow } from '../../../components/ui/tabletemplates/utils/configService';
import type { ObjectFieldDataType, ObjectFieldDefinition } from '../FieldRelated/objectDefinitionSchema';
import {
    getPickerIconNode,
    normalizeUiIconKey,
    UI_ICON_CUSTOM_KEY,
    UiIconPickerSelect,
} from '../../../utils/uiIconPickerCatalog';
import { FieldAttributesSectionedPanel } from '../FieldRelated/FieldAttributesSectionedPanel';
import {
    FieldDefinitionRowForm,
    getAutoNumberDisplayFormatFromObjectLabel,
    groupedFieldTypes,
    supportsUniqueToggle,
    toUserDefinedApiName,
} from '../FieldRelated/fieldDataTypeModel';
import { getDefaultAttributesForFieldType, getFieldTypeMasterEntry, validateFieldAttributes } from '../FieldRelated/fieldTypeMaster';
import { syncNotionNestFieldRows } from '../FieldRelated/notionNestSystemField';
import {
    buildFixedPlatformSystemFieldRows,
    PLATFORM_SYSTEM_API_SET,
    recordDisplayFieldApiForDataType,
    RECORD_ID_FIELD_API,
    RECORD_NAME_FIELD_API,
} from '../FieldRelated/platformSystemFields';
import { readIncludeInInlineEdit, readIncludeInTableView, withDataViewDefaults } from '../FieldRelated/fieldDataViewAttributes';
import { toDobjObjectTypeColumn, type PlatformObjectType } from '../shared/objectTypes';

type FieldErrors = Record<string, string>;
type ObjectType = PlatformObjectType;

function createField(overrides?: Partial<ObjectFieldDefinition>): ObjectFieldDefinition {
    const dataType = overrides?.dataType ?? 'text';
    const defaults = getDefaultAttributesForFieldType(dataType);
    const base: ObjectFieldDefinition = {
        id: crypto.randomUUID(),
        label: '',
        apiName: '',
        dataType,
        required: false,
        attributes: withDataViewDefaults({ ...defaults, indexed: false }),
    };
    return {
        ...base,
        ...overrides,
        attributes: withDataViewDefaults({ ...base.attributes, ...overrides?.attributes }),
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
        apiName: recordDisplayFieldApiForDataType(dataType),
        dataType,
        required: true,
        attributes: withDataViewDefaults({ ...defaults, indexed: true }),
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
    const [objectIcon, setObjectIcon] = useState<string>('table');
    const [objectCustomIcon, setObjectCustomIcon] = useState('');

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
        const fixedRows = buildFixedPlatformSystemFieldRows();
        const m0 = getFieldTypeMasterEntry(firstField.dataType);
        const attrs0 = { ...firstField.attributes };
        const rowDescription0 = String(attrs0.description ?? '').trim();
        if ('description' in attrs0) delete attrs0.description;
        if (m0?.attributeKeys.includes('required')) attrs0.required = true;
        attrs0.indexed = attrs0.indexed === true || attrs0.indexed === 1;
        attrs0.systemManaged = true;

        const recordNameRow: Record<string, unknown> = {
            version: 1,
            dataType: firstField.dataType,
            label: firstField.label.trim(),
            apiName: firstField.apiName.trim(),
            description: rowDescription0,
            required: 1,
            isdeleted: 0,
            isactive: 1,
            isCustom: 0,
            attributes: attrs0,
        };

        const normalizedFields: Array<Record<string, unknown>> = [
            ...fixedRows.map((row) => ({ ...row })),
            recordNameRow,
            ...fields.map((f) => {
                const m = getFieldTypeMasterEntry(f.dataType);
                const attrs = { ...f.attributes };
                if ('description' in attrs) delete attrs.description;
                if (m?.attributeKeys.includes('required')) attrs.required = f.required;
                attrs.indexed = attrs.indexed === true || attrs.indexed === 1;
                return {
                    version: 1,
                    dataType: f.dataType,
                    label: f.label,
                    apiName: f.apiName,
                    description: String(f.attributes?.description ?? ''),
                    required: f.required ? 1 : 0,
                    isdeleted: 0,
                    isactive: 1,
                    isCustom: 1,
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
                    dataType: 'text',
                    label: labelText,
                    apiName,
                    description: `${labelText} link field for hierarchy object relationship.`,
                    required: 0,
                    isdeleted: 0,
                    isactive: 1,
                    isCustom: 1,
                    attributes: withDataViewDefaults({
                        indexed: true,
                        defaultValue: '',
                    }),
                });
            };
            ensureLinkField('parent_id_u', 'Parent ID');
            ensureLinkField('child_id_u', 'Child ID');
        }

        const withNotionNest = syncNotionNestFieldRows(normalizedFields, objectType);

        withNotionNest.forEach((field, index) => {
            field.id = index + 1;
            field.order = index + 1;
        });

        return {
            obj_id: objId,
            version: 1,
            fields: withNotionNest,
            objectType,
            objectIcon,
            objectCustomIcon: objectIcon === UI_ICON_CUSTOM_KEY ? objectCustomIcon.trim() : '',
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
            const reserved = toUserDefinedApiName(field.apiName || '').toLowerCase();
            if (PLATFORM_SYSTEM_API_SET.has(reserved)) {
                nextErrors[`field_${idx}_apiName`] = 'That API name is reserved for built-in fields.';
            }
            if (!field.dataType) nextErrors[`field_${idx}_dataType`] = 'Data type is required.';
            const merged = mergeAttributesForValidation(field);
            const attrMsgs = validateFieldAttributes(field.dataType, merged);
            attrMsgs.forEach((msg, i) => {
                nextErrors[`field_${idx}_attr_${i}`] = msg;
            });
        });
        if (!firstField.label.trim()) nextErrors.firstFieldLabel = 'First field label is required.';
        if (firstField.apiName.trim().toLowerCase() !== RECORD_NAME_FIELD_API) {
            nextErrors.firstFieldApiName = `Record name API must be ${RECORD_NAME_FIELD_API}.`;
        }
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
            object_type: toDobjObjectTypeColumn(objectType),
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
                <div className="mt-4 min-w-0">
                    <div className="flex flex-wrap md:flex-nowrap gap-x-3 gap-y-3 w-full min-w-0 items-start">
                        <div className="flex flex-col gap-0.5 min-w-[8rem] shrink-0 basis-[9rem] max-w-[12rem]">
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Object Type</label>
                            <select
                                className="input text-sm h-10 py-0 w-full min-w-0 leading-snug"
                                value={objectType}
                                onChange={(e) => setObjectType(e.target.value as ObjectType)}
                            >
                                <option value="list">List</option>
                                <option value="transaction">Transaction</option>
                                <option value="hierarchy">Hierarchy (Parent &amp; Child)</option>
                                <option value="notionnest">NotionNest (Pages)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1 basis-[10rem] min-w-0">
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Object Icon</label>
                            <UiIconPickerSelect
                                showSearch={false}
                                wrapperClassName="w-full max-w-none gap-0"
                                className="h-10 py-0 leading-snug"
                                value={objectIcon}
                                onChange={(k) => setObjectIcon(normalizeUiIconKey(k))}
                            />
                        </div>
                        {objectIcon === UI_ICON_CUSTOM_KEY && (
                            <div className="flex flex-col gap-0.5 w-[6.5rem] shrink-0 sm:w-[7.5rem]">
                                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Emoji</label>
                                <input
                                    type="text"
                                    className="input text-sm h-10 py-0 w-full text-center"
                                    value={objectCustomIcon}
                                    onChange={(e) => setObjectCustomIcon(e.target.value)}
                                    placeholder="🙂"
                                    maxLength={16}
                                />
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5 w-[5.5rem] shrink-0 sm:w-24">
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Preview</label>
                            <div className="input flex h-10 w-full items-center justify-center bg-white px-2 py-0" title="Icon preview">
                                {getPickerIconNode(objectIcon, 20, objectCustomIcon)}
                            </div>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-[7rem] shrink-0 basis-[8rem] max-w-[11rem]">
                            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Creation Type</label>
                            <input
                                className="input text-sm h-10 py-0 w-full bg-gray-100 text-gray-700 leading-snug"
                                readOnly
                                disabled
                                value="custom"
                            />
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1.5">
                        Transaction: failed submissions freeze this record attempt. Hierarchy: Parent ID and Child ID
                        fields are auto-added in schema on save.
                    </p>
                </div>
            </div>

            <div className={cardCls}>
                <h2 className={sectionTitle}>Record name</h2>
                <p className="text-[11px] text-gray-500 mt-1">
                    Primary display field — Auto Number or Text only. API is fixed by type:{' '}
                    <span className="font-mono">{RECORD_NAME_FIELD_API}</span> (Text) or{' '}
                    <span className="font-mono">{RECORD_ID_FIELD_API}</span> (Auto Number). Platform columns (ID, Status,
                    audit fields) are added automatically with every new object.
                </p>
                <div className="mt-3 border border-gray-200 rounded-md p-3 bg-gray-50/50">
                    <FieldDefinitionRowForm
                        fieldLabel={firstField.label}
                        fieldApiName={firstField.apiName}
                        dataType={firstField.dataType}
                        onLabelChange={(nextLabel) => setFirstField((prev) => ({ ...prev, label: nextLabel }))}
                        onApiNameChange={() => {}}
                        apiNameReadOnly
                        onDataTypeChange={(dt) => {
                            const nextDefaults = getDefaultAttributesForFieldType(dt);
                            if (dt === 'autoNumber' && !String(nextDefaults.displayFormat ?? '').trim()) {
                                nextDefaults.displayFormat = getAutoNumberDisplayFormatFromObjectLabel(label);
                            }
                            const m = getFieldTypeMasterEntry(dt);
                            setFirstField((prev) => {
                                const attrs: Record<string, unknown> = { ...nextDefaults };
                                if (m?.attributeKeys.includes('required')) attrs.required = true;
                                const prevIndexed =
                                    prev.attributes.indexed === true || prev.attributes.indexed === 1;
                                attrs.indexed = prevIndexed;
                                const prevUnique =
                                    prev.attributes.unique === true || prev.attributes.unique === 1;
                                if (supportsUniqueToggle(dt)) attrs.unique = prevUnique;
                                const keepTable = readIncludeInTableView(prev.attributes);
                                const keepInline = readIncludeInInlineEdit(prev.attributes);
                                return {
                                    ...prev,
                                    dataType: dt,
                                    apiName: recordDisplayFieldApiForDataType(dt),
                                    required: true,
                                    attributes: withDataViewDefaults({
                                        ...attrs,
                                        includeInTableView: keepTable,
                                        includeInInlineEdit: keepInline,
                                    }),
                                };
                            });
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
                                    updateField(field.id, (() => {
                                        const attrs: Record<string, unknown> = { ...nextDefaults };
                                        const nextRequired = dt === 'autoNumber';
                                        if (m?.attributeKeys.includes('required')) attrs.required = nextRequired;
                                        const prevIndexed =
                                            field.attributes.indexed === true || field.attributes.indexed === 1;
                                        attrs.indexed = prevIndexed;
                                        const keepTable = readIncludeInTableView(field.attributes);
                                        const keepInline = readIncludeInInlineEdit(field.attributes);
                                        return {
                                            dataType: dt,
                                            required: nextRequired,
                                            attributes: withDataViewDefaults({
                                                ...attrs,
                                                includeInTableView: keepTable,
                                                includeInInlineEdit: keepInline,
                                            }),
                                        };
                                    })());
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
