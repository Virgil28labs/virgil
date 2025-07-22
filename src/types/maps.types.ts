/**
 * Google Maps Types and Interfaces
 * Type definitions for Google Maps integration
 */

export interface GoogleMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  address: {
    street?: string;
    city?: string;
    formatted?: string;
  } | null;
}


// Simplified types for traffic checking use case

export interface SavedPlace {
  id: string
  name: string
  address: string
  placeId?: string
  isHome?: boolean
  timestamp: number
}

// Custom map styles for Virgil theme
export const VIRGIL_MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#2d2233' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1a1420' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b2a5c1' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d4c5e2' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c8b7d4' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#3d2f42' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a796b3' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#4a3850' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3a2a40' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e91ad' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#6c3baa' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4a2776' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d4c5e2' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#3d2f42' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b2a5c1' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#1f1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8677a0' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1f1626' }],
  },
];