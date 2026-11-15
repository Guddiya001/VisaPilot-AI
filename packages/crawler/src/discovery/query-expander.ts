export type VisaHubRegionCode =
  | 'uk'
  | 'de'
  | 'nl'
  | 'ie'
  | 'se'
  | 'ca'
  | 'sg'
  | 'au'
  | 'jp';

export interface RegionVisaProfile {
  code: VisaHubRegionCode;
  country: string;
  countryAliases: readonly string[];
  cities: readonly string[];
  permitTerms: readonly string[];
  relocationTerms: readonly string[];
  visaOrClause: string;
  locationOrClause: string;
}

export interface ExpandGlobalVisaQueriesInput {
  query: string;
  country?: string;
  countries?: string[];
  atsDomains?: readonly string[];
}

export interface ExpandedQueryItem {
  id: string;
  region: VisaHubRegionCode | 'global';
  country: string;
  atsDomain?: string;
  roleClause: string;
  visaClause: string;
  locationClause: string;
  dorkQuery: string;
}

export interface ExpandedVisaQueriesResult {
  originalQuery: string;
  roleSynonyms: string[];
  roleOrClause: string;
  regions: VisaHubRegionCode[];
  atsDomains: string[];
  atsDorkQueries: ExpandedQueryItem[];
  regionalQueries: ExpandedQueryItem[];
  queries: ExpandedQueryItem[];
  queryStrings: string[];
}

export interface TokenizedRelevanceTarget {
  title?: string;
  description?: string;
  skills?: string[];
}

export interface TokenizedRelevanceResult {
  score: number;
  matched: boolean;
  matchedTokens: string[];
  unmatchedTokens: string[];
  titleHitCount: number;
  aliasHitCount: number;
}

export const ATS_DISCOVERY_DOMAINS = [
  'job-boards.greenhouse.io',
  'boards.greenhouse.io',
  'jobs.lever.co',
  'jobs.ashbyhq.com',
  'myworkdayjobs.com',
  'jobs.smartrecruiters.com',
] as const;

function quoteOrGroup(terms: readonly string[]): string {
  const unique = Array.from(new Set(terms.map((t) => t.trim()).filter(Boolean)));
  return `(${unique.map((term) => `"${term}"`).join(' OR ')})`;
}

function buildRegionProfile(
  code: VisaHubRegionCode,
  country: string,
  countryAliases: readonly string[],
  cities: readonly string[],
  permitTerms: readonly string[],
  relocationTerms: readonly string[],
): RegionVisaProfile {
  return {
    code,
    country,
    countryAliases,
    cities,
    permitTerms,
    relocationTerms,
    visaOrClause: quoteOrGroup([...permitTerms, ...relocationTerms]),
    locationOrClause: quoteOrGroup([country, ...cities.slice(0, 4)]),
  };
}

