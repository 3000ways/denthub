-- "inaccurate": a listener says a Journal Briefings summary, number or
-- attribution is wrong ("Spot a mistake?" on the episode page). Lands in the
-- admin Reports queue like every other report; the correction policy promises
-- action within 48 hours.
ALTER TABLE public.resource_reports DROP CONSTRAINT IF EXISTS resource_reports_reason_check;
ALTER TABLE public.resource_reports ADD CONSTRAINT resource_reports_reason_check
  CHECK (reason IN ('broken','inappropriate','irrelevant','offensive','ai_voice','inaccurate','other'));
