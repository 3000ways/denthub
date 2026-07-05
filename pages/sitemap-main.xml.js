// Child sitemap: the site's static public pages, one entry per Published
// resource (each podcast/show/channel/etc. has its own page at /resource/[id]),
// and the public "See all" topic pages at /browse?tag=…&kind=…
// Referenced by the top-level sitemap index at /sitemap.xml. Episode pages live
// in a separate child sitemap (/sitemap-episodes.xml) because they come from a
// different data source (Supabase) and can be far more numerous.
//
// Generated on request from live data (Airtable resources + Supabase quiz
// tags), so it stays current as resources/topics are added or removed — no
// hand-maintained file.

import { supabase } from '../lib/supabase';

const SITE = 'https://thedentalcommute.com';

// /browse's `kind` param labels come from the quiz taxonomy's question_key.
// (See lib/onboarding.js QUESTION_KEYS and lib/home-feed.js seeAllHref.)
const KIND_BY_QUESTION = { working_on: 'goal', interest: 'interest', career_stage: 'career' };

// Public, indexable static pages. (privacy/terms are noindex; profile/saved/
// my-* are auth-gated, so none of those belong in the sitemap.)
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
];

// Fetch every Published resource from Airtable, following pagination.
// Mirrors the server-side fetch pattern used by pages/resource/[id].js.
async function fetchResourceRecords() {
  const base = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) return [];

  const headers = { Authorization: `Bearer ${pat}` };
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    params.set('filterByFormula', "{Status}='Published'");
    if (offset) params.set('offset', offset);
    const r = await fetch(
      `https://api.airtable.com/v0/${base}/Resources?${params.toString()}`,
      { headers }
    );
    if (!r.ok) break;
    const data = await r.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

// The public /browse topic pages. Each active quiz-option tag that actually has
// episodes becomes a "See all" landing page; we skip tags with no episodes
// because /browse returns a 404 for those (never advertise a dead URL).
async function fetchBrowsePages() {
  try {
    const { data, error } = await supabase
      .from('quiz_options')
      .select('question_key, label')
      .eq('active', true)
      .order('sort_order');
    if (error || !data) return [];

    const checked = await Promise.all(
      data.map(async o => {
        const kind = KIND_BY_QUESTION[o.question_key];
        if (!kind || !o.label) return null;
        const { count } = await supabase
          .from('episodes')
          .select('id', { count: 'exact', head: true })
          .not('audio_url', 'is', null)
          .overlaps('quiz_tags', [o.label]);
        return count && count > 0 ? { tag: o.label, kind } : null;
      })
    );
    return checked.filter(Boolean);
  } catch (err) {
    return [];
  }
}

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

function buildSitemap(records, browsePages) {
  const urls = [];

  for (const p of STATIC_PAGES) {
    urls.push(
      `  <url>\n    <loc>${SITE}${p.path}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    );
  }

  for (const rec of records) {
    const lastmodRaw = rec.fields?.['Last Modified'] || rec.createdTime;
    const lastmod = lastmodRaw ? `\n    <lastmod>${xmlEscape(new Date(lastmodRaw).toISOString())}</lastmod>` : '';
    urls.push(
      `  <url>\n    <loc>${SITE}/resource/${xmlEscape(rec.id)}</loc>${lastmod}\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  }

  for (const b of browsePages) {
    const loc = xmlEscape(`${SITE}/browse?tag=${encodeURIComponent(b.tag)}&kind=${b.kind}`);
    urls.push(
      `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export async function getServerSideProps({ res }) {
  // On any failure, still emit a valid sitemap of whatever we did get, so we
  // never serve a broken document to crawlers.
  let records = [];
  let browsePages = [];
  try {
    [records, browsePages] = await Promise.all([fetchResourceRecords(), fetchBrowsePages()]);
  } catch (err) {
    records = [];
    browsePages = [];
  }

  const xml = buildSitemap(records, browsePages);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapMain() {
  return null;
}