export const REGION_VISA_PROFILES: Record<VisaHubRegionCode, RegionVisaProfile> = {
  uk: buildRegionProfile(
    'uk',
    'United Kingdom',
    ['uk', 'gb', 'united kingdom', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland'],
    ['London', 'Cardiff', 'Manchester', 'Edinburgh', 'Birmingham', 'Bristol', 'Cambridge', 'Oxford', 'Leeds', 'Glasgow', 'Belfast'],
    ['Skilled Worker', 'Global Talent', 'Certificate of Sponsorship', 'visa sponsorship'],
    ['relocation', 'relocation package', 'relocation support'],
  ),
  de: buildRegionProfile(
    'de',
    'Germany',
    ['de', 'germany', 'deutschland'],
    ['Berlin', 'Munich', 'München', 'Hamburg', 'Frankfurt', 'Cologne', 'Köln', 'Stuttgart', 'Düsseldorf'],
    ['EU Blue Card', 'Blue Card', 'Blaue Karte', 'work permit', 'visa sponsorship'],
    ['relocation', 'relocation package', 'relocation support'],
  ),
  nl: buildRegionProfile(
    'nl',
    'Netherlands',
    ['nl', 'netherlands', 'the netherlands', 'holland', 'nederland'],
    ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'The Hague', 'Den Haag', 'Delft'],
    ['Highly Skilled Migrant', 'kennismigrant', 'IND', 'EU Blue Card', 'visa sponsorship'],
    ['relocation', '30% ruling', 'relocation package'],
  ),
  ie: buildRegionProfile(
    'ie',
    'Ireland',
    ['ie', 'ireland', 'republic of ireland'],
    ['Dublin', 'Cork', 'Galway', 'Limerick'],
    ['Critical Skills', 'Critical Skills Employment Permit', 'Stamp 4', 'work permit', 'visa sponsorship'],
    ['relocation', 'relocation package', 'relocation assistance'],
  ),
  se: buildRegionProfile(
    'se',
    'Sweden',
    ['se', 'sweden', 'sverige'],
    ['Stockholm', 'Gothenburg', 'Göteborg', 'Malmö', 'Malmo', 'Uppsala'],
    ['Migrationsverket', 'work permit', 'EU Blue Card', 'visa sponsorship'],
    ['relocation', 'relocation support', 'relocation package'],
  ),
  ca: buildRegionProfile(
    'ca',
    'Canada',
    ['ca', 'canada'],
    ['Toronto', 'Vancouver', 'Montreal', 'Montréal', 'Ottawa', 'Waterloo', 'Calgary', 'Kitchener'],
    ['LMIA', 'Global Talent Stream', 'work permit', 'visa sponsorship'],
    ['relocation', 'relocation package', 'relocation assistance'],
  ),
  sg: buildRegionProfile(
    'sg',
    'Singapore',
    ['sg', 'singapore'],
    ['Singapore'],
    ['Employment Pass', 'EP', 'ONE Pass', 'visa sponsorship'],
    ['relocation', 'relocation package', 'relocation support'],
  ),
  au: buildRegionProfile(
    'au',
    'Australia',
    ['au', 'australia'],
    ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'],
    ['482', 'subclass 482', 'TSS', '186', 'visa sponsorship'],
    ['relocation', 'relocation package', 'relocation assistance'],
  ),
  jp: buildRegionProfile(
    'jp',
    'Japan',
    ['jp', 'japan'],
    ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Fukuoka', 'Shibuya', 'Minato'],
    ['Highly Skilled Professional', 'Engineer visa', 'work visa', 'visa sponsorship'],
    ['relocation', 'relocation support', 'relocation package'],
  ),
};

export interface CountryLookupEntry {
  code: string;
  country: string;
  aliases: readonly string[];
  cities: readonly string[];
}

export const COUNTRY_CITY_LOOKUP: readonly CountryLookupEntry[] = [
  ...Object.values(REGION_VISA_PROFILES).map((profile) => ({
    code: profile.code,
    country: profile.country,
    aliases: profile.countryAliases,
    cities: profile.cities,
  })),
  {
    code: 'ch',
    country: 'Switzerland',
    aliases: ['ch', 'switzerland', 'schweiz', 'suisse'],
    cities: ['Zurich', 'Zürich', 'Geneva', 'Genève', 'Basel', 'Bern', 'Lausanne', 'Zug'],
  },
  {
    code: 'us',
    country: 'United States',
    aliases: ['us', 'usa', 'united states', 'u.s.', 'u.s.a.', 'america'],
    cities: [
      'San Francisco',
      'New York',
      'Seattle',
      'Austin',
      'Boston',
      'Chicago',
      'Los Angeles',
      'Denver',
      'Washington DC',
      'Atlanta',
      'San Jose',
      'Mountain View',
      'Palo Alto',
      'Menlo Park',
      'Miami',
      'Dallas',
      'San Diego',
    ],
  },
  {
    code: 'fr',
    country: 'France',
    aliases: ['fr', 'france'],
    cities: ['Paris', 'Lyon', 'Toulouse', 'Nice', 'Marseille', 'Nantes'],
  },
  {
    code: 'in',
    country: 'India',
    aliases: ['in', 'india'],
    cities: ['Bengaluru', 'Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi', 'Noida', 'Gurgaon', 'Gurugram', 'Chennai'],
  },
  {
    code: 'pl',
    country: 'Poland',
    aliases: ['pl', 'poland', 'polska'],
    cities: ['Warsaw', 'Krakow', 'Kraków', 'Wroclaw', 'Wrocław', 'Gdansk', 'Gdańsk', 'Poznan'],
  },
  {
    code: 'dk',
    country: 'Denmark',
    aliases: ['dk', 'denmark', 'danmark'],
    cities: ['Copenhagen', 'Aarhus', 'Odense'],
  },
  {
    code: 'no',
    country: 'Norway',
    aliases: ['no', 'norway', 'norge'],
    cities: ['Oslo', 'Bergen', 'Trondheim'],
  },
  {
    code: 'fi',
    country: 'Finland',
    aliases: ['fi', 'finland', 'suomi'],
    cities: ['Helsinki', 'Espoo', 'Tampere'],
  },
  {
    code: 'ae',
    country: 'United Arab Emirates',
    aliases: ['ae', 'uae', 'united arab emirates'],
    cities: ['Dubai', 'Abu Dhabi'],
  },
  {
    code: 'nz',
    country: 'New Zealand',
    aliases: ['nz', 'new zealand'],
    cities: ['Auckland', 'Wellington', 'Christchurch'],
  },
];

