/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Cache fora de node_modules para evitar EPERM no Windows (OneDrive/antivírus)
  cacheDir: '.vite',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/contexts/**', 'src/hooks/**', 'src/routes/**', 'src/services/**'],
      exclude: ['src/main.tsx'],
    },
  },
})
