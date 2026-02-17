import React, { useState, useEffect } from 'react';
import { Users, Clock, X } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { formatFrenchDateTime } from '@/utils/date-format';

// Comprehensive language mapping with flags (matches CleanGA4Analytics)
const LANGUAGE_MAP: Record<string, { display: string; flag: string }> = {
  // Major languages
  'en': { display: 'English', flag: '🇺🇸' },
  'english': { display: 'English', flag: '🇺🇸' },
  'fr': { display: 'Français', flag: '🇫🇷' },
  'french': { display: 'Français', flag: '🇫🇷' },
  'es': { display: 'Español', flag: '🇪🇸' },
  'spanish': { display: 'Español', flag: '🇪🇸' },
  'de': { display: 'Deutsch', flag: '🇩🇪' },
  'german': { display: 'Deutsch', flag: '🇩🇪' },
  'it': { display: 'Italiano', flag: '🇮🇹' },
  'italian': { display: 'Italiano', flag: '🇮🇹' },
  'pt': { display: 'Português', flag: '🇵🇹' },
  'portuguese': { display: 'Português', flag: '🇵🇹' },
  'ru': { display: 'Русский', flag: '🇷🇺' },
  'russian': { display: 'Русский', flag: '🇷🇺' },
  'zh': { display: '中文', flag: '🇨🇳' },
  'chinese': { display: '中文', flag: '🇨🇳' },
  'ja': { display: '日本語', flag: '🇯🇵' },
  'japanese': { display: '日本語', flag: '🇯🇵' },
  'ko': { display: '한국어', flag: '🇰🇷' },
  'korean': { display: '한국어', flag: '🇰🇷' },
  'ar': { display: 'العربية', flag: '🇸🇦' },
  'arabic': { display: 'العربية', flag: '🇸🇦' },
  'hi': { display: 'हिन्दी', flag: '🇮🇳' },
  'hindi': { display: 'हिन्दी', flag: '🇮🇳' },
  
  // European languages
  'no': { display: 'Norwegian', flag: '🇳🇴' },
  'norwegian': { display: 'Norwegian', flag: '🇳🇴' },
  'nb': { display: 'Norwegian', flag: '🇳🇴' },
  'nn': { display: 'Norwegian', flag: '🇳🇴' },
  'sv': { display: 'Svenska', flag: '🇸🇪' },
  'swedish': { display: 'Svenska', flag: '🇸🇪' },
  'da': { display: 'Dansk', flag: '🇩🇰' },
  'danish': { display: 'Dansk', flag: '🇩🇰' },
  'nl': { display: 'Nederlands', flag: '🇳🇱' },
  'dutch': { display: 'Nederlands', flag: '🇳🇱' },
  'fi': { display: 'Suomi', flag: '🇫🇮' },
  'finnish': { display: 'Suomi', flag: '🇫🇮' },
  'pl': { display: 'Polski', flag: '🇵🇱' },
  'polish': { display: 'Polski', flag: '🇵🇱' },
  'cs': { display: 'Čeština', flag: '🇨🇿' },
  'czech': { display: 'Čeština', flag: '🇨🇿' },
  'sk': { display: 'Slovenčina', flag: '🇸🇰' },
  'slovak': { display: 'Slovenčina', flag: '🇸🇰' },
  'hu': { display: 'Magyar', flag: '🇭🇺' },
  'hungarian': { display: 'Magyar', flag: '🇭🇺' },
  'ro': { display: 'Română', flag: '🇷🇴' },
  'romanian': { display: 'Română', flag: '🇷🇴' },
  'bg': { display: 'Български', flag: '🇧🇬' },
  'bulgarian': { display: 'Български', flag: '🇧🇬' },
  'hr': { display: 'Hrvatski', flag: '🇭🇷' },
  'croatian': { display: 'Hrvatski', flag: '🇭🇷' },
  'sr': { display: 'Српски', flag: '🇷🇸' },
  'serbian': { display: 'Српски', flag: '🇷🇸' },
  'sl': { display: 'Slovenščina', flag: '🇸🇮' },
  'slovenian': { display: 'Slovenščina', flag: '🇸🇮' },
  'et': { display: 'Eesti', flag: '🇪🇪' },
  'estonian': { display: 'Eesti', flag: '🇪🇪' },
  'lv': { display: 'Latviešu', flag: '🇱🇻' },
  'latvian': { display: 'Latviešu', flag: '🇱🇻' },
  'lt': { display: 'Lietuvių', flag: '🇱🇹' },
  'lithuanian': { display: 'Lietuvių', flag: '🇱🇹' },
  'el': { display: 'Ελληνικά', flag: '🇬🇷' },
  'greek': { display: 'Ελληνικά', flag: '🇬🇷' },
  'tr': { display: 'Türkçe', flag: '🇹🇷' },
  'turkish': { display: 'Türkçe', flag: '🇹🇷' },
  'uk': { display: 'Українська', flag: '🇺🇦' },
  'ukrainian': { display: 'Українська', flag: '🇺🇦' },
  'be': { display: 'Беларуская', flag: '🇧🇾' },
  'belarusian': { display: 'Беларуская', flag: '🇧🇾' },
  'is': { display: 'Íslenska', flag: '🇮🇸' },
  'icelandic': { display: 'Íslenska', flag: '🇮🇸' },
  
  // Asian languages  
  'th': { display: 'ไทย', flag: '🇹🇭' },
  'thai': { display: 'ไทย', flag: '🇹🇭' },
  'vi': { display: 'Tiếng Việt', flag: '🇻🇳' },
  'vietnamese': { display: 'Tiếng Việt', flag: '🇻🇳' },
  'id': { display: 'Bahasa Indonesia', flag: '🇮🇩' },
  'indonesian': { display: 'Bahasa Indonesia', flag: '🇮🇩' },
  'ms': { display: 'Bahasa Melayu', flag: '🇲🇾' },
  'malay': { display: 'Bahasa Melayu', flag: '🇲🇾' },
  'tl': { display: 'Filipino', flag: '🇵🇭' },
  'filipino': { display: 'Filipino', flag: '🇵🇭' },
  'my': { display: 'မြန်မာ', flag: '🇲🇲' },
  'burmese': { display: 'မြန်မာ', flag: '🇲🇲' },
  'km': { display: 'ខ្មែរ', flag: '🇰🇭' },
  'khmer': { display: 'ខ្មែរ', flag: '🇰🇭' },
  'lo': { display: 'ລາວ', flag: '🇱🇦' },
  'lao': { display: 'ລາວ', flag: '🇱🇦' },
  
  // African languages
  'sw': { display: 'Kiswahili', flag: '🇰🇪' },
  'swahili': { display: 'Kiswahili', flag: '🇰🇪' },
  'am': { display: 'አማርኛ', flag: '🇪🇹' },
  'amharic': { display: 'አማርኛ', flag: '🇪🇹' },
  'ha': { display: 'Hausa', flag: '🇳🇬' },
  'hausa': { display: 'Hausa', flag: '🇳🇬' },
  'yo': { display: 'Yorùbá', flag: '🇳🇬' },
  'yoruba': { display: 'Yorùbá', flag: '🇳🇬' },
  'zu': { display: 'isiZulu', flag: '🇿🇦' },
  'zulu': { display: 'isiZulu', flag: '🇿🇦' },
  'af': { display: 'Afrikaans', flag: '🇿🇦' },
  'afrikaans': { display: 'Afrikaans', flag: '🇿🇦' },
  
  // Others
  'he': { display: 'עברית', flag: '🇮🇱' },
  'hebrew': { display: 'עברית', flag: '🇮🇱' },
  'fa': { display: 'فارسی', flag: '🇮🇷' },
  'persian': { display: 'فارسی', flag: '🇮🇷' },
  'ur': { display: 'اردو', flag: '🇵🇰' },
  'urdu': { display: 'اردو', flag: '🇵🇰' },
  'bn': { display: 'বাংলা', flag: '🇧🇩' },
  'bengali': { display: 'বাংলা', flag: '🇧🇩' }
};