const US_STATE_ABBR_REGEX = /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;
const CA_PROVINCE_ABBR_REGEX = /,\s*(ON|BC|QC|AB|MB|SK|NS|NB)\b/;

const ROLE_SYNONYM_CLUSTERS: ReadonlyArray<{
  triggers: readonly string[];
  synonyms: readonly string[];
}> = [
  {
    triggers: ['backend engineer', 'backend developer', 'backend', 'back-end engineer', 'server-side engineer'],
    synonyms: ['Backend Engineer', 'Systems Engineer', 'Platform Engineer', 'Distributed Systems'],
  },
  {
    triggers: ['frontend engineer', 'frontend developer', 'frontend', 'front-end engineer', 'ui engineer'],
    synonyms: ['Frontend Engineer', 'UI Engineer', 'Web Engineer', 'React Engineer', 'TypeScript Engineer'],
  },
  {
    triggers: ['full stack engineer', 'full-stack engineer', 'fullstack engineer', 'full stack developer', 'full stack', 'fullstack'],
    synonyms: ['Full Stack Engineer', 'Full-Stack Engineer', 'Software Engineer', 'Product Engineer'],
  },
  {
    triggers: ['software engineer', 'software developer', 'swe'],
    synonyms: ['Software Engineer', 'Backend Engineer', 'Full-Stack Engineer', 'Platform Engineer', 'Systems Engineer'],
  },
  {
    triggers: ['platform engineer', 'infrastructure engineer', 'site reliability engineer', 'sre', 'devops engineer', 'devops'],
    synonyms: ['Platform Engineer', 'Site Reliability Engineer', 'DevOps Engineer', 'Infrastructure Engineer', 'Systems Engineer'],
  },
  {
    triggers: ['distributed systems', 'systems engineer'],
    synonyms: ['Systems Engineer', 'Distributed Systems', 'Backend Engineer', 'Platform Engineer'],
  },
  {
    triggers: ['ai engineer', 'genai engineer', 'generative ai engineer', 'llm engineer', 'agentic ai'],
    synonyms: ['AI Engineer', 'GenAI Engineer', 'LLM Engineer', 'Applied AI Engineer', 'ML Platform Engineer'],
  },
  {
    triggers: ['machine learning engineer', 'ml engineer', 'applied scientist'],
    synonyms: ['Machine Learning Engineer', 'ML Engineer', 'Applied Scientist', 'AI Engineer', 'MLOps Engineer'],
  },
  {
    triggers: ['data engineer', 'analytics engineer', 'data platform engineer'],
    synonyms: ['Data Engineer', 'Data Platform Engineer', 'Analytics Engineer', 'Distributed Data Engineer'],
  },
  {
    triggers: ['mobile engineer', 'ios engineer', 'android engineer'],
    synonyms: ['Mobile Engineer', 'iOS Engineer', 'Android Engineer', 'React Native Engineer'],
  },
  {
    triggers: ['security engineer', 'appsec engineer', 'application security engineer'],
    synonyms: ['Security Engineer', 'Application Security Engineer', 'Cloud Security Engineer', 'Product Security Engineer'],
  },
];

export const QUERY_STOP_WORDS = new Set([
  'jobs', 'job', 'for', 'with', 'and', 'or', 'the', 'a', 'an', 'in', 'at', 'of', 'to',
  'h1b', 'h-1b', 'visa', 'sponsorship', 'sponsor', 'remote', 'worldwide', 'global',
  'immigration', 'work', 'permit', 'relocation', 'engineer', 'developer', 'senior',
  'lead', 'staff', 'principal', 'junior', 'mid', 'level',
]);

