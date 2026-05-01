export type FirstFieldType = 'autoNumber' | 'text';

/**
 * Salesforce-style custom field data types (Object Manager).
 * See `salesforceFieldTypeMaster.ts` for attribute keys per type.
 */
export type ObjectFieldDataType =
    | 'autoNumber'
    | 'formula'
    | 'rollupSummary'
    | 'lookup'
    | 'externalLookup'
    | 'checkbox'
    | 'currency'
    | 'date'
    | 'dateTime'
    | 'email'
    | 'geolocation'
    | 'number'
    | 'percent'
    | 'phone'
    | 'picklist'
    | 'picklistMulti'
    | 'text'
    | 'textArea'
    | 'textAreaLong'
    | 'textAreaRich'
    | 'textEncrypted'
    | 'time'
    | 'url';

/** Common SF-style keys often stored inside `attributes` (see field type master). */
export interface ObjectFieldAttributesBase {
    /** Stored on `attributes.indexed`; driven by Object Manager “Indexed” toggle (not inferred only). */
    indexed?: boolean;
    piiData?: boolean;
    hiiData?: boolean;
    financialData?: boolean;
    emailVerificationStatus?: string;
    description?: string;
    helpText?: string;
    autoAddToCustomReportType?: boolean;
    defaultValue?: string;
    [key: string]: unknown;
}

export interface ObjectFieldDefinition {
    id: number;
    version: 1;
    label: string;
    apiName: string;
    description: string;
    dataType: ObjectFieldDataType;
    /** Required on save (Object Manager “Required”). */
    required: 0 | 1;
    isdeleted: 0 | 1;
    isactive: 0 | 1;
    isCustom: 0 | 1;
    order: number;
    /** Type-specific + common SF options; driven by `FIELD_TYPE_MASTER` / `ATTRIBUTE_CATALOG`. */
    attributes: ObjectFieldAttributesBase;
}

export interface ObjectDefinitionSchema {
    obj_id: number;
    version: 1;
    fields: ObjectFieldDefinition[];
    /** Object behavior mode in Object Manager. */
    objectType?: 'list' | 'transaction' | 'hierarchy';
    /** Optional mirrors of object metadata inside the same JSON document. */
    objectLabel?: string;
    objectApiName?: string;
    objectDescription?: string;
}
