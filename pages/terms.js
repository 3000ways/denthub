import Head from 'next/head';

export default function TermsOfService() {
  return (
    <>
    <Head>
      <title>Terms of Service — The Dental Commute</title>
      <meta name="robots" content="noindex" />
    </Head>
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px', fontFamily: "'Inter', sans-serif", color: '#111' }}>
      <div style={{ marginBottom: 48 }}>
        <a href="/" style={{ fontSize: 13, color: '#2D6A4F', textDecoration: 'none' }}>← The Dental Commute</a>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 48 }}>Last updated: June 14, 2026</p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>1. Acceptance of Terms</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          By accessing or using The Dental Commute ("the platform"), you agree to be bound by these
          Terms of Service. If you do not agree, please do not use the platform.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>2. Who Can Use This Platform</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          The Dental Commute is intended for dental professionals, dental students, and others with
          a professional interest in dentistry. You must be at least 18 years old to create an account.
          By signing in, you represent that the information you provide is accurate.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>3. Your Account</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          You are responsible for maintaining the security of your account and for all activity that
          occurs under it. You may sign in using your Google account; authentication is handled by
          Google and governed by their terms. You may delete your account at any time by contacting us.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>4. User Content</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          You may submit votes, comments, and other content ("User Content") on the platform. By doing so, you grant
          The Dental Commute a non-exclusive, royalty-free license to display that content on the platform.
          You retain ownership of your content.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444', marginTop: 12 }}>
          You agree not to post content that is:
        </p>
        <ul style={{ fontSize: 15, lineHeight: 2, color: '#444', paddingLeft: 24 }}>
          <li>False, misleading, or fraudulent</li>
          <li>Harassing, abusive, or threatening toward others</li>
          <li>Promotional spam or unsolicited advertising</li>
          <li>In violation of any applicable law or regulation</li>
        </ul>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444', marginTop: 12 }}>
          We reserve the right to remove any User Content that violates these terms.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>5. NPI Verification</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          If you provide an NPI number to obtain a verified badge, you represent that the NPI number
          belongs to you. Providing a false or third-party NPI number is a violation of these terms
          and may result in account removal.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>6. Platform Content</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          The resources, rankings, and scores on The Dental Commute are provided for informational
          purposes only. They do not constitute clinical advice, endorsement, or recommendation.
          Always use your professional judgment when evaluating resources for clinical application.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>7. Intellectual Property</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          All platform design, content, scoring methodology, and branding are owned by The Dental Commute.
          You may not reproduce, copy, or distribute any part of the platform without written permission.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>8. Disclaimers</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          The platform is provided "as is" without warranties of any kind. We do not guarantee the
          accuracy, completeness, or availability of any resource listed. We are not liable for any
          damages arising from your use of the platform or reliance on its content.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>9. Changes to These Terms</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          We may update these Terms of Service from time to time. We will post the updated version
          on this page with a revised date. Continued use of the platform after changes constitutes
          acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>10. Contact</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          Questions about these terms? Contact us at{' '}
          <a href="mailto:d.a.ionescu@gmail.com" style={{ color: '#2D6A4F' }}>d.a.ionescu@gmail.com</a>.
        </p>
      </section>
    </div>
    </>
  );
}
