// Child sitemap: individual podcast-episode pages (/episode/[id]).
//
// Episodes live in Supabase (the `episodes` archive table, public-read), not
// Airtable, and there can be tens of thousands of them — more than a single
// sitemap file's 50,000-URL limit allows. So this sitemap is *sharded*: the
// top-level index (/sitemap.xml) links to /sitemap-episodes.xml?p=0,
// ?p=1, … and each page here serves one PAGE_SIZE-sized slice.
//
// Only episodes with a playable audio_url are listed — that matches what
// /episode/[id] actually renders (others 404), so we never advertise dead URLs.

import { supabase } from '../lib/supabase';

const SITE = 'https://thedentalcommute.com';
// URLs per shard. Kept below the 50,000 hard cap for headroom. Must match the
// value used to compute shard count in pages/sitemap.xml.js.
const PAGE_SIZE = 45000;
// Rows per Supabase request (PostgREST commonly caps a response at 1000).
const BATCH = 1000;

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

// Fetch the [start, start+PAGE_SIZE) slice of audio-bearing episodes, ordered by
// a stable key so shards don't overlap. Pages through the slice in BATCH-sized
// requests, advancing by the number of rows actually returned so it works
// regardless of the server's per-request row cap.
async function fetchEpisodeShard(pageIndex) {
  const start = pageIndex * PAGE_SIZE;
  const end = start + PAGE_SIZE; // exclusive
  const rows = [];
  let from = start;
  while (from < end) {
    const to = Math.min(from + BATCH, end) - 1;
    const { data, error } = await supabase
      .from('episodes')
      .select('id, published_at')
      .not('audio_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, to);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    from += data.length;
  }
  return rows;
}

function buildSitemap(rows) {
  const urls = rows.map(r => {
    const lastmod = r.published_at
      ? `\n    <lastmod>${xmlEscape(new Date(r.published_at).toISOString())}</lastmod>`
      : '';
    return `  <url>\n    <loc>${SITE}/episode/${xmlEscape(r.id)}</loc>${lastmod}\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export async function getServerSideProps({ res, query }) {
  const pageIndex = Math.max(0, parseInt(query.p, 10) || 0);
  let rows = [];
  try {
    rows = await fetchEpisodeShard(pageIndex);
  } catch (err) {
    rows = [];
  }

  const xml = buildSitemap(rows);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapEpisodes() {
  return null;
}
