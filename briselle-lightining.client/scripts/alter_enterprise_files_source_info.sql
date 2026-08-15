-- ============================================================
-- Briselle Enterprise Platform — DAM Schema Alteration Script
-- Script: scripts/alter_enterprise_files_source_info.sql
-- Description: Adds source_info JSONB column to enterprise_files
--              table with workspaceId, appId, objectId, recordId,
--              batchId, ownerId, blockTypeId, and blockId metadata.
--              Migrates columns to source_info JSONB, updates views,
--              and safely drops redundant top-level table columns.
-- Created At: 2026-07-30 | Last Modified: 2026-08-01
-- ============================================================

-- 1. Add source_info JSONB column if not exists
ALTER TABLE enterprise_files
ADD COLUMN IF NOT EXISTS source_info JSONB NOT NULL DEFAULT '{
    "workspaceId": null,
    "appId": null,
    "objectId": null,
    "recordId": null,
    "batchId": null,
    "ownerId": null,
    "blockTypeId": null,
    "blockId": null
}'::jsonb;

-- 2. Populate source_info JSONB column from existing top-level columns
-- (Note: record_id column does NOT exist in enterprise_files table, so recordId is extracted from source_info->>'recordId')
UPDATE enterprise_files
SET source_info = jsonb_build_object(
    'workspaceId', workspace_id,
    'appId', app_id,
    'objectId', object_id,
    'recordId', (source_info->>'recordId'),
    'batchId', batch_id,
    'ownerId', owner_id,
    'blockTypeId', COALESCE(source_info->>'blockTypeId', data_entity_type),
    'blockId', COALESCE(source_info->>'blockId', entity_id::text)
)
WHERE source_info IS NULL OR source_info = '{}'::jsonb OR (source_info->>'workspaceId') IS NULL;

-- 3. Create GIN index on source_info for ultra-fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_enterprise_files_source_info_gin 
ON enterprise_files USING gin (source_info);

-- 4. Recreate view_enterprise_files_camelcase to read from source_info JSONB
CREATE OR REPLACE VIEW view_enterprise_files_camelcase AS
SELECT
    file_id AS "fileId",
    entity_id AS "entityID",
    (source_info->>'workspaceId') AS "workspaceId",
    (source_info->>'appId') AS "AppId",
    (source_info->>'objectId') AS "objectId",
    (source_info->>'recordId') AS "recordId",
    (source_info->>'batchId') AS "batchId",
    (source_info->>'ownerId') AS "ownerId",
    (source_info->>'blockTypeId') AS "blockTypeId",
    (source_info->>'blockId') AS "blockId",
    source_info AS "sourceInfo",
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

-- 5. Drop redundant top-level columns with CASCADE
ALTER TABLE enterprise_files
DROP COLUMN IF EXISTS workspace_id CASCADE,
DROP COLUMN IF EXISTS app_id CASCADE,
DROP COLUMN IF EXISTS object_id CASCADE,
DROP COLUMN IF EXISTS batch_id CASCADE,
DROP COLUMN IF EXISTS owner_id CASCADE;
