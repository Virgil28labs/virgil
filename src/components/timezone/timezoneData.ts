/**
 * Timezone Database and Utilities
 *
 * Provides timezone data, search functionality, and mappings for the timezone widget.
 * City-first approach for better user experience.
 */

export interface TimezoneInfo {
  timezone: string;
  city: string;
  country: string;
  region?: string;
  popular: boolean;
  searchTerms: string[];
}

export interface SelectedTimezone {
  id: string;
  timezone: string;
  label: string;
  order: number;
}

/**
 * Comprehensive timezone database with city-first approach
 * Popular timezones marked for priority display
 */
export const TIMEZONE_DATABASE: TimezoneInfo[] = [
  // North America - Popular
  {
    timezone: "America/New_York",
    city: "New York",
    country: "United States",
    region: "Eastern",
    popular: true,
    searchTerms: [
      "new york",
      "nyc",
      "eastern",
      "est",
      "edt",
      "us east",
      "america/new_york",
    ],
  },
  {
    timezone: "America/Los_Angeles",
    city: "Los Angeles",
    country: "United States",
    region: "Pacific",
    popular: true,
    searchTerms: [
      "los angeles",
      "la",
      "pacific",
      "pst",
      "pdt",
      "us west",
      "california",
      "america/los_angeles",
    ],
  },
  {
    timezone: "America/Chicago",
    city: "Chicago",
    country: "United States",
    region: "Central",
    popular: true,
    searchTerms: [
      "chicago",
      "central",
      "cst",
      "cdt",
      "us central",
      "america/chicago",
    ],
  },
  {
    timezone: "America/Denver",
    city: "Denver",
    country: "United States",
    region: "Mountain",
    popular: false,
    searchTerms: [
      "denver",
      "mountain",
      "mst",
      "mdt",
      "us mountain",
      "america/denver",
    ],
  },
  {
    timezone: "America/Toronto",
    city: "Toronto",
    country: "Canada",
    region: "Eastern",
    popular: true,
    searchTerms: ["toronto", "canada", "canada east", "america/toronto"],
  },

  // Europe - Popular
  {
    timezone: "Europe/London",
    city: "London",
    country: "United Kingdom",
    popular: true,
    searchTerms: [
      "london",
      "uk",
      "britain",
      "gmt",
      "bst",
      "united kingdom",
      "europe/london",
    ],
  },
  {
    timezone: "Europe/Paris",
    city: "Paris",
    country: "France",
    popular: true,
    searchTerms: ["paris", "france", "cet", "cest", "europe/paris"],
  },
  {
    timezone: "Europe/Berlin",
    city: "Berlin",
    country: "Germany",
    popular: true,
    searchTerms: [
      "berlin",
      "germany",
      "deutschland",
      "cet",
      "cest",
      "europe/berlin",
    ],
  },
  {
    timezone: "Europe/Rome",
    city: "Rome",
    country: "Italy",
    popular: false,
    searchTerms: ["rome", "italy", "italia", "cet", "cest", "europe/rome"],
  },
  {
    timezone: "Europe/Madrid",
    city: "Madrid",
    country: "Spain",
    popular: false,
    searchTerms: ["madrid", "spain", "españa", "cet", "cest", "europe/madrid"],
  },
  {
    timezone: "Europe/Amsterdam",
    city: "Amsterdam",
    country: "Netherlands",
    popular: false,
    searchTerms: [
      "amsterdam",
      "netherlands",
      "holland",
      "cet",
      "cest",
      "europe/amsterdam",
    ],
  },
  {
    timezone: "Europe/Zurich",
    city: "Zurich",
    country: "Switzerland",
    popular: false,
    searchTerms: [
      "zurich",
      "switzerland",
      "swiss",
      "cet",
      "cest",
      "europe/zurich",
    ],
  },

  // Asia Pacific - Popular
  {
    timezone: "Asia/Tokyo",
    city: "Tokyo",
    country: "Japan",
    popular: true,
    searchTerms: ["tokyo", "japan", "jst", "asia/tokyo"],
  },
  {
    timezone: "Asia/Shanghai",
    city: "Shanghai",
    country: "China",
    popular: true,
    searchTerms: ["shanghai", "china", "beijing", "cst", "asia/shanghai"],
  },
  {
    timezone: "Asia/Hong_Kong",
    city: "Hong Kong",
    country: "Hong Kong",
    popular: true,
    searchTerms: ["hong kong", "hk", "hkt", "asia/hong_kong"],
  },
  {
    timezone: "Asia/Singapore",
    city: "Singapore",
    country: "Singapore",
    popular: true,
    searchTerms: ["singapore", "sgt", "asia/singapore"],
  },
  {
    timezone: "Asia/Seoul",
    city: "Seoul",
    country: "South Korea",
    popular: true,
    searchTerms: ["seoul", "south korea", "korea", "kst", "asia/seoul"],
  },
  {
    timezone: "Asia/Mumbai",
    city: "Mumbai",
    country: "India",
    popular: true,
    searchTerms: [
      "mumbai",
      "india",
      "bombay",
      "delhi",
      "ist",
      "asia/mumbai",
      "asia/kolkata",
    ],
  },
  {
    timezone: "Asia/Bangkok",
    city: "Bangkok",
    country: "Thailand",
    popular: false,
    searchTerms: ["bangkok", "thailand", "ict", "asia/bangkok"],
  },
  {
    timezone: "Asia/Dubai",
    city: "Dubai",
    country: "UAE",
    popular: true,
    searchTerms: ["dubai", "uae", "emirates", "gst", "asia/dubai"],
  },

  // Australia
  {
    timezone: "Australia/Sydney",
    city: "Sydney",
    country: "Australia",
    region: "Eastern",
    popular: true,
    searchTerms: ["sydney", "australia", "aest", "aedt", "australia/sydney"],
  },
  {
    timezone: "Australia/Melbourne",
    city: "Melbourne",
    country: "Australia",
    region: "Eastern",
    popular: false,
    searchTerms: [
      "melbourne",
      "australia",
      "aest",
      "aedt",
      "australia/melbourne",
    ],
  },
  {
    timezone: "Australia/Perth",
    city: "Perth",
    country: "Australia",
    region: "Western",
    popular: false,
    searchTerms: ["perth", "australia", "awst", "australia/perth"],
  },

  // Other Important
  {
    timezone: "Pacific/Auckland",
    city: "Auckland",
    country: "New Zealand",
    popular: false,
    searchTerms: [
      "auckland",
      "new zealand",
      "nzst",
      "nzdt",
      "pacific/auckland",
    ],
  },
  {
    timezone: "America/Sao_Paulo",
    city: "São Paulo",
    country: "Brazil",
    popular: false,
    searchTerms: ["sao paulo", "brazil", "brasil", "brt", "america/sao_paulo"],
  },
  {
    timezone: "America/Mexico_City",
    city: "Mexico City",
    country: "Mexico",
    popular: false,
    searchTerms: ["mexico city", "mexico", "cst", "cdt", "america/mexico_city"],
  },
  {
    timezone: "Africa/Cairo",
    city: "Cairo",
    country: "Egypt",
    popular: false,
    searchTerms: ["cairo", "egypt", "eet", "eest", "africa/cairo"],
  },
  {
    timezone: "Europe/Moscow",
    city: "Moscow",
    country: "Russia",
    popular: false,
    searchTerms: ["moscow", "russia", "msk", "europe/moscow"],
  },

  // UTC
  {
    timezone: "UTC",
    city: "UTC",
    country: "Coordinated Universal Time",
    popular: true,
    searchTerms: ["utc", "gmt", "universal", "coordinated", "greenwich"],
  },
];

