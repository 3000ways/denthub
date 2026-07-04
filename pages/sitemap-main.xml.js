// Child sitemap: the site's static public pages plus one entry per Published
// resource (each podcast/show/channel/etc. has its own page at /resource/[id]).
// Referenced by the top-level sitemap index at /sitemap.xml. Episode pages live
// in a separate child sitemap (/sitemap-episodes.xml) because they come from a
// different data source (Supabase) and can be far more numerous.
//
// Generated on request from live Airtable data, so it stays current as
// resources are added or removed — no hand-maintained file.

const SITE = 'https://thedentalcommute.com';

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

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

function buildSitemap(records) {
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

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export async function getServerSideProps({ res }) {
  let records = [];
  try {
    records = await fetchResourceRecords();
  } catch (err) {
    // On any failure, still emit a valid sitemap with the static pages so we
    // never serve a broken document to crawlers.
    records = [];
  }

  const xml = buildSitemap(records);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapMain() {
  return null;
}
