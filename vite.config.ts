import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.VITE_DEV_PORT ? parseInt(process.env.VITE_DEV_PORT) : 3000,
    host: 'localhost',
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: false,
      interval: 100
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React dependencies
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          
          // Supabase dependencies
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          
          // Large components for lazy loading
          if (id.includes('RaccoonMascot')) {
            return 'mascot';
          }
          
          if (id.includes('VirgilChatbot')) {
            return 'chatbot';
          }
          
          // Services and utilities
          if (id.includes('services/llm') || id.includes('lib/locationService') || id.includes('lib/mapsService')) {
            return 'services';
          }
          
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      },
      treeshake: {
        moduleSideEffects: false
      }
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'esbuild',
    target: 'es2020',
    cssMinify: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js']
  }
})
