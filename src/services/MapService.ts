/**
 * MapService - Centralized Google Maps API interactions
 * Service layer for managing Google Maps functionality
 */

import { logger } from '../lib/logger';
import { createLocationMarker } from '../utils/googleMaps';
import { timeService } from './TimeService';

export interface DirectionsRequestConfig {
  origin: string;
  destination: string;
  departureTime?: Date | 'now';
  travelMode?: google.maps.TravelMode;
  provideAlternatives?: boolean;
}

export interface DirectionsResult {
  routes: google.maps.DirectionsRoute[];
  status: google.maps.DirectionsStatus;
}

export class MapService {
  private directionsService: google.maps.DirectionsService | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private static instances = new WeakMap<google.maps.Map, MapService>();

  private constructor(private map: google.maps.Map) {
    this.initializeServices();
  }

  static getInstance(map: google.maps.Map): MapService {
    if (!this.instances.has(map)) {
      this.instances.set(map, new MapService(map));
    }
    return this.instances.get(map)!;
  }

  private initializeServices(): void {
    this.directionsService = new google.maps.DirectionsService();
    this.geocoder = new google.maps.Geocoder();
  }

  /**
   * Calculate directions between two points
   */
  async calculateRoute(config: DirectionsRequestConfig): Promise<DirectionsResult> {
    if (!this.directionsService) {
      throw new Error('DirectionsService not initialized');
    }

    const request: google.maps.DirectionsRequest = {
      origin: config.origin,
      destination: config.destination,
      travelMode: config.travelMode || google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: config.provideAlternatives ?? true,
      drivingOptions: {
        departureTime: config.departureTime === 'now' ? timeService.getCurrentDateTime() : config.departureTime || timeService.getCurrentDateTime(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS,
      },
    };

    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        this.directionsService!.route(request, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            reject(new Error(status));
          }
        });
      });

      return {
        routes: result.routes,
        status: google.maps.DirectionsStatus.OK,
      };
    } catch (error) {
      logger.error('Directions calculation failed', error as Error, {
        component: 'MapService',
        action: 'calculateRoute',
        metadata: { origin: config.origin, destination: config.destination },
      });
      throw error;
    }
  }

  /**
   * Geocode a location to get address information
   */
  async geocodeLocation(latLng: google.maps.LatLngLiteral): Promise<string> {
    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        this.geocoder!.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(new Error(status));
          }
        });
      });

      return result[0]?.formatted_address || '';
    } catch (error) {
      logger.error('Geocoding failed', error as Error, {
        component: 'MapService',
        action: 'geocodeLocation',
        metadata: { location: latLng },
      });
      return '';
    }
  }

  /**
   * Create a location marker on the map
   */
  async createMarker(position: google.maps.LatLngLiteral): Promise<google.maps.marker.AdvancedMarkerElement> {
    try {
      return await createLocationMarker(position, this.map);
    } catch (error) {
      logger.error('Marker creation failed', error as Error, {
        component: 'MapService',
        action: 'createMarker',
        metadata: { position },
      });
      throw error;
    }
  }

  /**
   * Create and configure a traffic layer
   */
  createTrafficLayer(): google.maps.TrafficLayer {
    return new google.maps.TrafficLayer();
  }

  /**
   * Fit map bounds to show a route
   */
  fitRouteBounds(route: google.maps.DirectionsRoute, padding?: google.maps.Padding): void {
    if (route.bounds) {
      const defaultPadding = {
        top: 100,
        right: 50,
        bottom: 150,
        left: 50,
      };
      this.map.fitBounds(route.bounds, padding || defaultPadding);
    }
  }

  /**
   * Pan map smoothly to route bounds
   */
  panToRouteBounds(route: google.maps.DirectionsRoute, padding?: google.maps.Padding): void {
    if (route.bounds) {
      const defaultPadding = {
        top: 100,
        right: 50,
        bottom: 150,
        left: 50,
      };
      this.map.panToBounds(route.bounds, padding || defaultPadding);
    }
  }

  /**
   * Set map center and zoom
   */
  setView(center: google.maps.LatLngLiteral, zoom: number): void {
    this.map.setCenter(center);
    this.map.setZoom(zoom);
  }

  /**
   * Clean up service instances
   */
  cleanup(): void {
    this.directionsService = null;
    this.geocoder = null;
  }
}