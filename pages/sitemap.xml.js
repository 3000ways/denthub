// Dynamic sitemap. Next.js serves this at /sitemap.xml. It lists the static
// public pages plus one entry per Published resource (every podcast/resource
// now has its own page at /resource/[id]), so search engines can discover and
// index them all. The list is generated on request from live Airtable data, so
// it stays current as resources are added or removed — no hand-maintained file.
//
// NOTE: the old static public/sitemap.xml was removed; a file in public/ would
// take precedence over this route and shadow it.

const SITE = 'https://thedentalcommute.com';

// Public, indexable static pages. (privacy/terms are noindex; profile/saved are
// auth-gated, so none of those belong in the sitemap.)
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
];

// Fetch every Published resource ID from Airtable, following pagination.
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
    params.set('fields[]', 'Last Modified'); // keep payload small; omitted if field absent
    if (offset) params.set('offset', offset);
    const r = await fetch(
      `https://api.airtable.com/v0/${base}/Resources?${params.toString()}`,
      { headers }
    );
    if (!r.ok) {
      // If the optional Last Modified field doesn't exist, retry without it.
      const params2 = new URLSearchParams();
      params2.set('filterByFormula', "{Status}='Published'");
      if (offset) params2.set('offset', offset);
      const r2 = await fetch(
        `https://api.airtable.com/v0/${base}/Resources?${params2.toString()}`,
        { headers }
      );
      if (!r2.ok) break;
      const data2 = await r2.json();
      records.push(...(data2.records || []));
      offset = data2.offset;
      continue;
    }
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

  // Cache at the CDN edge: serve for up to an hour, revalidate in the
  // background, so we hit Airtable at most ~once an hour regardless of crawl
  // volume. Matches the freshness needs of a directory sitemap.
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
}

// Route renders nothing — the XML is written directly in getServerSideProps.
export default function Sitemap() {
  return null;
}
