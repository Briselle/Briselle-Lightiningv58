/**
 * Master catalog for Salesforce-style custom fields (Object Manager parity, storage-oriented).
 * Used to drive defaults, validation, and compact UI. Serializable as JSON via FIELD_TYPE_MASTER.
 */
import type { ObjectFieldDataType } from './objectDefinitionSchema';

/** Single attribute definition — keys map to values stored on `ObjectFieldDefinition.attributes`. */
export interface MasterAttributeDef {
    key: string;
    label: string;
    /** When `label` is empty, used for `aria-label` on the control. */
    accessibilityLabel?: string;
    kind: 'text' | 'textarea' | 'number' | 'checkbox' | 'select';
    required?: boolean;
    placeholder?: string;
    min?: number;
    max?: number;
    rows?: number;
    hint?: string;
    options?: { value: string; label: string }[];
}

export interface FieldTypeMasterEntry {
    id: ObjectFieldDataType;
    /** UI section / optgroup */
    category: string;
    /** Salesforce-style picker label */
    label: string;
    /** Short description (SF “What is this?” style) */
    description: string;
    /** Ordered attribute keys from ATTRIBUTE_CATALOG */
    attributeKeys: string[];
}

/** All supported attribute keys; many types reuse the same keys. */
export const ATTRIBUTE_CATALOG: Record<string, MasterAttributeDef> = {
    description: {
        key: 'description',
        label: 'Description',
        kind: 'textarea',
        rows: 2,
        placeholder: 'Describe this field',
    },
    helpText: {
        key: 'helpText',
        label: 'Help Text',
        kind: 'textarea',
        rows: 2,
        placeholder: 'Shown on edit/detail pages',
    },
    autoAddToCustomReportType: {
        key: 'autoAddToCustomReportType',
        label: 'Auto add to custom report type',
        kind: 'checkbox',
    },
    defaultValue: {
        key: 'defaultValue',
        label: 'Default Value',
        kind: 'text',
        placeholder: 'Literal or formula (advanced)',
    },
    required: {
        key: 'required',
        label: 'Required',
        kind: 'checkbox',
        hint: 'Always require a value to save a record',
    },
    unique: {
        key: 'unique',
        label: 'Unique',
        kind: 'checkbox',
        hint: 'Do not allow duplicate values',
    },
    externalId: {
        key: 'externalId',
        label: 'External ID',
        kind: 'checkbox',
        hint: 'Unique identifier from an external system',
    },
    caseSensitivity: {
        key: 'caseSensitivity',
        label: 'Duplicate matching',
        kind: 'select',
        options: [
            { value: 'insensitive', label: 'Treat “ABC” and “abc” as duplicates (case insensitive)' },
            { value: 'sensitive', label: 'Treat “ABC” and “abc” as different (case sensitive)' },
        ],
    },
    displayFormat: {
        key: 'displayFormat',
        label: 'Display Format',
        kind: 'text',
        placeholder: 'e.g. A-{0000}',
        hint: 'Auto-number display pattern',
    },
    startingNumber: {
        key: 'startingNumber',
        label: 'Starting Number',
        kind: 'number',
        required: true,
        min: 0,
    },
    generateAutoNumberForExisting: {
        key: 'generateAutoNumberForExisting',
        label: 'Generate Auto Number for existing records',
        kind: 'checkbox',
    },
    formulaReturnType: {
        key: 'formulaReturnType',
        label: 'Formula Return Type',
        kind: 'select',
        required: true,
        options: [
            { value: 'checkbox', label: 'Checkbox' },
            { value: 'currency', label: 'Currency' },
            { value: 'date', label: 'Date' },
            { value: 'dateTime', label: 'Date/Time' },
            { value: 'number', label: 'Number' },
            { value: 'percent', label: 'Percent' },
            { value: 'text', label: 'Text' },
            { value: 'time', label: 'Time' },
        ],
    },
    formulaExpression: {
        key: 'formulaExpression',
        label: 'Formula',
        kind: 'textarea',
        rows: 3,
        required: true,
        placeholder: 'e.g. Amount - Cost__c',
    },
    summarizedObject: {
        key: 'summarizedObject',
        label: 'Summarized Object',
        kind: 'text',
        required: true,
        placeholder: 'API name of child object',
    },
    masterObject: {
        key: 'masterObject',
        label: 'Master Object',
        kind: 'text',
        placeholder: 'Optional; defaults to this object',
    },
    rollUpType: {
        key: 'rollUpType',
        label: 'Roll-Up Type',
        kind: 'select',
        required: true,
        options: [
            { value: 'count', label: 'COUNT' },
            { value: 'sum', label: 'SUM' },
            { value: 'min', label: 'MIN' },
            { value: 'max', label: 'MAX' },
        ],
    },
    fieldToAggregate: {
        key: 'fieldToAggregate',
        label: 'Field to Aggregate',
        kind: 'text',
        placeholder: 'API name (for SUM/MIN/MAX)',
    },
    rollupFilterMode: {
        key: 'rollupFilterMode',
        label: 'Filter Criteria',
        kind: 'select',
        options: [
            { value: 'all', label: 'All records included' },
            { value: 'criteria', label: 'Only records meeting criteria' },
        ],
    },
    rollupFilterCriteria: {
        key: 'rollupFilterCriteria',
        label: 'Criteria',
        kind: 'textarea',
        rows: 2,
        placeholder: 'Describe or encode filter (app-defined)',
    },
    relatedToObject: {
        key: 'relatedToObject',
        label: 'Related To',
        kind: 'text',
        required: true,
        placeholder: 'Object API name, e.g. Opportunity',
    },
    relatedToExternalObject: {
        key: 'relatedToExternalObject',
        label: 'Related To (External)',
        kind: 'text',
        required: true,
        placeholder: 'External object API name',
    },
    defaultChecked: {
        key: 'defaultChecked',
        label: 'Default Value',
        kind: 'select',
        options: [
            { value: 'unchecked', label: 'Unchecked' },
            { value: 'checked', label: 'Checked' },
        ],
    },
    length: {
        key: 'length',
        label: 'Length',
        kind: 'number',
        required: true,
        min: 1,
        max: 18,
        hint: 'Total digits for number/currency/percent',
    },
    decimalPlaces: {
        key: 'decimalPlaces',
        label: 'Decimal Places',
        kind: 'number',
        required: true,
        min: 0,
        max: 17,
    },
    useForAiPrediction: {
        key: 'useForAiPrediction',
        label: 'AI Prediction',
        kind: 'checkbox',
        hint: 'Store AI prediction scores',
    },
    piiData: {
        key: 'piiData',
        label: 'PII Data',
        kind: 'checkbox',
        hint: 'Personally identifiable information',
    },
    hiiData: {
        key: 'hiiData',
        label: 'HII Data',
        kind: 'checkbox',
        hint: 'Health-related or similarly sensitive information',
    },
    financialData: {
        key: 'financialData',
        label: 'Financial Data',
        kind: 'checkbox',
        hint: 'Financial or payment-related information',
    },
    emailVerificationStatus: {
        key: 'emailVerificationStatus',
        label: '',
        accessibilityLabel: 'Email verification status',
        kind: 'select',
        options: [
            { value: 'not_bounced', label: 'Not bounced' },
            { value: 'bounced', label: 'Bounced' },
        ],
        hint: 'Delivery / bounce tracking (if enabled for your org)',
    },
    currencySymbol: {
        key: 'currencySymbol',
        label: 'Currency Symbol',
        kind: 'select',
        options: [
            { value: 'USD', label: 'USD ($)' },
            { value: 'EUR', label: 'EUR (€)' },
            { value: 'GBP', label: 'GBP (£)' },
            { value: 'INR', label: 'INR (₹)' },
            { value: 'JPY', label: 'JPY (¥)' },
        ],
    },
    geolocationDisplayNotation: {
        key: 'geolocationDisplayNotation',
        label: 'Lat/Long display notation',
        kind: 'select',
        options: [
            { value: 'dms', label: 'Degrees, Minutes, Seconds' },
            { value: 'decimal', label: 'Decimal' },
        ],
    },
    geolocationDecimalPlaces: {
        key: 'geolocationDecimalPlaces',
        label: 'Decimal Places',
        kind: 'number',
        required: true,
        min: 0,
        max: 15,
    },
    picklistValues: {
        key: 'picklistValues',
        label: 'Values',
        kind: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'One value per line',
        hint: 'Enter values, each on a new line',
    },
    useGlobalPicklistValueSet: {
        key: 'useGlobalPicklistValueSet',
        label: 'Use global picklist value set',
        kind: 'checkbox',
    },
    globalPicklistValueSetName: {
        key: 'globalPicklistValueSetName',
        label: 'Global value set name',
        kind: 'text',
        placeholder: 'If using global set',
    },
    picklistDisplayAlphabetically: {
        key: 'picklistDisplayAlphabetically',
        label: 'Display values alphabetically',
        kind: 'checkbox',
    },
    picklistUseFirstAsDefault: {
        key: 'picklistUseFirstAsDefault',
        label: 'Use first value as default',
        kind: 'checkbox',
    },
    picklistRestrictToDefinedValues: {
        key: 'picklistRestrictToDefinedValues',
        label: 'Restrict to values defined in the value set',
        kind: 'checkbox',
    },
    picklistVisibleLines: {
        key: 'picklistVisibleLines',
        label: '# Visible Lines',
        kind: 'number',
        required: true,
        min: 1,
        max: 10,
    },
    textLength: {
        key: 'textLength',
        label: 'Length',
        kind: 'number',
        required: true,
        min: 1,
        max: 255,
    },
    textAreaLongLength: {
        key: 'textAreaLongLength',
        label: 'Length',
        kind: 'number',
        min: 256,
        max: 131072,
        hint: 'Max 131,072',
    },
    textAreaLongVisibleLines: {
        key: 'textAreaLongVisibleLines',
        label: '# Visible Lines',
        kind: 'number',
        required: true,
        min: 3,
        max: 50,
    },
    textEncryptedLength: {
        key: 'textEncryptedLength',
        label: 'Length',
        kind: 'number',
        required: true,
        min: 1,
        max: 32768,
    },
    maskType: {
        key: 'maskType',
        label: 'Mask Type',
        kind: 'select',
        required: true,
        options: [
            { value: 'none', label: '— None —' },
            { value: 'all', label: 'Mask all characters' },
            { value: 'lastFour', label: 'Show last four' },
            { value: 'creditCard', label: 'Credit card' },
            { value: 'ssn', label: 'Social Security Number' },
        ],
    },
    maskCharacter: {
        key: 'maskCharacter',
        label: 'Mask Character',
        kind: 'select',
        required: true,
        options: [
            { value: 'none', label: '— None —' },
            { value: '*', label: '*' },
            { value: 'X', label: 'X' },
        ],
    },
};

