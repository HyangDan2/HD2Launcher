import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['launcher.hd2lab.duckdns.org'],
  },
  preview: {
    allowedHosts: ['launcher.hd2lab.duckdns.org'],
  },
})
