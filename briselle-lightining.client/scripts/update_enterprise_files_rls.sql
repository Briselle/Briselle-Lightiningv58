-- ============================================================
-- Briselle Enterprise Platform — Digital Asset Management (DAM)
-- Production RLS & Permissions Update Script for enterprise_files
-- Location: scripts/update_enterprise_files_rls.sql
-- Created At: 2026-07-25
-- ============================================================

-- 1. Ensure Row Level Security is enabled on enterprise_files
ALTER TABLE IF EXISTS enterprise_files ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Enable all for authenticated users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable read for anonymous users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable select for all users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable insert for all users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable update for all users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable delete for all users" ON enterprise_files;

-- 3. Create full RLS policies allowing authenticated and anon clients to select, insert, update, and delete
CREATE POLICY "Enable select for all users" ON enterprise_files
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Enable insert for all users" ON enterprise_files
    FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON enterprise_files
    FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON enterprise_files
    FOR DELETE TO authenticated, anon USING (true);

-- 4. Re-create or update trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_enterprise_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enterprise_files_updated_at ON enterprise_files;

CREATE TRIGGER trigger_enterprise_files_updated_at
BEFORE UPDATE ON enterprise_files
FOR EACH ROW EXECUTE FUNCTION update_enterprise_files_updated_at();

-- 5. Re-create camelCase compatibility view if missing
CREATE OR REPLACE VIEW view_enterprise_files_camelcase AS
SELECT
    file_id AS "fileId",
    entity_id AS "entityID",
    workspace_id AS "workspaceId",
    app_id AS "AppId",
    object_id AS "objectId",
    batch_id AS "batchId",
    owner_id AS "ownerId",
    data_entity_type AS "dataEntityType",
    file_information AS "fileInformation",
    physical_metadata AS "physicalMetadata",
    version_information AS "versionInformation",
    status_information AS "statusInformation",
    security_information AS "securityInformation",
    ai_metadata AS "aiMetadata",
    search_metadata AS "searchMetadata",
    processing_metadata AS "processingMetadata",
    audit_information AS "auditInformation",
    custom_metadata AS "customMetadata",
    system_metadata AS "systemMetadata",
    compliance_metadata AS "complianceMetadata",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
FROM enterprise_files;
