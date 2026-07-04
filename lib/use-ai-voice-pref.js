// Client-side "hide AI-narrated podcasts" preference + the show-id set it filters
// against. Stored in localStorage so it works for signed-out visitors and
// persists across visits (it upgrades to a per-account setting for free once we
// want it — same pattern as the onboarding quiz). A custom event keeps every
// mounted list in sync when the toggle flips anywhere on the page.

import { useState, useEffect, useCallback } from 'react';

const KEY = 'tdc_hide_ai_voices';
const EVT = 'tdc-ai-voice-pref';

export function getHideAiVoices() {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; }
}

// [hide, setHide] — reads the stored preference, stays in sync with other
// toggles (custom event) and other tabs (storage event).
export function useHideAiVoices() {
  const [hide, setHideState] = useState(false);

  useEffect(() => {
    setHideState(getHideAiVoices());
    const sync = () => setHideState(getHideAiVoices());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, []);

  const setHide = useCallback((next) => {
    const v = typeof next === 'function' ? next(getHideAiVoices()) : next;
    try { window.localStorage.setItem(KEY, v ? '1' : '0'); } catch {}
    window.dispatchEvent(new Event(EVT));  // sync same-tab listeners
    setHideState(v);
  }, []);

  return [hide, setHide];
}

// The full exclusion helper for a feed/list. Returns the preference, its setter,
// and `isHiddenShow(resourceId)` — true only when the pref is on AND that show is
// a confirmed AI voice. The show-id set is fetched lazily (only when the pref is
// on) so it costs nothing for the vast majority of visitors who leave it off.
export function useAiVoiceExclusion() {
  const [hide, setHide] = useHideAiVoices();
  const [ids, setIds] = useState(null); // Set<resourceId> | null (not loaded)

  useEffect(() => {
    if (!hide) return;            // only pay for the fetch when the filter is on
    if (ids) return;              // already loaded this session
    let active = true;
    fetch('/api/ai-voice-shows')
      .then(r => r.json())
      .then(d => { if (active) setIds(new Set(d.ids || [])); })
      .catch(() => { if (active) setIds(new Set()); });
    return () => { active = false; };
  }, [hide, ids]);

  const isHiddenShow = useCallback(
    (resourceId) => hide && !!ids && !!resourceId && ids.has(resourceId),
    [hide, ids],
  );

  return { hide, setHide, isHiddenShow, loaded: !hide || !!ids };
}
