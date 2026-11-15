import { resolveCountryRegionCodes } from './query-expander.ts';
import type { VisaHubRegionCode } from './query-expander.ts';

export interface KnownSponsorEntry {
  canonicalName: string;
  aliases: readonly string[];
  atsSlugs: readonly string[];
  hubs: readonly VisaHubRegionCode[];
  primarySchemes: readonly string[];
  confidence: number;
  notes?: string;
}

export interface KnownSponsorLookupInput {
  companyName?: string;
  sourceUrl?: string;
  applyUrl?: string;
  atsSlug?: string;
  location?: string;
  country?: string;
}

export interface KnownSponsorLookupMatch {
  entry: KnownSponsorEntry;
  canonicalName: string;
  matchedBy: 'company_name' | 'ats_slug';
  matchedKey: string;
  hubAligned: boolean;
  confidence: number;
}

const LEGAL_SUFFIX_REGEX =
  /\b(inc\.?|incorporated|ltd\.?|limited|llc|l\.l\.c\.?|gmbh|ag|se|sa|ab|oy|as|aps|nv|n\.v\.|bv|b\.v\.|plc|pty\.?\s+ltd\.?|pty|corp\.?|corporation|holdings|group|technologies|technology|tech|pte\.?\s+ltd\.?|pte|k\.k\.|kk|co\.?)\b/gi;

const GENERIC_PATH_SEGMENTS = new Set([
  'jobs',
  'job',
  'careers',
  'career',
  'boards',
  'postings',
  'job-board',
  'posting-api',
  'v0',
  'v1',
  'v2',
  'en-us',
  'en-gb',
  'en',
  'external',
  'search',
]);

