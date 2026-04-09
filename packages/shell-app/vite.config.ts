import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// The shell is a Module Federation HOST.
// Each sub-app exposes its Dashboard as a remote module.
// In local dev, remotes point to localhost ports.
// In K8s, VITE_* env vars override to cluster service URLs.
//
// Sub-app vite configs each need the federation REMOTE counterpart:
//   federation({ name: 'resume_builder', filename: 'remoteEntry.js',
//     exposes: { './Dashboard': './src/components/Dashboard' },
//     shared: { 'react', 'react-dom', '@reduxjs/toolkit', 'react-redux', '@carbon/react' } })
// @carbon/react MUST be in both host and remote shared lists — omitting it from the host
// causes remotes to load a duplicate Carbon instance → CSS class conflicts + broken tab bar.

// Local dev defaults. Production overrides via VITE_REMOTE_* env vars in .env.production.
// Uses loadEnv so the federation plugin (which runs in Node during build) can read them —
// process.env does NOT include .env.* files; loadEnv does.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const remoteBase = {
    resume_builder: env.VITE_REMOTE_RESUME_BUILDER ?? 'http://localhost:3000',
    blogengine:   env.VITE_REMOTE_BLOGENGINE   ?? 'http://localhost:3005',
    tripplanner:  env.VITE_REMOTE_TRIPPLANNER  ?? 'http://localhost:3010',
    purefoy:      env.VITE_REMOTE_PUREFOY      ?? 'http://localhost:3020',
    core_reader:  env.VITE_REMOTE_CORE_READER  ?? 'http://localhost:3015',
    lean_canvas:  env.VITE_REMOTE_LEAN_CANVAS  ?? 'http://localhost:3025',
    gastown_pilot: env.VITE_REMOTE_GASTOWN_PILOT ?? 'http://localhost:3017',
    seh_study:     env.VITE_REMOTE_SEH_STUDY     ?? 'http://localhost:3030',
  }

  return {
  resolve: {
    // Force Vite to resolve frame-ui-components from TypeScript source.
    // The file: protocol dep doesn't have dist/ in CI — alias ensures
    // both dev server and production build use the same source path.
    alias: {
      '@ojfbot/frame-ui-components/tokens': resolve(__dirname, '../../../frame-ui-components/src/tokens.ts'),
      '@ojfbot/frame-ui-components': resolve(__dirname, '../../../frame-ui-components/src/index.ts'),
    },
  },
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
        // Must match resume-builder's shared @carbon/react entry — omitting this caused resume-builder
        // to load a duplicate Carbon instance, breaking Carbon CSS class resolution in shell.
        '@carbon/react':    { singleton: true, requiredVersion: '^1.67.0' },
      },
    }),
  ],
  // Treat the shared UI library as source code (not a pre-built dep).
  // The file: link resolves to .ts/.tsx — Vite must process it through
  // the React plugin rather than trying to pre-bundle it.
  optimizeDeps: {
    exclude: ['@ojfbot/frame-ui-components'],
    // CJS transitive deps of the excluded package must be explicitly included
    // so Vite pre-bundles them into ESM — otherwise browsers get CJS/ESM mismatch.
    include: [
      '@ojfbot/frame-ui-components > react-markdown',
      '@ojfbot/frame-ui-components > hast-util-to-jsx-runtime',
      '@ojfbot/frame-ui-components > style-to-js',
      '@ojfbot/frame-ui-components > style-to-object',
    ],
  },
  server: {
    port: 4000,   // Shell runs on 4000 to avoid clashing with sub-apps
    cors: true,
    fs: {
      allow: ['../../..'],  // Allow serving files from frame-ui-components sibling repo
    },
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
  }
})
