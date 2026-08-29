-- ============================================================
-- Briselle Enterprise Platform — Digital Asset Management (DAM)
-- Supabase Storage Bucket Update — Increase File Size Limit to 5GB
-- Location: scripts/update_supabase_bucket_5gb.sql
-- ============================================================

-- 1. Update enterprise-assets bucket file size limit to 5GB (5,368,709,120 bytes)
UPDATE storage.buckets
SET file_size_limit = 5368709120, -- 5 GB limit for video files
    allowed_mime_types = NULL,     -- Allow all file formats
    public = true
WHERE id = 'enterprise-assets';

-- 2. Verify bucket settings
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'enterprise-assets';
