// PubMed E-utilities client for Journal Briefings (server-only).
//
// Two calls: esearch (which PMIDs are new for a journal since a date) and
// efetch (the records themselves, as XML). PubMed XML is parsed with targeted
// regexes, the same approach the podcast harvester takes with RSS, so there is
// no XML dependency. Set NCBI_API_KEY in Vercel to lift the rate limit from 3
// to 10 requests per second; without it the harvester simply paces itself.

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL = 'thedentalcommute';

function params(extra) {
  const p = new URLSearchParams({ db: 'pubmed', tool: TOOL, ...extra });
  if (process.env.NCBI_API_KEY) p.set('api_key', process.env.NCBI_API_KEY);
  if (process.env.UNPAYWALL_EMAIL) p.set('email', process.env.UNPAYWALL_EMAIL);
  return p;
}

async function getText(url, { retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (res.status === 429 && attempt < retries) { await new Promise(r => setTimeout(r, 1200 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`PubMed HTTP ${res.status}`);
    return res.text();
  }
}

export function fmtDate(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getUTCFullYear()}/${String(x.getUTCMonth() + 1).padStart(2, '0')}/${String(x.getUTCDate()).padStart(2, '0')}`;
}

// PMIDs added to PubMed (Entrez date) for a journal between two dates.
export async function searchJournal({ pubmedAbbr, from, to = new Date(), filter = '', retmax = 200 }) {
  const term = [`"${pubmedAbbr}"[ta]`, `("${fmtDate(from)}"[edat] : "${fmtDate(to)}"[edat])`, filter ? `AND (${filter})` : '']
    .filter(Boolean).join(' AND ').replace(' AND AND ', ' AND ');
  const url = `${BASE}/esearch.fcgi?${params({ term, retmax: String(retmax), retmode: 'json', sort: 'pub date' })}`;
  const json = JSON.parse(await getText(url));
  const r = json.esearchresult || {};
  return { ids: r.idlist || [], count: Number(r.count || 0), term };
}

// ── XML helpers ──────────────────────────────────────────────────────────────
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? m[1] : null;
}
function tags(xml, name) {
  const out = []; const re = new RegExp(`<${name}(\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'gi'); let m;
  while ((m = re.exec(xml))) out.push({ attrs: m[1] || '', inner: m[2] });
  return out;
}
function attr(attrs, name) { const m = (attrs || '').match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; }
function text(xml) {
  return String(xml || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ').trim();
}
function isoFromParts(y, m, d) {
  if (!y) return null;
  const mm = m ? (isNaN(Number(m)) ? ({ jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }[String(m).slice(0, 3).toLowerCase()] || 1) : Number(m)) : 1;
  const dd = d ? Number(d) : 1;
  const dt = new Date(Date.UTC(Number(y), mm - 1, dd));
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

// Full records for a list of PMIDs → normalized article objects.
export async function fetchArticles(pmids) {
  if (!pmids || !pmids.length) return [];
  const url = `${BASE}/efetch.fcgi?${params({ id: pmids.join(','), retmode: 'xml' })}`;
  const xml = await getText(url);
  return tags(xml, 'PubmedArticle').map(a => parseArticle(a.inner)).filter(Boolean);
}

export function parseArticle(xml) {
  const pmid = text(tag(xml, 'PMID'));
  if (!pmid) return null;
  const art = tag(xml, 'Article') || '';
  const title = text(tag(art, 'ArticleTitle')).replace(/\.$/, '');
  const abstract = tags(tag(art, 'Abstract') || '', 'AbstractText').map(t => ({
    label: (attr(t.attrs, 'Label') || '').trim() || null,
    text: text(t.inner),
  })).filter(s => s.text);
  const authors = tags(tag(art, 'AuthorList') || '', 'Author').map(a => {
    const last = text(tag(a.inner, 'LastName')), fore = text(tag(a.inner, 'ForeName')), coll = text(tag(a.inner, 'CollectiveName'));
    return coll || [fore, last].filter(Boolean).join(' ');
  }).filter(Boolean);
  const journalXml = tag(art, 'Journal') || '';
  const journalAbbr = text(tag(journalXml, 'ISOAbbreviation')) || text(tag(xml, 'MedlineTA'));
  const journalName = text(tag(journalXml, 'Title'));
  const pubTypes = tags(tag(art, 'PublicationTypeList') || '', 'PublicationType').map(t => text(t.inner)).filter(Boolean);
  const ids = {};
  for (const t of tags(tag(xml, 'ArticleIdList') || '', 'ArticleId')) { const k = attr(t.attrs, 'IdType'); if (k) ids[k] = text(t.inner); }
  // Dates: when PubMed received it (entrez), and the article's own date.
  let receivedAt = null;
  for (const t of tags(tag(xml, 'History') || '', 'PubMedPubDate')) {
    if (attr(t.attrs, 'PubStatus') === 'entrez') receivedAt = isoFromParts(text(tag(t.inner, 'Year')), text(tag(t.inner, 'Month')), text(tag(t.inner, 'Day')));
  }
  const ad = tag(art, 'ArticleDate');
  const pd = tag(journalXml, 'PubDate');
  const publishedAt = ad ? isoFromParts(text(tag(ad, 'Year')), text(tag(ad, 'Month')), text(tag(ad, 'Day')))
    : pd ? isoFromParts(text(tag(pd, 'Year')), text(tag(pd, 'Month')), text(tag(pd, 'Day'))) : null;
  const doi = ids.doi || null;
  return {
    pmid, doi, pmc: ids.pmc || null,
    title, abstract, authors, journal_abbr: journalAbbr, journal_name: journalName,
    pub_types: pubTypes,
    received_at: receivedAt || publishedAt, published_at: publishedAt,
    url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  };
}
