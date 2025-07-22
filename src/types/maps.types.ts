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

export interface MapConfig {
  center: google.maps.LatLngLiteral;
  zoom: number;
  mapTypeId: google.maps.MapTypeId;
  styles: google.maps.MapTypeStyle[];
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
}

export interface StreetViewConfig {
  position: google.maps.LatLngLiteral;
  pov: {
    heading: number;
    pitch: number;
  };
  zoom: number;
  addressControl?: boolean;
  linksControl?: boolean;
  panControl?: boolean;
  enableCloseButton?: boolean;
}

export type ViewMode = 'map' | 'streetview';

export type SearchType = 'coffee' | 'food' | 'gas' | 'grocery' | 'pharmacy' | 'atm' | 'restaurant' | 'bar' | 'entertainment' | 'convenience' | '24hour';

export interface Place {
  id: string;
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
  rating?: number;
  priceLevel?: number;
  openNow?: boolean;
  distance?: number;
  placeId: string;
  types?: string[];
  icon?: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  location: google.maps.LatLngLiteral;
  address?: string;
  type: 'home' | 'work' | 'custom';
  icon?: string;
}

export interface GoogleMapsState {
  map: google.maps.Map | null;
  streetView: google.maps.StreetViewPanorama | null;
  marker: google.maps.Marker | null;
  currentView: ViewMode;
  isLoading: boolean;
  error: string | null;
  // New state for features
  searchResults: Place[];
  selectedPlace: Place | null;
  savedPlaces: SavedPlace[];
  showTraffic: boolean;
  activeSearch: SearchType | null;
  searchMarkers: google.maps.Marker[];
}

// Custom map styles for Virgil theme
export const VIRGIL_MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#2d2233' }]
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1a1420' }]
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b2a5c1' }]
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d4c5e2' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c8b7d4' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#3d2f42' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a796b3' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#4a3850' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3a2a40' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e91ad' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#6c3baa' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4a2776' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d4c5e2' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#3d2f42' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b2a5c1' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#1f1626' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8677a0' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1f1626' }]
  }
];