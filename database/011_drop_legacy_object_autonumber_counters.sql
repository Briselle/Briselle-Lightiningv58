-- =============================================
-- DROP legacy durable auto-number table (011)
-- =============================================
-- Run this if you previously applied:
--   database/011_autonumber_counter_ledger.sql (object_autonumber_counters + next_object_autonumber)
-- Counters now live in platform_config (config_type = 7, config_name = 'ObjectCounter'); see 012.
-- =============================================

DROP FUNCTION IF EXISTS public.next_object_autonumber(bigint, bigint, text, bigint);

DROP TABLE IF EXISTS public.object_autonumber_counters;
