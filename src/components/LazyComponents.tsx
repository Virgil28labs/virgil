import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size and improve performance
export const LazyRaccoonMascot = lazy(() => import('./RaccoonMascot.tsx').then(module => ({
  default: module.RaccoonMascot,
})));

export const LazyVirgilChatbot = lazy(() => import('./VirgilChatbot.tsx').then(module => ({
  default: module.default,
})));

// Lazy load optional components that may not be needed immediately
export const LazyWeather = lazy(() => import('./Weather.tsx').then(module => ({
  default: module.Weather,
})));

export const LazyUserProfileViewer = lazy(() => import('./UserProfileViewer.tsx').then(module => ({
  default: module.UserProfileViewer,
})));