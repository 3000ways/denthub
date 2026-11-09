import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

const PlayerContext = createContext({});

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const audioRef = useRef(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  // Chapters (one per paper) for Journal Briefings episodes: [{ title, start }].
  // Set from the episode object when the page has them, else fetched by episode
  // id. Null for ordinary podcasts.
  const [chapters, setChapters] = useState(null);
  const chaptersRef = useRef(null);
  const positionRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  // Playback speed (persists across episodes + reloads via localStorage)
  const [rate, setRateState] = useState(1);
  // IDs of episodes the user has completed (for "Listened" badges across the UI)
  const [completedIds, setCompletedIds] = useState(new Set());
  const completedFiredRef = useRef(false); // guard so 80% upsert fires only once per episode
  const syncTimerRef = useRef(null);

  // Initialize the Audio element once (browser only)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => setPosition(audio.currentTime));
    audio.addEventListener('durationchange', () => setDuration(isFinite(audio.duration) ? audio.duration : 0));
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', () => setIsPlaying(false));

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('seekbackward', ({ seekOffset }) => {
        audio.currentTime = Math.max(0, audio.currentTime - (seekOffset ?? 15));
      });
      navigator.mediaSession.setActionHandler('seekforward', ({ seekOffset }) => {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + (seekOffset ?? 15));
      });
    }

    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Restore the saved playback speed once (browser only)
  useEffect(() => {
    try {
      const saved = parseFloat(localStorage.getItem('player-rate'));
      // Cap at 2× — older builds allowed 2.5×, don't leave anyone stuck there.
      if (saved && saved > 0) setRateState(Math.min(saved, 2));
    } catch {}
  }, []);

  // Apply the chosen speed to the audio element. Re-runs when the speed OR the
  // episode changes, because the browser resets playbackRate to 1× on a new src.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    audio.defaultPlaybackRate = rate;
  }, [rate, currentEpisode]);

  // Load the user's completed episode IDs on sign-in
  useEffect(() => {
    if (!user) { setCompletedIds(new Set()); return; }
    supabase
      .from('listening_progress')
      .select('episode_id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .then(({ data }) => {
        setCompletedIds(new Set((data || []).map(r => r.episode_id)));
      });
  }, [user]);

  // Sync progress to Supabase every 5 seconds while playing
  useEffect(() => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    if (!isPlaying || !currentEpisode || !user) return;

    syncTimerRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const pos = Math.floor(audio.currentTime);
      const dur = Math.floor(audio.duration || currentEpisode.duration_seconds || 0);
      const pct = dur > 0 ? pos / dur : 0;
      const completed = pct >= 0.8;
      upsertProgress(currentEpisode, pos, dur, completed);
    }, 5000);

    return () => clearInterval(syncTimerRef.current);
  }, [isPlaying, currentEpisode, user]);

  // Fire the 80% completion mark as soon as threshold is crossed
  useEffect(() => {
    if (!currentEpisode || !user || completedFiredRef.current) return;
    if (duration > 0 && position / duration >= 0.8) {
      completedFiredRef.current = true;
      const pos = Math.floor(position);
      const dur = Math.floor(duration);
      upsertProgress(currentEpisode, pos, dur, true);
      setCompletedIds(prev => new Set([...prev, currentEpisode.id]));
    }
  }, [position, duration, currentEpisode, user]);

  async function upsertProgress(episode, posSeconds, durSeconds, completed) {
    if (!user) return;
    const row = {
      user_id:         user.id,
      episode_id:      episode.id,
      show_resource_id: episode.show_resource_id || null,
      position_seconds: posSeconds,
      duration_seconds: durSeconds || episode.duration_seconds || null,
      listened_at:     new Date().toISOString(),
    };
    if (completed) {
      row.completed = true;
      row.completed_at = new Date().toISOString();
    }
    await supabase
      .from('listening_progress')
      .upsert(row, { onConflict: 'user_id,episode_id' });
  }

  const play = useCallback(async (episode) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Resume if same episode is already loaded
    if (currentEpisode?.id === episode.id) {
      audio.play();
      return;
    }

    // Load new episode
    audio.src = episode.audio_url || episode.audioUrl || '';
    setCurrentEpisode(episode);
    setPosition(0);
    setDuration(0);
    completedFiredRef.current = false;

    // Chapters: from the episode object, or looked up for a briefing episode.
    const own = Array.isArray(episode.chapters) && episode.chapters.length > 1 ? episode.chapters : null;
    chaptersRef.current = own; setChapters(own);
    const isBriefing = String(episode.guid || '').startsWith('tdc:briefing:') || /\/briefings\/episodes\//.test(String(episode.audio_url || ''));
    if (!own && isBriefing && episode.id) {
      fetch(`/api/briefings/chapters?episode_id=${episode.id}`).then(r => (r.ok ? r.json() : null)).then(d => {
        if (d && Array.isArray(d.chapters) && d.chapters.length > 1 && audioRef.current && audioRef.current.src === (episode.audio_url || episode.audioUrl)) { chaptersRef.current = d.chapters; setChapters(d.chapters); }
      }).catch(() => {});
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:  episode.title   || '',
        artist: episode.show_name || episode.podcast || '',
        album:  episode.show_name || '',
        artwork: episode.image ? [{ src: episode.image, sizes: '512x512' }, { src: episode.image, sizes: '3000x3000' }] : [],
      });
    }

    // Restore saved position if the episode isn't completed yet
    if (user) {
      const { data } = await supabase
        .from('listening_progress')
        .select('position_seconds, completed')
        .eq('user_id', user.id)
        .eq('episode_id', episode.id)
        .single();
      if (data && data.position_seconds > 10 && !data.completed) {
        audio.currentTime = data.position_seconds;
      }
    }

    audio.play().catch(() => {});
  }, [currentEpisode, user]);

  // Which chapter the playhead is in (-1 when there are none).
  const chapterIndex = (() => {
    if (!chapters || !chapters.length) return -1;
    let i = 0;
    for (let k = 0; k < chapters.length; k++) if (position + 0.25 >= Number(chapters[k].start || 0)) i = k;
    return i;
  })();
  const nextChapter = useCallback(() => {
    const ch = chaptersRef.current, audio = audioRef.current;
    if (!ch || !audio) return;
    const now = audio.currentTime;
    const next = ch.find(c => Number(c.start || 0) > now + 0.5);
    if (next) audio.currentTime = Number(next.start);
    else audio.currentTime = Math.max(0, (audio.duration || now) - 0.5);
  }, []);
  const prevChapter = useCallback(() => {
    const ch = chaptersRef.current, audio = audioRef.current;
    if (!ch || !audio) return;
    const now = audio.currentTime;
    let cur = 0;
    for (let k = 0; k < ch.length; k++) if (now >= Number(ch[k].start || 0)) cur = k;
    // Early in a chapter: go to the previous one; otherwise restart this one.
    const target = now - Number(ch[cur].start || 0) < 3 && cur > 0 ? ch[cur - 1] : ch[cur];
    audio.currentTime = Number(target.start || 0);
  }, []);
  // Lock-screen / headphone next & previous track → next & previous paper.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('nexttrack', chapters && chapters.length > 1 ? () => nextChapter() : null);
      navigator.mediaSession.setActionHandler('previoustrack', chapters && chapters.length > 1 ? () => prevChapter() : null);
    } catch {}
  }, [chapters, nextChapter, prevChapter]);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const resume = useCallback(() => audioRef.current?.play().catch(() => {}), []);

  const seek = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const setRate = useCallback((r) => {
    setRateState(r);
    try { localStorage.setItem('player-rate', String(r)); } catch {}
  }, []);

  const markListened = useCallback(async (episode) => {
    if (!user) return;
    const dur = Math.floor(audioRef.current?.duration || episode.duration_seconds || 0);
    await upsertProgress(episode, dur, dur, true);
    setCompletedIds(prev => new Set([...prev, episode.id]));
  }, [user]);

  const deleteProgress = useCallback(async (episodeId) => {
    if (!user) return;
    await supabase
      .from('listening_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('episode_id', episodeId);
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.delete(episodeId);
      return next;
    });
  }, [user]);

  const percent = duration > 0 ? position / duration : 0;

  return (
    <PlayerContext.Provider value={{
      currentEpisode,
      isPlaying,
      position,
      duration,
      percent,
      rate,
      completedIds,
      chapters,
      chapterIndex,
      nextChapter,
      prevChapter,
      play,
      pause,
      resume,
      seek,
      setRate,
      markListened,
      deleteProgress,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
