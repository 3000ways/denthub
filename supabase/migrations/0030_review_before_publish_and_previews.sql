-- Journal Briefings — hear it before it publishes.
-- 1. Per-show "review before publishing": the Monday job renders the episode
--    and stops at status = rendered; Andrei listens in the admin and presses
--    Publish. Default ON so first episodes are always heard first.
-- 2. Listen-only previews of drafted weeklies rendered from the admin through
--    the shared audio cache (so the real render reuses every clip).
-- 3. A starter pronunciation list for the dental vocabulary (admin-editable).
ALTER TABLE public.briefing_shows ADD COLUMN IF NOT EXISTS review_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.briefings
  ADD COLUMN IF NOT EXISTS preview_url  TEXT,
  ADD COLUMN IF NOT EXISTS preview_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preview_meta JSONB;

INSERT INTO public.speech_pronunciations (term, spoken_as, note) VALUES
  ('NaOCl',      'sodium hypochlorite',          'chemical formula read as the name'),
  ('CBCT',       'C-B-C-T',                      'spell out'),
  ('EDTA',       'E-D-T-A',                      'spell out'),
  ('MTA',        'M-T-A',                        'spell out'),
  ('PRF',        'P-R-F',                        'spell out'),
  ('PRP',        'P-R-P',                        'spell out'),
  ('IANB',       'inferior alveolar nerve block','say the words'),
  ('VPT',        'vital pulp therapy',           'say the words'),
  ('RET',        'regenerative endodontic therapy','say the words'),
  ('CHX',        'chlorhexidine',                'say the word'),
  ('NiTi',       'nickel titanium',              'say the words'),
  ('PAI',        'P-A-I',                        'periapical index, spell out'),
  ('ROC',        'R-O-C',                        'spell out'),
  ('AUC',        'A-U-C',                        'spell out'),
  ('LLM',        'L-L-M',                        'spell out'),
  ('LLMs',       'L-L-Ms',                       'spell out'),
  ('GPT',        'G-P-T',                        'spell out'),
  ('ELISA',      'eh-LY-za',                     'assay'),
  ('Biodentine', 'Bio-dentine',                  'brand name'),
  ('MMP',        'M-M-P',                        'spell out'),
  ('IL',         'interleukin',                  'cytokine prefix (IL-1β)'),
  ('TNF',        'T-N-F',                        'spell out'),
  ('TGF',        'T-G-F',                        'spell out'),
  ('micro-CT',   'micro C-T',                    'spell out'),
  ('PRISMA',     'PRISMA',                       'keep as a word'),
  ('GRADE',      'GRADE',                        'keep as a word')
ON CONFLICT (term) DO NOTHING;
