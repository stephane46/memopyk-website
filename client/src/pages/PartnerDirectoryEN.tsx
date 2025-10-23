import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MapPin, Phone, Mail, Globe, Filter, Search, Package, X, Navigation, ChevronDown, ChevronUp, Camera, Film as FilmIcon, Video } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import { PHOTO_FORMATS, FILM_FORMATS, VIDEO_CASSETTES, DELIVERY } from '@shared/partnerFormats';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to track map bounds changes
function MapBoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds());
    },
    load: () => {
      onBoundsChange(map.getBounds());
    }
  });
  return null;
}

// Component to handle zooming to a specific location
function MapZoomController({ zoomTo }: { zoomTo: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (zoomTo) {
      map.flyTo([zoomTo.lat, zoomTo.lng], zoomTo.zoom, {
        duration: 1.5
      });
    }
  }, [zoomTo, map]);
  
  return null;
}

// Component to handle custom cluster clicks with tighter zoom
function ClusterClickHandler({ clusterRef }: { clusterRef: any }) {
  const map = useMap();
  
  useEffect(() => {
    if (clusterRef.current) {
      const group = clusterRef.current;
      
      group.on('clusterclick', (e: any) => {
        e.originalEvent.stopPropagation();
        const cluster = e.layer;
        const childMarkers = cluster.getAllChildMarkers();
        
        // Calculate center of cluster markers
        const bounds = L.latLngBounds(childMarkers.map((m: any) => m.getLatLng()));
        
        // Zoom to level 16 at the center to show only these markers
        map.flyToBounds(bounds, {
          padding: [100, 100],
          maxZoom: 16,
          duration: 1.0
        });
      });
    }
    
    return () => {
      if (clusterRef.current) {
        clusterRef.current.off('clusterclick');
      }
    };
  }, [clusterRef, map]);
  
  return null;
}

// Component to fit map bounds to all partners on initial load
function MapFitBounds({ partners }: { partners: Array<{ lat: number | null; lng: number | null }> }) {
  const map = useMap();
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (!hasInitialized.current && partners.length > 0) {
      const bounds: [number, number][] = partners
        .filter(p => p.lat && p.lng)
        .map(p => [p.lat!, p.lng!]);
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
        hasInitialized.current = true;
      }
    }
  }, [partners, map]);
  
  return null;
}

// Component to auto-zoom map when search results change
function MapAutoZoomToSearch({ 
  searchText, 
  filteredPartners 
}: { 
  searchText: string; 
  filteredPartners: Array<{ lat: number | null; lng: number | null }>;
}) {
  const map = useMap();
  const prevSearchText = useRef('');
  
  useEffect(() => {
    // Only auto-zoom when search text changes (not on initial load or filter changes)
    if (searchText && searchText !== prevSearchText.current && filteredPartners.length > 0) {
      const partnersWithCoords = filteredPartners.filter(p => p.lat && p.lng);
      
      if (partnersWithCoords.length === 1) {
        // Single result: zoom to that specific location
        const partner = partnersWithCoords[0];
        map.flyTo([partner.lat!, partner.lng!], 13, { duration: 1.5 });
      } else if (partnersWithCoords.length > 1) {
        // Multiple results: fit bounds to show all
        const bounds: [number, number][] = partnersWithCoords.map(p => [p.lat!, p.lng!]);
        map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 10, duration: 1.5 });
      }
    }
    
    prevSearchText.current = searchText;
  }, [searchText, filteredPartners, map]);
  
  return null;
}

interface Partner {
  name: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  services: string[];
  formats: {
    photo: string[];
    film: string[];
    video: string[];
  };
  website: string;
  phone: string;
  phone_public: boolean;
  email: string;
  email_public: boolean;
  public_description: string;
  slug: string;
  address: string;
  address_line2: string;
  postal_code: string;
  delivery: string[];
  other_photo: string;
  other_film: string;
  other_video: string;
  other_delivery: string;
  status?: string;
  is_active?: boolean;
  show_on_map?: boolean;
}

