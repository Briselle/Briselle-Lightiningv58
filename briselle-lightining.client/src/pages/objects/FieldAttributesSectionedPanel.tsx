import { useId } from 'react';
import type { ObjectFieldDataType } from './objectDefinitionSchema';
import {
    ATTRIBUTE_CATALOG,
    getEffectiveAttributeKeys,
    getFieldTypeMasterEntry,
    type MasterAttributeDef,
} from './salesforceFieldTypeMaster';

export function AttributeControl({
    def,
    value,
    onChange,
    compact = false,
    disabled = false,
    labelOverride,
}: {
    def: MasterAttributeDef;
    value: unknown;
    onChange: (v: unknown) => void;
    /** Tighter controls for Object Manager / dense forms */
    compact?: boolean;
    disabled?: boolean;
    labelOverride?: string;
}) {
    const labelCls = compact
        ? 'block text-[10px] font-medium text-gray-600 mb-0'
        : 'block text-[11px] font-medium text-gray-600 mb-0.5';
    const inputCls = compact ? 'input text-[11px] py-1 leading-tight' : 'input text-xs py-1.5';

    if (def.kind === 'checkbox') {
        return (
            <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer select-none leading-tight">
                <input type="checkbox" className="rounded border-gray-300 h-3.5 w-3.5 shrink-0" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                <span>{labelOverride ?? def.label}</span>
            </label>
        );
    }

    if (def.kind === 'textarea') {
        return (
            <div>
                <label className={labelCls}>
                    {def.label}
                    {def.required ? <span className="text-red-500"> *</span> : null}
                </label>
                <textarea
                    className={`${inputCls} ${compact ? 'min-h-[36px] resize-y' : 'min-h-[52px] resize-y'}`}
                    rows={compact ? 2 : def.rows ?? 2}
                    placeholder={def.placeholder}
                    value={String(value ?? '')}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                />
                {!compact && def.hint ? <p className="text-[10px] text-gray-500 mt-0.5">{def.hint}</p> : null}
            </div>
        );
    }

    if (def.kind === 'select') {
        const lbl = String(labelOverride ?? def.label ?? '').trim();
        const aria = lbl || def.accessibilityLabel || def.label || def.key;
        return (
            <div>
                {lbl ? (
                    <label className={labelCls} htmlFor={def.key}>
                        {lbl}
                        {def.required ? <span className="text-red-500"> *</span> : null}
                    </label>
                ) : null}
                <select
                    id={lbl ? def.key : undefined}
                    aria-label={aria}
                    className={inputCls}
                    value={String(value ?? '')}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {(def.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                {!compact && def.hint ? <p className="text-[10px] text-gray-500 mt-0.5">{def.hint}</p> : null}
            </div>
        );
    }

    if (def.kind === 'number') {
        return (
            <div>
                <label className={labelCls}>
                    {def.label}
                    {def.required ? <span className="text-red-500"> *</span> : null}
                </label>
                <input
                    type="number"
                    className={inputCls}
                    min={def.min}
                    max={def.max}
                    value={value === '' || value === undefined || value === null ? '' : Number(value)}
                    disabled={disabled}
                    onChange={(e) => {
                        const raw = e.target.value;
                        onChange(raw === '' ? '' : Number(raw));
                    }}
                />
                {!compact && def.hint ? <p className="text-[10px] text-gray-500 mt-0.5">{def.hint}</p> : null}
            </div>
        );
    }

    return (
        <div>
            <label className={labelCls}>
                {labelOverride ?? def.label}
                {def.required ? <span className="text-red-500"> *</span> : null}
            </label>
            <input
                type="text"
                className={`${inputCls} font-mono`}
                placeholder={def.placeholder}
                value={String(value ?? '')}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            />
            {!compact && def.hint ? <p className="text-[10px] text-gray-500 mt-0.5">{def.hint}</p> : null}
        </div>
    );
}

export interface FieldAttributeUiSection {
    id: string;
    title: string;
    description?: string;
    shellClass: string;
    keys: readonly string[];
}

/** Section order aligned with Briselle field scheme workbook (logical color groups). */
export const FIELD_ATTRIBUTE_UI_SECTIONS: FieldAttributeUiSection[] = [
    {
        id: 'descriptions',
        title: 'Descriptions',
        shellClass:
            'rounded-lg border border-slate-200/90 bg-slate-50/40 shadow-sm ring-1 ring-slate-200/40',
        keys: ['description', 'helpText'],
    },
    {
        id: 'classification',
        title: 'Data classification',
        shellClass: 'rounded-lg border border-amber-200/90 bg-amber-50/35 shadow-sm ring-1 ring-amber-200/35',
        keys: ['piiData', 'hiiData', 'financialData'],
    },
    {
        id: 'defaultFormula',
        title: 'Default and Formula',
        shellClass: 'rounded-lg border border-lime-200/85 bg-lime-50/25 shadow-sm ring-1 ring-lime-200/30',
        keys: [
            'defaultValue',
        ],
    },
    {
        id: 'reportAnalytics',
        title: 'Report & Analytics',
        shellClass: 'rounded-lg border border-indigo-200/85 bg-indigo-50/25 shadow-sm ring-1 ring-indigo-200/30',
        keys: [
            'autoAddToCustomReportType',
            'externalId',
            'useForAiPrediction',
        ],
    },
    {
        id: 'typeSpecific',
        title: 'Additional attributes',
        shellClass: 'rounded-lg border border-sky-200/90 bg-sky-50/30 shadow-sm ring-1 ring-sky-200/35',
        keys: [
            'textLength',
            'length',
            'decimalPlaces',
            'textAreaLongLength',
            'textAreaLongVisibleLines',
            'textEncryptedLength',
            'picklistVisibleLines',
            'displayFormat',
            'startingNumber',
            'generateAutoNumberForExisting',
            'formulaReturnType',
            'formulaExpression',
            'masterObject',
            'summarizedObject',
            'rollUpType',
            'fieldToAggregate',
            'rollupFilterMode',
            'rollupFilterCriteria',
            'relatedToObject',
            'relatedToExternalObject',
            'picklistValues',
            'useGlobalPicklistValueSet',
            'globalPicklistValueSetName',
            'picklistDisplayAlphabetically',
            'picklistUseFirstAsDefault',
            'picklistRestrictToDefinedValues',
            'geolocationDisplayNotation',
            'geolocationDecimalPlaces',
            'maskType',
            'maskCharacter',
            'defaultChecked',
            'emailVerificationStatus',
            'currencySymbol',
            'caseSensitivity',
        ],
    },
];

function buildSectionRows(
    dataType: ObjectFieldDataType,
    omitKeys: ReadonlySet<string>,
): { section: FieldAttributeUiSection; fieldKeys: string[] }[] {
    const effective = new Set(getEffectiveAttributeKeys(dataType));
    const allowed = new Set([...effective].filter((k) => !omitKeys.has(k) && k !== 'unique'));
    const assigned = new Set<string>();
    const rows: { section: FieldAttributeUiSection; fieldKeys: string[] }[] = [];

    for (const section of FIELD_ATTRIBUTE_UI_SECTIONS) {
        const fieldKeys = section.keys.filter((k) => allowed.has(k) && ATTRIBUTE_CATALOG[k]);
        fieldKeys.forEach((k) => assigned.add(k));
        if (fieldKeys.length > 0) {
            rows.push({ section, fieldKeys });
        }
    }

    const orphans = [...allowed].filter((k) => !assigned.has(k) && ATTRIBUTE_CATALOG[k]).sort();
    if (orphans.length > 0) {
        const typeSpecific = rows.find((r) => r.section.id === 'typeSpecific');
        if (typeSpecific) {
            typeSpecific.fieldKeys = [...typeSpecific.fieldKeys, ...orphans];
        } else {
            rows.push({
                section: {
                    id: 'typeSpecific',
                    title: 'Type specific attributes',
                    shellClass:
                        'rounded-lg border border-sky-200/90 bg-sky-50/30 shadow-sm ring-1 ring-sky-200/35',
                    keys: [],
                },
                fieldKeys: orphans,
            });
        }
    }

    if (dataType === 'email') {
        const sec = FIELD_ATTRIBUTE_UI_SECTIONS.find((s) => s.id === 'defaultFormula');
        if (sec) {
            const existing = rows.find((r) => r.section.id === 'defaultFormula');
            if (existing) {
                existing.fieldKeys = [
                    '__emailVerificationMirror',
                    ...existing.fieldKeys.filter((k) => k !== '__emailVerificationMirror'),
                ];
            } else {
                rows.push({ section: sec, fieldKeys: ['__emailVerificationMirror'] });
            }
        }
    }

    return rows;
}

export interface FieldAttributesSectionedPanelProps {
    dataType: ObjectFieldDataType;
    attributes: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
    /** Keys rendered elsewhere (e.g. table-level Required). */
    omitKeys?: ReadonlySet<string>;
    className?: string;
    /** Denser layout (default true). */
    compact?: boolean;
    /** Constrain height with vertical scroll (recommended in Object Manager add/edit). */
    scrollable?: boolean;
    /** Object display label used to prefill auto-number format (first 3 chars + "-"). */
    objectLabel?: string;
}

function getObjectPrefix(objectLabel?: string): string {
    const cleaned = String(objectLabel ?? '').replace(/[^a-z0-9]/gi, '').trim();
    if (!cleaned) return 'OBJ-';
    return `${cleaned.slice(0, 3)}-`;
}

/**
 * Sectioned attribute editor: same layout for add-field, edit-field, and object intake.
 */
export function FieldAttributesSectionedPanel({
    dataType,
    attributes,
    onChange,
    omitKeys = new Set(),
    className = '',
    compact = true,
    scrollable = false,
    objectLabel,
}: FieldAttributesSectionedPanelProps) {
    const emailMirrorTitleId = useId();
    const autoNumberPrefix = getObjectPrefix(objectLabel);
    const displayFormatValue = String(attributes.displayFormat ?? '').trim() || autoNumberPrefix;
    const startingNumberRaw = attributes.startingNumber;
    const startingNumber =
        typeof startingNumberRaw === 'number'
            ? startingNumberRaw
            : Number.isFinite(Number(startingNumberRaw))
              ? Number(startingNumberRaw)
              : 1;
    const disabledDefaultTypes = new Set<ObjectFieldDataType>([
        'formula',
        'rollupSummary',
        'lookup',
        'externalLookup',
        'geolocation',
    ]);
    const rows = buildSectionRows(dataType, omitKeys);
    if (rows.length === 0) return null;
    const typeLabel = getFieldTypeMasterEntry(dataType)?.label ?? dataType;
    const typeSpecificTitle = `${typeLabel} Specific Attributes`;

    const rowBySectionId = new Map(rows.map((r) => [r.section.id, r] as const));
    const firstRowSectionIds: readonly string[] = ['descriptions', 'classification'];
    const secondRowSectionIds: readonly string[] = ['defaultFormula', 'reportAnalytics'];
    const fieldSpecificSectionIds: readonly string[] = ['typeSpecific'];
    const pinnedSectionIds = new Set([...firstRowSectionIds, ...secondRowSectionIds, ...fieldSpecificSectionIds]);
    const firstRow = firstRowSectionIds.map((id) => rowBySectionId.get(id)).filter(Boolean) as typeof rows;
    const secondRow = secondRowSectionIds.map((id) => rowBySectionId.get(id)).filter(Boolean) as typeof rows;
    const fieldSpecificRows = fieldSpecificSectionIds
        .map((id) => rowBySectionId.get(id))
        .filter(Boolean) as typeof rows;
    const remainingRows = rows.filter((r) => !pinnedSectionIds.has(r.section.id));

    const renderSection = ({ section, fieldKeys }: (typeof rows)[number]) => (
        <section
            key={section.id}
            className={`${compact ? 'p-2' : 'p-4'} ${section.shellClass} ${section.id === 'typeSpecific' ? 'xl:col-span-2' : ''}`}
            aria-labelledby={`attr-sec-${section.id}`}
        >
            <div
                className={`flex flex-col gap-0 border-b border-black/[0.05] ${compact ? 'mb-1.5 pb-1' : 'mb-3 gap-0.5 pb-2.5'}`}
            >
                <h3
                    id={`attr-sec-${section.id}`}
                    className={`font-semibold tracking-tight text-gray-900 ${compact ? 'text-[11px] leading-tight' : 'text-[13px]'}`}
                >
                    {section.id === 'typeSpecific' ? typeSpecificTitle : section.title}
                </h3>
                {!compact && section.description ? (
                    <p className="text-[11px] leading-snug text-gray-500">{section.description}</p>
                ) : null}
            </div>
            <div
                className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-x-2 gap-y-1.5' : 'gap-x-6 gap-y-3'}`}
            >
                {fieldKeys.map((key) => {
                    if (key === '__emailVerificationMirror') {
                        const evDef = ATTRIBUTE_CATALOG.emailVerificationStatus;
                        const labelCls = compact
                            ? 'block text-[10px] font-medium text-gray-600 mb-0'
                            : 'block text-[11px] font-medium text-gray-600 mb-0.5';
                        const inputCls = compact ? 'input text-[11px] py-1 leading-tight' : 'input text-xs py-1.5';
                        const v = String(attributes.emailVerificationStatus ?? 'not_bounced');
                        return (
                            <div key={key}>
                                <div id={emailMirrorTitleId} className={labelCls}>
                                    Email Verification Status
                                </div>
                                <select
                                    aria-labelledby={emailMirrorTitleId}
                                    className={`${inputCls} bg-gray-50 text-gray-600 cursor-not-allowed`}
                                    disabled
                                    value={v}
                                >
                                    {(evDef.options ?? []).map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    }
                    const def = ATTRIBUTE_CATALOG[key];
                    if (!def) return null;
                    const isAutoDefault = key === 'defaultValue' && dataType === 'autoNumber';
                    const isCheckboxDefault = key === 'defaultValue' && dataType === 'checkbox';
                    const disableDefaultValue =
                        key === 'defaultValue' &&
                        (isAutoDefault || isCheckboxDefault || disabledDefaultTypes.has(dataType));
                    const value = isAutoDefault
                        ? `${displayFormatValue}${startingNumber}`
                        : isCheckboxDefault
                          ? String(attributes.defaultChecked ?? 'unchecked')
                        : attributes[key];
                    const labelOverride =
                        key === 'defaultChecked' ? 'Default (Checkbox Value)' : undefined;
                    return (
                        <AttributeControl
                            key={key}
                            def={def}
                            value={value}
                            onChange={(v) => onChange(key, v)}
                            compact={compact}
                            disabled={disableDefaultValue}
                            labelOverride={labelOverride}
                        />
                    );
                })}
            </div>
        </section>
    );

    const inner = (
        <div className={compact ? 'space-y-2' : 'space-y-4'}>
            {firstRow.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {firstRow.map(renderSection)}
                </div>
            ) : null}
            {secondRow.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {secondRow.map(renderSection)}
                </div>
            ) : null}
            {fieldSpecificRows.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {fieldSpecificRows.map(renderSection)}
                </div>
            ) : null}
            {remainingRows.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {remainingRows.map(renderSection)}
                </div>
            ) : null}
        </div>
    );

    if (scrollable) {
        return (
            <div
                className={`max-h-[min(52vh,400px)] overflow-y-auto overflow-x-hidden pr-0.5 [scrollbar-gutter:stable] ${className}`.trim()}
            >
                {inner}
            </div>
        );
    }

    return <div className={className}>{inner}</div>;
}
