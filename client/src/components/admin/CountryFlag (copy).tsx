import { useState, useEffect } from 'react';

// Country name to ISO code mapping for location enrichment data
const countryNameToCode: { [key: string]: string } = {
  // Major countries commonly seen in analytics
  'Spain': 'ES',
  'Italy': 'IT',
  'France': 'FR',
  'Germany': 'DE',
  'United Kingdom': 'GB',
  'United States': 'US',
  'Canada': 'CA',
  'Australia': 'AU',
  'Brazil': 'BR',
  'Japan': 'JP',
  'China': 'CN',
  'India': 'IN',
  'Russia': 'RU',
  'Mexico': 'MX',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Turkey': 'TR',
  'South Korea': 'KR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Venezuela': 'VE',
  'South Africa': 'ZA',
  'Egypt': 'EG',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Morocco': 'MA',
  'Algeria': 'DZ',
  'Tunisia': 'TN',
  'Israel': 'IL',
  'Saudi Arabia': 'SA',
  'UAE': 'AE',
  'United Arab Emirates': 'AE',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Malaysia': 'MY',
  'Singapore': 'SG',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'New Zealand': 'NZ',
  'Ukraine': 'UA',
  'Czech Republic': 'CZ',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Serbia': 'RS',
  'Slovenia': 'SI',
  'Slovakia': 'SK',
  'Lithuania': 'LT',
  'Latvia': 'LV',
  'Estonia': 'EE',
  'Ireland': 'IE',
  'Iceland': 'IS',
  'Luxembourg': 'LU',
  'Malta': 'MT',
  'Cyprus': 'CY',
  'Monaco': 'MC',
  'Liechtenstein': 'LI',
  'San Marino': 'SM',
  'Vatican City': 'VA',
  'Andorra': 'AD'
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

      // Try direct ISO code first - this should work for DK, FR, GB, IT, ES
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