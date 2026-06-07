import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { notionNestPagePath } from '../../modules/notion-nest/notionPageStorage';
import { parsePlatformObjectType, isNotionNestObjectType } from '../../modules/objects/shared/objectTypes';
import { supabase } from '../../utils/supabase';

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

function RecordDetail() {
    const { objectId, id } = useParams();
    const [redirectTo, setRedirectTo] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const run = async () => {
            if (!objectId || !id) {
                setLoading(false);
                return;
            }
            const numericObjectId = Number(objectId);
            let query = supabase
                .from('dobj')
                .select('object_type,dobj_configuration')
                .limit(1);
            if (Number.isFinite(numericObjectId) && numericObjectId > 0) {
                query = query.or(`sys_id.eq.${numericObjectId},dobj_id.eq.${numericObjectId}`);
            } else {
                query = query.or(`dobj_name_system.eq.${objectId},dobj_name_display.eq.${objectId}`);
            }
            const { data } = await query.maybeSingle();
            const cfg = safeParseConfig(data?.dobj_configuration);
            const type = parsePlatformObjectType(cfg, data?.object_type ?? null);
            if (isNotionNestObjectType(type)) {
                setRedirectTo(notionNestPagePath(objectId, id));
            }
            setLoading(false);
        };
        void run();
    }, [objectId, id]);

    if (loading) return <LoadingSpinner />;
    if (redirectTo) return <Navigate to={redirectTo} replace />;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Record Details</h1>
            <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                    <p className="text-gray-600">Object ID: {objectId}</p>
                    <p className="text-gray-600">Record ID: {id}</p>
                    <p className="text-gray-500">Record details will be displayed here</p>
                </div>
            </div>
        </div>
    );
}

export default RecordDetail;
