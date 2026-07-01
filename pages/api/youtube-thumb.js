// Returns the thumbnail/avatar image for a YouTube channel or video URL.
// YouTube channel pages expose the avatar via an og:image meta tag; video pages
// expose the video thumbnail the same way. We scrape that tag server-side and
// proxy the image bytes (cached at the edge) so cards can show real artwork
// instead of the generic YouTube logo. Any failure returns 404 so the caller
// falls back to its placeholder icon.
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url || !/^https?:\/\/(www\.)?youtube\.com\//i.test(url)) {
    return res.status(400).end();
  }

  try {
    const page = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!page.ok) return res.status(404).end();
    const html = await page.text();

    const m = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (!m) return res.status(404).end();
    const imgUrl = m[1];

    const img = await fetch(imgUrl, { signal: AbortSignal.timeout(5000) });
    if (!img.ok) return res.status(404).end();
    const buf = await img.arrayBuffer();

    res.setHeader('Content-Type', img.headers.get('content-type') || 'image/jpeg');
    // Cache aggressively — channel avatars change rarely.
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).send(Buffer.from(buf));
  } catch {
    return res.status(404).end();
  }
}