const GENERIC_STRUCTURAL_TOKENS = new Set([
  'systems', 'system', 'services', 'service', 'software', 'solutions', 'solution',
  'applications', 'application', 'architecture', 'development', 'web', 'cloud', 'data',
]);

export const TECH_AND_ROLE_ALIASES: Record<string, string[]> = {
  'react': ['reactjs', 'react.js'],
  'reactjs': ['react', 'react.js'],
  'react.js': ['react', 'reactjs'],
  'node': ['nodejs', 'node.js'],
  'nodejs': ['node', 'node.js'],
  'node.js': ['node', 'nodejs'],
  'next': ['nextjs', 'next.js'],
  'nextjs': ['next', 'next.js'],
  'next.js': ['next', 'nextjs'],
  'vue': ['vuejs', 'vue.js'],
  'vuejs': ['vue', 'vue.js'],
  'typescript': ['ts'],
  'ts': ['typescript'],
  'javascript': ['js'],
  'js': ['javascript'],
  'python': ['py'],
  'golang': ['go'],
  'go': ['golang'],
  'kubernetes': ['k8s'],
  'k8s': ['kubernetes'],
  'postgresql': ['postgres'],
  'postgres': ['postgresql'],
  'mongodb': ['mongo'],
  'mongo': ['mongodb'],
  'gen ai': ['gen ai', 'genai', 'generative ai', 'llm', 'llms', 'large language model', 'large language models', 'foundation model'],
  'genai': ['gen ai', 'genai', 'generative ai', 'llm', 'llms', 'large language model', 'large language models'],
  'generative ai': ['gen ai', 'genai', 'generative ai', 'llm', 'llms', 'large language model', 'large language models'],
  'agentic ai': ['agentic ai', 'agentic', 'ai agent', 'ai agents', 'autonomous agent', 'autonomous agents', 'multi-agent'],
  'agentic': ['agentic ai', 'agentic', 'ai agent', 'ai agents', 'autonomous agent', 'autonomous agents'],
  'ai agent': ['agentic ai', 'agentic', 'ai agent', 'ai agents', 'autonomous agent', 'autonomous agents'],
  'ai agents': ['agentic ai', 'agentic', 'ai agent', 'ai agents', 'autonomous agent', 'autonomous agents'],
  'machine learning': ['machine learning', 'ml', 'deep learning', 'neural network'],
  'ml': ['machine learning', 'deep learning'],
  'deep learning': ['machine learning', 'ml', 'deep learning', 'neural network'],
  'llm': ['gen ai', 'genai', 'generative ai', 'large language model', 'llms'],
  'llms': ['gen ai', 'genai', 'generative ai', 'large language model', 'llm'],
  'ci/cd': ['cicd', 'ci cd'],
  'cicd': ['ci/cd', 'ci cd'],
  'artificial intelligence': ['ai', 'artificial intelligence'],
  'ai': ['artificial intelligence'],
  'backend': ['back-end', 'server-side'],
  'back-end': ['backend', 'server-side'],
  'distributed': ['microservices', 'micro-services', 'event-driven', 'scalable', 'concurrent'],
  'distributed systems': ['microservices', 'micro-services', 'distributed computing', 'event-driven'],
  'microservices': ['micro-services', 'distributed systems', 'distributed'],
  'systems': ['system', 'platform', 'infrastructure'],
  'frontend': ['front-end', 'ui'],
  'fullstack': ['full-stack', 'full stack'],
  'full-stack': ['fullstack', 'full stack'],
};

export const NON_TECHNICAL_TITLES = [
  'alliance director', 'partner manager', 'partner development', 'strategic events',
  'program manager', 'product marketing', 'account executive', 'sales manager', 'sales development',
  'recruiter', 'talent acquisition', 'legal counsel', 'general counsel', 'accountant',
  'finance manager', 'events manager', 'event coordinator', 'office manager', 'customer success manager',
];

const TERM_REGEX_CACHE = new Map<string, RegExp>();
const ROLE_SYNONYMS_CACHE = new Map<string, string[]>();
const REGION_CODES_CACHE = new Map<string, string[]>();

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSafeTermRegex(term: string, caseSensitive = false): RegExp {
  const normalized = term.trim();
  const cacheKey = `${caseSensitive ? '1' : '0'}:${normalized}`;
  const cached = TERM_REGEX_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const escaped = escapeRegex(normalized).replace(/\s+/g, '\\s+');
  const flags = caseSensitive ? 'u' : 'iu';
  const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, flags);
  TERM_REGEX_CACHE.set(cacheKey, regex);
  return regex;
}

