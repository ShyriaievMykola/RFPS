import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Content Security Policy додається лише у production-збірку:
// у dev-режимі Vite вбудовує inline-скрипти для HMR, які CSP заблокувала б.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // host: true — слухати всі мережеві адреси (доступ з інших пристроїв і через тунель);
  // allowedHosts — домен Cloudflare Tunnel, з якого Vite приймає запити.
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    allowedHosts: ['energomonitor.pepipupu.com'],
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
    allowedHosts: ['energomonitor.pepipupu.com'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
