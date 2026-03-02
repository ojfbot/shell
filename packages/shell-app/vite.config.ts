import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// The shell is a Module Federation HOST.
// Each sub-app exposes its Dashboard as a remote module.
// In local dev, remotes point to localhost ports.
// In K8s, VITE_* env vars override to cluster service URLs.
//
// Sub-app vite configs each need the federation REMOTE counterpart:
//   federation({ name: 'cv_builder', filename: 'remoteEntry.js',
//     exposes: { './Dashboard': './src/components/Dashboard' },
//     shared: { 'react', 'react-dom', '@reduxjs/toolkit', 'react-redux', '@carbon/react' } })
// @carbon/react MUST be in both host and remote shared lists — omitting it from the host
// causes remotes to load a duplicate Carbon instance → CSS class conflicts + broken tab bar.

// Local dev defaults. Production overrides via VITE_REMOTE_* env vars:
//   VITE_REMOTE_CV_BUILDER=https://cv.jim.software
//   VITE_REMOTE_BLOGENGINE=https://blog.jim.software
//   VITE_REMOTE_TRIPPLANNER=https://trips.jim.software
//   VITE_REMOTE_PUREFOY=https://purefoy.jim.software
const remoteBase = {
  cv_builder:   process.env.VITE_REMOTE_CV_BUILDER   ?? 'http://localhost:3000',
  blogengine:   process.env.VITE_REMOTE_BLOGENGINE   ?? 'http://localhost:3005',
  tripplanner:  process.env.VITE_REMOTE_TRIPPLANNER  ?? 'http://localhost:3010',
  purefoy:      process.env.VITE_REMOTE_PUREFOY      ?? 'http://localhost:3020',
}

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: Object.fromEntries(
        Object.entries(remoteBase).map(([k, base]) => [
          k,
          `${base}/assets/remoteEntry.js`,
        ])
      ),
      // Shared singletons — one copy in the runtime regardless of which module loaded it.
      // Object form enforces singleton + version constraints matching the remote configs.
      shared: {
        'react':            { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom':        { singleton: true, requiredVersion: '^18.3.1' },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.10.1' },
        'react-redux':      { singleton: true, requiredVersion: '^9.2.0' },
        // Must match cv-builder's shared @carbon/react entry — omitting this caused cv-builder
        // to load a duplicate Carbon instance, breaking Carbon CSS class resolution in shell.
        '@carbon/react':    { singleton: true, requiredVersion: '^1.67.0' },
      },
    }),
  ],
  server: {
    port: 4000,   // Shell runs on 4000 to avoid clashing with sub-apps
    cors: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Use the modern Sass compiler API (suppresses legacy-js-api deprecation warning)
        api: 'modern-compiler' as const,
      },
    },
  },
  preview: { port: 4000 },
  build: {
    // Module Federation requires non-legacy chunk format
    target: 'esnext',
    minify: false,
  },
})
