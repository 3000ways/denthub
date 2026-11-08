-- Journal Briefings — hybrid format (owner decision 2026-11-08 after the legal review).
-- Each paper read in depth carries a licence-derived read mode and, for
-- all-rights-reserved papers, an original summary in the show's own words.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS oa_host_type TEXT,                 -- 'publisher' | 'repository' (Unpaywall best location)
  ADD COLUMN IF NOT EXISTS read_mode    TEXT CHECK (read_mode IN ('verbatim','verbatim_nd','hybrid','quote_only')),
  ADD COLUMN IF NOT EXISTS summary      TEXT,                 -- our own-words summary (hybrid mode), checked against the abstract
  ADD COLUMN IF NOT EXISTS summary_meta JSONB,                -- model, attempts, checks, cost
  ADD COLUMN IF NOT EXISTS summary_at   TIMESTAMPTZ;
COMMENT ON COLUMN public.articles.read_mode IS 'verbatim = CC BY/NC abstract read as published; verbatim_nd = CC ND, read with strip-only cleaning; hybrid = our summary + quoted conclusion; quote_only = summary failed checks, title + quoted conclusion';