export const KNOWN_SPONSORS: readonly KnownSponsorEntry[] = [
  // ── Core 14 Global Visa Sponsors across UK / EU / APAC / CA ───────────────
  {
    canonicalName: 'Monzo',
    aliases: ['Monzo', 'Monzo Bank', 'Monzo Bank Ltd'],
    atsSlugs: ['monzo'],
    hubs: ['uk'],
    primarySchemes: ['UK Skilled Worker'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Booking.com',
    aliases: ['Booking.com', 'Booking', 'Booking.com B.V.', 'Booking Holdings'],
    atsSlugs: ['booking', 'bookingcom', 'booking-com'],
    hubs: ['nl', 'uk', 'de'],
    primarySchemes: ['NL Highly Skilled Migrant', 'EU Blue Card', 'UK Skilled Worker'],
    confidence: 0.92,
  },
  {
    canonicalName: 'Adyen',
    aliases: ['Adyen', 'Adyen N.V.', 'Adyen NV'],
    atsSlugs: ['adyen'],
    hubs: ['nl', 'uk', 'sg', 'au', 'de'],
    primarySchemes: ['NL Highly Skilled Migrant', 'EU Blue Card', 'Singapore Employment Pass', 'UK Skilled Worker'],
    confidence: 0.92,
  },
  {
    canonicalName: 'Zalando',
    aliases: ['Zalando', 'Zalando SE', 'Zalando Tech'],
    atsSlugs: ['zalando'],
    hubs: ['de', 'ie', 'nl', 'se'],
    primarySchemes: ['EU Blue Card', 'Critical Skills Employment Permit'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Delivery Hero',
    aliases: ['Delivery Hero', 'DeliveryHero', 'Delivery Hero SE'],
    atsSlugs: ['deliveryhero', 'delivery-hero'],
    hubs: ['de', 'sg'],
    primarySchemes: ['EU Blue Card', 'Singapore Employment Pass'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Revolut',
    aliases: ['Revolut', 'Revolut Ltd'],
    atsSlugs: ['revolut'],
    hubs: ['uk', 'de', 'nl', 'ie', 'sg', 'au', 'jp'],
    primarySchemes: ['UK Skilled Worker', 'EU Blue Card', 'Critical Skills Employment Permit', 'Singapore Employment Pass'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Wise',
    aliases: ['Wise', 'TransferWise', 'Wise Plc'],
    atsSlugs: ['wise', 'transferwise'],
    hubs: ['uk', 'sg', 'au', 'de'],
    primarySchemes: ['UK Skilled Worker', 'Singapore Employment Pass', 'Australia Subclass 482'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Spotify',
    aliases: ['Spotify', 'Spotify AB'],
    atsSlugs: ['spotify'],
    hubs: ['se', 'uk', 'de', 'nl'],
    primarySchemes: ['Sweden Work Permit (Migrationsverket)', 'UK Skilled Worker', 'EU Blue Card'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Klarna',
    aliases: ['Klarna', 'Klarna Bank', 'Klarna AB'],
    atsSlugs: ['klarna'],
    hubs: ['se', 'de', 'uk'],
    primarySchemes: ['Sweden Work Permit (Migrationsverket)', 'EU Blue Card', 'UK Skilled Worker'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Canva',
    aliases: ['Canva', 'Canva Pty Ltd'],
    atsSlugs: ['canva'],
    hubs: ['au', 'uk'],
    primarySchemes: ['Australia Subclass 482', 'UK Skilled Worker'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Atlassian',
    aliases: ['Atlassian', 'Atlassian Pty Ltd', 'Atlassian Corp'],
    atsSlugs: ['atlassian'],
    hubs: ['au', 'nl', 'de', 'ca', 'uk', 'jp'],
    primarySchemes: ['Australia Subclass 482', 'NL Highly Skilled Migrant', 'Canada LMIA / Global Talent Stream', 'UK Skilled Worker'],
    confidence: 0.91,
  },
  {
    canonicalName: 'Grab',
    aliases: ['Grab', 'Grab Holdings', 'GrabTaxi'],
    atsSlugs: ['grab'],
    hubs: ['sg'],
    primarySchemes: ['Singapore Employment Pass'],
    confidence: 0.89,
  },
  {
    canonicalName: 'N26',
    aliases: ['N26', 'N26 Bank', 'N26 GmbH'],
    atsSlugs: ['n26'],
    hubs: ['de', 'nl'],
    primarySchemes: ['EU Blue Card'],
    confidence: 0.89,
  },
  {
    canonicalName: 'HelloFresh',
    aliases: ['HelloFresh', 'Hello Fresh', 'HelloFresh SE'],
    atsSlugs: ['hellofresh', 'hello-fresh'],
    hubs: ['de', 'uk', 'nl', 'ca', 'au'],
    primarySchemes: ['EU Blue Card', 'UK Skilled Worker', 'NL Highly Skilled Migrant', 'Australia Subclass 482'],
    confidence: 0.89,
  },

  // ── Additional International Hub Visa Sponsors ─────────────────────────────
  {
    canonicalName: 'Stripe',
    aliases: ['Stripe'],
    atsSlugs: ['stripe'],
    hubs: ['ie', 'uk', 'sg', 'jp', 'ca', 'de'],
    primarySchemes: ['Critical Skills Employment Permit', 'UK Skilled Worker', 'Singapore Employment Pass'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Cloudflare',
    aliases: ['Cloudflare'],
    atsSlugs: ['cloudflare'],
    hubs: ['uk', 'de', 'sg', 'au', 'ca', 'jp'],
    primarySchemes: ['UK Skilled Worker', 'EU Blue Card', 'Singapore Employment Pass'],
    confidence: 0.88,
  },
  {
    canonicalName: 'Datadog',
    aliases: ['Datadog'],
    atsSlugs: ['datadog'],
    hubs: ['uk', 'de', 'nl', 'ie', 'sg', 'jp', 'au'],
    primarySchemes: ['UK Skilled Worker', 'EU Blue Card', 'Singapore Employment Pass'],
    confidence: 0.88,
  },
  {
    canonicalName: 'Shopify',
    aliases: ['Shopify'],
    atsSlugs: ['shopify'],
    hubs: ['ca', 'ie', 'uk', 'de'],
    primarySchemes: ['Canada LMIA / Global Talent Stream', 'Critical Skills Employment Permit', 'UK Skilled Worker'],
    confidence: 0.89,
  },
  {
    canonicalName: 'Deliveroo',
    aliases: ['Deliveroo', 'Roofoods'],
    atsSlugs: ['deliveroo'],
    hubs: ['uk'],
    primarySchemes: ['UK Skilled Worker'],
    confidence: 0.88,
  },
  {
    canonicalName: 'Checkout.com',
    aliases: ['Checkout.com', 'Checkout'],
    atsSlugs: ['checkout', 'checkoutcom'],
    hubs: ['uk', 'de', 'sg'],
    primarySchemes: ['UK Skilled Worker', 'EU Blue Card', 'Singapore Employment Pass'],
    confidence: 0.87,
  },
  {
    canonicalName: 'Starling Bank',
    aliases: ['Starling Bank', 'Starling'],
    atsSlugs: ['starlingbank', 'starling-bank'],
    hubs: ['uk'],
    primarySchemes: ['UK Skilled Worker'],
    confidence: 0.86,
  },
  {
    canonicalName: 'Skyscanner',
    aliases: ['Skyscanner'],
    atsSlugs: ['skyscanner'],
    hubs: ['uk', 'sg'],
    primarySchemes: ['UK Skilled Worker', 'Singapore Employment Pass'],
    confidence: 0.88,
  },
  {
    canonicalName: 'Miro',
    aliases: ['Miro', 'RealtimeBoard'],
    atsSlugs: ['miro'],
    hubs: ['nl', 'de', 'uk', 'jp'],
    primarySchemes: ['NL Highly Skilled Migrant', 'EU Blue Card', 'UK Skilled Worker'],
    confidence: 0.89,
  },
  {
    canonicalName: 'Mollie',
    aliases: ['Mollie', 'Mollie B.V.'],
    atsSlugs: ['mollie'],
    hubs: ['nl', 'uk', 'de'],
    primarySchemes: ['NL Highly Skilled Migrant', 'EU Blue Card'],
    confidence: 0.87,
  },
  {
    canonicalName: 'Personio',
    aliases: ['Personio', 'Personio SE'],
    atsSlugs: ['personio'],
    hubs: ['de', 'ie', 'uk', 'nl'],
    primarySchemes: ['EU Blue Card', 'Critical Skills Employment Permit', 'UK Skilled Worker'],
    confidence: 0.88,
  },
  {
    canonicalName: 'Celonis',
    aliases: ['Celonis', 'Celonis SE'],
    atsSlugs: ['celonis'],
    hubs: ['de', 'uk', 'jp'],
    primarySchemes: ['EU Blue Card', 'UK Skilled Worker'],
    confidence: 0.88,
  },
  {
    canonicalName: 'Mercari',
    aliases: ['Mercari', 'Mercari Inc'],
    atsSlugs: ['mercari'],
    hubs: ['jp'],
    primarySchemes: ['Japan Highly Skilled Professional / Engineer Visa'],
    confidence: 0.9,
  },
  {
    canonicalName: 'Rakuten',
    aliases: ['Rakuten', 'Rakuten Group'],
    atsSlugs: ['rakuten'],
    hubs: ['jp', 'sg', 'uk'],
    primarySchemes: ['Japan Highly Skilled Professional / Engineer Visa', 'Singapore Employment Pass'],
    confidence: 0.88,
  },
  {
    canonicalName: 'PayPay',
    aliases: ['PayPay'],
    atsSlugs: ['paypay'],
    hubs: ['jp'],
    primarySchemes: ['Japan Highly Skilled Professional / Engineer Visa'],
    confidence: 0.89,
  },
  {
    canonicalName: 'Xero',
    aliases: ['Xero', 'Xero Limited'],
    atsSlugs: ['xero'],
    hubs: ['au', 'uk', 'sg', 'ca'],
    primarySchemes: ['Australia Subclass 482', 'UK Skilled Worker', 'Singapore Employment Pass'],
    confidence: 0.87,
  },
  {
    canonicalName: 'Airwallex',
    aliases: ['Airwallex'],
    atsSlugs: ['airwallex'],
    hubs: ['au', 'sg', 'uk', 'nl'],
    primarySchemes: ['Australia Subclass 482', 'Singapore Employment Pass', 'UK Skilled Worker', 'NL Highly Skilled Migrant'],
    confidence: 0.88,
  },
  {
    canonicalName: 'Sea',
    aliases: ['Sea', 'Sea Limited', 'Shopee'],
    atsSlugs: ['shopee', 'seagroup'],
    hubs: ['sg'],
    primarySchemes: ['Singapore Employment Pass'],
    confidence: 0.87,
  },
  {
    canonicalName: 'Intercom',
    aliases: ['Intercom'],
    atsSlugs: ['intercom'],
    hubs: ['ie', 'uk', 'au'],
    primarySchemes: ['Critical Skills Employment Permit', 'UK Skilled Worker'],
    confidence: 0.88,
  },
  {
    canonicalName: 'Wealthsimple',
    aliases: ['Wealthsimple'],
    atsSlugs: ['wealthsimple'],
    hubs: ['ca'],
    primarySchemes: ['Canada LMIA / Global Talent Stream'],
    confidence: 0.86,
  },
  {
    canonicalName: 'Cohere',
    aliases: ['Cohere'],
    atsSlugs: ['cohere'],
    hubs: ['ca', 'uk'],
    primarySchemes: ['Canada LMIA / Global Talent Stream', 'UK Skilled Worker'],
    confidence: 0.87,
  },
];

export function normalizeCompanyNameKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(LEGAL_SUFFIX_REGEX, ' ')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeCompanySlugKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

export function extractAtsSlugFromUrl(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname
    .split('/')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // Workday: <company>.wd5.myworkdayjobs.com or <company>.myworkdayjobs.com
  if (host.endsWith('.myworkdayjobs.com')) {
    const firstLabel = host.split('.')[0];
    if (firstLabel && !/^wd\d+$/.test(firstLabel) && firstLabel !== 'www') {
      return normalizeCompanySlugKey(firstLabel);
    }
  }

  // Personio: <company>.jobs.personio.de or <company>.jobs.personio.com
  if (host.includes('.jobs.personio.')) {
    const firstLabel = host.split('.')[0];
    if (firstLabel && firstLabel !== 'www') {
      return normalizeCompanySlugKey(firstLabel);
    }
  }

  // Greenhouse API: boards-api.greenhouse.io/v1/boards/<slug>/jobs
  const boardsIdx = segments.indexOf('boards');
  if (boardsIdx !== -1 && segments[boardsIdx + 1]) {
    return normalizeCompanySlugKey(segments[boardsIdx + 1]);
  }

  // Lever API: api.lever.co/v0/postings/<slug>
  const postingsIdx = segments.indexOf('postings');
  if (postingsIdx !== -1 && segments[postingsIdx + 1]) {
    return normalizeCompanySlugKey(segments[postingsIdx + 1]);
  }

  // Ashby API: api.ashbyhq.com/posting-api/job-board/<slug>
  const jobBoardIdx = segments.indexOf('job-board');
  if (jobBoardIdx !== -1 && segments[jobBoardIdx + 1]) {
    return normalizeCompanySlugKey(segments[jobBoardIdx + 1]);
  }

  // Standard ATS board URLs:
  // job-boards.greenhouse.io/<slug>/jobs/...
  // boards.greenhouse.io/<slug>/jobs/...
  // jobs.lever.co/<slug>/...
  // jobs.ashbyhq.com/<slug>/...
  // jobs.smartrecruiters.com/<slug>/...
  if (
    host.includes('greenhouse.io') ||
    host.includes('lever.co') ||
    host.includes('ashbyhq.com') ||
    host.includes('smartrecruiters.com')
  ) {
    const candidate = segments.find((seg) => !GENERIC_PATH_SEGMENTS.has(seg));
    if (candidate) {
      return normalizeCompanySlugKey(candidate);
    }
  }

  return null;
}

export class KnownSponsorRegistry {
  private readonly entries: KnownSponsorEntry[] = [];
  private readonly byNameKey = new Map<string, KnownSponsorEntry>();
  private readonly bySlugKey = new Map<string, KnownSponsorEntry>();

  constructor(initialEntries: readonly KnownSponsorEntry[] = KNOWN_SPONSORS) {
    for (const entry of initialEntries) {
      this.register(entry);
    }
  }

  register(entry: KnownSponsorEntry): void {
    this.entries.push(entry);

    const nameCandidates = [entry.canonicalName, ...entry.aliases];
    for (const candidate of nameCandidates) {
      const exactLower = candidate.trim().toLowerCase();
      if (exactLower) {
        this.byNameKey.set(exactLower, entry);
      }
      const normalized = normalizeCompanyNameKey(candidate);
      if (normalized) {
        this.byNameKey.set(normalized, entry);
      }
      const domainTrimmed = normalizeCompanyNameKey(candidate.replace(/\.(com|io|co|ai|dev)$/i, ''));
      if (domainTrimmed) {
        this.byNameKey.set(domainTrimmed, entry);
      }
    }

    for (const slug of entry.atsSlugs) {
      const normalizedSlug = normalizeCompanySlugKey(slug);
      if (normalizedSlug) {
        this.bySlugKey.set(normalizedSlug, entry);
      }
    }
  }

  getAll(): readonly KnownSponsorEntry[] {
    return this.entries;
  }

  lookup(input: KnownSponsorLookupInput | string): KnownSponsorLookupMatch | null {
    const query: KnownSponsorLookupInput =
      typeof input === 'string' ? { companyName: input } : input;

    const jobRegionCodes = new Set<string>([
      ...(query.country ? resolveCountryRegionCodes(query.country, false) : []),
      ...(query.location ? resolveCountryRegionCodes(query.location, true) : []),
    ]);

    const computeMatch = (
      entry: KnownSponsorEntry,
      matchedBy: 'company_name' | 'ats_slug',
      matchedKey: string,
    ): KnownSponsorLookupMatch => {
      const hubAligned =
        jobRegionCodes.size === 0 ||
        entry.hubs.some((hub) => jobRegionCodes.has(hub));
      const confidence = hubAligned
        ? entry.confidence
        : Number(Math.max(0.8, entry.confidence - 0.06).toFixed(2));

      return {
        entry,
        canonicalName: entry.canonicalName,
        matchedBy,
        matchedKey,
        hubAligned,
        confidence,
      };
    };

    // 1. Lookup by normalized company name / alias
    if (query.companyName) {
      const rawLower = query.companyName.trim().toLowerCase();
      const normalized = normalizeCompanyNameKey(query.companyName);
      const withoutTld = normalizeCompanyNameKey(
        query.companyName.replace(/\.(com|io|co|ai|dev)$/i, ''),
      );

      const entry =
        this.byNameKey.get(rawLower) ||
        this.byNameKey.get(normalized) ||
        this.byNameKey.get(withoutTld);

      if (entry) {
        return computeMatch(entry, 'company_name', query.companyName);
      }
    }

    // 2. Lookup by explicit ATS slug or extracted URL slug
    const slugCandidates = [
      query.atsSlug ? normalizeCompanySlugKey(query.atsSlug) : null,
      extractAtsSlugFromUrl(query.sourceUrl),
      extractAtsSlugFromUrl(query.applyUrl),
    ].filter((s): s is string => Boolean(s));

    for (const slug of slugCandidates) {
      const entry = this.bySlugKey.get(slug);
      if (entry) {
        return computeMatch(entry, 'ats_slug', slug);
      }
    }

    return null;
  }

  isKnownSponsor(input: KnownSponsorLookupInput | string): boolean {
    return this.lookup(input) !== null;
  }
}

export const knownSponsorRegistry = new KnownSponsorRegistry();