export function expandRoleSynonyms(query: string): string[] {
  const cleaned = query.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return ['Software Engineer', 'Backend Engineer', 'Full-Stack Engineer', 'Platform Engineer'];
  }

  const cached = ROLE_SYNONYMS_CACHE.get(cleaned);
  if (cached) {
    return cached;
  }

  const lower = cleaned.toLowerCase();
  const strippedSeniority = lower
    .replace(/^(senior|sr\.?|staff|principal|lead|mid|junior|jr\.?)\s+/i, '')
    .trim();

  const exactCluster = ROLE_SYNONYM_CLUSTERS.find(
    (cluster) => cluster.triggers.includes(lower) || cluster.triggers.includes(strippedSeniority),
  );
  const boundaryCluster =
    exactCluster ||
    ROLE_SYNONYM_CLUSTERS.find((cluster) =>
      cluster.triggers.some((t) => buildSafeTermRegex(t).test(lower)),
    );

  let resolved: string[];
  if (boundaryCluster) {
    const results = [...boundaryCluster.synonyms];
    if (!results.some((r) => r.toLowerCase() === lower)) {
      results.unshift(cleaned);
    }
    resolved = results;
  } else {
    resolved = [cleaned];
  }

  ROLE_SYNONYMS_CACHE.set(cleaned, resolved);
  return resolved;
}

export function resolveCountryRegionCodes(input: string, includeAmbiguousStateCheck = false): string[] {
  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') {
    return [];
  }

  const cacheKey = `${includeAmbiguousStateCheck ? '1' : '0'}:${trimmed}`;
  const cached = REGION_CODES_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const lower = trimmed.toLowerCase();
  const matched = new Set<string>();
  const hasExplicitUSState = includeAmbiguousStateCheck && US_STATE_ABBR_REGEX.test(trimmed);
  const hasExplicitCAProvince = includeAmbiguousStateCheck && CA_PROVINCE_ABBR_REGEX.test(trimmed);

  for (const entry of COUNTRY_CITY_LOOKUP) {
    const aliasMatched = entry.aliases.some((alias) => {
      // Avoid matching ", CA" (California, USA) as Canada when US state format is present
      if (entry.code === 'ca' && alias === 'ca' && hasExplicitUSState) {
        return false;
      }
      // Short 2-letter codes are uppercase-sensitive or strictly delimited in mixed location strings
      if (alias.length <= 2) {
        if (lower === alias) return true;
        return new RegExp(`(?:^|[,\\s(/])${escapeRegex(alias.toUpperCase())}(?=$|[,\\s)/])`).test(trimmed);
      }
      return buildSafeTermRegex(alias).test(lower);
    });

    if (aliasMatched) {
      matched.add(entry.code);
    }
  }

  // Only infer by city when not contradicted by an explicit US state, CA province, or explicit country marker
  const explicitCountryMatch = matched.size > 0;
  for (const entry of COUNTRY_CITY_LOOKUP) {
    if (hasExplicitUSState && entry.code !== 'us') {
      continue;
    }
    if (hasExplicitCAProvince && entry.code !== 'ca') {
      continue;
    }
    if (explicitCountryMatch && !matched.has(entry.code)) {
      continue;
    }
    const cityMatched = entry.cities.some((city) => buildSafeTermRegex(city).test(lower));
    if (cityMatched) {
      matched.add(entry.code);
    }
  }

  if (hasExplicitUSState && matched.size === 0) {
    matched.add('us');
  }
  if (hasExplicitCAProvince && matched.size === 0) {
    matched.add('ca');
  }

  const resolved = Array.from(matched);
  if (REGION_CODES_CACHE.size < 2000) {
    REGION_CODES_CACHE.set(cacheKey, resolved);
  }
  return resolved;
}

