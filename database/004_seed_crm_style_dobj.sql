-- =============================================
-- CRM-style seed rows for public.dobj (entity_id = 1000000000)
-- =============================================
-- Prerequisites:
--   005_add_sys_status_dobj.sql (sys_status)
--   007_rename_dobj_pk_to_sys_id_generated_dobj_id.sql (sys_id, generated dobj_id)
--   008_rename_dobj_audit_to_sys_with_entity_mirror.sql (optional: sys_* audit + entity-scope generated copies)
-- =============================================
-- INSERT uses canonical columns only (omit generated columns: dobj_id, optional dobj_* copies from 008).
-- =============================================

INSERT INTO public.dobj (
    sys_id,
    entity_id,
    dobj_name_display,
    dobj_name_system,
    dobj_description,
    dobj_type,
    dobj_status,
    dobj_configuration,
    sys_created_ts,
    sys_updated_ts,
    sys_created_by_id,
    sys_updated_by_id,
    "isCustom",
    sys_status
)
VALUES
    (2000000101, 1000000000, 'Opportunity', 'Opportunity', 'CRM-style opportunities pipeline', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000102, 1000000000, 'Deal', 'Deal', 'Closed-won / closed-lost commercial deals', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000103, 1000000000, 'Lead', 'Lead', 'Inbound and outbound leads', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000104, 1000000000, 'Account2', 'Account2', 'Customer and partner accounts', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000105, 1000000000, 'Contact2', 'Contact2', 'People associated with accounts', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000106, 1000000000, 'Customer', 'Customer', 'Billing customers and subscribers', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000107, 1000000000, 'Project', 'Project', 'Delivery projects and engagements', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000108, 1000000000, 'Sprint', 'Sprint', 'Agile sprint backlog container', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000109, 1000000000, 'Case', 'Case', 'Support cases and service tickets', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000110, 1000000000, 'Task', 'Task', 'Tasks and follow-ups', 'System', 1, null, now(), now(), 1200, 3901, 0, 1),
    (2000000111, 1000000000, 'Campaign', 'Campaign', 'Marketing campaigns', 'System', 'Draft', null, now(), now(), 1200, 3901, 0, 1),
    (2000000112, 1000000000, 'Product', 'Product', 'Product catalog entries', 'System', 1, null, now(), now(), 1200, 3901, 0, 1)
ON CONFLICT (sys_id) DO UPDATE SET
    entity_id = EXCLUDED.entity_id,
    dobj_name_display = EXCLUDED.dobj_name_display,
    dobj_name_system = EXCLUDED.dobj_name_system,
    dobj_description = EXCLUDED.dobj_description,
    dobj_type = EXCLUDED.dobj_type,
    dobj_status = EXCLUDED.dobj_status,
    dobj_configuration = EXCLUDED.dobj_configuration,
    sys_created_ts = EXCLUDED.sys_created_ts,
    sys_updated_ts = EXCLUDED.sys_updated_ts,
    sys_created_by_id = EXCLUDED.sys_created_by_id,
    sys_updated_by_id = EXCLUDED.sys_updated_by_id,
    "isCustom" = EXCLUDED."isCustom",
    sys_status = EXCLUDED.sys_status;
