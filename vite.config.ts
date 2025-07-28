import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: process.env.VITE_DEV_PORT ? parseInt(process.env.VITE_DEV_PORT) : 3000,
    host: true, // Listen on all addresses including localhost and network
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false,
      interval: 100,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React dependencies
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          
          // UI framework dependencies
          if (id.includes('@emotion') || id.includes('styled-components')) {
            return 'ui-vendor';
          }
          
          // Supabase dependencies
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          
          // Large visualization libraries
          if (id.includes('three') || id.includes('@react-three')) {
            return 'three-vendor';
          }
          
          // Chart libraries
          if (id.includes('chart') || id.includes('recharts') || id.includes('d3')) {
            return 'charts-vendor';
          }
          
          // Large components for lazy loading
          if (id.includes('RaccoonMascot')) {
            return 'mascot';
          }
          
          if (id.includes('VirgilChatbot')) {
            return 'chatbot';
          }
          
          // Dashboard apps - each gets its own chunk
          if (id.includes('NotesApp')) return 'notes-app';
          if (id.includes('CameraApp')) return 'camera-app';
          if (id.includes('NasaApodViewer')) return 'nasa-apod';
          if (id.includes('MinimalHabitTracker')) return 'habit-tracker';
          if (id.includes('GiphyGallery')) return 'giphy-gallery';
          if (id.includes('DogGallery')) return 'dog-gallery';
          if (id.includes('RhythmMachineViewer')) return 'rhythm-machine';
          if (id.includes('DrawPerfectCircle')) return 'circle-game';
          if (id.includes('VectorMemory')) return 'vector-memory';
          
          // Services and utilities
          if (id.includes('services/') || id.includes('lib/')) {
            return 'services';
          }
          
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          
          // Return undefined for all other cases
          return undefined;
        },
        // Optimize chunk size
        chunkFileNames: () => {
          return 'assets/[name]-[hash].js';
        },
      },
      treeshake: {
        moduleSideEffects: false,
      },
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'esbuild',
    target: 'es2020',
    cssMinify: true,
    // Split CSS per async chunk
    cssCodeSplit: true,
    // Set chunk size warnings
    chunkSizeWarningLimit: 500, // 500kb warning threshold
    // Enable better tree shaking
    reportCompressedSize: true,
    // Optimize asset handling
    assetsInlineLimit: 4096, // 4kb
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
  },
});
