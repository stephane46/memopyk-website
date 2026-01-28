import { useState, useEffect } from 'react';

// COMPLETE Country name to ISO code mapping - ALL 195+ countries
const countryNameToCode: { [key: string]: string } = {
  // Europe
  'Albania': 'AL',
  'Andorra': 'AD',
  'Armenia': 'AM',
  'Austria': 'AT',
  'Azerbaijan': 'AZ',
  'Belarus': 'BY',
  'Belgium': 'BE',
  'Bosnia and Herzegovina': 'BA',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Cyprus': 'CY',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Denmark': 'DK',
  'Estonia': 'EE',
  'Finland': 'FI',
  'France': 'FR',
  'Georgia': 'GE',
  'Germany': 'DE',
  'Greece': 'GR',
  'Hungary': 'HU',
  'Iceland': 'IS',
  'Ireland': 'IE',
  'Italy': 'IT',
  'Kazakhstan': 'KZ',
  'Kosovo': 'XK',
  'Latvia': 'LV',
  'Liechtenstein': 'LI',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Malta': 'MT',
  'Moldova': 'MD',
  'Monaco': 'MC',
  'Montenegro': 'ME',
  'Netherlands': 'NL',
  'North Macedonia': 'MK',
  'Norway': 'NO',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Romania': 'RO',
  'Russia': 'RU',
  'San Marino': 'SM',
  'Serbia': 'RS',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Spain': 'ES',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Turkey': 'TR',
  'Ukraine': 'UA',
  'United Kingdom': 'GB',
  'Vatican City': 'VA',

  // Asia
  'Afghanistan': 'AF',
  'Bahrain': 'BH',
  'Bangladesh': 'BD',
  'Bhutan': 'BT',
  'Brunei': 'BN',
  'Cambodia': 'KH',
  'China': 'CN',
  'India': 'IN',
  'Indonesia': 'ID',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Israel': 'IL',
  'Japan': 'JP',
  'Jordan': 'JO',
  'Kuwait': 'KW',
  'Kyrgyzstan': 'KG',
  'Laos': 'LA',
  'Lebanon': 'LB',
  'Malaysia': 'MY',
  'Maldives': 'MV',
  'Mongolia': 'MN',
  'Myanmar': 'MM',
  'Nepal': 'NP',
  'North Korea': 'KP',
  'Oman': 'OM',
  'Pakistan': 'PK',
  'Palestine': 'PS',
  'Philippines': 'PH',
  'Qatar': 'QA',
  'Saudi Arabia': 'SA',
  'Singapore': 'SG',
  'South Korea': 'KR',
  'Sri Lanka': 'LK',
  'Syria': 'SY',
  'Taiwan': 'TW',
  'Tajikistan': 'TJ',
  'Thailand': 'TH',
  'Timor-Leste': 'TL',
  'Turkmenistan': 'TM',
  'UAE': 'AE',
  'United Arab Emirates': 'AE',
  'Uzbekistan': 'UZ',
  'Vietnam': 'VN',
  'Yemen': 'YE',

  // Africa
  'Algeria': 'DZ',
  'Angola': 'AO',
  'Benin': 'BJ',
  'Botswana': 'BW',
  'Burkina Faso': 'BF',
  'Burundi': 'BI',
  'Cameroon': 'CM',
  'Cape Verde': 'CV',
  'Central African Republic': 'CF',
  'Chad': 'TD',
  'Comoros': 'KM',
  'Congo': 'CG',
  'Democratic Republic of the Congo': 'CD',
  'Djibouti': 'DJ',
  'Egypt': 'EG',
  'Equatorial Guinea': 'GQ',
  'Eritrea': 'ER',
  'Eswatini': 'SZ',
  'Ethiopia': 'ET',
  'Gabon': 'GA',
  'Gambia': 'GM',
  'Ghana': 'GH',
  'Guinea': 'GN',
  'Guinea-Bissau': 'GW',
  'Ivory Coast': 'CI',
  'Kenya': 'KE',
  'Lesotho': 'LS',
  'Liberia': 'LR',
  'Libya': 'LY',
  'Madagascar': 'MG',
  'Malawi': 'MW',
  'Mali': 'ML',
  'Mauritania': 'MR',
  'Mauritius': 'MU',
  'Morocco': 'MA',
  'Mozambique': 'MZ',
  'Namibia': 'NA',
  'Niger': 'NE',
  'Nigeria': 'NG',
  'Rwanda': 'RW',
  'Sao Tome and Principe': 'ST',
  'Senegal': 'SN',
  'Seychelles': 'SC',
  'Sierra Leone': 'SL',
  'Somalia': 'SO',
  'South Africa': 'ZA',
  'South Sudan': 'SS',
  'Sudan': 'SD',
  'Tanzania': 'TZ',
  'Togo': 'TG',
  'Tunisia': 'TN',
  'Uganda': 'UG',
  'Zambia': 'ZM',
  'Zimbabwe': 'ZW',

  // North America
  'Antigua and Barbuda': 'AG',
  'Bahamas': 'BS',
  'Barbados': 'BB',
  'Belize': 'BZ',
  'Canada': 'CA',
  'Costa Rica': 'CR',
  'Cuba': 'CU',
  'Dominica': 'DM',
  'Dominican Republic': 'DO',
  'El Salvador': 'SV',
  'Grenada': 'GD',
  'Guatemala': 'GT',
  'Haiti': 'HT',
  'Honduras': 'HN',
  'Jamaica': 'JM',
  'Mexico': 'MX',
  'Nicaragua': 'NI',
  'Panama': 'PA',
  'Saint Kitts and Nevis': 'KN',
  'Saint Lucia': 'LC',
  'Saint Vincent and the Grenadines': 'VC',
  'Trinidad and Tobago': 'TT',
  'United States': 'US',
  'USA': 'US',

  // South America
  'Argentina': 'AR',
  'Bolivia': 'BO',
  'Brazil': 'BR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Ecuador': 'EC',
  'Guyana': 'GY',
  'Paraguay': 'PY',
  'Peru': 'PE',
  'Suriname': 'SR',
  'Uruguay': 'UY',
  'Venezuela': 'VE',

  // Oceania
  'Australia': 'AU',
  'Fiji': 'FJ',
  'Kiribati': 'KI',
  'Marshall Islands': 'MH',
  'Micronesia': 'FM',
  'Nauru': 'NR',
  'New Zealand': 'NZ',
  'Palau': 'PW',
  'Papua New Guinea': 'PG',
  'Samoa': 'WS',
  'Solomon Islands': 'SB',
  'Tonga': 'TO',
  'Tuvalu': 'TV',
  'Vanuatu': 'VU',

  // Additional territories and common variations
  'Hong Kong': 'HK',
  'Macao': 'MO',
  'Puerto Rico': 'PR',
  'Greenland': 'GL',
  'Faroe Islands': 'FO',
  'Gibraltar': 'GI',
  'Isle of Man': 'IM',
  'Jersey': 'JE',
  'Guernsey': 'GG',
  'Bermuda': 'BM',
  'Cayman Islands': 'KY',
  'British Virgin Islands': 'VG',
  'US Virgin Islands': 'VI',
  'American Samoa': 'AS',
  'Guam': 'GU',
  'Northern Mariana Islands': 'MP',
  'French Polynesia': 'PF',
  'New Caledonia': 'NC',
  'Cook Islands': 'CK',
  'Niue': 'NU',
  'Tokelau': 'TK',
  'Pitcairn': 'PN',
  'Norfolk Island': 'NF',
  'Christmas Island': 'CX',
  'Cocos Islands': 'CC',
  'Heard Island': 'HM',
  'Bouvet Island': 'BV',
  'South Georgia': 'GS',
  'Svalbard': 'SJ',
  'Antarctica': 'AQ'
};

