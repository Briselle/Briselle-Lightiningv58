import { supabase } from '../../../utils/supabase';
import { NOTION_PAGE_STORAGE_KEY, type NotionPagePayload, type NotionRecordContext } from './types';
import { createDefaultNotionPage, parseNotionPageFromValues } from './notionNestPageDefaults';

const FIXED_ENTITY_ID = 1000000000;

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

export function notionNestPagePath(objectRouteId: string, recordId: string | number): string {
    return `/notion/${encodeURIComponent(String(objectRouteId))}/${encodeURIComponent(String(recordId))}`;
}

export async function loadNotionRecordContext(
    objectRouteId: string,
    recordId: string,
): Promise<{ data: NotionRecordContext | null; error: string | null }> {
    const numericObjectId = Number(objectRouteId);
    let objQuery = supabase
        .from('dobj')
        .select('sys_id,dobj_id,dobj_name_display,dobj_name_system,object_type,dobj_configuration')
        .limit(1);
    if (Number.isFinite(numericObjectId) && numericObjectId > 0) {
        objQuery = objQuery.or(`sys_id.eq.${numericObjectId},dobj_id.eq.${numericObjectId}`);
    } else {
        objQuery = objQuery.or(`dobj_name_system.eq.${objectRouteId},dobj_name_display.eq.${objectRouteId}`);
    }
    const { data: objRow, error: objErr } = await objQuery.maybeSingle();
    if (objErr) return { data: null, error: objErr.message };
    if (!objRow) return { data: null, error: 'Object not found.' };

    const dobjId = Number(objRow.dobj_id ?? objRow.sys_id);
    const numericRecordId = Number(recordId);
    let recQuery = supabase
        .from('ddata')
        .select('ddata_id,dobj_id,entity_id,ddata_values,ddata_created_at,ddata_updated_at,ddata_created_by_id,ddata_modified_by_id')
        .eq('dobj_id', dobjId)
        .eq('entity_id', FIXED_ENTITY_ID)
        .eq('ddata_status', 1)
        .limit(1);
    if (Number.isFinite(numericRecordId) && numericRecordId > 0) {
        recQuery = recQuery.eq('ddata_id', numericRecordId);
    } else {
        return { data: null, error: 'Invalid record id.' };
    }
    const { data: recRow, error: recErr } = await recQuery.maybeSingle();
    if (recErr) return { data: null, error: recErr.message };
    if (!recRow) return { data: null, error: 'Page not found.' };

    const values =
        recRow.ddata_values != null && typeof recRow.ddata_values === 'object'
            ? (recRow.ddata_values as Record<string, unknown>)
            : {};
    const page = parseNotionPageFromValues(values);
    let title = String(values.sys_record_name ?? values.name ?? '').trim();
    if (!title || title.toLowerCase() === 'untitled') {
        title = String(values.sys_record_id ?? values.sys_id ?? recRow.ddata_id).trim();
    }

    return {
        data: {
            ddataId: recRow.ddata_id,
            dobjId,
            entityId: FIXED_ENTITY_ID,
            objectLabel: String(objRow.dobj_name_display ?? objRow.dobj_name_system ?? 'Object'),
            objectRouteId,
            title,
            page,
            rawValues: values,
            createdAt: recRow.ddata_created_at,
            updatedAt: recRow.ddata_updated_at,
            createdById: recRow.ddata_created_by_id,
            modifiedById: recRow.ddata_modified_by_id,
        },
        error: null,
    };
}

export async function saveNotionPage(
    ctx: Pick<NotionRecordContext, 'ddataId' | 'dobjId' | 'entityId' | 'rawValues'>,
    patch: {
        page?: NotionPagePayload;
        title?: string;
    },
): Promise<{ error: string | null }> {
    const nextValues: Record<string, unknown> = { ...ctx.rawValues };
    if (patch.title != null) {
        nextValues.sys_record_name = patch.title;
    }
    if (patch.page) {
        nextValues[NOTION_PAGE_STORAGE_KEY] = {
            ...patch.page,
            updatedAt: new Date().toISOString(),
        };
    }
    const { error } = await supabase
        .from('ddata')
        .update({
            ddata_values: nextValues,
            ddata_updated_at: new Date().toISOString(),
        })
        .eq('ddata_id', ctx.ddataId)
        .eq('dobj_id', ctx.dobjId)
        .eq('entity_id', ctx.entityId);
    return { error: error?.message ?? null };
}

