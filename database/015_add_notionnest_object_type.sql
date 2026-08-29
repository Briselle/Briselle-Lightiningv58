-- Allow NotionNest in dobj.object_type (matches UI / dobj_configuration.objectType)
ALTER TABLE public.dobj
    DROP CONSTRAINT IF EXISTS ck_dobj_object_type;

ALTER TABLE public.dobj
    ADD CONSTRAINT ck_dobj_object_type
    CHECK (object_type IN ('list', 'transaction', 'hierarchy', 'notionnest'));

COMMENT ON COLUMN public.dobj.object_type IS
    'Object-level behavior mode: list | transaction | hierarchy | notionnest.';
