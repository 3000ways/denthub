-- Journal Briefings ("Endodontics This Week" and siblings): the data behind a
-- weekly AI-narrated podcast per specialty that reads the week's new papers
-- from the specialty's top three journals. Plan: docs/journal-briefings-build-plan.md
--
-- Four tables:
--   journals     — the curated journal list per specialty cluster (seeded below
--                  from lib/journals.js; the admin edits spoken_name / active)
--   articles     — one row per paper harvested from PubMed (public metadata:
--                  title, authors, abstract by section, ids, dates, access status)
--   briefings    — one row per weekly episode: script, audio, chapters, cost
--   audio_cache  — rendered speech segments keyed by text+voice, so a shared
--                  abstract is paid for once and a corrected script re-renders cheaply
--
-- Trust model: journals / articles / published briefings are PUBLIC READ (they
-- power public pages and the RSS feed); every write goes through the service
-- role (harvest cron, render job, admin). audio_cache is service-role only.

-- ── journals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journals (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cluster           TEXT NOT NULL,                 -- 'endo', 'ortho', … (lib/journals.js)
  pubmed_abbr       TEXT NOT NULL,                 -- PubMed journal title abbreviation ([ta])
  name              TEXT NOT NULL,
  spoken_name       TEXT NOT NULL,                 -- what the host voice says ("the J-O-E")
  society           TEXT,
  homepage          TEXT,
  search_filter     TEXT,                          -- extra PubMed clause for broad journals
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  last_harvested_at TIMESTAMPTZ,
  last_status       TEXT,                          -- 'ok' | 'error'
  last_error        TEXT,
  article_count     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT journals_cluster_abbr_key UNIQUE (cluster, pubmed_abbr)
);

-- ── articles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.articles (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pmid            TEXT NOT NULL UNIQUE,
  doi             TEXT,
  pmc             TEXT,
  journal_abbr    TEXT NOT NULL,
  journal_name    TEXT,
  title           TEXT NOT NULL,
  authors         TEXT[] NOT NULL DEFAULT '{}',
  abstract        JSONB NOT NULL DEFAULT '[]',     -- [{label, text}]
  pub_types       TEXT[] NOT NULL DEFAULT '{}',
  rank_tier       SMALLINT NOT NULL DEFAULT 4,     -- 1 reviews/meta … 5 case reports (lib/journals.js rankTier)
  received_at     TIMESTAMPTZ,                     -- when PubMed received it (edat) — drives "this week"
  published_at    TIMESTAMPTZ,
  url             TEXT,                            -- doi.org link, else PubMed
  pubmed_url      TEXT,
  oa_status       TEXT NOT NULL DEFAULT 'unknown' CHECK (oa_status IN ('unknown','none','open','manuscript')),
  oa_url          TEXT,
  oa_license      TEXT,
  oa_checked_at   TIMESTAMPTZ,
  clusters        TEXT[] NOT NULL DEFAULT '{}',    -- every cluster whose journal list includes this journal
  cluster         TEXT,                            -- the ONE briefing it is routed to (set at draft time)
  briefing_id     BIGINT,                          -- set when scheduled into a briefing
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','scheduled','read','headline_only','skipped')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS articles_received_idx  ON public.articles (received_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS articles_journal_idx   ON public.articles (journal_abbr);
CREATE INDEX IF NOT EXISTS articles_clusters_gin  ON public.articles USING GIN (clusters);
CREATE INDEX IF NOT EXISTS articles_status_idx    ON public.articles (status);
CREATE INDEX IF NOT EXISTS articles_oa_pending_idx ON public.articles (id) WHERE oa_checked_at IS NULL AND doi IS NOT NULL;

-- ── briefings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.briefings (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cluster          TEXT NOT NULL,
  kind             TEXT NOT NULL DEFAULT 'weekly' CHECK (kind IN ('trailer','weekly')),
  week_of          DATE NOT NULL,                  -- the Monday (trailer: its publish date)
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','rendered','published','skipped','failed','unpublished')),
  title            TEXT,
  script           JSONB NOT NULL DEFAULT '[]',    -- [{kind, speaker, text, article_id?}]
  article_ids      BIGINT[] NOT NULL DEFAULT '{}', -- read in full, in order
  headline_ids     BIGINT[] NOT NULL DEFAULT '{}', -- named only, rolled to next week
  audio_url        TEXT,
  duration_seconds INTEGER,
  chapters         JSONB NOT NULL DEFAULT '[]',    -- [{title, start, article_id}]
  episode_id       BIGINT REFERENCES public.episodes(id) ON DELETE SET NULL,
  cost_cents       NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost_breakdown   JSONB NOT NULL DEFAULT '{}',
  checks           JSONB NOT NULL DEFAULT '{}',    -- quality-check results
  error            TEXT,
  drafted_at       TIMESTAMPTZ,
  rendered_at      TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT briefings_cluster_week_key UNIQUE (cluster, week_of)
);
CREATE INDEX IF NOT EXISTS briefings_cluster_week_idx ON public.briefings (cluster, week_of DESC);

-- ── audio_cache ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audio_cache (
  text_hash        TEXT PRIMARY KEY,               -- sha256(voice|speed|model|text)
  voice            TEXT NOT NULL,
  model            TEXT NOT NULL,
  speed            NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  chars            INTEGER NOT NULL,
  duration_seconds NUMERIC(8,2) NOT NULL,
  bytes            INTEGER NOT NULL,
  audio_url        TEXT NOT NULL,
  cost_cents       NUMERIC(10,4) NOT NULL DEFAULT 0,
  hits             INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── pronunciation dictionary (admin-maintained) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.speech_pronunciations (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  term        TEXT NOT NULL UNIQUE,
  spoken_as   TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.journals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_cache          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_pronunciations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journals' AND policyname = 'journals_public_read') THEN
    CREATE POLICY journals_public_read ON public.journals FOR SELECT USING (active);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'articles' AND policyname = 'articles_public_read') THEN
    CREATE POLICY articles_public_read ON public.articles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'briefings' AND policyname = 'briefings_public_read') THEN
    CREATE POLICY briefings_public_read ON public.briefings FOR SELECT USING (status = 'published');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'speech_pronunciations' AND policyname = 'pronunciations_public_read') THEN
    CREATE POLICY pronunciations_public_read ON public.speech_pronunciations FOR SELECT USING (true);
  END IF;
