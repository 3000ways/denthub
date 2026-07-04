// Top-level sitemap INDEX. Next.js serves this at /sitemap.xml (the URL
// registered in robots.txt and Google Search Console).
//
// It doesn't list pages directly — it points at child sitemaps:
//   • /sitemap-main.xml            → static pages + every /resource/[id]
//   • /sitemap-episodes.xml?p=N    → every /episode/[id], split into shards
//
// Episodes come from the Supabase archive and can exceed a single sitemap
// file's 50,000-URL limit, so they're sharded. We count them at request time
// and list exactly as many episode shards as needed, so the index stays correct
// as the archive grows — nothing to maintain by hand.

import { supabase } from '../lib/supabase';

const SITE = 'https://thedentalcommute.com';
// Must match PAGE_SIZE in pages/sitemap-episodes.xml.js.
const EPISODES_PER_SHARD = 45000;

// Count audio-bearing episodes (the ones /episode/[id] actually renders).
// Returns null if the count can't be read, so callers can fall back safely.
async function episodeCount() {
  try {
    const { count, error } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .not('audio_url', 'is', null);
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    return null;
  }
}

function buildIndex(childPaths) {
  const items = childPaths
    .map(p => `  <sitemap>\n    <loc>${SITE}${p}</loc>\n  </sitemap>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

export async function getServerSideProps({ res }) {
  const count = await episodeCount();
  // If the count is unavailable (e.g. Supabase unreachable), still expose one
  // episode shard so production — which can reach Supabase — serves episodes.
  const shards = count == null ? 1 : Math.max(1, Math.ceil(count / EPISODES_PER_SHARD));

  const paths = ['/sitemap-main.xml'];
  for (let i = 0; i < shards; i++) paths.push(`/sitemap-episodes.xml?p=${i}`);

  const xml = buildIndex(paths);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapIndex() {
  return null;
}
