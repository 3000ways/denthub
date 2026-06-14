const BASE_ID  = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

const VALID_SPECIALTIES = ['General Dentistry','Endodontics','Orthodontics','Periodontics','Oral Surgery','Prosthodontics','Pediatric Dentistry','Oral Radiology','Dental Anesthesiology','Pain'];
const VALID_TOPICS      = ['Clinical','Technology','Leadership','Marketing','Finance & Investment','Practice Growth','Team & HR','Wellness'];
const VALID_TYPES       = ['Podcast','YouTube','Book','Course','Software','Community','Conference','Coaching','Mastermind','Other'];

async function verifyTurnstile(token, ip) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

async function analyzeUrl(url) {
  if (!process.env.PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not set');

  const prompt = `A user has submitted this URL for a dental professional resource directory: ${url}

Visit the page and research this resource online. Then return a JSON object (no markdown, no code blocks, just raw JSON) with exactly these fields:

{
  "Name": "the resource's title",
  "Description": "1-2 sentences on what it is and why it's valuable to dental professionals",
  "Type": "one of: Podcast, YouTube, Book, Course, Software, Community, Conference, Coaching, Mastermind, Other — do NOT use 'Website'; if the resource is a coaching or consulting program use 'Coaching', if it's a mastermind group use 'Mastermind', if it's a CE platform use 'Course', if it's a dental community/forum use 'Community'",
  "Author": "author, host, or creator name (or empty string if unknown)",
  "RSSFeedURL": "the RSS feed URL if this is a podcast, otherwise empty string",
  "Specialty": ["array of applicable dental specialties — must have at least one — from: General Dentistry, Endodontics, Orthodontics, Periodontics, Oral Surgery, Prosthodontics, Oral Radiology, Dental Anesthesiology, Pain — if relevant to all dentists include all that apply"],
  "Topic": ["array of applicable topics — must have at least one — from: Clinical, Technology, Leadership, Marketing, Finance & Investment, Practice Growth, Team & HR, Wellness"],
  "ExpertScore": number 0-100 (reputation among dental experts),
  "CommunityScore": number 0-100 (community engagement and sentiment),
  "PopularityScore": number 0-100 (audience size and reach),
  "RecencyScore": number 0-100 (how current and actively maintained),
  "ClinicalDepthScore": number 0-100 (clinical relevance and depth for practitioners)
}

Return ONLY the raw JSON object, no other text.`;

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity error ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON');
  return JSON.parse(jsonMatch[0]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url, turnstileToken } = req.body;
  if (!url || !turnstileToken) return res.status(400).json({ error: 'Missing url or verification token' });

  // Validate URL format
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  // Verify Turnstile CAPTCHA
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const valid = await verifyTurnstile(turnstileToken, ip);
  if (!valid) return res.status(400).json({ error: 'Human verification failed. Please try again.' });

  // Analyze the URL with AI
  let parsed;
  try {
    parsed = await analyzeUrl(url);
  } catch (e) {
    return res.status(500).json({ error: `Could not analyze this URL: ${e.message}` });
  }

  // Sanitize specialty and topic arrays against valid values
  const specialty = Array.isArray(parsed.Specialty)
    ? parsed.Specialty.filter(s => VALID_SPECIALTIES.includes(s))
    : [];
  const topic = Array.isArray(parsed.Topic)
    ? parsed.Topic.filter(t => VALID_TOPICS.includes(t))
    : [];

  // Fallbacks
  const finalSpecialty = specialty.length ? specialty : ['General Dentistry'];
  const finalTopic     = topic.length     ? topic     : ['Clinical'];

  // Normalize Type — map common AI variants, then clamp to valid list
  const typeMap = {
    'YouTube Channel': 'YouTube',
    'CE Website': 'Course',
    'CE Platform': 'Course',
    'Website': 'Other',
    'Consulting': 'Coaching',
    'Consulting Firm': 'Coaching',
    'Mentor': 'Coaching',
    'Mentorship': 'Coaching',
    'Mastermind Group': 'Mastermind',
  };
  const rawType = parsed.Type || 'Other';
  const mappedType = typeMap[rawType] || rawType;
  const finalType = VALID_TYPES.includes(mappedType) ? mappedType : 'Other';

  // Write to Airtable
  const fields = {
    Name:        parsed.Name        || url,
    URL:         url,
    Description: parsed.Description || '',
    Type:        finalType,
    'Host or Author': parsed.Author || '',
    ...(parsed.RSSFeedURL ? { 'RSS Feed URL': parsed.RSSFeedURL } : {}),
    Specialty:   finalSpecialty,
    Topic:       finalTopic,
    Source:      'User Submission',
    Status:      'Draft',
    'Submission Status': 'Pending',
    ...(parsed.ExpertScore        != null ? { 'Expert Score':         Number(parsed.ExpertScore) }        : {}),
    ...(parsed.CommunityScore     != null ? { 'Community Score':      Number(parsed.CommunityScore) }     : {}),
    ...(parsed.PopularityScore    != null ? { 'Popularity Score':     Number(parsed.PopularityScore) }    : {}),
    ...(parsed.RecencyScore       != null ? { 'Recency Score':        Number(parsed.RecencyScore) }       : {}),
    ...(parsed.ClinicalDepthScore != null ? { 'Clinical Depth Score': Number(parsed.ClinicalDepthScore) } : {}),
  };

  const atRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  if (!atRes.ok) {
    const err = await atRes.text();
    return res.status(500).json({ error: `Failed to save submission: ${err}` });
  }

  return res.status(200).json({ ok: true, name: fields.Name, type: finalType });
}
