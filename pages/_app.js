import Head from 'next/head';
import Script from 'next/script';
import { AuthProvider } from '../lib/auth-context';
import { BookmarkProvider } from '../lib/bookmarks-context';
import { EpisodeBookmarkProvider } from '../lib/episode-bookmarks-context';
import { VotesProvider } from '../lib/votes-context';
import { PlayerProvider, usePlayer } from '../lib/player-context';
import PlayerBar from '../components/PlayerBar';

// Google Analytics 4 Measurement ID. Public by design (it ships in the page),
// so a hardcoded fallback is fine; can be overridden via a Vercel env var.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-NHEQGSKG9D';

// Inner shell: reads PlayerContext to add bottom padding when the bar is visible
function AppShell({ Component, pageProps }) {
  const { currentEpisode } = usePlayer();
  return (
    <>
      <div style={{ paddingBottom: currentEpisode ? 80 : 0 }}>
        <Component {...pageProps} />
      </div>
      <PlayerBar />
    </>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
    <BookmarkProvider>
    <EpisodeBookmarkProvider>
    <VotesProvider>
    <PlayerProvider>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; }
          ::-webkit-scrollbar { display: none; }
        `}</style>
      </Head>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}
      <AppShell Component={Component} pageProps={pageProps} />
    </PlayerProvider>
    </VotesProvider>
    </EpisodeBookmarkProvider>
    </BookmarkProvider>
    </AuthProvider>
  );
}
