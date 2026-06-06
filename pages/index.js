import { useState, useEffect } from "react";

const SCORE_SIGNALS = [
  { label: "Expert",     color: "#a78bfa", key: "Expert Score" },
  { label: "Community",  color: "#0fd4a0", key: "Community Score" },
  { label: "Popularity", color: "#3b82f6", key: "Popularity Score" },
  { label: "Recency",    color: "#fbbf24", key: "Recency Score" },
  { label: "Clinical",   color: "#f87171", key: "Clinical Depth Score" },
];

const TYPE_COLORS = {
  "Podcast":      { bg: "#0fd4a018", bdr: "#0fd4a045", txt: "#0fd4a0" },
  "Book":         { bg: "#a78bfa18", bdr: "#a78bfa45", txt: "#a78bfa" },
  "YouTube":      { bg: "#f8717118", bdr: "#f8717145", txt: "#f87171" },
  "Software":     { bg: "#3b82f618", bdr: "#3b82f645", txt: "#60a5fa" },
  "CE Website":   { bg: "#fbbf2418", bdr: "#fbbf2445", txt: "#fbbf24" },
  "Journal":      { bg: "#34d35918", bdr: "#34d35945", txt: "#34d359" },
  "Online Course":{ bg: "#f472b618", bdr: "#f472b645", txt: "#f472b6" },
  "Community":    { bg: "#fb923c18", bdr: "#fb923c45", txt: "#fb923c" },
};

function ScoreRing({ score = 0 }) {
  const r = 14, cx = 22, cy = 22;
  const circ = 2 * Math.PI * r;
  const color = score >= 90 ? "#0fd4a0" : score >= 80 ? "#3b82f6" : "#fbbf24";
  return (
    <svg width="44" height="44" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${(score / 100) * circ} ${circ}`}
        strokeDashoffset={circ / 4} strokeLinecap="round" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="9" fontWeight="700" fontFamily="DM Mono, monospace">{score}</text>
    </svg>
  );
}

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || { bg: "#ffffff10", bdr: "#ffffff25", txt: "#a8b8d8" };
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: c.bg, border: `1px solid ${c.bdr}`, color: c.txt,
      textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {type}
    </span>
  );
}

function ResourceCard({ rec, rank }) {
  const f = rec.fields;
  const score = f["Final Score"] || 0;
  const rankColor = rank === 1 ? "#fbbf24" : rank === 2 ? "#a8b8d8" : rank === 3 ? "#cd7f32" : "#1e2d45";
  const isNew = f["Date Added"] && (Date.now() - new Date(f["Date Added"])) < 30 * 86400000;

  return (
    <a href={f.URL || "#"} target="_blank" rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block", background: "#161f30",
        border: `1px solid ${rank <= 3 ? rankColor : "#1e2d45"}`,
        borderRadius: 14, padding: "16px 18px", position: "relative",
        overflow: "hidden", transition: "border-color 0.2s, transform 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#0fd4a0"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = rank <= 3 ? rankColor : "#1e2d45"; e.currentTarget.style.transform = "translateY(0)"; }}>
      {rank <= 3 && (
        <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%",
          background: rankColor, borderRadius: "14px 0 0 14px" }} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: rankColor, fontFamily: "DM Mono, monospace" }}>#{rank}</span>
          <ScoreRing score={score} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#f0f4ff" }}>{f.Name}</span>
            {isNew && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                background: "#0fd4a020", border: "1px solid #0fd4a050", color: "#0fd4a0",
                textTransform: "uppercase", letterSpacing: "0.08em" }}>New</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#6b7fa3", marginBottom: 8, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {f.Description}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <TypeBadge type={f.Type} />
            {f["Host or Author"] && (
              <span style={{ fontSize: 10, color: "#6b7fa3" }}>by {f["Host or Author"]}</span>
            )}
            {(f["Vote Count"] || 0) > 0 && (
              <span style={{ fontSize: 10, color: "#6b7fa3" }}>
                <span style={{ color: "#fbbf24" }}>★</span> {(f["Vote Count"]).toLocaleString()} votes
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SCORE_SIGNALS.map(s => (f[s.key] > 0) && (
          <div key={s.label} style={{ flex: 1, minWidth: 50 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 8, color: "#6b7fa3", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
              <span style={{ fontSize: 8, color: s.color, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{f[s.key]}</span>
            </div>
            <div style={{ height: 2, background: "#1e2d45", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${f[s.key]}%`, background: s.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </a>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11,
      fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Outfit, sans-serif",
      border: `1px solid ${active ? "#0fd4a0" : "#1e2d45"}`,
      background: active ? "#0fd4a015" : "transparent",
      color: active ? "#0fd4a0" : "#6b7fa3", transition: "all 0.15s" }}>
      {label}
    </button>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "#161f30", border: "1px solid #1e2d45", borderRadius: 12,
      padding: "12px 18px", minWidth: 100, flex: 1 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#6b7fa3", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
    </div>
  );
}

