-- Listener crowdsourcing for the AI Voice feature: a lightweight vote cast from
-- the player — "Is this an AI voice?" → AI / Human / Not sure — captured at the
-- moment someone is actually hearing the show.
--
-- Trust model mirrors resource_reports/episodes: writes go ONLY through the
-- service-role key from /api/voice-vote (which verifies a Cloudflare Turnstile
-- token first). RLS is ON with NO policies, so anon/authenticated can neither
-- read nor write — only the service role touches it. The admin "AI Voice" tab
-- reads aggregates through the same service-role client.
--
-- ⚠️ This is a SIGNAL, never a public label. Votes aggregate into a "Suspected"
-- tally for Andrei to confirm; nothing on the site flips to a public 🤖 badge off
-- the crowd alone (see lib/voice.js / the AI Voice roadmap theme). Two-way on
-- purpose: "human" votes are counter-evidence that protects a real creator from a
-- false AI flag.
--
-- We record the episode heard AND its show (denormalized show_resource_id, the
-- Airtable record id) so the admin can tally by show without a join. Anti-spam:
-- one vote per voter per episode per UTC day (unique index); re-voting the same
-- day UPDATES the verdict (a listener can change their mind) via upsert.

CREATE TABLE public.voice_votes (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  episode_id        BIGINT NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  resource_id       TEXT,                              -- show's Airtable record id (denormalized for rollup)
  verdict           TEXT NOT NULL CHECK (verdict IN ('ai','human','unsure')),
  voter_ip_hash     TEXT NOT NULL,                     -- salted hash of the voter's IP (never the raw IP)
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- set if signed in
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- UTC calendar day, set at insert so the unique index sits on plain columns.
  voted_on          DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'utc')::date)
);

-- Rollup + triage indexes.
CREATE INDEX voice_votes_resource_idx ON public.voice_votes (resource_id);
CREATE INDEX voice_votes_episode_idx  ON public.voice_votes (episode_id);

-- One vote per voter (by IP hash) per episode per UTC day; re-votes upsert.
CREATE UNIQUE INDEX voice_votes_one_per_day
  ON public.voice_votes (voter_ip_hash, episode_id, voted_on);

-- RLS on, with NO policies: anon/authenticated get nothing. Service role only.
ALTER TABLE public.voice_votes ENABLE ROW LEVEL SECURITY;
