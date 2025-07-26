/**
 * Custom hook for managing route state in GoogleMapsModal
 * Consolidates route-related state to reduce re-renders and improve performance
 */

import { useState, useCallback } from 'react';

interface RouteState {
  currentRoute: google.maps.DirectionsRoute | null;
  alternativeRoutes: google.maps.DirectionsRoute[];
  selectedRouteIndex: number;
  hasActiveRoute: boolean;
  showRouteOptions: boolean;
  routeInfoVisible: boolean;
}

interface RouteActions {
  setCurrentRoute: (route: google.maps.DirectionsRoute | null) => void;
  setAlternativeRoutes: (routes: google.maps.DirectionsRoute[]) => void;
  setSelectedRouteIndex: (index: number) => void;
  setHasActiveRoute: (hasRoute: boolean) => void;
  setShowRouteOptions: (show: boolean | ((prev: boolean) => boolean)) => void;
  setRouteInfoVisible: (visible: boolean) => void;
  clearRoute: () => void;
  setRouteData: (routes: google.maps.DirectionsRoute[]) => void;
}

const initialRouteState: RouteState = {
  currentRoute: null,
  alternativeRoutes: [],
  selectedRouteIndex: 0,
  hasActiveRoute: false,
  showRouteOptions: false,
  routeInfoVisible: true,
};

export function useRouteState(): RouteState & RouteActions {
  const [state, setState] = useState<RouteState>(initialRouteState);

  const setCurrentRoute = useCallback((route: google.maps.DirectionsRoute | null) => {
    setState(prev => ({ ...prev, currentRoute: route }));
  }, []);

  const setAlternativeRoutes = useCallback((routes: google.maps.DirectionsRoute[]) => {
    setState(prev => ({ ...prev, alternativeRoutes: routes }));
  }, []);

  const setSelectedRouteIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedRouteIndex: index }));
  }, []);

  const setHasActiveRoute = useCallback((hasRoute: boolean) => {
    setState(prev => ({ ...prev, hasActiveRoute: hasRoute }));
  }, []);

  const setShowRouteOptions = useCallback((show: boolean | ((prev: boolean) => boolean)) => {
    setState(prev => ({
      ...prev,
      showRouteOptions: typeof show === 'function' ? show(prev.showRouteOptions) : show,
    }));
  }, []);

  const setRouteInfoVisible = useCallback((visible: boolean) => {
    setState(prev => ({ ...prev, routeInfoVisible: visible }));
  }, []);

  const clearRoute = useCallback(() => {
    setState(initialRouteState);
  }, []);

  const setRouteData = useCallback((routes: google.maps.DirectionsRoute[]) => {
    setState(prev => ({
      ...prev,
      currentRoute: routes[0] || null,
      alternativeRoutes: routes.slice(1),
      selectedRouteIndex: 0,
      hasActiveRoute: routes.length > 0,
      showRouteOptions: routes.length > 1,
      routeInfoVisible: true,
    }));
  }, []);

  return {
    ...state,
    setCurrentRoute,
    setAlternativeRoutes,
    setSelectedRouteIndex,
    setHasActiveRoute,
    setShowRouteOptions,
    setRouteInfoVisible,
    clearRoute,
    setRouteData,
  };
}
