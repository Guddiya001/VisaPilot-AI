/**
 * Universal Visa & Location Header Formatter
 *
 * Parses target country, city, work mode, and visa sponsorship policy from any JD text or structured input,
 * generating unambiguous, jurisdiction-tailored single-line relocation & visa sponsorship headers.
 */

export interface JobLocationPolicy {
  country: string;
  workMode: 'remote' | 'hybrid' | 'onsite';
  sponsorsVisa: boolean;
  city?: string;
}

export interface HeaderFormatOptions {
  timezone?: string;
}

export const EU_SCHENGEN_COUNTRIES = new Set([
  'germany', 'netherlands', 'ireland', 'france', 'spain', 'sweden',
  'poland', 'denmark', 'austria', 'belgium', 'finland', 'norway',
  'switzerland', 'portugal', 'italy', 'estonia', 'czech republic', 'eu', 'europe',
]);

const CITY_TO_COUNTRY: Record<string, { country: string; city: string }> = {
  // UK
  london: { country: 'UK', city: 'London' },
  manchester: { country: 'UK', city: 'Manchester' },
  edinburgh: { country: 'UK', city: 'Edinburgh' },
  bristol: { country: 'UK', city: 'Bristol' },
  cambridge: { country: 'UK', city: 'Cambridge' },
  oxford: { country: 'UK', city: 'Oxford' },

  // Germany
  berlin: { country: 'Germany', city: 'Berlin' },
  munich: { country: 'Germany', city: 'Munich' },
  frankfurt: { country: 'Germany', city: 'Frankfurt' },
  hamburg: { country: 'Germany', city: 'Hamburg' },
  cologne: { country: 'Germany', city: 'Cologne' },

  // Netherlands
  amsterdam: { country: 'Netherlands', city: 'Amsterdam' },
  rotterdam: { country: 'Netherlands', city: 'Rotterdam' },
  utrecht: { country: 'Netherlands', city: 'Utrecht' },
  eindhoven: { country: 'Netherlands', city: 'Eindhoven' },

  // Ireland
  dublin: { country: 'Ireland', city: 'Dublin' },
  cork: { country: 'Ireland', city: 'Cork' },

  // France
  paris: { country: 'France', city: 'Paris' },
  lyon: { country: 'France', city: 'Lyon' },

  // Spain
  madrid: { country: 'Spain', city: 'Madrid' },
  barcelona: { country: 'Spain', city: 'Barcelona' },

  // Switzerland
  zurich: { country: 'Switzerland', city: 'Zurich' },
  geneva: { country: 'Switzerland', city: 'Geneva' },

  // Sweden / Denmark / Norway / Finland
  stockholm: { country: 'Sweden', city: 'Stockholm' },
  copenhagen: { country: 'Denmark', city: 'Copenhagen' },
  oslo: { country: 'Norway', city: 'Oslo' },
  helsinki: { country: 'Finland', city: 'Helsinki' },

  // Austria / Belgium / Portugal / Italy / Estonia / Czechia
  vienna: { country: 'Austria', city: 'Vienna' },
  brussels: { country: 'Belgium', city: 'Brussels' },
  lisbon: { country: 'Portugal', city: 'Lisbon' },
  milan: { country: 'Italy', city: 'Milan' },
  rome: { country: 'Italy', city: 'Rome' },
  tallinn: { country: 'Estonia', city: 'Tallinn' },
  prague: { country: 'Czech Republic', city: 'Prague' },

  // Poland
  warsaw: { country: 'Poland', city: 'Warsaw' },
  krakow: { country: 'Poland', city: 'Krakow' },

  // USA
  'san francisco': { country: 'USA', city: 'San Francisco' },
  'new york': { country: 'USA', city: 'New York' },
  nyc: { country: 'USA', city: 'New York' },
  seattle: { country: 'USA', city: 'Seattle' },
  austin: { country: 'USA', city: 'Austin' },
  boston: { country: 'USA', city: 'Boston' },
  chicago: { country: 'USA', city: 'Chicago' },
  'los angeles': { country: 'USA', city: 'Los Angeles' },

  // Canada
  toronto: { country: 'Canada', city: 'Toronto' },
  vancouver: { country: 'Canada', city: 'Vancouver' },
  montreal: { country: 'Canada', city: 'Montreal' },
  waterloo: { country: 'Canada', city: 'Waterloo' },
  ottawa: { country: 'Canada', city: 'Ottawa' },

  // Singapore & APAC & Middle East
  singapore: { country: 'Singapore', city: 'Singapore' },
  sydney: { country: 'Australia', city: 'Sydney' },
  melbourne: { country: 'Australia', city: 'Melbourne' },
  brisbane: { country: 'Australia', city: 'Brisbane' },
  tokyo: { country: 'Japan', city: 'Tokyo' },
  dubai: { country: 'UAE', city: 'Dubai' },
  'abu dhabi': { country: 'UAE', city: 'Abu Dhabi' },
};

