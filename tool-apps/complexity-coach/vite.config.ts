import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/tools/complexity-coach/',
  plugins: [react()],
  build: {
    outDir: resolve(import.meta.dirname, '../../tools/complexity-coach'),
    emptyOutDir: true,
    sourcemap: false
  }
});
