// Journal Briefings — editorial and corrections policy. The public commitments
// behind the hybrid format: how papers are chosen, the own-words rule, author
// credit, AI disclosure, independence, corrections within 48 hours, and how a
// rightsholder opts out. Linked from every episode page, the show pages, the
// hub and the show notes in the feed.
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SiteNav from '../../components/SiteNav';
import Footer from '../../components/Footer';
import { CONTACT_EMAIL } from '../../lib/contact';
import { SITE } from '../../lib/briefings-urls';

const FONT = "'Inter', sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

const UPDATED = 'November 9, 2026';

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 10px' }}>{title}</h2>
      <div style={{ fontSize: 15, color: '#333', lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}

export default function PolicyPage() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const f = () => setIsMobile(window.innerWidth < 640); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const title = 'Editorial and corrections policy — Journal Briefings';
  const description = 'How The Dental Commute\'s Journal Briefings choose papers, summarise them in our own words, credit authors, disclose AI narration, stay independent, correct mistakes within 48 hours, and honour rightsholder requests.';
  const mail = <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: GREEN }}>{CONTACT_EMAIL}</a>;
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <link rel="canonical" href={`${SITE}/journals/policy`} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <div style={{ background: '#f5f2eb', minHeight: '100vh', fontFamily: FONT }}>
        <SiteNav />
        <div style={{ maxWidth: 760, margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 24px 80px' }}>
          <Link href="/journals" style={{ fontSize: 13, color: GREEN, textDecoration: 'none' }}>← Journal Briefings</Link>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '20px 0 8px' }}>Journal Briefings</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 28 : 36, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.15, color: '#111' }}>Editorial and corrections policy</h1>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>Last updated {UPDATED}</div>

          <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? '20px 18px' : '28px 32px' }}>
            <Section title="What these shows are">
              <p style={{ margin: '0 0 10px' }}>Each Journal Briefings show is a weekly, AI-narrated briefing on the new research in one dental specialty. Every Monday it covers the papers published that week in the specialty's three leading journals. The shows are made by The Dental Commute, an independent directory for dental professionals. They are not affiliated with, endorsed by, or produced for any journal, publisher or professional society.</p>
              <p style={{ margin: 0 }}>The shows are informational. They summarise published research; they do not give clinical advice, and nothing in them replaces reading the paper or your own clinical judgement.</p>
            </Section>

            <Section title="How papers are chosen">
              <p style={{ margin: 0 }}>Mechanically, not by taste. Every night we check PubMed, the U.S. National Library of Medicine's public index, for new records from the three journals. On Monday the week's papers are ordered by study type (systematic reviews and trials first), then by journal, then newest first. Up to eight are covered in depth; the rest are mentioned in brief. Letters, editorials, errata and news items are left out. No paper is promoted or omitted for commercial reasons, and no one can pay to be included.</p>
            </Section>

            <Section title="Their facts, our words">
              <p style={{ margin: '0 0 10px' }}>For each paper covered in depth, one voice describes the study in our own words: what was done, who was studied, what was found, including the numbers the authors report, and what the authors say it means. That description is written from the paper's published abstract and checked against it automatically before it is spoken: every number must appear in the abstract, and no run of the authors' wording may be reproduced. A second voice then quotes the authors' conclusion, in their words, and says that it is a quotation.</p>
              <p style={{ margin: '0 0 10px' }}>When a paper is published open access under a Creative Commons licence that permits it, the abstract is read exactly as published, and the licence is named on the episode page.</p>
              <p style={{ margin: 0 }}>We never read full text. We never bypass a paywall. We link to every paper at the publisher's page so you can read it there.</p>
            </Section>

            <Section title="Authors are always credited">
              <p style={{ margin: 0 }}>Every paper that is mentioned, in depth or in brief, is introduced with its authors' names and its journal, and the episode page lists the authors in full with a link to the paper.</p>
            </Section>

            <Section title="The voices are synthetic, and we say so">
              <p style={{ margin: 0 }}>Grace and Adrian are AI-generated voices. Every episode says so, every show is marked as AI-narrated in our directory, and listeners who prefer human-hosted shows can hide AI-narrated podcasts across The Dental Commute with one switch.</p>
            </Section>

            <Section title="Independence">
              <p style={{ margin: 0 }}>The shows carry no advertising, no sponsor messages and no affiliate links, in the audio, the episode pages or the podcast feed. The Dental Commute may earn revenue elsewhere on the site; none of it touches these shows or influences which papers they cover.</p>
            </Section>

            <Section title="Corrections, within 48 hours">
              <p style={{ margin: '0 0 10px' }}>If a summary, a number, an attribution or a quotation is wrong, tell us: use <em>Spot a mistake?</em> next to the paper on the episode page, or write to {mail}. We review every report. Where we got it wrong, we correct the episode page immediately, re-record the affected segment, and note the correction on the page, within 48 hours of the report.</p>
              <p style={{ margin: 0 }}>Authors are welcome to tell us if we have misrepresented their work, and we will say so publicly if we have.</p>
            </Section>

            <Section title="Rightsholders: questions, takedowns and opting out">
              <p style={{ margin: '0 0 10px' }}>We believe this format respects authors' and publishers' rights: we describe facts in our own words, quote one attributed sentence, read abstracts verbatim only where the licence allows, credit every author, and link to the publisher. If you are a rightsholder and disagree about a specific episode or paper, write to {mail}. We will remove or amend the material within 48 hours of a request from the rightsholder while we discuss it; we will not argue first.</p>
              <p style={{ margin: 0 }}>A journal, publisher or author may also ask us not to cover their journal or their papers at all. We keep a register of such requests and honour them from the next episode onwards.</p>
            </Section>

            <Section title="Sources and credits">
              <p style={{ margin: 0 }}>Bibliographic data, including abstracts, come from PubMed, courtesy of the U.S. National Library of Medicine, which does not endorse these shows. Open-access status and licences come from Unpaywall. Abstracts and conclusions remain the copyright of their authors and publishers. Everything else in an episode is written by The Dental Commute.</p>
            </Section>

            <Section title="Contact">
              <p style={{ margin: 0 }}>{mail}. This policy is reviewed whenever the format changes, and the date above is updated.</p>
            </Section>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