export default function PartnerDirectoryEN() {
  const [searchText, setSearchText] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [zoomTo, setZoomTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [modalPartner, setModalPartner] = useState<Partner | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const clusterRef = useRef<any>(null);

  const { data: partnersResponse, isLoading, refetch } = useQuery<{ partners: Partner[], total: number }>({
    queryKey: ['/api/partners', { limit: 1000, status: 'Approved', is_active: true, show_on_map: true, transform: true }],
    queryFn: async () => {
      try {
        const response = await fetch('/api/partners?limit=1000&status=Approved&is_active=true&show_on_map=true&transform=true', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!response.ok) {
          return { partners: [], total: 0 };
        }
        const data = await response.json();
        return data;
      } catch (error) {
        return { partners: [], total: 0 };
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const partners = partnersResponse?.partners || [];

  // Filter partners
  const filteredPartners = partners.filter(partner => {
    // CRITICAL: Only show approved, active partners with show_on_map enabled
    const isVisible = 
      partner.status === 'Approved' && 
      partner.is_active === true && 
      partner.show_on_map === true;
    
    if (!isVisible) return false;

    // Text search (name or city)
    const matchesSearch = !searchText || 
      partner.name.toLowerCase().includes(searchText.toLowerCase()) ||
      partner.city.toLowerCase().includes(searchText.toLowerCase());

    // Service filter
    const matchesService = selectedServices.length === 0 ||
      selectedServices.some(s => partner.services.includes(s));

    return matchesSearch && matchesService;
  });

  // Partners with coordinates for map
  const mappablePartners = filteredPartners.filter(p => p.lat && p.lng);
  
  // Partners visible in the current map viewport
  const visiblePartners = useMemo(() => {
    if (!mapBounds) {
      return mappablePartners;
    }
    return mappablePartners.filter(partner => 
      mapBounds.contains([partner.lat!, partner.lng!])
    );
  }, [mappablePartners, mapBounds]);

  // Service chips with counts (English labels) - ORDERED: Photo, Film, Video
  // Counts based on VISIBLE partners in the current viewport
  const allServices = [
    { id: 'Photo', label: 'Photo' },
    { id: 'Film', label: 'Film' },
    { id: 'Video', label: 'Video' }
  ];
  const serviceCounts = allServices.map(service => ({
    id: service.id,
    name: service.label,
    count: visiblePartners.filter(p => p.services.includes(service.id)).length
  }));

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(s => s !== serviceId) : [...prev, serviceId]
    );
  };

  // Helper function to get English format labels
  const getFormatLabel = (formatId: string): string => {
    const photoFormat = PHOTO_FORMATS.find(f => f.v === formatId);
    if (photoFormat) return photoFormat.en;
    
    const filmFormat = FILM_FORMATS.find(f => f.v === formatId);
    if (filmFormat) return filmFormat.en;
    
    const videoFormat = VIDEO_CASSETTES.find(f => f.v === formatId);
    if (videoFormat) return videoFormat.en;
    
    return formatId;
  };

  // Helper function to get English delivery labels
  const getDeliveryLabel = (deliveryId: string): string => {
    const delivery = DELIVERY.find(d => d.v === deliveryId);
    return delivery ? delivery.en : deliveryId;
  };

  // Helper function to get icon for service type
  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'Photo':
        return Camera;
      case 'Film':
        return FilmIcon;
      case 'Video':
        return Video;
      default:
        return Package;
    }
  };

  // Function to zoom to a partner location
  const zoomToPartner = (partner: Partner) => {
    if (partner.lat && partner.lng) {
      setSelectedPartner(partner.slug);
      setExpandedCard(partner.slug);
      setZoomTo({ lat: partner.lat, lng: partner.lng, zoom: 13 });
    }
  };

  // Default map center (France)
  const mapCenter: [number, number] = [46.603354, 1.888334];

  return (
    <div className="min-h-screen bg-[#F2EBDC]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2A4759] to-[#011526] text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Digitization Services Directory</h1>
          <p className="text-xl text-gray-300">
            Find a professional near you
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">

        {/* Search Bar and Filters - Single Line in Left Column */}
        <div className="mb-4 flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:w-1/2">
          {/* Search Bar */}
          <div className="relative w-full lg:w-auto lg:flex-shrink-0" style={{ minWidth: '200px' }}>
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Name or city..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-10"
              data-testid="input-search-partners"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                data-testid="button-clear-search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Service Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1 whitespace-nowrap">
              <Filter className="h-4 w-4" />
              Services:
            </h3>
            <div className="flex gap-2 flex-wrap">
              {serviceCounts.map(({ id, name, count }) => {
                const Icon = getServiceIcon(id);
                return (
                  <Badge
                    key={id}
                    variant={selectedServices.includes(id) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors flex items-center justify-center gap-1.5 w-[130px] px-3 py-1.5 ${
                      selectedServices.includes(id)
                        ? 'bg-[#D67C4A] text-white hover:bg-[#c5703e]'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => toggleService(id)}
                    data-testid={`filter-service-${id.toLowerCase()}`}
                  >
                    <Icon className="h-4 w-4" />
                    {name} ({count})
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        {/* Map & List Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Map */}
          <div>
            {/* Map */}
            <div className="h-[350px] lg:h-[588px] rounded-lg overflow-hidden shadow-lg relative">
              {/* Floating Visible Partners Counter */}
              <div className="absolute top-4 right-4 z-[1000] bg-[#D67C4A] text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 font-semibold text-base lg:text-lg" data-testid="visible-partners-counter">
                <MapPin className="h-5 w-5 lg:h-6 lg:w-6" />
                <span>{visiblePartners.length} professional{visiblePartners.length !== 1 ? 's' : ''} found</span>
              </div>
              <MapContainer
                center={mapCenter}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                data-testid="partner-map"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBoundsTracker onBoundsChange={setMapBounds} />
                <MapZoomController zoomTo={zoomTo} />
                <MapFitBounds partners={mappablePartners} />
                <MapAutoZoomToSearch searchText={searchText} filteredPartners={mappablePartners} />
                <ClusterClickHandler clusterRef={clusterRef} />
                <MarkerClusterGroup
                  ref={clusterRef}
                  chunkedLoading
                  maxClusterRadius={(zoom: number) => zoom >= 13 ? 5 : 50}
                  iconCreateFunction={(cluster: any) => {
                    const count = cluster.getChildCount();
                    return L.divIcon({
                      html: `
                        <div style="position: relative; width: 25px; height: 41px;">
                          <svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.5 0C5.59644 0 0 5.59644 0 12.5C0 21.875 12.5 41 12.5 41C12.5 41 25 21.875 25 12.5C25 5.59644 19.4036 0 12.5 0Z" fill="#2A4759"/>
                            <circle cx="12.5" cy="12.5" r="8" fill="white"/>
                          </svg>
                          <div style="position: absolute; top: 4.5px; left: 50%; transform: translateX(-50%); color: #2A4759; font-weight: bold; font-size: 13px; line-height: 1; pointer-events: none; font-family: Arial, sans-serif;">
                            ${count}
                          </div>
                        </div>
                      `,
                      className: '',
                      iconSize: [25, 41],
                      iconAnchor: [12.5, 41]
                    });
                  }}
                  spiderfyOnMaxZoom={true}
                  spiderfyDistanceMultiplier={2}
                  showCoverageOnHover={false}
                  zoomToBoundsOnClick={false}
                >
                  {mappablePartners.map((partner, index) => (
                    partner.lat && partner.lng && (
                      <Marker
                        key={index}
                        position={[partner.lat, partner.lng]}
                        eventHandlers={{
                          click: () => {
                            setSelectedPartner(partner.slug);
                            setExpandedCard(partner.slug);
                            setZoomTo({ lat: partner.lat!, lng: partner.lng!, zoom: 13 });
                          }
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
                          <div className="font-semibold">{partner.name}</div>
                          <div className="text-xs text-gray-600">{partner.city}</div>
                        </Tooltip>
                      </Marker>
                    )
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            </div>
          </div>

          {/* Partner List - Aligned with Map Top */}
          <div id="partner-list-container" className="flex flex-col gap-3 max-h-[600px] lg:h-[588px] overflow-y-auto snap-y snap-mandatory partner-list-scrollbar p-0 pr-6" style={{ background: 'linear-gradient(to right, transparent calc(100% - 24px), #F2EBDC calc(100% - 24px))', scrollSnapStop: 'always' }}>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : visiblePartners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-semibold">No results</p>
                <p className="mt-2">Zoom or pan the map to see more partners.</p>
              </div>
            ) : (
              <>
                {visiblePartners.map((partner, index) => {
                  const isExpanded = expandedCard === partner.slug;
                  
                  return (
                    <Card
                    key={index}
                    id={`card-${partner.slug}`}
                    className={`${isExpanded ? 'min-h-[500px] lg:h-[588px]' : 'h-[288px]'} flex-shrink-0 snap-start transition-all overflow-hidden cursor-pointer w-full m-0 ${
                      selectedPartner === partner.slug
                        ? 'ring-2 ring-[#D67C4A] shadow-xl'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      if (!isExpanded) {
                        setExpandedCard(partner.slug);
                        // Scroll within the container to show the expanded card
                        setTimeout(() => {
                          const container = document.getElementById('partner-list-container');
                          const card = document.getElementById(`card-${partner.slug}`);
                          if (container && card) {
                            const cardOffsetTop = card.offsetTop;
                            container.scrollTo({ top: cardOffsetTop, behavior: 'smooth' });
                          }
                        }, 100);
                      } else {
                        setExpandedCard(null);
                      }
                    }}
                    data-testid={`partner-card-${partner.slug}`}
                  >
                    <CardContent className="p-0 h-full flex flex-col">
                      {/* Header Section with colored background */}
                      <div className="bg-gradient-to-r from-[#2A4759] to-[#1f3646] px-4 py-2 sticky top-0 z-10 flex-shrink-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-1">
                              {partner.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[#F2EBDC]">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{partner.city}, {partner.country}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className={isExpanded ? "p-3 space-y-2 overflow-y-auto flex-1" : "p-4 space-y-3"}>
                        {/* Description with expand indicator */}
                        {partner.public_description && (
                          <div>
                            <p className={`text-sm text-gray-700 leading-snug ${!isExpanded ? 'line-clamp-2' : ''}`}>
                              {partner.public_description}
                            </p>
                            {!isExpanded && partner.public_description.length > 100 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCard(partner.slug);
                                  setTimeout(() => {
                                    const container = document.getElementById('partner-list-container');
                                    const card = document.getElementById(`card-${partner.slug}`);
                                    if (container && card) {
                                      const cardOffsetTop = card.offsetTop;
                                      container.scrollTo({ top: cardOffsetTop, behavior: 'smooth' });
                                    }
                                  }, 100);
                                }}
                                className="text-[#D67C4A] hover:text-[#c5703e] text-sm font-medium mt-1 flex items-center gap-1"
                              >
                                Read more <ChevronDown className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Delivery Methods (Expanded Only) */}
                        {isExpanded && partner.delivery.length > 0 && (
                          <div className="border-t pt-2">
                            <h4 className="font-semibold text-gray-900 text-xs mb-1">Delivery options</h4>
                            <div className="flex flex-wrap gap-1">
                              {partner.delivery.map(deliveryId => (
                                <span
                                  key={deliveryId}
                                  className="inline-block text-xs bg-[#89BAD9] text-white px-2 py-0.5 rounded"
                                >
                                  {getDeliveryLabel(deliveryId)}
                                </span>
                              ))}
                              {partner.other_delivery && (
                                <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                  Other: {partner.other_delivery}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Services and Formats - Always show all 3 services */}
                        <div className={`space-y-1.5 ${isExpanded ? 'border-t pt-2' : ''}`}>
                          {allServices.map(service => {
                            const formats = service.id === 'Photo' ? partner.formats.photo :
                                          service.id === 'Film' ? partner.formats.film :
                                          partner.formats.video;
                            
                            if (!partner.services.includes(service.id)) return null;

                            const Icon = getServiceIcon(service.id);
                            
                            return (
                              <div key={service.id}>
                                <Badge className="bg-[#D67C4A] text-white mb-1 px-2 py-0.5 w-[90px] flex items-center justify-center gap-1 inline-flex text-xs">
                                  <Icon className="h-3 w-3" />
                                  {service.label}
                                </Badge>
                                {isExpanded && formats.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {formats.map(formatId => (
                                      <span
                                        key={formatId}
                                        className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                                      >
                                        {getFormatLabel(formatId)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Contact Information (Expanded Only) */}
                        {isExpanded && (
                          <div className="space-y-2 border-t pt-2">
                            <h4 className="font-semibold text-gray-900 text-xs">Contact</h4>
                            <div className="flex flex-wrap gap-2">
                              {partner.website && (
                                <a
                                  href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-[#D67C4A] hover:text-[#c5703e] transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Globe className="h-3.5 w-3.5" />
                                  <span className="text-xs">Website</span>
                                </a>
                              )}
                              {partner.phone_public && partner.phone && (
                                <a
                                  href={`tel:${partner.phone}`}
                                  className="flex items-center gap-1.5 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  <span className="text-xs">Phone</span>
                                </a>
                              )}
                              {partner.email_public && partner.email && (
                                <a
                                  href={`mailto:${partner.email}`}
                                  className="flex items-center gap-1.5 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  <span className="text-xs">Email</span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Collapse/Expand Button */}
                      {isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCard(null);
                          }}
                          className="bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-1.5 px-3 text-sm transition-colors flex items-center justify-center gap-2 border-t"
                        >
                          Collapse <ChevronUp className="h-4 w-4" />
                        </button>
                      )}
                    </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Partner Detail Modal */}
      <Dialog open={!!modalPartner} onOpenChange={(open) => !open && setModalPartner(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {modalPartner && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#2A4759] pr-8">
                  {modalPartner.name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-gray-600 mt-2">
                  <MapPin className="h-4 w-4" />
                  <span>{modalPartner.city}, {modalPartner.country}</span>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Description */}
                {modalPartner.public_description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {modalPartner.public_description}
                    </p>
                  </div>
                )}

                {/* Services and Formats */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Services offered</h3>
                  <div className="space-y-3">
                    {modalPartner.services.sort((a, b) => {
                      const order = ['Photo', 'Film', 'Video'];
                      return order.indexOf(a) - order.indexOf(b);
                    }).map(service => {
                      const formats = service === 'Photo' ? modalPartner.formats.photo :
                                    service === 'Film' ? modalPartner.formats.film :
                                    modalPartner.formats.video;
                      
                      if (formats.length === 0) return null;

                      const Icon = getServiceIcon(service);
                      return (
                        <div key={service}>
                          <Badge className="bg-[#D67C4A] text-white mb-2 px-3 py-1 w-[90px] flex items-center justify-center gap-1 inline-flex">
                            <Icon className="h-3.5 w-3.5" />
                            {service}
                          </Badge>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formats.map(formatId => (
                              <span
                                key={formatId}
                                className="inline-block text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md"
                              >
                                {getFormatLabel(formatId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
                  <div className="space-y-3">
                    {modalPartner.website && (
                      <a
                        href={modalPartner.website.startsWith('http') ? modalPartner.website : `https://${modalPartner.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-[#D67C4A] hover:text-[#c5703e] transition-colors group"
                      >
                        <Globe className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Visit website</span>
                      </a>
                    )}
                    {modalPartner.phone && (
                      <a
                        href={`tel:${modalPartner.phone}`}
                        className="flex items-center gap-3 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                      >
                        <Phone className="h-5 w-5" />
                        <span>{modalPartner.phone}</span>
                      </a>
                    )}
                    {modalPartner.email && (
                      <a
                        href={`mailto:${modalPartner.email}`}
                        className="flex items-center gap-3 text-[#2A4759] hover:text-[#1f3646] transition-colors"
                      >
                        <Mail className="h-5 w-5" />
                        <span>{modalPartner.email}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Locate on Map Button */}
                {modalPartner.lat && modalPartner.lng && (
                  <Button
                    onClick={() => {
                      zoomToPartner(modalPartner);
                      setModalPartner(null);
                    }}
                    className="w-full bg-[#2A4759] hover:bg-[#1f3646] text-white"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Locate on map
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