function resolveHubRegions(country?: string, countries?: string[]): VisaHubRegionCode[] {
  const allRegions = Object.keys(REGION_VISA_PROFILES) as VisaHubRegionCode[];
  const requested = [
    ...(country ? [country] : []),
    ...(countries || []),
  ]
    .map((c) => c.trim())
    .filter(Boolean);

  if (
    requested.length === 0 ||
    requested.some((r) => ['all', 'worldwide', 'global', 'any'].includes(r.toLowerCase()))
  ) {
    return allRegions;
  }

  const resolved = new Set<VisaHubRegionCode>();
  for (const item of requested) {
    const codes = resolveCountryRegionCodes(item, false);
    for (const code of codes) {
      if (code in REGION_VISA_PROFILES) {
        resolved.add(code as VisaHubRegionCode);
      }
    }
  }

  return resolved.size > 0 ? Array.from(resolved) : allRegions;
}

/**
 * Deterministically expands a job query into multi-region role synonyms,
 * regional work-permit/relocation OR-clauses, and parallel ATS site-dork queries.
 * Executes synchronously with zero LLM calls (<5ms).
 */
export function expandGlobalVisaQueries(
  input: ExpandGlobalVisaQueriesInput,
): ExpandedVisaQueriesResult {
  const originalQuery = (input.query || '').trim();
  const roleSynonyms = expandRoleSynonyms(originalQuery);
  const roleOrClause = quoteOrGroup(roleSynonyms);
  const regions = resolveHubRegions(input.country, input.countries);
  const atsDomains = [...(input.atsDomains?.length ? input.atsDomains : ATS_DISCOVERY_DOMAINS)];

  const regionalQueries: ExpandedQueryItem[] = [];
  const atsDorkQueries: ExpandedQueryItem[] = [];

  for (const regionCode of regions) {
    const profile = REGION_VISA_PROFILES[regionCode];
    const regionalDork = `${roleOrClause} ${profile.locationOrClause} ${profile.visaOrClause}`;

    regionalQueries.push({
      id: `region:${regionCode}`,
      region: regionCode,
      country: profile.country,
      roleClause: roleOrClause,
      visaClause: profile.visaOrClause,
      locationClause: profile.locationOrClause,
      dorkQuery: regionalDork,
    });

    for (const domain of atsDomains) {
      const atsDork = `site:${domain} ${roleOrClause} ${profile.locationOrClause} ${profile.visaOrClause}`;
      atsDorkQueries.push({
        id: `ats:${domain}:${regionCode}`,
        region: regionCode,
        country: profile.country,
        atsDomain: domain,
        roleClause: roleOrClause,
        visaClause: profile.visaOrClause,
        locationClause: profile.locationOrClause,
        dorkQuery: atsDork,
      });
    }
  }

  const queries = [...atsDorkQueries, ...regionalQueries];

  return {
    originalQuery,
    roleSynonyms,
    roleOrClause,
    regions,
    atsDomains,
    atsDorkQueries,
    regionalQueries,
    queries,
    queryStrings: queries.map((q) => q.dorkQuery),
  };
}

/**
 * Scores relevance of a job target against a query using tokenized weighted overlap,
 * word-boundary tech/role aliases, and title-first weighting.
 */