// Full country mapping (will be loaded dynamically)
let fullCountryMapping: { [key: string]: string } = {};

interface CountryFlagProps {
  country: string;
  className?: string;
  size?: number;
}

/**
 * Professional Country Flag Component
 * 
 * Features complete coverage of all 195+ countries using the hampusborgos/country-flags
 * repository with accurate SVG renderings that match official country legislation.
 * 
 * Fallback system:
 * 1. SVG flags from professional flag repository (255 countries/territories)
 * 2. Unicode flag emojis for any remaining edge cases
 * 3. Neutral placeholder only for invalid data
 */
export function CountryFlag({ country, className = "", size = 20 }: CountryFlagProps) {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [flagSvgExists, setFlagSvgExists] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Handle "(not set)" entries with globe icon
    if (country === '(not set)') {
      setCountryCode('globe');
      setIsLoading(false);
      return;
    }

    // Load full country mapping if not loaded
    if (Object.keys(fullCountryMapping).length === 0) {
      fetch('/flags/countries.json')
        .then(res => res.json())
        .then(data => {
          fullCountryMapping = data;
          // Create reverse mapping for country names
          Object.entries(data).forEach(([code, name]) => {
            countryNameToCode[name as string] = code;
          });
          processCountry();
        })
        .catch(() => processCountry()); // Fallback if JSON fails to load
    } else {
      processCountry();
    }

    function processCountry() {
      if (!country || country === 'Unknown') {
        setCountryCode(null);
        setIsLoading(false);
        return;
      }

      // Try direct ISO code first - this should work for FR, US, GB, IT, ES from GA4
      let code = country.toUpperCase();
      
      if (code.length === 2) {
        setCountryCode(code);
        checkFlagExists(code);
        return;
      }

      // Try country name mapping
      code = countryNameToCode[country] || countryNameToCode[country.toLowerCase()];
      if (code) {
        setCountryCode(code);
        checkFlagExists(code);
        return;
      }

      // Try partial matching for fuzzy names
      const fuzzyMatch = Object.keys(countryNameToCode).find(name => 
        name.toLowerCase().includes(country.toLowerCase()) ||
        country.toLowerCase().includes(name.toLowerCase())
      );
      
      if (fuzzyMatch) {
        code = countryNameToCode[fuzzyMatch];
        setCountryCode(code);
        checkFlagExists(code);
        return;
      }

      setCountryCode(null);
      setIsLoading(false);
    }

    function checkFlagExists(code: string) {
      const flagPath = `/flags/${code.toLowerCase()}.svg`;
      
      const img = new Image();
      img.onload = () => {
        setFlagSvgExists(true);
        setIsLoading(false);
      };
      img.onerror = () => {
        setFlagSvgExists(false);
        setIsLoading(false);
      };
      img.src = flagPath;
    }
  }, [country]);

  // Show loading placeholder during flag detection
  if (isLoading && countryCode) {

    return (
      <div 
        className={`inline-flex items-center justify-center ${className}`}
        style={{
          width: `${size}px`,
          height: `${Math.round(size * 0.75)}px`,
          backgroundColor: '#f3f4f6',
          borderRadius: '2px',
          border: '1px solid rgba(0,0,0,0.1)'
        }}
      >
        <div style={{
          width: '60%',
          height: '60%',
          backgroundColor: '#e5e7eb',
          borderRadius: '1px'
        }} />
      </div>
    );
  }

  // Professional SVG flag (preferred)
  if (countryCode && flagSvgExists && !isLoading) {

    return (
      <img
        src={`/flags/${countryCode.toLowerCase()}.svg`}
        alt={`${country} flag`}
        width={size}
        height={Math.round(size * 0.75)} // Standard 4:3 ratio
        className={`inline-block ${className}`}
        style={{
          objectFit: 'contain',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '2px'
        }}
      />
    );
  }

  // Special handling for "(not set)" entries with globe icon
  if (countryCode === 'globe' && !isLoading) {
    return (
      <div 
        className={`inline-flex items-center justify-center ${className} text-gray-500`}
        style={{
          fontSize: `${Math.round(size * 0.8)}px`,
          lineHeight: '1'
        }}
        title="Location not determined"
      >
        🌍
      </div>
    );
  }

  // Unicode flag emoji fallback
  if (countryCode && !isLoading) {

    const getUnicodeFlagEmoji = (code: string): string | null => {
      if (code && code.length === 2) {
        const codePoints = code.toUpperCase().split('').map(char => 
          0x1F1E6 - 65 + char.charCodeAt(0)
        );
        return String.fromCodePoint(...codePoints);
      }
      return null;
    };

    const unicodeFlag = getUnicodeFlagEmoji(countryCode);

    if (unicodeFlag) {
      return (
        <div 
          className={`inline-flex items-center justify-center ${className}`}
          style={{
            fontSize: `${size}px`,
            lineHeight: '1',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          title={`${country} (${countryCode})`}
        >
          {unicodeFlag}
        </div>
      );
    }
  }

  // Final fallback for invalid or unknown countries
  
  // Final fallback: Create a styled flag placeholder with country code
  return (
    <div 
      className={`inline-flex items-center justify-center ${className} bg-gray-100 border border-gray-300 rounded text-xs font-medium text-gray-700`}
      style={{
        width: `${size}px`,
        height: `${Math.round(size * 0.75)}px`, // Flag aspect ratio
        fontSize: `${Math.round(size * 0.3)}px`
      }}
      title={`${country} (${countryCode || country})`}
    >
      {(countryCode || country)?.substring(0, 2).toUpperCase()}
    </div>
  );
}