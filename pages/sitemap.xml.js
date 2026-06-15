export async function getServerSideProps({ res }) {
  const pages = [
    { url: 'https://thedentalcommute.com', priority: '1.0', changefreq: 'daily' },
    { url: 'https://thedentalcommute.com/about', priority: '0.7', changefreq: 'monthly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function Sitemap() { return null; }