export function scoreTokenizedRelevance(
  query: string | undefined,
  target: string | TokenizedRelevanceTarget,
  options: { threshold?: number } = {},
): TokenizedRelevanceResult {
  const threshold = options.threshold ?? 0.35;

  if (!query || query.trim().length === 0) {
    return {
      score: 1,
      matched: true,
      matchedTokens: [],
      unmatchedTokens: [],
      titleHitCount: 0,
      aliasHitCount: 0,
    };
  }

  const titleText = (typeof target === 'string' ? target : target.title || '').toLowerCase();
  const descriptionText = (typeof target === 'string' ? '' : target.description || '').toLowerCase();
  const skillsText = (typeof target === 'string' ? '' : (target.skills || []).join(' ')).toLowerCase();
  const haystack = `${titleText} ${skillsText} ${descriptionText}`.trim();

  const orGroups = query
    .split(/\s+or\s+|,/i)
    .map((g) => g.replace(/[()"']/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase())
    .filter((g) => g.length > 0);

  if (orGroups.length === 0) {
    return {
      score: 1,
      matched: true,
      matchedTokens: [],
      unmatchedTokens: [],
      titleHitCount: 0,
      aliasHitCount: 0,
    };
  }

  const isNonTechTitle = NON_TECHNICAL_TITLES.some((nt) => titleText.includes(nt));

  let bestResult: TokenizedRelevanceResult = {
    score: 0,
    matched: false,
    matchedTokens: [],
    unmatchedTokens: [],
    titleHitCount: 0,
    aliasHitCount: 0,
  };

  for (const group of orGroups) {
    // 1. Direct phrase or alias match for the whole group
    const groupAliases = Array.from(new Set([group, ...(TECH_AND_ROLE_ALIASES[group] || [])]));
    let groupMatchedInTitle = false;
    let groupMatchedInSkillsOrDesc = false;

    for (const alias of groupAliases) {
      const reg = buildSafeTermRegex(alias);
      if (reg.test(titleText)) {
        groupMatchedInTitle = true;
        break;
      }
      if (reg.test(skillsText) || reg.test(descriptionText)) {
        groupMatchedInSkillsOrDesc = true;
      }
    }

    if (groupMatchedInTitle) {
      const candidate: TokenizedRelevanceResult = {
        score: 1,
        matched: true,
        matchedTokens: [group],
        unmatchedTokens: [],
        titleHitCount: 1,
        aliasHitCount: 1,
      };
      if (candidate.score > bestResult.score) bestResult = candidate;
      continue;
    }

    if (groupMatchedInSkillsOrDesc && !isNonTechTitle) {
      const candidate: TokenizedRelevanceResult = {
        score: 0.85,
        matched: 0.85 >= threshold,
        matchedTokens: [group],
        unmatchedTokens: [],
        titleHitCount: 0,
        aliasHitCount: 1,
      };
      if (candidate.score > bestResult.score) bestResult = candidate;
      continue;
    }

    // 2. Tokenize group with stop-word stripping
    const rawTokens = group
      .replace(/[^a-z0-9+#./\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    let tokens = rawTokens.filter((w) => !QUERY_STOP_WORDS.has(w));
    if (tokens.length === 0) {
      tokens = rawTokens.filter((w) => !['jobs', 'job', 'for', 'with', 'and', 'or', 'the', 'a', 'an', 'in', 'at', 'of', 'to'].includes(w));
    }

    if (tokens.length === 0) {
      continue;
    }

    let totalWeight = 0;
    let earnedWeight = 0;
    let titleHitCount = 0;
    let aliasHitCount = 0;
    const matchedTokens: string[] = [];
    const unmatchedTokens: string[] = [];

    for (const token of tokens) {
      const isGeneric = tokens.length > 1 && GENERIC_STRUCTURAL_TOKENS.has(token);
      const tokenWeight = isGeneric ? 0.45 : 1.0;
      totalWeight += tokenWeight;

      const directReg = buildSafeTermRegex(token);
      const aliases = TECH_AND_ROLE_ALIASES[token] || [];

      let multiplier = 0;
      let hitInTitle = false;
      let usedAlias = false;

      if (directReg.test(titleText)) {
        multiplier = 1.0;
        hitInTitle = true;
      } else if (directReg.test(skillsText)) {
        multiplier = 0.9;
      } else if (directReg.test(descriptionText)) {
        multiplier = 0.7;
      } else {
        for (const alias of aliases) {
          const aliasReg = buildSafeTermRegex(alias);
          if (aliasReg.test(titleText)) {
            multiplier = Math.max(multiplier, 0.8);
            hitInTitle = true;
            usedAlias = true;
          } else if (aliasReg.test(skillsText)) {
            multiplier = Math.max(multiplier, 0.7);
            usedAlias = true;
          } else if (aliasReg.test(descriptionText)) {
            multiplier = Math.max(multiplier, 0.55);
            usedAlias = true;
          }
        }
      }

      if (multiplier > 0) {
        earnedWeight += tokenWeight * multiplier;
        matchedTokens.push(token);
        if (hitInTitle) titleHitCount++;
        if (usedAlias) aliasHitCount++;
      } else {
        unmatchedTokens.push(token);
      }
    }

    if (isNonTechTitle && titleHitCount === 0) {
      continue;
    }

    const score = totalWeight > 0 ? Number((earnedWeight / totalWeight).toFixed(4)) : 0;
    const matched = score >= threshold && haystack.length > 0;

    if (score > bestResult.score) {
      bestResult = {
        score,
        matched,
        matchedTokens,
        unmatchedTokens,
        titleHitCount,
        aliasHitCount,
      };
    }
  }

  return bestResult;
}
