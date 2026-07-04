// Returns the Airtable record ids of every resource that is publicly an AI voice
// — i.e. Voice Type = AI-generated/Mixed AND Voice Status = Confirmed (see
// lib/voice.js). This is the source of truth for the listener-facing "hide
// AI-narrated podcasts" filter: the client fetches this list once (only when the
// preference is on) and drops any episode/card whose show id is in it.
//
// Public + read-only + tiny, so it's edge-cacheable. "Suspected" shows are never
// included — the false-positive firewall means only human-confirmed flags reach
// visitors.

import { isPublicAiVoice } from '../../lib/voice';

const BASE_ID  = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }
  if (!process.env.AIRTABLE_PAT) return res.status(200).json({ ids: [] });

  try {
    let records = [];
    let offset;
    do {
      const params = new URLSearchParams({
        pageSize: '100',
        // Only Confirmed rows can ever be public, so filter at the source.
        filterByFormula: `{Voice Status}='Confirmed'`,
      });
      params.append('fields[]', 'Voice Type');
      params.append('fields[]', 'Voice Status');
      if (offset) params.set('offset', offset);
      const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` },
      });
      if (!r.ok) return res.status(200).json({ ids: [] }); // fail open — never blocks the feed
      const data = await r.json();
      records = records.concat(data.records || []);
      offset = data.offset;
    } while (offset);

    const ids = records.filter(rec => isPublicAiVoice(rec.fields)).map(rec => rec.id);

    // Cache at the edge; the set changes rarely (only when Andrei confirms a flag).
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ ids });
  } catch {
    return res.status(200).json({ ids: [] });
  }
}
