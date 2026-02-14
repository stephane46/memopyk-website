import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function containedInBounds(
  bounds: MapBounds | null,
  lat: number,
  lng: number,
): boolean {
  if (!bounds) return true;
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

interface PartnerMarker {
  name: string;
  city: string;
  slug: string;
  lat: number | null;
  lng: number | null;
}

interface PartnerMapboxProps {
  partners: PartnerMarker[];
  onBoundsChange: (bounds: MapBounds) => void;
  selectedPartnerSlug?: string | null;
}

function partnersToGeoJSON(
  partners: PartnerMarker[],
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: partners
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng!, p.lat!] },
        properties: { name: p.name, city: p.city, slug: p.slug },
      })),
  };
}

export default function PartnerMapbox({
  partners,
  onBoundsChange,
  selectedPartnerSlug,
}: PartnerMapboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const sourceReady = useRef(false);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const partnersRef = useRef(partners);

  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);
  useEffect(() => { partnersRef.current = partners; }, [partners]);

  const emitBounds = useCallback((map: mapboxgl.Map) => {
    const b = map.getBounds();
    onBoundsChangeRef.current({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [1.888334, 46.603354],
      zoom: 5,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    map.on('moveend', () => emitBounds(map));

    map.on('load', () => {
      const data = partnersToGeoJSON(partnersRef.current);

      map.addSource('partners', {
        type: 'geojson',
        data,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'partners',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#D67C4A', 10, '#2A4759', 30, '#011526'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 30, 30],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Cluster count label
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'partners',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Individual markers
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'partners',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#D67C4A',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Popup on marker click
      map.on('click', 'unclustered-point', (e) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const props = feature.properties!;
        new mapboxgl.Popup({ offset: 10, closeButton: false, maxWidth: '200px' })
          .setLngLat(coords)
          .setHTML(`<div style="font-weight:600">${props.name}</div><div style="font-size:12px;color:#666">${props.city}</div>`)
          .addTo(map);
      });

      // Zoom into cluster on click
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features.length) return;
        const clusterId = features[0].properties!.cluster_id;
        (map.getSource('partners') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom!,
          });
        });
      });

      // Cursors
      for (const layer of ['clusters', 'unclustered-point']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }

      sourceReady.current = true;

      // Fit to partners
      const withCoords = partnersRef.current.filter((p) => p.lat != null && p.lng != null);
      if (withCoords.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        for (const p of withCoords) bounds.extend([p.lng!, p.lat!]);
        map.fitBounds(bounds, { padding: 50, maxZoom: 10, duration: 0 });
      }

      emitBounds(map);
    });

    return () => { map.remove(); mapRef.current = null; sourceReady.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update GeoJSON data when partners change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourceReady.current) return;
    const src = map.getSource('partners') as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData(partnersToGeoJSON(partners));
    }
  }, [partners]);

  // Fly to selected partner
  useEffect(() => {
    if (!selectedPartnerSlug || !mapRef.current) return;
    const p = partners.find((x) => x.slug === selectedPartnerSlug);
    if (p?.lat && p?.lng) {
      mapRef.current.flyTo({ center: [p.lng, p.lat], zoom: 14, duration: 800 });
    }
  }, [selectedPartnerSlug, partners]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