END $$;
-- audio_cache: RLS on, no policies → service role only.

-- Keep the anon role away from the columns the public never needs.
REVOKE ALL ON public.audio_cache FROM anon, authenticated;

-- ── seed journals (mirrors lib/journals.js; safe to re-run) ─────────────────
INSERT INTO public.journals (cluster, pubmed_abbr, name, spoken_name, society, search_filter) VALUES
  ('endo','J Endod','Journal of Endodontics','the J-O-E','AAE',NULL),
  ('endo','Int Endod J','International Endodontic Journal','the I-E-J','ESE / BES',NULL),
  ('endo','Eur Endod J','European Endodontic Journal','the European Endo Journal',NULL,NULL),
  ('ortho','Am J Orthod Dentofacial Orthop','American Journal of Orthodontics and Dentofacial Orthopedics','A-J-O-D-O','AAO',NULL),
  ('ortho','Angle Orthod','The Angle Orthodontist','the Angle','EHASO',NULL),
  ('ortho','Eur J Orthod','European Journal of Orthodontics','the E-J-O','EOS',NULL),
  ('perio','J Periodontol','Journal of Periodontology','the Journal of Periodontology','AAP',NULL),
  ('perio','J Clin Periodontol','Journal of Clinical Periodontology','the J-C-P','EFP',NULL),
  ('perio','Clin Oral Implants Res','Clinical Oral Implants Research','Clinical Oral Implants Research','EAO',NULL),
  ('prostho','J Prosthet Dent','Journal of Prosthetic Dentistry','the J-P-D',NULL,NULL),
  ('prostho','J Prosthodont','Journal of Prosthodontics','the Journal of Prosthodontics','ACP',NULL),
  ('prostho','Int J Prosthodont','International Journal of Prosthodontics','the I-J-P',NULL,NULL),
  ('oms','J Oral Maxillofac Surg','Journal of Oral and Maxillofacial Surgery','the J-O-M-S','AAOMS',NULL),
  ('oms','Int J Oral Maxillofac Surg','International Journal of Oral and Maxillofacial Surgery','the I-J-O-M-S','IAOMS',NULL),
  ('oms','Br J Oral Maxillofac Surg','British Journal of Oral and Maxillofacial Surgery','the British Journal','BAOMS',NULL),
  ('pedo','Pediatr Dent','Pediatric Dentistry','Pediatric Dentistry','AAPD',NULL),
  ('pedo','Int J Paediatr Dent','International Journal of Paediatric Dentistry','the International Journal','IAPD / BSPD',NULL),
  ('pedo','Eur Arch Paediatr Dent','European Archives of Paediatric Dentistry','the European Archives','EAPD',NULL),
  ('radiology','Dentomaxillofac Radiol','Dentomaxillofacial Radiology','Dentomaxillofacial Radiology','IADMFR',NULL),
  ('radiology','Oral Surg Oral Med Oral Pathol Oral Radiol','Oral Surgery, Oral Medicine, Oral Pathology and Oral Radiology','Triple-O',NULL,NULL),
  ('radiology','Oral Radiol','Oral Radiology','Oral Radiology','JSOMR',NULL),
  ('pathology','J Oral Pathol Med','Journal of Oral Pathology and Medicine','the Journal of Oral Pathology and Medicine',NULL,NULL),
  ('pathology','Oral Surg Oral Med Oral Pathol Oral Radiol','Oral Surgery, Oral Medicine, Oral Pathology and Oral Radiology','Triple-O',NULL,NULL),
  ('pathology','Head Neck Pathol','Head and Neck Pathology','Head and Neck Pathology',NULL,NULL),
  ('oralmed','Oral Dis','Oral Diseases','Oral Diseases',NULL,NULL),
  ('oralmed','J Oral Pathol Med','Journal of Oral Pathology and Medicine','the Journal of Oral Pathology and Medicine',NULL,NULL),
  ('oralmed','Oral Surg Oral Med Oral Pathol Oral Radiol','Oral Surgery, Oral Medicine, Oral Pathology and Oral Radiology','Triple-O',NULL,NULL),
  ('pain','J Oral Facial Pain Headache','Journal of Oral and Facial Pain and Headache','the Journal of Oral and Facial Pain','AAOP',NULL),
  ('pain','J Oral Rehabil','Journal of Oral Rehabilitation','the Journal of Oral Rehabilitation',NULL,NULL),
  ('pain','Cranio','CRANIO','Cranio',NULL,NULL),
  ('anesthesia','Anesth Prog','Anesthesia Progress','Anesthesia Progress','ADSA',NULL),
  ('anesthesia','J Dent Anesth Pain Med','Journal of Dental Anesthesia and Pain Medicine','the Journal of Dental Anesthesia','KDSA',NULL),
  ('anesthesia','Paediatr Anaesth','Pediatric Anesthesia','Pediatric Anesthesia',NULL,'(dental[tiab] OR dentistry[tiab] OR tooth[tiab] OR teeth[tiab] OR oral surgery[tiab])'),
  ('publichealth','Community Dent Oral Epidemiol','Community Dentistry and Oral Epidemiology','Community Dentistry and Oral Epidemiology',NULL,NULL),
  ('publichealth','J Public Health Dent','Journal of Public Health Dentistry','the Journal of Public Health Dentistry','AAPHD',NULL),
  ('publichealth','Community Dent Health','Community Dental Health','Community Dental Health','BASCD',NULL),
  ('general','J Am Dent Assoc','The Journal of the American Dental Association','JADA','ADA',NULL),
  ('general','J Dent Res','Journal of Dental Research','the Journal of Dental Research','IADR',NULL),
  ('general','J Dent','Journal of Dentistry','the Journal of Dentistry',NULL,NULL),
  ('implants','Clin Oral Implants Res','Clinical Oral Implants Research','Clinical Oral Implants Research','EAO',NULL),
  ('implants','Int J Oral Maxillofac Implants','International Journal of Oral and Maxillofacial Implants','the J-O-M-I','AO',NULL),
  ('implants','Clin Implant Dent Relat Res','Clinical Implant Dentistry and Related Research','Clinical Implant Dentistry',NULL,NULL)
ON CONFLICT (cluster, pubmed_abbr) DO NOTHING;

-- Only the first two shows harvest from day one; the rest switch on from the admin.
UPDATE public.journals SET active = (cluster IN ('endo','ortho'));
