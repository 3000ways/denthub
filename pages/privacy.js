import Head from 'next/head';
import Link from 'next/link';
import Footer from '../components/Footer';
import SiteNav from '../components/SiteNav';
import { CONTACT_EMAIL } from '../lib/contact';

const GREEN = '#0F6E56';
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";

const textStyle = { fontSize: 15, lineHeight: 1.7, color: '#444' };

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

function P({ children }) {
  return <p style={{ ...textStyle, margin: '0 0 12px' }}>{children}</p>;
}

function List({ children }) {
  return <ul style={{ ...textStyle, paddingLeft: 22, margin: '0 0 12px' }}>{children}</ul>;
}

export default function PrivacyPolicy() {
  return (
    <>
    <Head>
      <title>Privacy Policy — The Dental Commute</title>
      <meta name="robots" content="noindex" />
    </Head>
    <div style={{ background: '#f5f2eb', backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize: '22px 22px', minHeight: '100vh', fontFamily: FONT_BODY }}>
      <SiteNav />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 28px 100px', color: '#111' }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 13, color: GREEN, textDecoration: 'none' }}>← The Dental Commute</Link>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 48 }}>Last updated: November 8, 2026</p>

        <Section title="Overview">
          <P>
            The Dental Commute ("we," "us," or "our") is a directory of learning resources for dental professionals.
            This policy explains what information we collect, how we use it, who helps us handle it, and the choices you have.
            We do not sell your personal information.
          </P>
        </Section>

        <Section title="Information You Give Us">
          <P>When you sign in with Google, we receive your name, email address, and Google profile picture.</P>
          <P>In your profile or the welcome questions, you can choose to add:</P>
          <List>
            <li>Your role and specialty</li>
            <li>Your province or state</li>
            <li>Your career stage, clinical interests, and what you are working on</li>
            <li>Your NPI number, if you want a verified badge</li>
          </List>
          <P>If you claim a listing as its owner, we also keep your claim and the details and edits you submit for that listing.</P>
        </Section>

        <Section title="Information Created As You Use the Site">
          <P>When you are signed in, we keep:</P>
          <List>
            <li>Votes, comments, and comment upvotes</li>
            <li>Saved and followed resources, saved episodes, and pins</li>
            <li>Your listening history: which episodes you played, how far you got, and when you finished them, which also powers your CE activity log</li>
          </List>
          <P>
            Anyone, signed in or not, can suggest a resource, report a problem, or vote on whether a show uses an AI voice.
            To limit abuse, we store a scrambled (salted and hashed) version of your IP address with reports and AI-voice votes, not the address itself.
          </P>
        </Section>

        <Section title="What Other People Can See">
          <List>
            <li>Comments show your name, your role or specialty, your province or state, and your verified badge if you have one.</li>
            <li>Pins on the Community Pinboard are public and show your specialty and province or state (for example, "Pinned by a periodontist in Ohio"), but not your name. In a small specialty or region, that description could still point to you.</li>
          </List>
          <P>Your saved items and listening history are private to your account.</P>
        </Section>

        <Section title="How We Use Your Information">
          <List>
            <li>To sign you in and run your account</li>
            <li>To show your comments, pins, and verified badge</li>
            <li>To personalize recommendations and remember your listening progress</li>
            <li>To calculate Community scores from votes, comments, bookmarks, and pins</li>
            <li>To understand how the site is used and to improve it</li>
            <li>To prevent spam and abuse</li>
            <li>To contact you about a listing you have claimed</li>
          </List>
        </Section>

        <Section title="Cookies, Analytics, and Browser Storage">
          <P>
            We use Google Analytics, which sets cookies to measure visits. It records things like the pages you view, your device and browser,
            your approximate location, and actions on the site, such as what you type into search, the specialty you pick, and the episode length you filter by.
            We do not send Google your name or email through Analytics. Please avoid typing personal or patient information into search.
          </P>
          <P>
            We have turned off Google's advertising features for Analytics. You can opt out of Google Analytics with{' '}
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: GREEN }}>Google's browser add-on</a>.
          </P>
          <P>
            We also use Vercel Speed Insights and Cloudflare to measure site performance and traffic, and Cloudflare Turnstile to block bots, which may set a security cookie.
            Your browser stores your sign-in session and small preferences, such as playback speed and whether to hide AI-narrated podcasts.
          </P>
        </Section>

        <Section title="Who Helps Us Run the Site">
          <P>We share information with these service providers only as needed for them to do their work:</P>
          <List>
            <li><strong>Supabase</strong>: database and sign-in</li>
            <li><strong>Vercel</strong>: website hosting and speed measurement</li>
            <li><strong>Google</strong>: sign-in, analytics, and web fonts</li>
            <li><strong>Cloudflare</strong>: network security, bot protection, traffic measurement, and email forwarding</li>
            <li><strong>Resend</strong>: sending email, including messages about listing claims and notices to us about reports and claims</li>
            <li><strong>Perplexity</strong>: AI analysis of public content and of web addresses people suggest, not your account information</li>
          </List>
          <P>
            Podcast audio plays directly from each show's own hosting provider, which can see your IP address, and links to other sites are governed by those sites' policies.
            These providers may process information outside your province or country, including in the United States.
          </P>
        </Section>

        <Section title="What We Do Not Do">
          <List>
            <li>We do not sell your personal information</li>
            <li>We do not share your data with advertisers or show ads based on it</li>
            <li>We do not send you marketing email without your consent</li>
            <li>We never see or store your Google password</li>
          </List>
        </Section>

        <Section title="How Long We Keep It">
          <P>
            We keep your account information and activity until you remove it or delete your account.
            Abuse-prevention records may be kept for as long as they are needed for that purpose, and analytics data is kept according to our Google Analytics retention settings.
          </P>
        </Section>

        <Section title="Your Choices and Rights">
          <P>
            You can edit your profile at any time, and permanently delete your account and its data from{' '}
            <Link href="/profile" style={{ color: GREEN }}>Profile settings</Link>.
            You can also revoke our access to your Google account at myaccount.google.com.
          </P>
          <P>
            To ask for a copy of your information, request a correction, or raise a privacy concern, email us at the address below.
            Depending on where you live, you may have further rights under local privacy law, including the right to complain to your privacy regulator.
          </P>
        </Section>

        <Section title="Age Limit">
          <P>The Dental Commute is intended for adults. You must be at least 18 to create an account.</P>
        </Section>

        <Section title="If the Site Changes Hands">
          <P>
            If The Dental Commute is merged with or transferred to another organization, your information may be transferred as part of that change.
            We will update this policy and tell you if the way we handle your information changes.
          </P>
        </Section>

        <Section title="Changes to This Policy">
          <P>
            We may update this policy from time to time and will post the new version here with a revised date.
            Continued use of the site after a change means you accept the updated policy.
          </P>
        </Section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Contact</h2>
          <p style={textStyle}>
            If you have questions about this Privacy Policy or your data, please contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: GREEN }}>{CONTACT_EMAIL}</a>.
          </p>
        </section>
      </div>
    </div>
      <Footer maxWidth={720} />
    </>
  );
}
