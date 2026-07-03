// Shared constants + helpers for the onboarding quiz and the homepage
// "Recommended for you" personalization.
//
// The quiz's answer options are NOT hardcoded here — they live in the
// `quiz_options` table (admin-editable) so the same taxonomy drives (a) what
// the quiz asks, (b) what the AI tagger (lib/episode-tagger.js) tags episodes
// with, and (c) an admin screen to add/retire options without a code deploy.
//
// Matching is per-EPISODE, not per-resource: each episode carries a
// `quiz_tags` array (set by the AI tagger); recommendEpisodes() finds episodes
// whose tags overlap with a person's answers and ranks by how many they share.

import { supabase } from './supabase';

export const QUESTION_KEYS = {
  CAREER_STAGE: 'career_stage',
  INTEREST: 'interest',
  WORKING_ON: 'working_on',
};

// Q1 (career_stage) is single-select — no cap needed.
export const MAX_PICKS = {
  [QUESTION_KEYS.INTEREST]: 4,
  [QUESTION_KEYS.WORKING_ON]: 3,
};

// Active answer options for all three question groups, grouped by question_key.
// Used by the quiz modal and the profile page's editable pills.
export async function fetchQuizOptions() {
  const { data, error } = await supabase
    .from('quiz_options')
    .select('question_key, label')
    .eq('active', true)
    .order('sort_order');
  if (error || !data) return { [QUESTION_KEYS.CAREER_STAGE]: [], [QUESTION_KEYS.INTEREST]: [], [QUESTION_KEYS.WORKING_ON]: [] };
  const grouped = { [QUESTION_KEYS.CAREER_STAGE]: [], [QUESTION_KEYS.INTEREST]: [], [QUESTION_KEYS.WORKING_ON]: [] };
  data.forEach(o => { grouped[o.question_key]?.push(o.label); });
  return grouped;
}

// All of a profile's quiz answers, flattened into one array of tags to match
// against episodes.quiz_tags — career stage + interests + "working on" are
// blended with equal weight (no tag is a hard requirement).
function profileAnswers(profile) {
  return [
    profile?.career_stage,
    ...(profile?.interests || []),
    ...(profile?.focus_areas || []), // "working_on" picks are stored on the pre-existing focus_areas column
  ].filter(Boolean);
}

// Episodes whose quiz_tags overlap a profile's answers, ranked by how many
// tags they share (ties broken by recency). Returns [] for signed-out users,
// profiles with no quiz answers yet, or while the AI tagging backfill hasn't
// reached these episodes (untagged episodes simply can't match — no fallback).
export async function recommendEpisodes(profile, limit = 6) {
  const answers = profileAnswers(profile);
  if (!answers.length) return [];

  const { data, error } = await supabase
    .from('episodes')
    .select('id, title, description, show_name, show_resource_id, image, audio_url, guid, published_at, quiz_tags')
    .overlaps('quiz_tags', answers)
    .order('published_at', { ascending: false })
    .limit(200); // candidate pool; final ranking + slice happens below
  if (error || !data) return [];

  return data
    .map(ep => ({ ep, hits: (ep.quiz_tags || []).filter(t => answers.includes(t)).length }))
    .sort((a, b) => b.hits - a.hits || new Date(b.ep.published_at || 0) - new Date(a.ep.published_at || 0))
    .slice(0, limit)
    .map(x => x.ep);
}
