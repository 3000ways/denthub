-- 0021: Tighten public read access on resources (Airtable→Supabase Phase 2).
--
-- 0020 opened resources with a blanket public-read policy. That exposed
-- Draft/Archived rows and internal/PII columns (submitter email, editor notes,
-- internal voice-scan audit notes) to anyone via the Supabase REST API.
-- The public only ever sees Published resources, so:
--   • row policy narrows to status = 'Published'
--   • column privileges revoke the internal/PII columns from anon+authenticated
--     (PostgREST expands select=* to only the permitted columns)
-- Server code that needs everything (admin panel, score engine, harvester)
-- uses the service-role key, which bypasses RLS and column grants entirely.

drop policy resources_public_read on public.resources;
create policy resources_public_read on public.resources
  for select using (status = 'Published');

revoke select (submitter_email, editor_notes, voice_note)
  on public.resources from anon, authenticated;
