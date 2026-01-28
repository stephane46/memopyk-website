import React, { useState, useEffect } from 'react';
import { Play, Clock, X, Eye, Users } from 'lucide-react';
import { formatFrenchDateTime } from '@/utils/date-format';

interface VideoPerformanceData {
  video_id: string;
  total_views: number;
  unique_viewers: number;
  total_watch_time: number;
  average_watch_time: number;
  last_viewed: string | null;
}

interface VideoPerformanceCardProps {
  frontContent: React.ReactNode;
  className?: string;
  performanceData?: VideoPerformanceData[];
  dateFrom?: string;
  dateTo?: string;
}

export function VideoPerformanceCard({ frontContent, className = "", performanceData = [], dateFrom, dateTo }: VideoPerformanceCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [freshData, setFreshData] = useState<VideoPerformanceData[]>([]);

  const handleCardClick = async () => {
    setIsModalOpen(true);
    setFreshData([]); // Reset data to show loading state
    // NUCLEAR OPTION: Use completely new endpoint to bypass all caching
    try {
      const timestamp = Date.now();
      
      let url = `/api/analytics/fresh-video-data?t=${timestamp}&r=${Math.random()}`;
      if (dateFrom) url += `&dateFrom=${encodeURIComponent(dateFrom)}`;
      if (dateTo) url += `&dateTo=${encodeURIComponent(dateTo)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Cache-Bust': timestamp.toString()
        }
      });
      const data = await response.json();
      setFreshData(data);
      console.log('🚨 NUCLEAR CACHE BYPASS - FRESH DATA:', data);
    } catch (error) {
      console.error('Failed to fetch fresh data:', error);
    }
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return 'Never viewed';
    }
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      console.log(`🕐 TIMING DEBUG: ${dateString} → ${diffInMinutes} minutes ago`);
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return formatFrenchDateTime(date);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Never viewed';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getVideoDisplayName = (videoId: string) => {
    // Clean up video filenames for display
    return videoId
      .replace(/\.mp4$/, '')
      .replace(/gallery_/g, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      {/* CLICKABLE CARD */}
      <div 
        className={`cursor-pointer transition-transform duration-200 hover:scale-105 ${className}`}
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
          {/* MODAL CONTENT WITH SOLID BACKGROUND */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb'
            }}
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
                <Play style={{ width: '24px', height: '24px' }} />
                Gallery Views
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

            {/* CONTENT AREA */}
            <div style={{ padding: '24px' }}>
              {/* SUMMARY STATS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>
                    {(freshData.length > 0 ? freshData : performanceData).reduce((sum, video) => sum + video.total_views, 0)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                    Total Views
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                    {(freshData.length > 0 ? freshData : performanceData).filter(video => video.total_views > 0).length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                    Videos Watched
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
                    {formatDuration((freshData.length > 0 ? freshData : performanceData).reduce((sum, video) => sum + video.total_watch_time, 0))}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                    Total Watch Time
                  </div>
                </div>
              </div>

              {/* VIDEO LIST */}
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px'
              }}>
                Most Popular Videos
              </div>

              {freshData.length === 0 && isModalOpen && !(freshData.length > 0 ? freshData : performanceData).length ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Loading...
                </div>
              ) : (freshData.length > 0 ? freshData : performanceData).length > 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {(freshData.length > 0 ? freshData : performanceData).map((video, index) => (
                    <div 
                      key={video.video_id}
                      style={{
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    >
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#111827',
                          fontSize: '16px'
                        }}>
                          {getVideoDisplayName(video.video_id)}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          Last viewed {formatDate(video.last_viewed)}
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '16px',
                        fontSize: '14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Eye style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                          <span style={{ color: '#374151' }}>
                            <strong>{video.total_views}</strong> views
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                          <span style={{ color: '#374151' }}>
                            <strong>{formatDuration(video.average_watch_time)}</strong> avg
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                          <span style={{ color: '#374151' }}>
                            <strong>{video.unique_viewers}</strong> unique
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280'
                }}>
                  <Play style={{ 
                    width: '48px', 
                    height: '48px', 
                    margin: '0 auto 12px auto',
                    color: '#d1d5db'
                  }} />
                  <p style={{ margin: 0 }}>No video performance data found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}