const cat = ATTRIBUTE_CATALOG;

/** Ordered master list: matches Salesforce “Data Type” picker groupings. */
export const FIELD_TYPE_MASTER: FieldTypeMasterEntry[] = [
    {
        id: 'autoNumber',
        category: 'System',
        label: 'Auto Number',
        description: 'System-generated sequence using a display format you define.',
        attributeKeys: [
            'displayFormat',
            'startingNumber',
            'generateAutoNumberForExisting',
            'unique',
            'defaultValue',
            'description',
            'helpText',
            'externalId',
            'autoAddToCustomReportType',
        ],
    },
    {
        id: 'formula',
        category: 'Calculated',
        label: 'Formula',
        description: 'Read-only; value from a formula expression.',
        attributeKeys: [
            'formulaReturnType',
            'formulaExpression',
            'defaultValue',
            'description',
            'helpText',
            'autoAddToCustomReportType',
        ],
    },
    {
        id: 'rollupSummary',
        category: 'Calculated',
        label: 'Roll-Up Summary',
        description: 'Aggregates data from a related list.',
        attributeKeys: [
            'masterObject',
            'summarizedObject',
            'rollUpType',
            'fieldToAggregate',
            'rollupFilterMode',
            'rollupFilterCriteria',
            'defaultValue',
            'description',
            'helpText',
            'autoAddToCustomReportType',
        ],
    },
    {
        id: 'lookup',
        category: 'Relationship',
        label: 'Lookup Relationship',
        description: 'Links to another object; users pick a related record.',
        attributeKeys: ['relatedToObject', 'defaultValue', 'description', 'helpText', 'autoAddToCustomReportType'],
    },
    {
        id: 'externalLookup',
        category: 'Relationship',
        label: 'External Lookup Relationship',
        description: 'Links to an external object.',
        attributeKeys: ['relatedToExternalObject', 'defaultValue', 'description', 'helpText', 'autoAddToCustomReportType'],
    },
    {
        id: 'checkbox',
        category: 'General',
        label: 'Checkbox',
        description: 'True (checked) or False (unchecked).',
        attributeKeys: ['defaultChecked', 'defaultValue', 'description', 'helpText', 'autoAddToCustomReportType'],
    },
    {
        id: 'currency',
        category: 'Numeric',
        label: 'Currency',
        description: 'Currency amount with formatting.',
        attributeKeys: [
            'currencySymbol',
            'length',
            'decimalPlaces',
            'required',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'date',
        category: 'Date/Time',
        label: 'Date',
        description: 'Date value.',
        attributeKeys: ['required', 'description', 'helpText', 'autoAddToCustomReportType', 'defaultValue'],
    },
    {
        id: 'dateTime',
        category: 'Date/Time',
        label: 'Date/Time',
        description: 'Date and time value.',
        attributeKeys: ['required', 'description', 'helpText', 'autoAddToCustomReportType', 'defaultValue'],
    },
    {
        id: 'email',
        category: 'General',
        label: 'Email',
        description: 'Email address with format validation.',
        attributeKeys: [
            'required',
            'unique',
            'externalId',
            'emailVerificationStatus',
            'description',
            'helpText',
            'autoAddToCustomReportType',
        ],
    },
    {
        id: 'geolocation',
        category: 'General',
        label: 'Geolocation',
        description: 'Latitude and longitude; distance calculations.',
        attributeKeys: [
            'geolocationDisplayNotation',
            'geolocationDecimalPlaces',
            'required',
            'unique',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'number',
        category: 'Numeric',
        label: 'Number',
        description: 'Numeric value; leading zeros removed.',
        attributeKeys: [
            'length',
            'decimalPlaces',
            'required',
            'unique',
            'externalId',
            'useForAiPrediction',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'percent',
        category: 'Numeric',
        label: 'Percent',
        description: 'Percentage with % formatting.',
        attributeKeys: [
            'length',
            'decimalPlaces',
            'required',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'phone',
        category: 'Text',
        label: 'Phone',
        description: 'Phone number with formatting.',
        attributeKeys: ['required', 'unique', 'description', 'helpText', 'autoAddToCustomReportType', 'defaultValue'],
    },
    {
        id: 'picklist',
        category: 'Picklist',
        label: 'Picklist',
        description: 'Single selection from a list.',
        attributeKeys: [
            'picklistValues',
            'useGlobalPicklistValueSet',
            'globalPicklistValueSetName',
            'picklistDisplayAlphabetically',
            'picklistUseFirstAsDefault',
            'picklistRestrictToDefinedValues',
            'required',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'picklistMulti',
        category: 'Picklist',
        label: 'Picklist (Multi-Select)',
        description: 'Multiple selections from a list.',
        attributeKeys: [
            'picklistValues',
            'useGlobalPicklistValueSet',
            'globalPicklistValueSetName',
            'picklistDisplayAlphabetically',
            'picklistUseFirstAsDefault',
            'picklistRestrictToDefinedValues',
            'picklistVisibleLines',
            'required',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'text',
        category: 'Text',
        label: 'Text',
        description: 'Letters, numbers, and symbols up to max length.',
        attributeKeys: [
            'textLength',
            'required',
            'unique',
            'caseSensitivity',
            'externalId',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'textArea',
        category: 'Text',
        label: 'Text Area',
        description: 'Up to 255 characters, multiple lines.',
        attributeKeys: [
            'textLength',
            'textAreaLongVisibleLines',
            'required',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'textAreaLong',
        category: 'Text',
        label: 'Text Area (Long)',
        description: 'Long text up to 131,072 characters.',
        attributeKeys: [
            'textAreaLongLength',
            'textAreaLongVisibleLines',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'textAreaRich',
        category: 'Text',
        label: 'Text Area (Rich)',
        description: 'Rich text, images, and links.',
        attributeKeys: [
            'textAreaLongLength',
            'textAreaLongVisibleLines',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'textEncrypted',
        category: 'Text',
        label: 'Text (Encrypted)',
        description: 'Encrypted storage with masking.',
        attributeKeys: [
            'textEncryptedLength',
            'maskType',
            'maskCharacter',
            'required',
            'description',
            'helpText',
            'autoAddToCustomReportType',
            'defaultValue',
        ],
    },
    {
        id: 'time',
        category: 'Date/Time',
        label: 'Time',
        description: 'Local time value.',
        attributeKeys: ['required', 'unique', 'description', 'helpText', 'autoAddToCustomReportType', 'defaultValue'],
    },
    {
        id: 'url',
        category: 'General',
        label: 'URL',
        description: 'Website address; opens in a new window when clicked.',
        attributeKeys: ['required', 'description', 'helpText', 'autoAddToCustomReportType', 'defaultValue'],
    },
];

const ENTRY_BY_ID: Record<string, FieldTypeMasterEntry> = Object.fromEntries(
    FIELD_TYPE_MASTER.map((e) => [e.id, e]),
);

export function getFieldTypeMasterEntry(type: ObjectFieldDataType): FieldTypeMasterEntry | undefined {
    return ENTRY_BY_ID[type];
}

/**
 * Reporting + External ID: required on every field type for consistent Object Manager UI
 * (same position in “Description & defaults” via `FIELD_ATTRIBUTE_UI_SECTIONS`).
 */
const EFFECTIVE_KEYS_EVERY_TYPE: readonly string[] = ['autoAddToCustomReportType', 'externalId', 'useForAiPrediction'];

/** Governance flags appended to every type (Briselle field scheme). */
const EFFECTIVE_KEYS_SUFFIX: readonly string[] = ['piiData', 'hiiData', 'financialData'];

/**
 * Keys used for defaults, validation, and the sectioned Object Manager UI.
 * Extends the type master list with cross-cutting fields (reporting, external ID, governance, email-only).
 */
export function getEffectiveAttributeKeys(dataType: ObjectFieldDataType): string[] {
    const entry = ENTRY_BY_ID[dataType];
    const keys: string[] = [];
    const seen = new Set<string>();
    if (entry) {
        for (const k of entry.attributeKeys) {
            if (!seen.has(k)) {
                keys.push(k);
                seen.add(k);
            }
        }
    }
    for (const k of EFFECTIVE_KEYS_EVERY_TYPE) {
        if (!seen.has(k)) {
            keys.push(k);
            seen.add(k);
        }
    }
    for (const k of EFFECTIVE_KEYS_SUFFIX) {
        if (!seen.has(k)) {
            keys.push(k);
            seen.add(k);
        }
    }
    return keys;
}

/** JSON-serializable export of the master (for documentation / external tools). */
export const FIELD_TYPE_MASTER_JSON = FIELD_TYPE_MASTER.map((e) => ({
    id: e.id,
    category: e.category,
    label: e.label,
    description: e.description,
    attributes: getEffectiveAttributeKeys(e.id).map((k) => {
        const def = ATTRIBUTE_CATALOG[k];
        return def
            ? {
                  key: def.key,
                  label: def.label,
                  kind: def.kind,
                  required: def.required ?? false,
              }
            : { key: k, label: k, kind: 'unknown', required: false };
    }),
}));

/** Defaults when user picks a data type (merged into `attributes`). */
export function getDefaultAttributesForFieldType(type: ObjectFieldDataType): Record<string, unknown> {
    const entry = ENTRY_BY_ID[type];
    if (!entry) return {};
    const out: Record<string, unknown> = {};
    for (const key of getEffectiveAttributeKeys(type)) {
        switch (key) {
            case 'startingNumber':
                out[key] = 1;
                break;
            case 'generateAutoNumberForExisting':
            case 'autoAddToCustomReportType':
            case 'unique':
            case 'externalId':
            case 'useForAiPrediction':
            case 'useGlobalPicklistValueSet':
            case 'picklistDisplayAlphabetically':
            case 'picklistUseFirstAsDefault':
            case 'picklistRestrictToDefinedValues':
                out[key] = false;
                break;
            case 'defaultChecked':
                out[key] = 'unchecked';
                break;
            case 'rollUpType':
                out[key] = 'count';
                break;
            case 'rollupFilterMode':
                out[key] = 'all';
                break;
            case 'formulaReturnType':
                out[key] = 'text';
                break;
            case 'geolocationDisplayNotation':
                out[key] = 'decimal';
                break;
            case 'geolocationDecimalPlaces':
                out[key] = 6;
                break;
            case 'currencySymbol':
                out[key] = 'USD';
                break;
            case 'length':
                out[key] = 18;
                break;
            case 'decimalPlaces':
                out[key] = type === 'currency' || type === 'percent' ? 2 : 0;
                break;
            case 'textLength':
                out[key] = 255;
                break;
            case 'textAreaLongLength':
                out[key] = 32768;
                break;
            case 'textAreaLongVisibleLines':
            case 'picklistVisibleLines':
                out[key] = 4;
                break;
            case 'textEncryptedLength':
                out[key] = 175;
                break;
            case 'maskType':
                out[key] = 'none';
                break;
            case 'maskCharacter':
                out[key] = '*';
                break;
            case 'caseSensitivity':
                out[key] = 'insensitive';
                break;
            case 'picklistValues':
            case 'formulaExpression':
            case 'rollupFilterCriteria':
            case 'displayFormat':
                out[key] = '';
                break;
            case 'fieldToAggregate':
            case 'summarizedObject':
            case 'masterObject':
            case 'relatedToObject':
            case 'relatedToExternalObject':
            case 'globalPicklistValueSetName':
                out[key] = '';
                break;
            case 'required':
                out[key] = false;
                break;
            case 'description':
            case 'helpText':
            case 'defaultValue':
                out[key] = '';
                break;
            case 'piiData':
            case 'hiiData':
            case 'financialData':
                out[key] = false;
                break;
            case 'emailVerificationStatus':
                out[key] = 'not_bounced';
                break;
            default:
                break;
        }
    }
    return out;
}

export function validateFieldAttributes(
    dataType: ObjectFieldDataType,
    attributes: Record<string, unknown>,
): string[] {
    const entry = ENTRY_BY_ID[dataType];
    if (!entry) return ['Unknown data type.'];
    const msgs: string[] = [];
    for (const key of getEffectiveAttributeKeys(dataType)) {
        const def = ATTRIBUTE_CATALOG[key];
        if (!def?.required) continue;
        if (dataType === 'textEncrypted' && key === 'maskCharacter' && attributes.maskType === 'none') {
            continue;
        }
        const v = attributes[key];
        if (v === undefined || v === null || (typeof v === 'string' && !String(v).trim())) {
            msgs.push(`${def.label} is required.`);
        }
    }
    if (dataType === 'picklist' || dataType === 'picklistMulti') {
        const useGlobal = attributes.useGlobalPicklistValueSet === true;
        const vals = String(attributes.picklistValues ?? '').trim();
        if (!useGlobal && !vals) msgs.push('Enter at least one picklist value or enable global value set with a name.');
    }
    if (dataType === 'rollupSummary') {
        const t = attributes.rollUpType;
        if (t === 'sum' || t === 'min' || t === 'max') {
            const agg = String(attributes.fieldToAggregate ?? '').trim();
            if (!agg) msgs.push('Field to Aggregate is required for SUM/MIN/MAX.');
        }
    }
    return msgs;
}