export async function createNotionNestRecord(params: {
    dobjId: number;
    title: string;
    actorId: number;
    /** Optional additional schema field values captured from the standard record creation form. */
    extraValues?: Record<string, unknown>;
}): Promise<{ recordId: number | null; error: string | null }> {
    const title = params.title.trim() || 'Untitled';
    const page = createDefaultNotionPage(title);
    const nowIso = new Date().toISOString();
    // Merge extra schema values first so the notion page key always wins on conflict.
    const ddataValues: Record<string, unknown> = {
        ...(params.extraValues ?? {}),
        sys_record_name: title,
        [NOTION_PAGE_STORAGE_KEY]: page,
    };
    const { data, error } = await supabase
        .from('ddata')
        .insert({
            entity_id: FIXED_ENTITY_ID,
            dobj_id: params.dobjId,
            ddata_values: ddataValues,
            ddata_status: 1,
            ddata_created_at: nowIso,
            ddata_updated_at: nowIso,
            ddata_created_by_id: params.actorId,
            ddata_modified_by_id: params.actorId,
        })
        .select('ddata_id')
        .single();
    if (error) return { recordId: null, error: error.message };
    return { recordId: data?.ddata_id ?? null, error: null };
}


export async function listNotionPages(dobjId: number): Promise<{ id: number; title: string }[]> {
    const { data, error } = await supabase
        .from('ddata')
        .select('ddata_id,ddata_values')
        .eq('dobj_id', dobjId)
        .eq('entity_id', FIXED_ENTITY_ID)
        .eq('ddata_status', 1)
        .limit(20);
    if (error || !data) return [];
    return data.map(row => {
        const values = (row.ddata_values || {}) as Record<string, any>;
        let title = String(values.sys_record_name ?? values.name ?? '').trim();
        if (!title) title = `Page #${row.ddata_id}`;
        return { id: row.ddata_id, title };
    });
}

export function mergeObjectConfigIcon(config: unknown): Record<string, unknown> {
    return safeParseConfig(config);
}

/* ---- Version Checkpoints (Positional Undo) ---- */

export async function savePageVersion(
    ddataId: number,
    saveNumber: number,
    versionData: NotionPagePayload,
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('notion_page_versions')
        .insert({
            ddata_id: ddataId,
            save_number: saveNumber,
            version_data: versionData,
        });
    return { error: error?.message ?? null };
}

export async function loadPageVersions(
    ddataId: number,
): Promise<{ versions: { id: number; saveNumber: number; createdAt: string }[]; error: string | null }> {
    const { data, error } = await supabase
        .from('notion_page_versions')
        .select('id,save_number,created_at')
        .eq('ddata_id', ddataId)
        .order('save_number', { ascending: true });
    if (error) return { versions: [], error: error.message };
    return {
        versions: (data || []).map((row: any) => ({
            id: row.id,
            saveNumber: row.save_number,
            createdAt: row.created_at,
        })),
        error: null,
    };
}

export async function loadPageVersionData(
    versionId: number,
): Promise<{ data: NotionPagePayload | null; error: string | null }> {
    const { data, error } = await supabase
        .from('notion_page_versions')
        .select('version_data')
        .eq('id', versionId)
        .single();
    if (error) return { data: null, error: error.message };
    return { data: (data?.version_data as NotionPagePayload) ?? null, error: null };
}

export async function deletePageVersion(
    versionId: number,
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('notion_page_versions')
        .delete()
        .eq('id', versionId);
    return { error: error?.message ?? null };
}

export async function deletePageVersionsByDdataId(
    ddataId: number,
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('notion_page_versions')
        .delete()
        .eq('ddata_id', ddataId);
    return { error: error?.message ?? null };
}
