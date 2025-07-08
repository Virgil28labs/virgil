import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size and improve performance
export const LazyRaccoonMascot = lazy(() => import('./RaccoonMascot.tsx').then(module => ({
  default: module.RaccoonMascot
})));

export const LazyVirgilChatbot = lazy(() => import('./VirgilChatbot.tsx').then(module => ({
  default: module.default
})));

// Lazy load optional components that may not be needed immediately
export const LazyWeather = lazy(() => import('./Weather.tsx').then(module => ({
  default: module.Weather
})));

export const LazyUserProfileViewer = lazy(() => import('./UserProfileViewer.tsx').then(module => ({
  default: module.UserProfileViewer
})));

// Lazy load services that are only needed conditionally
export const lazyWeatherService = () => import('../lib/weatherService.ts').then(module => module.weatherService);

export const lazySearchService = () => import('../lib/searchService.ts').then(module => module.searchService);

export const lazyLocationService = () => import('../lib/locationService.ts').then(module => module.locationService);