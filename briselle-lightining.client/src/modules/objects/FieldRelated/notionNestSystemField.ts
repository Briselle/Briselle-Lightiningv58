/**
 * NotionNest page field — persisted in `dobj_configuration.fields` and `ddata_values.__notion_page`.
 */
import { NOTION_PAGE_STORAGE_KEY, type NotionPagePayload } from '../../notion-nest/types';
import { isNotionNestObjectType, type PlatformObjectType } from '../shared/objectTypes';

export const NOTION_NEST_PAGE_FIELD_API = NOTION_PAGE_STORAGE_KEY;

const NOTION_NEST_PAGE_FIELD_API_LOWER = NOTION_NEST_PAGE_FIELD_API.toLowerCase();

export function isNotionNestPageFieldApi(apiName: string): boolean {
    return String(apiName ?? '').trim().toLowerCase() === NOTION_NEST_PAGE_FIELD_API_LOWER;
}

export function isReservedNotionNestFieldApi(apiName: string): boolean {
    return isNotionNestPageFieldApi(apiName);
}

export function buildNotionNestPageFieldRow(order: number): Record<string, unknown> {
    return {
        version: 1,
        id: order,
        order,
        dataType: 'notionNestPage',
        label: 'NotionNest Page',
        apiName: NOTION_NEST_PAGE_FIELD_API,
        description: 'BlockNote page document (blocks, icon, cover). Open a record to edit in the page editor.',
        required: 0,
        isdeleted: 0,
        isactive: 1,
        isCustom: 0,
        attributes: {
            indexed: false,
            systemManaged: true,
            includeInTableView: true,
            includeInInlineEdit: false,
            preferredInView: false,
        },
    };
}

function reindexFieldOrders(fields: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return fields.map((row, index) => {
        const order = index + 1;
        return { ...row, id: order, order };
    });
}

/**
 * Ensures the NotionNest page field exists and is active for notionnest objects; deactivates when type changes away.
 */
export function syncNotionNestFieldRows(
    fields: Array<Record<string, unknown>>,
    objectType: PlatformObjectType,
): Array<Record<string, unknown>> {
    const wantField = isNotionNestObjectType(objectType);
    const idx = fields.findIndex((f) => isNotionNestPageFieldApi(String(f.apiName ?? '')));

    if (!wantField) {
        if (idx < 0) return fields;
        const row = { ...fields[idx] };
        row.isactive = 0;
        const next = [...fields];
        next[idx] = row;
        return next;
    }

    if (idx >= 0) {
        const row = { ...fields[idx] };
        row.isactive = 1;
        row.isdeleted = 0;
        row.dataType = 'notionNestPage';
        if (!String(row.label ?? '').trim()) row.label = 'NotionNest Page';
        if (!String(row.apiName ?? '').trim()) row.apiName = NOTION_NEST_PAGE_FIELD_API;
        const attrs =
            typeof row.attributes === 'object' && row.attributes != null
                ? { ...(row.attributes as Record<string, unknown>) }
                : {};
        attrs.systemManaged = true;
        if (attrs.includeInInlineEdit === undefined) attrs.includeInInlineEdit = false;
        if (attrs.includeInTableView === undefined) attrs.includeInTableView = true;
        row.attributes = attrs;
        const next = [...fields];
        next[idx] = row;
        return next;
    }

    const maxId = fields.reduce((acc, f) => Math.max(acc, Number(f.id) || 0), 0);
    return reindexFieldOrders([...fields, buildNotionNestPageFieldRow(maxId + 1)]);
}

export function applyNotionNestFieldPolicy(
    cfg: Record<string, unknown>,
    objectType: PlatformObjectType,
): Record<string, unknown> {
    const raw = Array.isArray(cfg.fields) ? (cfg.fields as Array<Record<string, unknown>>) : [];
    const nextFields = syncNotionNestFieldRows(raw, objectType);
    const unchanged =
        nextFields.length === raw.length &&
        nextFields.every((row, i) => JSON.stringify(row) === JSON.stringify(raw[i]));
    if (unchanged) return cfg;
    return { ...cfg, fields: nextFields, objectType };
}

function parseNotionPagePayload(raw: unknown): NotionPagePayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (!Array.isArray(o.blocks)) return null;
    return raw as NotionPagePayload;
}

/** Short label for Object Loader grid cells and read-only edit surfaces. */
export function formatNotionNestPageCellSummary(raw: unknown): string {
    const page = parseNotionPagePayload(raw);
    if (!page) return '—';
    const blockCount = page.blocks?.length ?? 0;
    const icon = String(page.icon ?? '').trim();
    const updated = String(page.updatedAt ?? '').trim();
    const parts: string[] = [];
    if (icon) parts.push(icon);
    parts.push(blockCount === 1 ? '1 block' : `${blockCount} blocks`);
    if (updated) {
        const d = new Date(updated);
        if (!Number.isNaN(d.getTime())) {
            parts.push(`updated ${d.toLocaleDateString()}`);
        }
    }
    return parts.join(' · ') || 'Empty page';
}

export function formatObjectLoaderCellDisplay(raw: unknown, fieldType?: string): string {
    if (raw == null) return '-';
    if (fieldType === 'notionNestPage' || (!fieldType && parseNotionPagePayload(raw))) {
        return formatNotionNestPageCellSummary(raw);
    }
    if (typeof raw === 'object') {
        try {
            const compact = JSON.stringify(raw);
            return compact.length > 220 ? `${compact.slice(0, 220)}...` : compact;
        } catch {
            return '[object]';
        }
    }
    return String(raw);
}
