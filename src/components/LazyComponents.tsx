import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size and improve performance
export const LazyRaccoonMascot = lazy(() => import('./raccoon/RaccoonMascot.tsx').then(module => ({
  default: module.RaccoonMascot,
})));

export const LazyVirgilChatbot = lazy(() => import('./VirgilChatbot.tsx').then(module => ({
  default: module.default,
})));
