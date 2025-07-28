import { lazy } from 'react';

// Lazy load all dashboard app components for optimal bundle splitting
export const LazyDashboardApps = {
  // Notes App
  NotesApp: lazy(() =>
    import(/* webpackChunkName: "notes-app" */ './notes/NotesApp')
      .then(module => ({ default: module.NotesApp })),
  ),
  
  // Camera App
  CameraApp: lazy(() =>
    import(/* webpackChunkName: "camera-app" */ './camera/CameraApp')
      .then(module => ({ default: module.CameraApp })),
  ),
  
  // NASA APOD Viewer
  NasaApodViewer: lazy(() =>
    import(/* webpackChunkName: "nasa-apod" */ './nasa/NasaApodViewer')
      .then(module => ({ default: module.NasaApodViewer })),
  ),
  
  // Habit Tracker
  MinimalHabitTracker: lazy(() =>
    import(/* webpackChunkName: "habit-tracker" */ './streak/MinimalHabitTracker')
      .then(module => ({ default: module.MinimalHabitTracker })),
  ),
  
  // Giphy Gallery
  GiphyGallery: lazy(() =>
    import(/* webpackChunkName: "giphy-gallery" */ './giphy/GiphyGallery')
      .then(module => ({ default: module.GiphyGallery })),
  ),
  
  // Dog Gallery  
  DogGallery: lazy(() =>
    import(/* webpackChunkName: "dog-gallery" */ './dog/DogGallery')
      .then(module => ({ default: module.DogGallery })),
  ),
  
  // Rhythm Machine
  RhythmMachineViewer: lazy(() =>
    import(/* webpackChunkName: "rhythm-machine" */ './rhythm/RhythmMachineViewer')
      .then(module => ({ default: module.RhythmMachineViewer })),
  ),
  
  // Perfect Circle Game
  DrawPerfectCircle: lazy(() =>
    import(/* webpackChunkName: "circle-game" */ './circle/DrawPerfectCircle')
      .then(module => ({ default: module.DrawPerfectCircle })),
  ),
  
  // Vector Memory
  VectorMemory: lazy(() =>
    import(/* webpackChunkName: "vector-memory" */ './VectorMemory')
      .then(module => ({ default: module.VectorMemory })),
  ),
};

// Preload function for critical apps
export const preloadDashboardApp = (appName: keyof typeof LazyDashboardApps) => {
  const app = LazyDashboardApps[appName];
  if (app && '_payload' in app && typeof app._payload === 'function') {
    app._payload();
  }
};