-- ============================================================
-- Briselle Enterprise Platform — Digital Asset Management (DAM)
-- Supabase Storage Setup Script
-- Location: scripts/supabase_storage_setup.sql
-- ============================================================

INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'enterprise-assets',
    'enterprise-assets',
    true,
    false,
    524288000, -- 500 MB limit
    ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/aac',
        'video/mp4', 'video/webm', 'video/ogg',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv', 'application/json'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 524288000;

-- Storage RLS Policies for authenticated & public uploads/downloads
CREATE POLICY "Authenticated Upload Policy" ON storage.objects
    FOR INSERT TO authenticated, anon WITH CHECK (bucket_id = 'enterprise-assets');

CREATE POLICY "Public Read Policy" ON storage.objects
    FOR SELECT TO authenticated, anon USING (bucket_id = 'enterprise-assets');

CREATE POLICY "Authenticated Update Policy" ON storage.objects
    FOR UPDATE TO authenticated, anon USING (bucket_id = 'enterprise-assets');

CREATE POLICY "Authenticated Delete Policy" ON storage.objects
    FOR DELETE TO authenticated, anon USING (bucket_id = 'enterprise-assets');
