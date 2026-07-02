// Admin CRUD for the quiz's answer options (quiz_options table). This is the
// one source of truth for what the two-question onboarding quiz asks, what the
// profile page's editable pills show, and what the AI episode tagger tags
// against — so adding/editing/retiring an option here needs no code deploy.
//
// GET returns every option (including inactive ones, for the admin editor);
// the quiz/profile pages instead query Supabase directly with the anon key
// (public-read RLS policy) filtered to active=true.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

const VALID_KEYS = ['career_stage', 'interest', 'working_on'];

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const db = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await db.from('quiz_options').select('*').order('question_key').order('sort_order');
      if (error) throw new Error(error.message);
      return res.status(200).json({ options: data || [] });
    }

    if (req.method === 'POST') {
      const { question_key, label } = req.body || {};
      if (!VALID_KEYS.includes(question_key) || !label?.trim()) {
        return res.status(400).json({ error: 'question_key and label are required' });
      }
      const { data: existing } = await db.from('quiz_options').select('sort_order').eq('question_key', question_key).order('sort_order', { ascending: false }).limit(1);
      const nextOrder = (existing && existing[0] ? existing[0].sort_order : -1) + 1;
      const { data, error } = await db.from('quiz_options')
        .insert({ question_key, label: label.trim(), sort_order: nextOrder })
        .select().single();
      if (error) throw new Error(error.message);
      return res.status(200).json({ option: data });
    }

    if (req.method === 'PATCH') {
      const { id, active, label, sort_order } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const fields = { updated_at: new Date().toISOString() };
      if (active !== undefined) fields.active = active;
      if (label !== undefined) fields.label = label.trim();
      if (sort_order !== undefined) fields.sort_order = sort_order;
      const { data, error } = await db.from('quiz_options').update(fields).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return res.status(200).json({ option: data });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}
