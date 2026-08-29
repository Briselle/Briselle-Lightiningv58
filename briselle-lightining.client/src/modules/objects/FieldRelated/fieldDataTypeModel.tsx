/**
 * Shared field row UI + helpers for Object Manager / Object intake (single layout, no duplicated markup).
 */
import type { ObjectFieldDataType } from './objectDefinitionSchema';
import { FIELD_TYPE_MASTER, type FieldTypeMasterEntry } from './fieldTypeMaster';
import { cn } from '../../../utils/helpers';

export const FIELD_TYPE_CATEGORY_ORDER = [
    'System',
    'Calculated',
    'Relationship',
    'General',
    'Numeric',
    'Date/Time',
    'Text',
    'Picklist',
] as const;

/** Types only injected by the platform (not user-selectable on Add Field). */
const USER_SELECTABLE_TYPE_IDS = new Set(
    FIELD_TYPE_MASTER.map((e) => e.id).filter((id) => id !== 'notionNestPage'),
);

export function groupedFieldTypes(): { category: string; entries: FieldTypeMasterEntry[] }[] {
    const map = new Map<string, FieldTypeMasterEntry[]>();
    for (const e of FIELD_TYPE_MASTER) {
        if (!USER_SELECTABLE_TYPE_IDS.has(e.id)) continue;
        map.set(e.category, [...(map.get(e.category) ?? []), e]);
    }
    return FIELD_TYPE_CATEGORY_ORDER.map((c) => ({ category: c, entries: map.get(c) ?? [] })).filter(
        (g) => g.entries.length > 0,
    );
}

export function toUserDefinedApiName(value: string | undefined | null): string {
    const base = String(value ?? '')
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
    if (!base) return '';
    return base.endsWith('_u') ? base : `${base}_u`;
}

export function getAutoNumberDisplayFormatFromObjectLabel(objectLabel?: string): string {
    const cleaned = String(objectLabel ?? '').replace(/[^a-z0-9]/gi, '').trim();
    if (!cleaned) return 'OBJ-';
    return `${cleaned.slice(0, 3)}-`;
}

export function supportsUniqueToggle(dataType: ObjectFieldDataType): boolean {
    return new Set<ObjectFieldDataType>(['autoNumber', 'email', 'geolocation', 'url', 'number', 'phone', 'text']).has(
        dataType,
    );
}

