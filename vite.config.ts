/// <reference types="vitest/config" />
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },

  // Workaround: prevent Vite from pre-bundling lucide-react (which may try to resolve missing re-exports)
  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  // Ensure lucide-react is bundled on SSR to avoid external resolution issues in certain contexts
  ssr: {
    noExternal: ['lucide-react'],
  },

  

  server: {
    host: '127.0.0.1',
    // כופה IPv4
    port: 5173,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1' // כופה IPv4 גם ב-preview
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  }
});