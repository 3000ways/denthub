-- Claim Your Profile: podcast/resource owners claim their listing and edit it,
-- gated by Andrei's manual approval. Implements the editorial-integrity
-- firewall from ROADMAP.md: owner content lives here in Supabase; the
-- objective record (scores, ranking) stays in Airtable and owners never write
-- to it directly.
--
-- Three tables:
--   resource_claims        — who claims what, pending Andrei's approval.
--   resource_owner_content — the "owner's layer": bio/vision/featured episodes.
--                            Auto-publishes once the claim is approved (low
--                            risk — can't corrupt the objective record).
--   resource_edit_proposals — factual-field corrections (Name, URL, Description,
--                            Image, Host, RSS, tags) that touch the shared
--                            Airtable record. Reviewed by Andrei before being
--                            applied — never auto-published.

CREATE TABLE public.resource_claims (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id   TEXT NOT NULL,                 -- Airtable resource record id
  contact_email TEXT NOT NULL,
  claimant_name TEXT,
  claimant_role TEXT,                          -- e.g. "Host", "Producer", "Team member"
  message       TEXT,                          -- optional note to Andrei
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES auth.users(id)
);

-- One active (pending or approved) claim per user per resource — resubmitting
-- after a rejection is fine (old row stays, status stays 'rejected').
CREATE UNIQUE INDEX resource_claims_active_unique
  ON public.resource_claims (user_id, resource_id)
  WHERE status IN ('pending', 'approved');

CREATE INDEX resource_claims_resource_idx ON public.resource_claims (resource_id);
CREATE INDEX resource_claims_status_idx ON public.resource_claims (status, created_at DESC);

ALTER TABLE public.resource_claims ENABLE ROW LEVEL SECURITY;

-- Owners can see and create their own claims. Reviewing (status/reviewed_*)
-- happens via the service-role key from the admin API, not client-side RLS.
CREATE POLICY "resource_claims_own_read" ON public.resource_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "resource_claims_own_insert" ON public.resource_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.resource_owner_content (
  resource_id       TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio               TEXT,                       -- short creator note
  vision            TEXT,                       -- "vision for dentistry" blurb
  featured_episode_ids BIGINT[] NOT NULL DEFAULT '{}',  -- episodes.id, owner-picked
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.resource_owner_content ENABLE ROW LEVEL SECURITY;

-- Public-read (shown on the resource page to everyone, like the Pinboard),
-- but only the claiming owner may write — and only via the app after their
-- claim is approved (enforced in the API layer, not by RLS, since RLS can't
-- easily check claim status without a subquery; kept simple here).
CREATE POLICY "resource_owner_content_public_read" ON public.resource_owner_content
  FOR SELECT USING (true);

CREATE POLICY "resource_owner_content_own_write" ON public.resource_owner_content
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.resource_edit_proposals (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id   TEXT NOT NULL,
  changes       JSONB NOT NULL,                -- { "Name": {"old":"...","new":"..."}, ... }
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES auth.users(id),
  admin_note    TEXT                            -- optional reason on reject
);

CREATE INDEX resource_edit_proposals_status_idx ON public.resource_edit_proposals (status, created_at DESC);
CREATE INDEX resource_edit_proposals_resource_idx ON public.resource_edit_proposals (resource_id);

ALTER TABLE public.resource_edit_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resource_edit_proposals_own_read" ON public.resource_edit_proposals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "resource_edit_proposals_own_insert" ON public.resource_edit_proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
