import { useState, useEffect, useRef } from 'react';
import { EpisodeCard } from './EpisodeCard';
import { EPISODE_SEARCH_THRESHOLD } from '../lib/resource-episodes';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// "All Episodes" — browse and search a show's entire back-catalog.
//
// The first page is server-rendered (passed in as initialEpisodes/initialTotal)
// so episode titles are indexable and the section paints instantly. Everything
// after that — Load More, the Newest/Oldest toggle, and in-show search — is
// fetched client-side from /api/resource-episodes.
export function AllEpisodes({ showResourceId, showName, initialEpisodes = [], initialTotal = 0, featuredEpisodes = [], onSignInRequired }) {
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [total, setTotal] = useState(initialTotal);
  const [sort, setSort] = useState('newest');       // 'newest' | 'oldest'
  const [input, setInput] = useState('');            // raw text in the box
  const [term, setTerm] = useState('');              // debounced, active query
  const [offset, setOffset] = useState(initialEpisodes.length);
  const [hasMore, setHasMore] = useState(initialEpisodes.length < initialTotal);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isSearching = term.trim().length >= 2;
  const showSearchBox = initialTotal >= EPISODE_SEARCH_THRESHOLD;

  // Creator-featured episodes (owner picks). Set of ids for badging inline, plus
  // the full objects for pinning to the top of the browse view. When browsing
  // (not searching), featured episodes are shown first — badged — and filtered
  // out of the main list below so they don't appear twice. When searching, we
  // don't pin, but any matching row still gets the ★ badge.
  const featuredIds = new Set((featuredEpisodes || []).map(e => e.id));
  const pinFeatured = !isSearching && featuredEpisodes.length > 0;

  // Refresh-on-view: pull this show's newest episodes into the archive on load
  // (throttled server-side), then quietly reload page 1 if the count grew. Runs
  // once on mount; the SSR list shows instantly in the meantime.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/refresh-show?id=${encodeURIComponent(showResourceId)}`, { method: 'POST' })
      .then(r => r.json())
      .then(result => {
        if (cancelled || !result || result.error || result.skipped) return;
        if (typeof result.total !== 'number' || result.total === total) return;
        return fetch(`/api/resource-episodes?${new URLSearchParams({ id: showResourceId, sort: 'newest', offset: '0', count: '1' })}`)
          .then(r => r.json())
          .then(data => {
            if (cancelled || data.error) return;
            setEpisodes(data.episodes || []);
            setTotal(data.total ?? 0);
            setOffset(data.nextOffset ?? (data.episodes || []).length);
            setHasMore(!!data.nextOffset);
          });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce the search box: wait 300ms after typing stops before querying.
  useEffect(() => {
    const t = setTimeout(() => setTerm(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  // Re-fetch from the top whenever the sort order or the active query changes.
  // Skip the very first render so we keep the server-rendered initial list.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ id: showResourceId, sort, offset: '0', count: '1' });
    if (isSearching) params.set('q', term.trim());
    fetch(`/api/resource-episodes?${params}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || data.error) return;
        setEpisodes(data.episodes || []);
        setTotal(data.total ?? 0);
        setOffset(data.nextOffset ?? (data.episodes || []).length);
        setHasMore(!!data.nextOffset);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sort, term]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const params = new URLSearchParams({ id: showResourceId, sort, offset: String(offset) });
    if (isSearching) params.set('q', term.trim());
    fetch(`/api/resource-episodes?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        setEpisodes(prev => [...prev, ...(data.episodes || [])]);
        setOffset(data.nextOffset ?? (offset + (data.episodes || []).length));
        setHasMore(!!data.nextOffset);
      })
      .finally(() => setLoading(false));
  }

  const cardStyle = { background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: isMobile ? '18px 14px' : '28px 32px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 24 };
  const countLabel = isSearching
    ? `${total} ${total === 1 ? 'result' : 'results'}`
    : `${total} ${total === 1 ? 'episode' : 'episodes'}`;

  return (
    <div style={cardStyle}>
      {/* Header: title + count + sort toggle */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>All Episodes</div>
          <div style={{ fontSize: 12, color: '#bbb', fontFamily: FONT }}>{countLabel}</div>
        </div>
        {!isSearching && total > 1 && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[['newest', 'Newest'], ['oldest', 'Oldest']].map(([val, lbl]) => (
              <button key={val} onClick={() => setSort(val)}
                style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${sort === val ? GREEN : BORDER}`,
                  background: sort === val ? GREEN : '#fff',
                  color: sort === val ? '#fff' : '#666' }}>
                {lbl}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* In-show search — only on larger catalogs */}
      {showSearchBox && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Search ${showName || 'this show'}'s episodes…`}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, fontFamily: FONT,
              padding: '9px 32px 9px 12px', borderRadius: 8, border: `1px solid ${BORDER}`,
              outline: 'none', background: '#fff', color: '#111' }}
            onFocus={e => e.currentTarget.style.borderColor = GREEN}
            onBlur={e => e.currentTarget.style.borderColor = BORDER}
          />
          {input && (
            <button onClick={() => { setInput(''); setTerm(''); }} aria-label="Clear search"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 15, lineHeight: 1, padding: 4 }}>
              ×
            </button>
          )}
        </div>
      )}

      {/* Episode list. When browsing, the creator's featured picks are pinned on
          top (badged) and removed from the main list below to avoid duplicates. */}
      {(() => {
        const mainList = pinFeatured ? episodes.filter(ep => !featuredIds.has(ep.id)) : episodes;
        const isEmpty = mainList.length === 0 && !(pinFeatured && featuredEpisodes.length > 0);
        if (isEmpty) {
          return (
            <div style={{ fontSize: 13, color: '#999', fontFamily: FONT, padding: '8px 0' }}>
              {isSearching
                ? <>No episodes match “{term.trim()}”.</>
                : 'Episode archive coming soon for this show.'}
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pinFeatured && featuredEpisodes.map(ep => (
              <EpisodeCard key={`feat-${ep.id}`} ep={ep} isFeatured isNew={false} onSignInRequired={onSignInRequired} />
            ))}
            {mainList.map((ep, i) => {
              // Divider where the list crosses from dated into undated episodes
              // (they always sort to the bottom). Only in browse mode.
              const showUndatedDivider = !isSearching && ep.date == null && i > 0 && mainList[i - 1].date != null;
              return (
                <div key={ep.id ?? i}>
                  {showUndatedDivider && (
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ccc', margin: '10px 0 8px' }}>
                      Undated episodes
                    </div>
                  )}
                  <EpisodeCard ep={ep} isFeatured={featuredIds.has(ep.id)} isNew={false} onSignInRequired={onSignInRequired} />
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Load More */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={loadMore} disabled={loading}
            style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: loading ? 'default' : 'pointer',
              padding: '9px 22px', borderRadius: 8, border: `1px solid ${BORDER}`,
              background: '#fff', color: loading ? '#bbb' : GREEN }}>
            {loading ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