export function InlineFieldSwitch({
    checked,
    disabled,
    onChange,
    ariaLabel,
}: {
    checked: boolean;
    disabled?: boolean;
    onChange: (next: boolean) => void;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => {
                if (disabled) return;
                onChange(!checked);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            } ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
            <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow mt-0.5 transition-transform ${
                    checked ? 'translate-x-4' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}

export type FieldRowTypePicker =
    | { variant: 'grouped'; groups: { category: string; entries: FieldTypeMasterEntry[] }[] }
    | { variant: 'flat'; entries: FieldTypeMasterEntry[] };

export type FieldDefinitionRowErrors = {
    label?: string;
    apiName?: string;
    dataType?: string;
};

/**
 * `balanced`: 3+3+3+3 (toggle bank). `wideDataType`: 2+2+5+3 — wider Data Type on New Object intake.
 * Toggles share one grid cell so they never wrap to a second row when the `<select>` has a large intrinsic width.
 */
export type FieldDefinitionRowColumnLayout = 'balanced' | 'wideDataType';

export type FieldDefinitionRowFormProps = {
    fieldLabel: string;
    fieldApiName: string;
    dataType: ObjectFieldDataType;
    onLabelChange: (v: string) => void;
    onApiNameChange: (v: string) => void;
    onDataTypeChange: (dt: ObjectFieldDataType) => void;
    typePicker: FieldRowTypePicker;
    /** Master “What is this?” line under the Data Type control. */
    dataTypeDescription?: string | null;
    errors?: FieldDefinitionRowErrors;
    /** Label for API name input (Object Manager uses “Field Name (API)” in some places). */
    apiNameFieldLabel?: string;
    /** Lock Field Name (API) — platform record-name slot uses a fixed api key. */
    apiNameReadOnly?: boolean;
    requiredMode: 'interactive' | 'locked-on' | 'placeholder';
    required?: boolean;
    onRequiredChange?: (v: boolean) => void;
    indexed: boolean;
    onIndexedChange: (v: boolean) => void;
    unique: boolean;
    onUniqueChange: (v: boolean) => void;
    columnLayout?: FieldDefinitionRowColumnLayout;
    leadingToggle?: {
        label: string;
        checked: boolean;
        ariaLabel: string;
        onChange: (v: boolean) => void;
        disabled?: boolean;
    };
};

function renderDataTypeSelect(
    typePicker: FieldRowTypePicker,
    dataType: ObjectFieldDataType,
    onDataTypeChange: (dt: ObjectFieldDataType) => void,
) {
    if (typePicker.variant === 'grouped') {
        return (
            <select
                className="input text-sm py-1.5 w-full"
                value={dataType}
                onChange={(e) => onDataTypeChange(e.target.value as ObjectFieldDataType)}
            >
                {typePicker.groups.map(({ category, entries }) => (
                    <optgroup key={category} label={category}>
                        {entries.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.label}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>
        );
    }
    return (
        <select
            className="input text-sm py-1.5 w-full min-w-0 max-w-full"
            value={dataType}
            onChange={(e) => onDataTypeChange(e.target.value as ObjectFieldDataType)}
        >
            {typePicker.entries.map((e) => (
                <option key={e.id} value={e.id}>
                    {e.label}
                </option>
            ))}
        </select>
    );
}

/**
 * 12-column field header: Field Label, Field Name, Data Type (3rd), then Required/Indexed/Unique in one bank.
 * Grid uses `minmax(0,1fr)` so wide `<select>` content cannot push Unique to a new row.
 */
export function FieldDefinitionRowForm({
    fieldLabel,
    fieldApiName,
    dataType,
    onLabelChange,
    onApiNameChange,
    onDataTypeChange,
    typePicker,
    dataTypeDescription,
    errors,
    apiNameFieldLabel = 'Field Name *',
    apiNameReadOnly = false,
    requiredMode,
    required = false,
    onRequiredChange,
    indexed,
    onIndexedChange,
    unique,
    onUniqueChange,
    columnLayout = 'balanced',
    leadingToggle,
}: FieldDefinitionRowFormProps) {
    const labelSpan = columnLayout === 'wideDataType' ? 'md:col-span-2' : 'md:col-span-3';
    const apiSpan = columnLayout === 'wideDataType' ? 'md:col-span-2' : 'md:col-span-3';
    const dataTypeSpan = columnLayout === 'wideDataType' ? 'md:col-span-5' : 'md:col-span-3';
    const toggleBankSpan = 'md:col-span-3';
    return (
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 md:grid-cols-[repeat(12,minmax(0,1fr))] md:items-start">
            <div className={`${labelSpan} min-w-0`}>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Field Label *</label>
                <input
                    className="input text-sm py-1.5 w-full"
                    value={fieldLabel}
                    onChange={(e) => onLabelChange(e.target.value)}
                />
                {errors?.label ? <p className="text-[11px] text-red-600 mt-0.5">{errors.label}</p> : null}
            </div>
            <div className={`${apiSpan} min-w-0`}>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">{apiNameFieldLabel}</label>
                <input
                    className={cn(
                        'input text-sm py-1.5 w-full font-mono',
                        apiNameReadOnly && 'bg-gray-100 cursor-not-allowed',
                    )}
                    value={fieldApiName}
                    readOnly={apiNameReadOnly}
                    onChange={(e) => onApiNameChange(e.target.value)}
                />
                {errors?.apiName ? <p className="text-[11px] text-red-600 mt-0.5">{errors.apiName}</p> : null}
            </div>
            <div className={`${dataTypeSpan} min-w-0`}>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Data Type *</label>
                {renderDataTypeSelect(typePicker, dataType, onDataTypeChange)}
                {dataTypeDescription ? (
                    <p className="text-[10px] text-gray-500 leading-snug mt-1">{dataTypeDescription}</p>
                ) : null}
                {errors?.dataType ? <p className="text-[11px] text-red-600 mt-0.5">{errors.dataType}</p> : null}
            </div>
            <div
                className={`${toggleBankSpan} flex min-w-0 flex-row flex-nowrap items-end justify-end gap-3 pb-1 md:gap-4`}
            >
                {leadingToggle ? (
                    <div className="flex shrink-0 flex-col gap-1">
                        <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">
                            {leadingToggle.label}
                        </span>
                        <InlineFieldSwitch
                            checked={leadingToggle.checked}
                            ariaLabel={leadingToggle.ariaLabel}
                            onChange={leadingToggle.onChange}
                            disabled={leadingToggle.disabled}
                        />
                    </div>
                ) : null}
                <div className="flex shrink-0 flex-col gap-1">
                    <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">Required</span>
                    {requiredMode === 'interactive' && onRequiredChange ? (
                        <InlineFieldSwitch checked={required} ariaLabel="Required" onChange={onRequiredChange} />
                    ) : requiredMode === 'locked-on' ? (
                        <InlineFieldSwitch checked ariaLabel="Required (always on)" disabled onChange={() => {}} />
                    ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                    )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                    <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">Indexed</span>
                    <InlineFieldSwitch checked={indexed} ariaLabel="Indexed" onChange={onIndexedChange} />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                    <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">Unique</span>
                    <InlineFieldSwitch
                        checked={unique}
                        ariaLabel="Unique"
                        disabled={!supportsUniqueToggle(dataType)}
                        onChange={onUniqueChange}
                    />
                </div>
            </div>
        </div>
    );
}
