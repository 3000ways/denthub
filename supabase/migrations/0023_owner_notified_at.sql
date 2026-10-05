-- 0023: Track whether Andrei has been emailed about a claim / edit proposal.
--
-- Claims and edit proposals are inserted straight from the browser (RLS
-- own-insert), so there is no server step to send the alert from. Instead the
-- page calls /api/notify-owner with the new row's id; that endpoint flips
-- owner_notified_at from NULL to now() atomically and only sends when the flip
-- succeeds — so each row can trigger at most ONE email, however often the
-- endpoint is called. Owners cannot UPDATE these tables (no update policy), so
-- they can't reset the flag to re-trigger it.

alter table public.resource_claims         add column if not exists owner_notified_at timestamptz;
alter table public.resource_edit_proposals add column if not exists owner_notified_at timestamptz;

-- Existing rows predate alerts — mark them handled so nothing old re-alerts.
update public.resource_claims         set owner_notified_at = created_at where owner_notified_at is null;
update public.resource_edit_proposals set owner_notified_at = created_at where owner_notified_at is null;
