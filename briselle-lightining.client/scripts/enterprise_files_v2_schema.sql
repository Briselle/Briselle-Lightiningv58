-- ============================================================
-- Briselle Enterprise Platform — Digital Asset Management (DAM)
-- Production Database Schema Script v2.0
-- Reference: Schema - Enterprise_Digital_Asset_Table_v2.xlsx
-- Location: scripts/enterprise_files_v2_schema.sql
-- Created At: 2026-07-25 | Last Modified: 2026-07-25
-- ============================================================

-- 1. Create pgcrypto extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create enterprise_files metadata table matching v2 schema exactly
CREATE TABLE IF NOT EXISTS enterprise_files (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    workspace_id UUID NULL,
    app_id UUID NULL,
    object_id UUID NULL,
    batch_id UUID NULL,
    owner_id UUID NOT NULL,
    data_entity_type VARCHAR(100) NOT NULL,
    file_information JSONB NOT NULL DEFAULT '{
        "schemaVersion": "1.0",
        "displayName": "",
        "originalFileName": "",
        "fileExtension": "",
        "mimeType": "",
        "contentType": "",
        "bucketName": "enterprise-assets",
        "storageProvider": "Supabase",
        "storagePath": "",
        "folderPath": "",
        "publicUrl": "",
        "cdnUrl": "",
        "downloadUrl": "",
        "previewUrl": "",
        "thumbnailUrl": "",
        "storageRegion": "",
        "storageClass": "",
        "contentEncoding": "",
        "compressionAlgorithm": "",
        "isCompressed": false,
        "retentionPolicy": "",
        "expirationDate": null
    }'::jsonb,
    physical_metadata JSONB DEFAULT '{
        "schemaVersion": "1.0",
        "fileSize": 0,
        "checksum": "",
        "checksumAlgorithm": "SHA256",
        "etag": "",
        "width": null,
        "height": null,
        "duration": null,
        "pageCount": null,
        "dpi": null,
        "resolution": "",
        "orientation": "",
        "colorDepth": "",
        "colorSpace": "",
        "bitRate": "",
        "frameRate": "",
        "sampleRate": "",
        "channels": "",
        "codec": "",
        "cameraModel": "",
        "deviceModel": "",
        "gps": {"latitude": null, "longitude": null},
        "createdOnDevice": null,
        "lastModifiedOnDevice": null,
        "exif": {}
    }'::jsonb,
    version_information JSONB DEFAULT '{
        "schemaVersion": "1.0",
        "versionNumber": 1,
        "versionLabel": "v1.0",
        "parentFileId": null,
        "isLatestVersion": true,
        "majorVersion": 1,
        "minorVersion": 0,
        "changeSummary": "",
        "changeType": "",
        "publishedBy": null,
        "publishedOn": null
    }'::jsonb,
    status_information JSONB NOT NULL DEFAULT '{
        "schemaVersion": "1.0",
        "status": "Active",
        "isActive": true,
        "isDeleted": false,
        "isArchived": false,
        "isLocked": false,
        "isHidden": false,
        "deletedAt": null,
        "deletedBy": null,
        "archivedAt": null,
        "archivedBy": null,
        "lockReason": "",
        "retentionStatus": "",
        "legalHold": false
    }'::jsonb,
    security_information JSONB DEFAULT '{
        "schemaVersion": "1.0",
        "visibility": "Private",
        "classificationLevel": "",
        "encryptionStatus": "Encrypted",
        "encryptionAlgorithm": "AES-256",
        "encryptionKeyId": "",
        "accessPolicy": {},
        "sharingPolicy": {},
        "allowedUsers": [],
        "allowedRoles": [],
        "allowedDomains": [],
        "watermarkEnabled": false,
        "downloadAllowed": true,
        "printAllowed": true,
        "copyAllowed": true,
        "externalSharingAllowed": false,
        "passwordProtected": false,
        "passwordHint": ""
    }'::jsonb,
    ai_metadata JSONB DEFAULT '{
        "schemaVersion": "1.0",
        "ocrStatus": "Pending",
        "ocrText": "",
        "language": "",
        "transcript": "",
        "translation": "",
        "summary": "",
        "keywords": [],
        "entities": [],
        "namedEntities": [],
        "topics": [],
        "generatedTags": [],
        "generatedDescription": "",
        "classification": "",
        "confidence": 0,
        "moderationStatus": "",
        "moderationLabels": [],
        "sentiment": "",
        "embeddingId": "",
        "embeddingModel": "",
        "vectorDatabase": "",
        "documentType": "",
        "aiProvider": "",
        "lastProcessedAt": null
    }'::jsonb,
    search_metadata JSONB DEFAULT '{
        "schemaVersion": "1.0",
        "title": "",
        "description": "",
        "searchKeywords": [],
        "tags": [],
        "aliases": [],
        "searchVector": "",
        "indexed": false,
        "indexedAt": null,
        "searchRank": 0,
        "popularityScore": 0,
        "viewCount": 0,
        "downloadCount": 0,
        "favoriteCount": 0
    }'::jsonb,
    processing_metadata JSONB DEFAULT '{
        "schemaVersion": "1.0",
        "processingStatus": "Pending",
        "thumbnailGenerated": false,
        "previewGenerated": false,
        "virusScanStatus": "Pending",
        "virusEngine": "",
        "virusDefinitionVersion": "",
        "virusScannedAt": null,
        "ocrCompletedAt": null,
        "thumbnailGeneratedAt": null,
        "previewGeneratedAt": null,
        "conversionStatus": "",
        "conversionFormat": "",
        "compressionStatus": "",
        "processingPipeline": [],
        "processingLogs": [],
        "errors": []
    }'::jsonb,
    audit_information JSONB NOT NULL DEFAULT '{
        "schemaVersion": "1.0",
        "createdBy": "",
        "createdOn": "",
        "modifiedBy": "",
        "modifiedOn": "",
        "deletedBy": "",
        "deletedOn": null,
        "lastViewedBy": "",
        "lastViewedOn": null,
        "lastDownloadedBy": "",
        "lastDownloadedOn": null,
        "recordVersion": 1,
        "rowVersion": "",
        "createdFromIp": "",
        "modifiedFromIp": "",
        "deviceInfo": "",
        "browserInfo": "",
        "operatingSystem": "",
        "userAgent": "",
        "auditTrail": []
    }'::jsonb,
    custom_metadata JSONB DEFAULT '{
        "schemaVersion": "1.0",
        "tenantFields": {},
        "properties": {},
        "labels": {},
        "workflowData": {},
        "integrationData": {},
        "externalReferences": {},
        "notes": ""
    }'::jsonb,
    system_metadata JSONB NOT NULL DEFAULT '{
        "schemaVersion": "1.0",
        "platformVersion": "v58.0",
        "storageEngine": "Supabase Storage",
        "storageProvider": "Supabase",
        "replicationRegion": "",
        "replicationStatus": "",
        "cacheStatus": "",
        "lifecyclePolicy": "",
        "integrityStatus": "",
        "migrationVersion": "v2.0",
        "featureFlags": [],
        "lastIntegrityCheck": null,
        "lastMigration": null,
        "systemNotes": "",
        "diagnostics": {}
    }'::jsonb,
    compliance_metadata JSONB NOT NULL DEFAULT '{
        "schemaVersion": "1.0",
        "dataClassification": "Internal",
        "sensitivityLabel": "",
        "gdpr": {},
        "hipaa": {},
        "ferpa": {},
        "dpdp": {},
        "retentionPolicy": "",
        "retentionUntil": null,
        "legalHold": false,
        "legalHoldReason": "",
        "consentReference": "",
        "dataResidency": "",
        "dlpStatus": "",
        "auditClassification": "",
        "complianceTags": [],
        "eDiscovery": {},
        "recordsManagement": {}
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create BTREE indexes for high-performance relational queries
CREATE INDEX IF NOT EXISTS idx_enterprise_files_entity_id ON enterprise_files (entity_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_files_workspace_id ON enterprise_files (workspace_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_files_app_id ON enterprise_files (app_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_files_object_id ON enterprise_files (object_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_files_batch_id ON enterprise_files (batch_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_files_owner_id ON enterprise_files (owner_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_files_data_entity_type ON enterprise_files (data_entity_type);

-- 4. Create GIN indexes for fast JSONB metadata querying
CREATE INDEX IF NOT EXISTS idx_ef_file_info_gin ON enterprise_files USING GIN (file_information);
CREATE INDEX IF NOT EXISTS idx_ef_physical_meta_gin ON enterprise_files USING GIN (physical_metadata);
CREATE INDEX IF NOT EXISTS idx_ef_version_info_gin ON enterprise_files USING GIN (version_information);
CREATE INDEX IF NOT EXISTS idx_ef_status_info_gin ON enterprise_files USING GIN (status_information);
CREATE INDEX IF NOT EXISTS idx_ef_security_info_gin ON enterprise_files USING GIN (security_information);
CREATE INDEX IF NOT EXISTS idx_ef_ai_metadata_gin ON enterprise_files USING GIN (ai_metadata);
CREATE INDEX IF NOT EXISTS idx_ef_search_metadata_gin ON enterprise_files USING GIN (search_metadata);
CREATE INDEX IF NOT EXISTS idx_ef_processing_meta_gin ON enterprise_files USING GIN (processing_metadata);
CREATE INDEX IF NOT EXISTS idx_ef_audit_info_gin ON enterprise_files USING GIN (audit_information);
CREATE INDEX IF NOT EXISTS idx_ef_custom_metadata_gin ON enterprise_files USING GIN (custom_metadata);
CREATE INDEX IF NOT EXISTS idx_ef_system_metadata_gin ON enterprise_files USING GIN (system_metadata);
CREATE INDEX IF NOT EXISTS idx_ef_compliance_meta_gin ON enterprise_files USING GIN (compliance_metadata);

-- 5. Row Level Security (RLS) policies allowing full access for authenticated & anon clients
ALTER TABLE enterprise_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable read for anonymous users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable select for all users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable insert for all users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable update for all users" ON enterprise_files;
DROP POLICY IF EXISTS "Enable delete for all users" ON enterprise_files;

CREATE POLICY "Enable select for all users" ON enterprise_files
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Enable insert for all users" ON enterprise_files
    FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON enterprise_files
    FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON enterprise_files
    FOR DELETE TO authenticated, anon USING (true);

-- 6. Auto-update updated_at timestamp trigger
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

-- 7. Database view for camelCase API compatibility
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
