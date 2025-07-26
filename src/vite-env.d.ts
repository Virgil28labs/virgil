/// <reference types="vite/client" />
/// <reference types="node" />
/// <reference types="@types/google.maps" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_LLM_API_URL: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_OPENWEATHER_API_KEY?: string;
  readonly VITE_DEFAULT_MODEL?: string;
  readonly VITE_ENABLE_CACHE?: string;
  readonly VITE_CACHE_TTL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global type declarations for better TypeScript support
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }

  interface Window {
    google?: typeof google;
  }

  // DOM API types
  type ResizeObserverCallback = (entries: ResizeObserverEntry[]) => void;
  type FrameRequestCallback = (time: number) => void;
  type PermissionState = 'granted' | 'denied' | 'prompt';
  type PermissionStatus = 'granted' | 'denied' | 'unknown' | 'unavailable';
}

// Asset type declarations
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}
