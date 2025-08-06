import { lazy } from 'react';

// Module imports for prefetching
const moduleImports = {
  NotesApp: () => import(/* webpackChunkName: "notes-app", webpackPrefetch: true */ './notes/NotesApp'),
  CameraApp: () => import(/* webpackChunkName: "camera-app" */ './camera/CameraApp'),
  NasaApodViewer: () => import(/* webpackChunkName: "nasa-apod" */ './nasa/NasaApodViewer'),
  MinimalHabitTracker: () => import(/* webpackChunkName: "habit-tracker", webpackPrefetch: true */ './streak/MinimalHabitTracker'),
  GiphyGallery: () => import(/* webpackChunkName: "giphy-gallery" */ './giphy/GiphyGallery'),
  DogGallery: () => import(/* webpackChunkName: "dog-gallery" */ './dog/DogGallery'),
  RhythmMachineViewer: () => import(/* webpackChunkName: "rhythm-machine" */ './rhythm/RhythmMachineViewer'),
  DrawPerfectCircle: () => import(/* webpackChunkName: "circle-game" */ './circle/DrawPerfectCircle'),
  VectorMemory: () => import(/* webpackChunkName: "vector-memory" */ './VectorMemory'),
};

// Lazy load all dashboard app components for optimal bundle splitting
export const LazyDashboardApps = {
  // Notes App - prefetched as commonly used
  NotesApp: lazy(() =>
    moduleImports.NotesApp().then(module => ({ default: module.NotesApp })),
  ),
  
  // Camera App
  CameraApp: lazy(() =>
    moduleImports.CameraApp().then(module => ({ default: module.CameraApp })),
  ),
  
  // NASA APOD Viewer
  NasaApodViewer: lazy(() =>
    moduleImports.NasaApodViewer().then(module => ({ default: module.NasaApodViewer })),
  ),
  
  // Habit Tracker - prefetched as commonly used
  MinimalHabitTracker: lazy(() =>
    moduleImports.MinimalHabitTracker().then(module => ({ default: module.MinimalHabitTracker })),
  ),
  
  // Giphy Gallery
  GiphyGallery: lazy(() =>
    moduleImports.GiphyGallery().then(module => ({ default: module.GiphyGallery })),
  ),
  
  // Dog Gallery  
  DogGallery: lazy(() =>
    moduleImports.DogGallery().then(module => ({ default: module.DogGallery })),
  ),
  
  // Rhythm Machine
  RhythmMachineViewer: lazy(() =>
    moduleImports.RhythmMachineViewer().then(module => ({ default: module.RhythmMachineViewer })),
  ),
  
  // Perfect Circle Game
  DrawPerfectCircle: lazy(() =>
    moduleImports.DrawPerfectCircle().then(module => ({ default: module.DrawPerfectCircle })),
  ),
  
  // Vector Memory
  VectorMemory: lazy(() =>
    moduleImports.VectorMemory().then(module => ({ default: module.VectorMemory })),
  ),
};

// Preload function for critical apps
export const preloadDashboardApp = (appName: keyof typeof LazyDashboardApps) => {
  // Use the module imports directly for preloading
  if (appName in moduleImports) {
    moduleImports[appName as keyof typeof moduleImports]();
  }
};

// Preload high-priority apps on idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Preload commonly used apps
    preloadDashboardApp('NotesApp');
    preloadDashboardApp('MinimalHabitTracker');
  }, { timeout: 2000 });
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(() => {
    preloadDashboardApp('NotesApp');
    preloadDashboardApp('MinimalHabitTracker');
  }, 2000);
}