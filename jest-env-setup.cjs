// Setup environment variables for Jest
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.VITE_OPENWEATHER_API_KEY = 'test-weather-key';
process.env.VITE_DOG_API_URL = 'https://dog.ceo/api';
process.env.VITE_LLM_API_URL = 'http://localhost:5002/api/v1';
process.env.VITE_API_URL = 'http://localhost:5002';
process.env.VITE_DEFAULT_MODEL = 'gpt-4o-mini';
process.env.VITE_CACHE_TTL = '3600';
process.env.VITE_ENABLE_CACHE = 'true';