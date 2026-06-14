export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px', fontFamily: "'Inter', sans-serif", color: '#111' }}>
      <div style={{ marginBottom: 48 }}>
        <a href="/" style={{ fontSize: 13, color: '#2D6A4F', textDecoration: 'none' }}>← The Dental Commute</a>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 48 }}>Last updated: June 14, 2026</p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Overview</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          The Dental Commute ("we," "us," or "our") is a dental resource directory for dental professionals.
          This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
          We take your privacy seriously and do not sell your personal information to anyone.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Information We Collect</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444', marginBottom: 12 }}>
          When you sign in with Google, we receive your:
        </p>
        <ul style={{ fontSize: 15, lineHeight: 2, color: '#444', paddingLeft: 24 }}>
          <li>Name</li>
          <li>Email address</li>
          <li>Google profile picture (used only for display purposes)</li>
        </ul>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444', marginTop: 12 }}>
          We also collect information you voluntarily provide during onboarding:
        </p>
        <ul style={{ fontSize: 15, lineHeight: 2, color: '#444', paddingLeft: 24 }}>
          <li>Your role (e.g. Dentist, Dental Student, Dental Staff)</li>
          <li>Your specialty (e.g. Endodontics, Orthodontics)</li>
          <li>NPI number, if you choose to provide it for verified badge display</li>
        </ul>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444', marginTop: 12 }}>
          We also collect content you create on the platform:
        </p>
        <ul style={{ fontSize: 15, lineHeight: 2, color: '#444', paddingLeft: 24 }}>
          <li>Votes on resources</li>
          <li>Comments and comment upvotes</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>How We Use Your Information</h2>
        <ul style={{ fontSize: 15, lineHeight: 2, color: '#444', paddingLeft: 24 }}>
          <li>To authenticate you and maintain your account</li>
          <li>To display your name and role alongside your comments and votes</li>
          <li>To show a "Verified" badge next to your comments if your NPI is confirmed</li>
          <li>To personalize your experience on the platform</li>
          <li>To improve the quality and relevance of our resource rankings</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>What We Do Not Do</h2>
        <ul style={{ fontSize: 15, lineHeight: 2, color: '#444', paddingLeft: 24 }}>
          <li>We do not sell your personal information</li>
          <li>We do not share your data with third-party advertisers</li>
          <li>We do not use your information for marketing without your consent</li>
          <li>We do not store your Google password — authentication is handled entirely by Google</li>
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Data Storage</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          Your account data is stored securely using Supabase, a trusted cloud database provider.
          Resource and category data is managed in Airtable. Both services employ industry-standard
          security practices including encryption at rest and in transit.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Your Rights</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          You may request deletion of your account and associated data at any time by emailing us.
          You may also revoke The Dental Commute's access to your Google account at any time through
          your Google account settings at myaccount.google.com.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Cookies</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          We use a session cookie solely to keep you signed in between visits. We do not use tracking
          or advertising cookies.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Changes to This Policy</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          We may update this Privacy Policy from time to time. We will post the updated version on
          this page with a revised date. Continued use of the platform after changes constitutes
          acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Contact</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#444' }}>
          If you have questions about this Privacy Policy or your data, please contact us at{' '}
          <a href="mailto:d.a.ionescu@gmail.com" style={{ color: '#2D6A4F' }}>d.a.ionescu@gmail.com</a>.
        </p>
      </section>
    </div>
  );
}