/**
 * Normalizes country names for standard jurisdiction routing
 */
export function normalizeCountry(country: string): string {
  const lower = country.trim().toLowerCase();
  if (
    lower === 'uk' ||
    lower === 'united kingdom' ||
    lower === 'great britain' ||
    lower === 'england' ||
    lower === 'scotland' ||
    lower === 'wales'
  ) {
    return 'UK';
  }
  if (
    lower === 'us' ||
    lower === 'usa' ||
    lower === 'united states' ||
    lower === 'united states of america'
  ) {
    return 'USA';
  }
  if (lower === 'germany' || lower === 'deutschland') {
    return 'Germany';
  }
  if (lower === 'netherlands' || lower === 'holland') {
    return 'Netherlands';
  }
  if (lower === 'uae' || lower === 'united arab emirates') {
    return 'UAE';
  }
  if (lower === 'eu' || lower === 'europe' || lower === 'european union') {
    return 'EU';
  }
  if (lower === 'singapore') return 'Singapore';
  if (lower === 'ireland') return 'Ireland';
  if (lower === 'canada') return 'Canada';
  if (lower === 'australia') return 'Australia';
  if (lower === 'japan') return 'Japan';
  if (lower === 'worldwide' || lower === 'global' || lower === 'anywhere' || lower === 'remote') {
    return 'Worldwide';
  }

  return country
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parses target country, city, work mode, and visa sponsorship policy from raw JD text or partial input
 */
export function parseJobLocationPolicy(
  input: string | Partial<JobLocationPolicy> | Record<string, unknown>
): JobLocationPolicy {
  if (typeof input === 'object' && input !== null) {
    const inputRecord = input as Record<string, unknown>;
    const rawCountry = (inputRecord.country as string) || (inputRecord.location as string) || '';
    const rawCity = (inputRecord.city as string) || '';
    const workMode = (inputRecord.workMode as 'remote' | 'hybrid' | 'onsite') || 'remote';
    const sponsorsVisa = inputRecord.sponsorsVisa !== undefined ? Boolean(inputRecord.sponsorsVisa) : true;

    if (rawCountry) {
      return {
        country: normalizeCountry(rawCountry),
        workMode,
        sponsorsVisa,
        city: rawCity || undefined,
      };
    }
  }

  const text = typeof input === 'string' ? input : JSON.stringify(input);
  const lowerText = text.toLowerCase();

  // 1. Detect City & infer Country
  let detectedCity: string | undefined;
  let detectedCountry: string | undefined;

  for (const [cityKey, mapping] of Object.entries(CITY_TO_COUNTRY)) {
    const cityRegex = new RegExp(`\\b${cityKey}\\b`, 'i');
    if (cityRegex.test(lowerText)) {
      detectedCity = mapping.city;
      detectedCountry = mapping.country;
      break;
    }
  }

  // 2. Detect Country directly (checking case-sensitive uppercase US first to avoid matching "us")
  if (!detectedCountry) {
    if (/\b(?:uk|united kingdom|great britain|england|scotland|wales)\b/i.test(lowerText)) {
      detectedCountry = 'UK';
    } else if (/\b(?:germany|deutschland)\b/i.test(lowerText) || /,\s*DE\b/.test(text)) {
      detectedCountry = 'Germany';
    } else if (/\b(?:netherlands|holland)\b/i.test(lowerText) || /,\s*NL\b/.test(text)) {
      detectedCountry = 'Netherlands';
    } else if (/\bireland\b/i.test(lowerText)) {
      detectedCountry = 'Ireland';
    } else if (
      /\b(?:usa|united states|u\.s\.a\.|u\.s\.)\b/i.test(lowerText) ||
      /\b(?:Remote\s*[-–(]\s*US\b|\bUS\s*[-–)]\s*Remote|\bUS\s+only\b)/i.test(text) ||
      /\bUS\b/.test(text)
    ) {
      detectedCountry = 'USA';
    } else if (/\bcanada\b/i.test(lowerText)) {
      detectedCountry = 'Canada';
    } else if (/\bsingapore\b/i.test(lowerText)) {
      detectedCountry = 'Singapore';
    } else if (/\baustralia\b/i.test(lowerText)) {
      detectedCountry = 'Australia';
    } else if (/\bjapan\b/i.test(lowerText)) {
      detectedCountry = 'Japan';
    } else if (/\b(?:uae|united arab emirates)\b/i.test(lowerText)) {
      detectedCountry = 'UAE';
    } else if (/\bfrance\b/i.test(lowerText)) {
      detectedCountry = 'France';
    } else if (/\bspain\b/i.test(lowerText)) {
      detectedCountry = 'Spain';
    } else if (/\bswitzerland\b/i.test(lowerText)) {
      detectedCountry = 'Switzerland';
    } else if (/\bsweden\b/i.test(lowerText)) {
      detectedCountry = 'Sweden';
    } else if (/\bdenmark\b/i.test(lowerText)) {
      detectedCountry = 'Denmark';
    } else if (/\bnorway\b/i.test(lowerText)) {
      detectedCountry = 'Norway';
    } else if (/\bfinland\b/i.test(lowerText)) {
      detectedCountry = 'Finland';
    } else if (/\baustria\b/i.test(lowerText)) {
      detectedCountry = 'Austria';
    } else if (/\bbelgium\b/i.test(lowerText)) {
      detectedCountry = 'Belgium';
    } else if (/\bportugal\b/i.test(lowerText)) {
      detectedCountry = 'Portugal';
    } else if (/\bitaly\b/i.test(lowerText)) {
      detectedCountry = 'Italy';
    } else if (/\bestonia\b/i.test(lowerText)) {
      detectedCountry = 'Estonia';
    } else if (/\bpoland\b/i.test(lowerText)) {
      detectedCountry = 'Poland';
    } else if (/\b(?:EU|Europe)\b/.test(text)) {
      detectedCountry = 'EU';
    } else if (/\b(?:worldwide|global remote|anywhere|work from anywhere)\b/i.test(lowerText)) {
      detectedCountry = 'Worldwide';
    } else {
      detectedCountry = 'Worldwide';
    }
  }

  // 3. Detect Work Mode
  let workMode: 'remote' | 'hybrid' | 'onsite' = 'remote';
  if (/\b(?:hybrid|flexible office|\d+\s*days\s*(?:in|per\s*week\s*in)\s*office)\b/i.test(lowerText)) {
    workMode = 'hybrid';
  } else if (/\b(?:on-?site|in-?office|office-?based)\b/i.test(lowerText)) {
    workMode = 'onsite';
  } else if (/\b(?:remote|work from home|wfh|distributed)\b/i.test(lowerText)) {
    workMode = 'remote';
  }

  // 4. Detect Visa Sponsorship
  let sponsorsVisa = true;
  if (
    /\b(?:no\s*(?:visa\s*)?sponsorship|cannot\s*sponsor|unable\s*to\s*sponsor|does\s*not\s*sponsor|not\s*eligible\s*for\s*sponsorship|without\s*(?:company\s*)?sponsorship|must\s*be\s*authorized\s*to\s*work\s*without|us\s*citizen\s*or\s*green\s*card\s*only)\b/i.test(
      lowerText
    )
  ) {
    sponsorsVisa = false;
  }

  return {
    country: detectedCountry,
    workMode,
    sponsorsVisa,
    city: detectedCity,
  };
}

/**
 * Formats a clean, recruiter-aligned single-line location and visa sponsorship header.
 *
 * Jurisdiction Rules:
 * - UK roles:
 *   "Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)"
 * - EU / Schengen roles (Germany, Netherlands, Ireland, Denmark, etc.):
 *   "Noida, India (Open to [Country] Relocation | EU Blue Card / Visa Sponsorship Required)"
 * - US / Canada roles:
 *   "Noida, India (Open to Relocation | Visa Sponsorship Required)"
 * - Singapore roles:
 *   "Noida, India (Open to Singapore Relocation | Employment Pass / Visa Sponsorship Required)"
 * - Global Remote roles:
 *   "Noida, India (Open to Global Remote | UTC+5:30)"
 * - Other international roles:
 *   "Noida, India (Open to [Country] Relocation | Visa Sponsorship Required)"
 */
export function formatVisaLocationHeader(
  candidateCity: string = 'Noida, India',
  jdLocationOrInput: JobLocationPolicy | string | Record<string, unknown>,
  options: HeaderFormatOptions = {}
): string {
  const timezone = options.timezone || 'UTC+5:30';
  let policy: JobLocationPolicy;

  if (
    typeof jdLocationOrInput === 'object' &&
    jdLocationOrInput !== null &&
    'country' in jdLocationOrInput &&
    'workMode' in jdLocationOrInput
  ) {
    policy = {
      country: normalizeCountry(jdLocationOrInput.country as string),
      workMode: (jdLocationOrInput.workMode as 'remote' | 'hybrid' | 'onsite') || 'remote',
      sponsorsVisa:
        jdLocationOrInput.sponsorsVisa !== undefined ? Boolean(jdLocationOrInput.sponsorsVisa) : true,
      city: (jdLocationOrInput.city as string) || undefined,
    };
  } else {
    policy = parseJobLocationPolicy(jdLocationOrInput);
  }

  const rawCountry = policy.country?.trim() || '';
  const lowerCountry = rawCountry.toLowerCase();
  const workMode = policy.workMode || 'remote';

  // 1. Global / Worldwide remote roles
  const isGlobalRemote =
    lowerCountry === 'worldwide' ||
    lowerCountry === 'global' ||
    lowerCountry === 'anywhere' ||
    (lowerCountry === 'remote' && workMode === 'remote');

  if (isGlobalRemote) {
    return `${candidateCity} (Open to Global Remote | ${timezone})`;
  }

  const standardCountry = normalizeCountry(rawCountry);

  // If no sponsorship is provided
  if (!policy.sponsorsVisa) {
    if (workMode === 'remote') {
      return `${candidateCity} (Open to Remote | ${timezone})`;
    }
    return `${candidateCity} (Open to ${standardCountry} Relocation)`;
  }

  // 2. UK roles with Skilled Worker Visa sponsorship
  if (standardCountry === 'UK') {
    return `${candidateCity} (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)`;
  }

  // 3. EU / Schengen Blue Card roles (Germany, Netherlands, Ireland, EU, etc.)
  if (EU_SCHENGEN_COUNTRIES.has(standardCountry.toLowerCase())) {
    const relocationLabel = standardCountry === 'EU' ? 'EU Relocation' : `${standardCountry} Relocation`;
    return `${candidateCity} (Open to ${relocationLabel} | EU Blue Card / Visa Sponsorship Required)`;
  }

  // 4. US / Canada roles
  if (standardCountry === 'USA' || standardCountry === 'Canada') {
    return `${candidateCity} (Open to Relocation | Visa Sponsorship Required)`;
  }

  // 5. Singapore (Employment Pass)
  if (standardCountry === 'Singapore') {
    return `${candidateCity} (Open to Singapore Relocation | Employment Pass / Visa Sponsorship Required)`;
  }

  // 6. Default international country-specific relocation (e.g. Australia, Japan, UAE)
  return `${candidateCity} (Open to ${standardCountry} Relocation | Visa Sponsorship Required)`;
}

/**
 * Checks if raw resume text contains duplicate location/visa sub-headers
 */
export function hasDuplicateVisaSubHeader(text: string): boolean {
  const matches = text.match(/open\s*to:?\s*.*(?:visa\s*sponsorship\s*required|relocation|global\s*remote)/gi);
  return Boolean(matches && matches.length > 1);
}

/**
 * Removes duplicate visa/location sub-headers from raw resume header text
 */
export function removeDuplicateVisaSubHeaders(headerText: string): string {
  const lines = headerText.split('\n');
  const filteredLines: string[] = [];
  let foundPrimaryLocationHeader = false;

  for (const line of lines) {
    const isPrimaryHeader =
      /open\s*to\s*(?:[a-z\s]+)?(?:relocation|global\s*remote)\s*\|.*(?:visa\s*sponsorship\s*required|utc)/i.test(
        line
      );

    if (isPrimaryHeader) {
      if (!foundPrimaryLocationHeader) {
        foundPrimaryLocationHeader = true;
        filteredLines.push(line);
      }
      continue;
    }

    // Drop redundant secondary lines like "Open to: Remote Visa Sponsorship Required"
    if (
      foundPrimaryLocationHeader &&
      /^open\s*to:?\s*.*(?:visa\s*sponsorship|relocation|remote)/i.test(line.trim())
    ) {
      continue;
    }

    filteredLines.push(line);
  }

  return filteredLines.join('\n');
}
