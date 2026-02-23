import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Cache fora de node_modules para evitar EPERM no Windows (OneDrive/antivírus)
  cacheDir: '.vite',
})
