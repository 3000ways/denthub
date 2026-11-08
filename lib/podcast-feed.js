// Journal Briefings — the podcast RSS feed for one show (pure: data in, XML out).
//
// What Apple Podcasts and Spotify need: RSS 2.0 with the itunes namespace, an
// owner email, a square 1400–3000 px artwork, categories, explicit flag, one
// enclosure per item with a byte length, a stable guid per item. We add the
// podcast namespace for chapters (one chapter per paper) and the feed's own
// stable guid. Everything visitor-facing in the text is escaped.

import { artworkUrl, feedUrl, showUrl, briefingUrl, chaptersUrl, showDescription } from './briefings-urls.js';
import { CONTACT_EMAIL } from './contact.js';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rfc822 = iso => new Date(iso || Date.now()).toUTCString();
const cdata = s => `<![CDATA[${String(s ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

// Show notes (plain text with line breaks) → simple HTML for podcast apps.
export function notesHtml(text) {
  const paras = String(text || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return paras.map(p => `<p>${esc(p).replace(/\n/g, '<br/>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join('');
}

/**
 * buildFeedXml({ show, row, items })
 *   show  — cluster entry (key, show, label, journals)
 *   row   — briefing_shows row (feed_guid, apple_url…) or null
 *   items — published briefings with episode description text attached as `notes`
 */
export function buildFeedXml({ show, row, items = [] }) {
  const key = show.key;
  const title = show.show;
  const desc = showDescription(show);
  const art = artworkUrl(key);
  const self = feedUrl(key);
  const link = showUrl(key);
  const lastBuild = items[0]?.published_at || new Date().toISOString();
  const item = b => {
    const url = briefingUrl(b.id);
    const dur = Math.round(Number(b.duration_seconds || 0));
    const chap = Array.isArray(b.chapters) && b.chapters.length > 1 ? chaptersUrl(b.audio_url) : null;
    const summary = b.kind === 'trailer' ? `Episode 0: what ${title} is and how it works.` : `${title}, week of ${b.week_of}.`;
    return `    <item>
      <title>${esc(b.title)}</title>
      <itunes:title>${esc(b.title)}</itunes:title>
      <link>${esc(url)}</link>
      <guid isPermaLink="false">tdc:briefing:${b.id}</guid>
      <pubDate>${rfc822(b.published_at)}</pubDate>
      <description>${cdata(notesHtml(b.notes || summary))}</description>
      <itunes:summary>${esc(summary)}</itunes:summary>
      <enclosure url="${esc(b.audio_url)}" length="${Number(b.audio_bytes || 0)}" type="audio/mpeg"/>
      <itunes:duration>${dur}</itunes:duration>
      <itunes:episodeType>${b.kind === 'trailer' ? 'trailer' : 'full'}</itunes:episodeType>
      <itunes:explicit>false</itunes:explicit>
      <itunes:image href="${esc(art)}"/>${chap ? `
      <podcast:chapters url="${esc(chap)}" type="application/json+chapters"/>` : ''}
    </item>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <copyright>© The Dental Commute. Paper abstracts and conclusions remain © their authors and publishers.</copyright>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <description>${esc(desc)}</description>
    <itunes:summary>${esc(desc)}</itunes:summary>
    <itunes:subtitle>${esc(`The week's new ${show.label.toLowerCase()} research, every Monday. AI-narrated, independent.`)}</itunes:subtitle>
    <itunes:author>The Dental Commute</itunes:author>
    <itunes:owner><itunes:name>The Dental Commute</itunes:name><itunes:email>${esc(CONTACT_EMAIL)}</itunes:email></itunes:owner>
    <itunes:image href="${esc(art)}"/>
    <image><url>${esc(art)}</url><title>${esc(title)}</title><link>${esc(link)}</link></image>
    <itunes:category text="Health &amp; Fitness"><itunes:category text="Medicine"/></itunes:category>
    <itunes:category text="Science"/>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>${row && row.feed_guid ? `
    <podcast:guid>${esc(row.feed_guid)}</podcast:guid>` : ''}
    <podcast:locked owner="${esc(CONTACT_EMAIL)}">no</podcast:locked>
    <podcast:medium>podcast</podcast:medium>
${items.map(item).join('\n')}
  </channel>
</rss>
`;
}