/**
 * Search timezones by query string
 * Returns results prioritized by popularity and relevance
 */
export function searchTimezones(query: string, limit = 10): TimezoneInfo[] {
  if (!query || query.length < 2) {
    return TIMEZONE_DATABASE.filter((tz) => tz.popular).slice(0, limit);
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Score each timezone based on match quality
  const scored = TIMEZONE_DATABASE.map((timezone) => {
    let score = 0;

    // Exact matches get highest score
    if (timezone.city.toLowerCase() === normalizedQuery) score += 100;
    if (timezone.country.toLowerCase() === normalizedQuery) score += 90;
    if (timezone.timezone.toLowerCase() === normalizedQuery) score += 80;

    // Partial matches
    if (timezone.city.toLowerCase().includes(normalizedQuery)) score += 60;
    if (timezone.country.toLowerCase().includes(normalizedQuery)) score += 50;
    if (timezone.region?.toLowerCase().includes(normalizedQuery)) score += 40;

    // Search terms matches
    timezone.searchTerms.forEach((term) => {
      if (term === normalizedQuery) score += 70;
      if (term.includes(normalizedQuery)) score += 30;
    });

    // Boost popular timezones
    if (timezone.popular) score += 20;

    return { timezone, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.timezone);
}

/**
 * Get popular timezones for quick selection
 */
export function getPopularTimezones(): TimezoneInfo[] {
  return TIMEZONE_DATABASE.filter((tz) => tz.popular);
}

/**
 * Get timezone info by timezone identifier
 */
export function getTimezoneInfo(timezone: string): TimezoneInfo | undefined {
  return TIMEZONE_DATABASE.find((tz) => tz.timezone === timezone);
}

/**
 * Generate unique ID for selected timezone
 */
export function generateTimezoneId(): string {
  return `timezone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default timezone list for new users
 */
export function getDefaultTimezones(): SelectedTimezone[] {
  // Start with user's local timezone
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localInfo = getTimezoneInfo(localTimezone);

  return [
    {
      id: generateTimezoneId(),
      timezone: localTimezone,
      label: localInfo ? localInfo.city : "Local Time",
      order: 0,
    },
  ];
}