// Language formatting utility with comprehensive mapping
const formatLanguage = (langCode: string): { display: string; flag: string } => {
  if (!langCode) return { display: 'Unknown', flag: '🌐' };
  
  const code = langCode.toLowerCase().split(/[-_]/)[0]; // Get base language code
  
  // Check both language code and full name
  const mapped = LANGUAGE_MAP[code] || LANGUAGE_MAP[langCode.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  
  // Fallback for unmapped languages
  const cleaned = langCode.replace(/[-_].*/, '').toLowerCase();
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return { display: capitalized, flag: '🌐' };
};

interface VisitorModalProps {
  frontContent: React.ReactNode;
  className?: string;
  visitors?: Array<{
    ipAddress: string;
    country: string;
    region?: string;
    city?: string;
    countryCode?: string;
    timezone?: string;
    organization?: string;
    language: string;
    lastVisit: string;
    userAgent: string;
    visitCount?: number;
    sessionDuration?: number;
    previousVisit?: string;
  }>;
}

export function FlipCard({ frontContent, className = "", visitors = [] }: VisitorModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        handleModalClose();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen]);

  // Click outside handler
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleModalClose();
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 5) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return formatFrenchDateTime(date);
    } catch (error) {
      return 'Just now';
    }
  };

  return (
    <>
      {/* CLICKABLE CARD */}
      <div 
        className={`cursor-pointer transition-transform hover:scale-105 ${className}`}
        onClick={handleCardClick}
      >
        {frontContent}
      </div>

      {/* CUSTOM MODAL WITH ABSOLUTE POSITIONING */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleBackdropClick}
        >
          {/* MODAL CONTENT WITH PURE WHITE BACKGROUND */}
          <div
            style={{
              backgroundColor: '#ffffff',
              background: '#ffffff',
              backgroundImage: 'none',
              opacity: '1',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb',
              transform: 'none',
              filter: 'none',
              isolation: 'isolate',
              willChange: 'auto',
              backfaceVisibility: 'hidden',
              mixBlendMode: 'normal'
            }}
            className="analytics-modal-content"
            data-testid="analytics-visitor-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER WITH CLOSE BUTTON */}
            <div style={{
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827'
              }}>
                <Users style={{ width: '24px', height: '24px' }} />
                Recent Visitors Details
              </div>
              <button
                onClick={handleModalClose}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            
            {/* MODAL BODY */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '12px'
              }}>
                Last 100 unique visitors • Total: {visitors.length}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visitors.length > 0 ? (
                  visitors.map((visitor, index) => (
                    <div 
                      key={visitor.ipAddress || `visitor-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <CountryFlag country={visitor.countryCode || visitor.country} size={32} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: '500',
                            color: '#111827',
                            fontSize: '14px',
                            marginBottom: '2px'
                          }}>
                            {visitor.city && visitor.region 
                              ? `${visitor.city} (${visitor.region})` 
                              : visitor.city || visitor.region || visitor.ipAddress || 'Unknown'}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}>
                            <span>
                              {visitor.language ? (
                                <>
                                  {formatLanguage(visitor.language).flag} {formatLanguage(visitor.language).display}
                                </>
                              ) : (
                                '🌐 Unknown'
                              )}
                            </span>
                            <span style={{ 
                              backgroundColor: visitor.previousVisit ? '#dcfce7' : '#fef3c7',
                              color: visitor.previousVisit ? '#166534' : '#92400e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {visitor.previousVisit ? 'Returning' : 'New'}
                            </span>
                            {visitor.previousVisit && (visitor.visitCount || 1) > 1 && (
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                {visitor.visitCount} visits
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            color: '#9ca3af',
                            marginTop: '2px',
                            fontFamily: 'monospace'
                          }}>
                            {visitor.ipAddress}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#6b7280',
                        backgroundColor: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        minWidth: '120px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock style={{ width: '14px', height: '14px' }} />
                          {formatDate(visitor.lastVisit)}
                        </div>
                        {visitor.sessionDuration && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}>
                            <span>⏱</span>
                            {formatDuration(visitor.sessionDuration)}
                          </div>
                        )}
                        {visitor.previousVisit && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#9ca3af',
                            textAlign: 'center'
                          }}>
                            Prev: {formatDate(visitor.previousVisit)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px',
                    color: '#6b7280'
                  }}>
                    <Users style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 12px auto',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No recent visitors found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}