export default function DentHub() {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState("All");
  const [activeCatTheme, setActiveCatTheme] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [rRes, cRes] = await Promise.all([
          fetch("/api/airtable?table=Resources"),
          fetch("/api/airtable?table=Categories"),
        ]);
        const rData = await rRes.json();
        const cData = await cRes.json();
        if (rData.error) throw new Error(rData.error);
        setResources(rData.records || []);
        setCategories(cData.records || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const types = ["All", ...new Set(resources.map(r => r.fields.Type).filter(Boolean))];
  const catThemes = ["All", ...new Set(categories.map(c => c.fields.Theme).filter(Boolean))];

  const filtered = resources.filter(r => {
    const f = r.fields;
    return (activeType === "All" || f.Type === activeType) &&
      (!search || [f.Name, f.Description, f["Host or Author"]]
        .some(v => v?.toLowerCase().includes(search.toLowerCase())));
  });

  const totalVotes = resources.reduce((s, r) => s + (r.fields["Vote Count"] || 0), 0);
  const avgScore = resources.length
    ? Math.round(resources.reduce((s, r) => s + (r.fields["Final Score"] || 0), 0) / resources.length)
    : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0a0f1a; color: #f0f4ff; font-family: 'Outfit', sans-serif; }
        ::placeholder { color: #6b7fa3; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 3px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        a { text-decoration: none; }
      `}</style>

      <div style={{ background: "#0a0f1a", minHeight: "100vh" }}>

        {/* Nav */}
        <nav style={{ borderBottom: "1px solid #1e2d45", background: "#111827", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "14px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0fd4a020",
                border: "1px solid #0fd4a050", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16 }}>⚕</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>DentHub</div>
                <div style={{ fontSize: 9, color: "#6b7fa3", textTransform: "uppercase", letterSpacing: "0.1em" }}>Curated by an Endodontist</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["Discover", "Software", "Specialties", "Residencies", "Community"].map(n => (
                <button key={n} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12,
                  background: "transparent", border: "none", color: "#6b7fa3", cursor: "pointer",
                  fontFamily: "Outfit, sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#f0f4ff"}
                  onMouseLeave={e => e.currentTarget.style.color = "#6b7fa3"}>{n}</button>
              ))}
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px" }}>

          {/* Hero */}
          <div className="fade-up" style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 10, color: "#0fd4a0", textTransform: "uppercase",
              letterSpacing: "0.15em", fontWeight: 600, marginBottom: 10 }}>
              The definitive dental resource directory
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 400, fontFamily: "'DM Serif Display', serif",
              lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 14 }}>
              Every dentistry resource,<br />
              <span style={{ color: "#0fd4a0", fontStyle: "italic" }}>ranked by clinicians.</span>
            </h1>
            <p style={{ fontSize: 15, color: "#a8b8d8", maxWidth: 520, lineHeight: 1.7, marginBottom: 24 }}>
              Podcasts, books, software, CE programs, residencies and more — scored by a
              weighted formula combining expert assessment, community votes, and clinical relevance.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#161f30",
              border: "1px solid #1e2d45", borderRadius: 12, padding: "10px 16px", maxWidth: 480 }}>
              <span style={{ color: "#6b7fa3", fontSize: 16 }}>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search resources, hosts, software..."
                style={{ border: "none", background: "transparent", color: "#f0f4ff",
                  fontSize: 14, outline: "none", flex: 1, fontFamily: "Outfit, sans-serif" }} />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ background: "none", border: "none", color: "#6b7fa3",
                    cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7fa3",
              fontSize: 13, marginBottom: 24 }}>
              <div style={{ width: 16, height: 16, border: "2px solid #0fd4a0",
                borderTopColor: "transparent", borderRadius: "50%",
                animation: "spin 0.8s linear infinite" }} />
              Loading your DentHub...
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "#f8717115", border: "1px solid #f8717140",
              borderRadius: 12, padding: "18px 22px", color: "#f87171",
              fontSize: 13, marginBottom: 24 }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Stats */}
          {!loading && !error && (
            <div className="fade-up" style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              <StatCard label="Resources ranked" value={resources.length} color="#0fd4a0" />
              <StatCard label="Categories" value={categories.length} color="#a78bfa" />
              <StatCard label="Total votes" value={totalVotes.toLocaleString()} color="#fbbf24" />
              <StatCard label="Avg score" value={avgScore} color="#3b82f6" />
            </div>
          )}

          {/* Type filter pills */}
          {!loading && !error && (
            <div style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
              {types.map(t => (
                <Pill key={t} label={t} active={activeType === t} onClick={() => setActiveType(t)} />
              ))}
            </div>
          )}

          {/* Resource cards */}
          {!loading && !error && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 12, marginBottom: 48 }}>
              {filtered.length === 0
                ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0",
                    color: "#6b7fa3", fontSize: 14 }}>No resources match your search.</div>
                : filtered.map((rec, i) => (
                    <div key={rec.id} className="fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                      <ResourceCard rec={rec} rank={i + 1} />
                    </div>
                  ))
              }
            </div>
          )}

          {/* Categories */}
          {!loading && !error && categories.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ fontSize: 24, fontWeight: 400, fontFamily: "'DM Serif Display', serif" }}>
                  Browse by category
                </h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {catThemes.slice(0, 6).map(t => (
                    <Pill key={t} label={t.split(" & ")[0]} active={activeCatTheme === t}
                      onClick={() => setActiveCatTheme(t)} />
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 8 }}>
                {categories
                  .filter(c => activeCatTheme === "All" || c.fields.Theme === activeCatTheme)
                  .map(cat => (
                    <div key={cat.id} style={{ background: "#161f30", border: "1px solid #1e2d45",
                      borderRadius: 12, padding: "13px 15px", cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#0fd4a0"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2d45"}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff", marginBottom: 4 }}>
                        {cat.fields["Category Name"]}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7fa3", lineHeight: 1.4,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {cat.fields.Description}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 9, color: "#0fd4a0", textTransform: "uppercase",
                        letterSpacing: "0.07em", fontWeight: 600 }}>
                        {(cat.fields.Theme || "").split(" & ")[0]}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid #1e2d45",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "'DM Serif Display', serif" }}>DentHub</span>
              <span style={{ fontSize: 11, color: "#6b7fa3" }}>Curated by an endodontist · Updated weekly by AI</span>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              {["Suggest a resource", "About rankings", "Newsletter"].map(l => (
                <span key={l} style={{ fontSize: 12, color: "#6b7fa3", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#f0f4ff"}
                  onMouseLeave={e => e.currentTarget.style.color = "#6b7fa3"}>{l}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
