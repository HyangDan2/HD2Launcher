import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/launcher/',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['hd2lab.duckdns.org'],
  },
  preview: {
    allowedHosts: ['hd2lab.duckdns.org'],
  },
})
