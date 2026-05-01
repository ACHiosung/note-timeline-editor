import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'file-protocol-compat',
      transformIndexHtml(html) {
        return html
          .replace(/ crossorigin/g, '')
          .replace(/ type="module"/g, '')
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
