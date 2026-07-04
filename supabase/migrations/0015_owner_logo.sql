-- Owner-set logo, part of the resource-icon priority ladder:
--   owner logo → Airtable "Image URL" (Andrei's hand-pick) → Airtable
--   "Auto Image URL" (RSS show art / AI research guess) → favicon → letter.
--
-- The owner's logo lives here in resource_owner_content (NOT in the Airtable
-- edit-proposal review queue) so it AUTO-PUBLISHES the moment an approved owner
-- sets it — same instant-publish behaviour as their bio/vision. Writes are
-- already locked down by the 0010 "claimed_write" policy (owner must hold an
-- approved claim on this resource), so instant publish stays scoped to the
-- owner's own listing and can't touch anyone else's.
--
-- Automation (harvester, AI research) never writes this column — those write
-- Airtable's "Auto Image URL" field instead, which sits BELOW the owner logo in
-- the ladder. So a creator's own choice always wins and is never overwritten.

ALTER TABLE public.resource_owner_content
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
