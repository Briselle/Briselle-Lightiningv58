-- =============================================
-- Backfill NotionNest Page field in dobj_configuration.fields
-- =============================================
-- Run after deploying client that injects __notion_page into object schema.
-- Safe to re-run: only adds the field when object_type = notionnest and it is missing.

UPDATE public.dobj d
SET dobj_configuration = jsonb_set(
    COALESCE(d.dobj_configuration, '{}'::jsonb),
    '{fields}',
    COALESCE(d.dobj_configuration, '{}'::jsonb)->'fields' || jsonb_build_array(
        jsonb_build_object(
            'version', 1,
            'id', COALESCE(
                (
                    SELECT MAX((f->>'id')::int)
                    FROM jsonb_array_elements(COALESCE(d.dobj_configuration->'fields', '[]'::jsonb)) AS f
                ),
                0
            ) + 1,
            'order', COALESCE(
                (
                    SELECT MAX((f->>'order')::int)
                    FROM jsonb_array_elements(COALESCE(d.dobj_configuration->'fields', '[]'::jsonb)) AS f
                ),
                0
            ) + 1,
            'dataType', 'notionNestPage',
            'label', 'NotionNest Page',
            'apiName', '__notion_page',
            'description', 'BlockNote page document (blocks, icon, cover). Open a record to edit in the page editor.',
            'required', 0,
            'isdeleted', 0,
            'isactive', 1,
            'isCustom', 0,
            'attributes', jsonb_build_object(
                'indexed', false,
                'systemManaged', true,
                'includeInTableView', true,
                'includeInInlineEdit', false,
                'preferredInView', false
            )
        )
    )
)
WHERE d.object_type = 'notionnest'
  AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(d.dobj_configuration->'fields', '[]'::jsonb)) AS f
      WHERE lower(f->>'apiName') = '__notion_page'
  );
