/// <reference types="vite/client" />
/// <reference types="node" />

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
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}