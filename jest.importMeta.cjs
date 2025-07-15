// Mock import.meta.env for Jest
global.importMeta = {
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_OPENWEATHER_API_KEY: 'test-weather-key',
    VITE_DOG_API_URL: 'https://dog.ceo/api',
    VITE_LLM_API_URL: 'http://localhost:5002/api/v1',
    VITE_API_URL: 'http://localhost:5002',
    VITE_DEFAULT_MODEL: 'gpt-4o-mini',
    VITE_CACHE_TTL: '3600',
    VITE_ENABLE_CACHE: 'true',
    MODE: 'test',
    DEV: false,
    PROD: false,
    SSR: false
  }
};

// Also set process.env for compatibility
Object.assign(process.env, {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  VITE_OPENWEATHER_API_KEY: 'test-weather-key',
  VITE_DOG_API_URL: 'https://dog.ceo/api',
  VITE_LLM_API_URL: 'http://localhost:5002/api/v1',
  VITE_API_URL: 'http://localhost:5002',
  VITE_DEFAULT_MODEL: 'gpt-4o-mini',
  VITE_CACHE_TTL: '3600',
  VITE_ENABLE_CACHE: 'true'
});