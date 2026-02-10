/**
 * IP Geolocation Service
 *
 * Offline IP-to-location lookup using geoip-lite (MaxMind GeoLite2 database).
 * No external API calls — the database is bundled with the package.
 */

import geoip from "geoip-lite";

/** ISO-2 code → full country name (common countries; fallback to code) */
const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AD: "Andorra", AO: "Angola",
  AR: "Argentina", AM: "Armenia", AU: "Australia", AT: "Austria", AZ: "Azerbaijan",
  BH: "Bahrain", BD: "Bangladesh", BY: "Belarus", BE: "Belgium", BJ: "Benin",
  BT: "Bhutan", BO: "Bolivia", BA: "Bosnia and Herzegovina", BW: "Botswana",
  BR: "Brazil", BN: "Brunei", BG: "Bulgaria", BF: "Burkina Faso", BI: "Burundi",
  KH: "Cambodia", CM: "Cameroon", CA: "Canada", CF: "Central African Republic",
  TD: "Chad", CL: "Chile", CN: "China", CO: "Colombia", CG: "Congo",
  CR: "Costa Rica", HR: "Croatia", CU: "Cuba", CY: "Cyprus", CZ: "Czechia",
  DK: "Denmark", DJ: "Djibouti", DO: "Dominican Republic", EC: "Ecuador",
  EG: "Egypt", SV: "El Salvador", EE: "Estonia", ET: "Ethiopia", FI: "Finland",
  FR: "France", GA: "Gabon", DE: "Germany", GH: "Ghana", GR: "Greece",
  GT: "Guatemala", GN: "Guinea", HT: "Haiti", HN: "Honduras", HK: "Hong Kong",
  HU: "Hungary", IS: "Iceland", IN: "India", ID: "Indonesia", IR: "Iran",
  IQ: "Iraq", IE: "Ireland", IL: "Israel", IT: "Italy", JM: "Jamaica",
  JP: "Japan", JO: "Jordan", KZ: "Kazakhstan", KE: "Kenya", KW: "Kuwait",
  KG: "Kyrgyzstan", LA: "Laos", LV: "Latvia", LB: "Lebanon", LY: "Libya",
  LT: "Lithuania", LU: "Luxembourg", MO: "Macao", MG: "Madagascar", MY: "Malaysia",
  ML: "Mali", MT: "Malta", MX: "Mexico", MD: "Moldova", MN: "Mongolia",
  ME: "Montenegro", MA: "Morocco", MZ: "Mozambique", MM: "Myanmar", NA: "Namibia",
  NP: "Nepal", NL: "Netherlands", NZ: "New Zealand", NI: "Nicaragua", NE: "Niger",
  NG: "Nigeria", NO: "Norway", OM: "Oman", PK: "Pakistan", PA: "Panama",
  PY: "Paraguay", PE: "Peru", PH: "Philippines", PL: "Poland", PT: "Portugal",
  QA: "Qatar", RO: "Romania", RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia",
  SN: "Senegal", RS: "Serbia", SG: "Singapore", SK: "Slovakia", SI: "Slovenia",
  ZA: "South Africa", KR: "South Korea", ES: "Spain", LK: "Sri Lanka",
  SD: "Sudan", SE: "Sweden", CH: "Switzerland", SY: "Syria", TW: "Taiwan",
  TJ: "Tajikistan", TZ: "Tanzania", TH: "Thailand", TN: "Tunisia", TR: "Turkey",
  TM: "Turkmenistan", UG: "Uganda", UA: "Ukraine", AE: "United Arab Emirates",
  GB: "United Kingdom", US: "United States", UY: "Uruguay", UZ: "Uzbekistan",
  VE: "Venezuela", VN: "Vietnam", YE: "Yemen", ZM: "Zambia", ZW: "Zimbabwe",
};

export interface GeoResult {
  countryCode: string;   // ISO-2 (e.g. "MY")
  countryName: string;   // Full name (e.g. "Malaysia")
  city: string | null;   // City name or null
}

/**
 * Look up geographic location for an IP address.
 * Returns null for private/unknown IPs.
 */
export function lookupIP(ip: string): GeoResult | null {
  try {
    const geo = geoip.lookup(ip);
    if (!geo || !geo.country) {
      return null;
    }

    const countryCode = geo.country; // ISO-2
    const countryName = COUNTRY_NAMES[countryCode] || countryCode;
    const city = geo.city || null;

    return { countryCode, countryName, city };
  } catch (error) {
    console.error(`[Geo] Lookup failed for ${ip}:`, error);
    return null;
  }
}
