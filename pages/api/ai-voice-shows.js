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
import { listPublishedResources } from '../../lib/resources-db';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  try {
    // Only Confirmed rows can ever be public, so filter at the source.
    const records = await listPublishedResources({
      voiceStatus: 'Confirmed',
      select: 'id, voice_type, voice_status',
    });
    const ids = records.filter(rec => isPublicAiVoice(rec.fields)).map(rec => rec.id);

    // Cache at the edge; the set changes rarely (only when Andrei confirms a flag).
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ ids });
  } catch {
    return res.status(200).json({ ids: [] });
  }
}
