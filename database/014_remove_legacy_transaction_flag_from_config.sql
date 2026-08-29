-- =============================================
-- Remove legacy isTransactionObject key from dobj_configuration JSON
-- =============================================
-- Object Type is now source-of-truth in public.dobj.object_type.
-- This cleanup removes old JSON flags from all objects.
-- =============================================

UPDATE public.dobj
SET dobj_configuration =
    COALESCE(dobj_configuration, '{}'::jsonb)
    - 'isTransactionObject'
    - 'is_transaction_object'
    - 'Is_Transaction_Object'
    - 'Is_Transaction Object'
WHERE COALESCE(dobj_configuration, '{}'::jsonb) ?| ARRAY[
    'isTransactionObject',
    'is_transaction_object',
    'Is_Transaction_Object',
    'Is_Transaction Object'
];

