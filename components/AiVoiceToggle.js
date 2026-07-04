import { useHideAiVoices } from '../lib/use-ai-voice-pref';

const FONT = "'Inter', system-ui, -apple-system, sans-serif";
const GREEN = '#0F6E56';

// A small "Hide AI-narrated podcasts" switch. Reads/writes the shared
// localStorage preference (lib/use-ai-voice-pref), so flipping it here updates
// every feed on the page live. Only confirmed AI-voice shows are ever affected.
export function AiVoiceToggle({ isMobile = false }) {
  const [hide, setHide] = useHideAiVoices();

  return (
    <button
      type="button"
      onClick={() => setHide(!hide)}
      role="switch"
      aria-checked={hide}
      title="Hide podcasts our team has confirmed use an AI-generated voice"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer',
        fontFamily: FONT, fontSize: isMobile ? 12.5 : 13, color: '#555', fontWeight: 500,
        background: hide ? '#f0f7f4' : '#fff', border: `1px solid ${hide ? GREEN : '#e8e8e8'}`,
        borderRadius: 20, padding: '7px 14px',
      }}
    >
      <span aria-hidden style={{
        position: 'relative', width: 32, height: 18, borderRadius: 20, flexShrink: 0,
        background: hide ? GREEN : '#d1d5db', transition: 'background 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: hide ? 16 : 2, width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }} />
      </span>
      🤖 Hide AI-narrated podcasts
    </button>
  );
}
