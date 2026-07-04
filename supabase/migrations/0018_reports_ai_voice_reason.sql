-- Add "ai_voice" to the resource_reports reason vocabulary.
--
-- This is detection signal #1 for the AI Voice disclosure feature (see the
-- roadmap theme): the cheapest way to spot AI-narrated shows is to let listeners
-- flag them through the report button they already use. An ai_voice report is
-- just a SIGNAL that lands in the admin Reports queue — it never auto-publishes a
-- label. A human (Andrei) still has to set Voice Status = Confirmed in Airtable
-- before anything shows publicly, so the false-positive firewall stays intact.
--
-- A CHECK constraint can't be altered in place, so drop and recreate it with the
-- extra value. Existing rows all use the old values, so the new constraint
-- validates cleanly.

ALTER TABLE public.resource_reports
  DROP CONSTRAINT IF EXISTS resource_reports_reason_check;

ALTER TABLE public.resource_reports
  ADD CONSTRAINT resource_reports_reason_check
  CHECK (reason IN ('broken','inappropriate','irrelevant','offensive','ai_voice','other'));
