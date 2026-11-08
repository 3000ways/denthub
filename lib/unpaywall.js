// Unpaywall lookup: is there a legal, free full-text copy of this paper?
//
// Used by Journal Briefings to decide whether a paper can get a full reading
// (open access with a permissive licence) or only its abstract. Unpaywall asks
// for a contact email on every request (UNPAYWALL_EMAIL in Vercel, normally
// hello@thedentalcommute.com). Server-only; never throws — a lookup failure
// just means "unknown", and the harvester retries another night.
//
// Result: { oa_status: 'open' | 'manuscript' | 'none' | 'unknown', oa_url, license, host_type }
//   open        — publisher-hosted OA (gold/hybrid) or any version with a licence
//   manuscript  — a repository copy (e.g. PubMed Central author manuscript)
//   none        — Unpaywall knows the DOI and found no free copy

export async function lookupOpenAccess(doi) {
  const email = process.env.UNPAYWALL_EMAIL;
  if (!doi || !email) return { oa_status: 'unknown', oa_url: null, license: null, host_type: null, checked: false };
  try {
    const res = await fetch(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`, { signal: AbortSignal.timeout(12000) });
    if (res.status === 404) return { oa_status: 'none', oa_url: null, license: null, host_type: null, checked: true };
    if (!res.ok) return { oa_status: 'unknown', oa_url: null, license: null, host_type: null, checked: false };
    const d = await res.json();
    const best = d.best_oa_location || null;
    if (!d.is_oa || !best) return { oa_status: 'none', oa_url: null, license: null, host_type: null, checked: true };
    const license = best.license || null;
    const hostType = best.host_type || null; // 'publisher' | 'repository'
    const status = hostType === 'publisher' || license ? 'open' : 'manuscript';
    return { oa_status: status, oa_url: best.url_for_pdf || best.url || null, license, host_type: hostType, checked: true };
  } catch {
    return { oa_status: 'unknown', oa_url: null, license: null, host_type: null, checked: false };
  }
}

// Licences under which we would read the FULL TEXT aloud on the site. Anything
// else (including CC BY-NC-ND and unknown) gets the abstract only.
const FULL_READ_LICENSES = ['cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc0', 'public-domain'];
export function allowsFullReading(license) {
  return !!license && FULL_READ_LICENSES.includes(String(license).toLowerCase());
}
