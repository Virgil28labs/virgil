// Lazy load services that are only needed conditionally
export const lazyWeatherService = () => import('./weatherService.ts').then(module => module.weatherService);

export const lazyLocationService = () => import('./locationService.ts').then(module => module.locationService);
