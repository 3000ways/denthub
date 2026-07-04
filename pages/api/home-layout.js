// Returns the PUBLISHED home layout per audience: an ordered array of enabled
// blocks as { key, settings }, e.g.
//   { logged_out: [{ key:'whats_new', settings:{ heading:'…' } }, …], logged_in: [...] }.
// The home page falls back to the code default when a layout is absent, so this
// returning {} (e.g. before the home_layout table is created) is harmless.

import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase.from('home_layout').select('audience, published');
    if (error || !data) return res.status(200).json({});
    const out = {};
    data.forEach(row => {
      const blocks = row.published && row.published.blocks;
      if (Array.isArray(blocks)) {
        out[row.audience] = blocks
          .filter(b => b && b.on)
          .map(b => ({ key: b.key, settings: b.settings || {} }));
      }
    });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(out);
  } catch (err) {
    return res.status(200).json({}); // fail soft — home uses its default layout
  }
}
