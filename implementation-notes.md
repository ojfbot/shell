# Implementation notes

## Deviations

- 2026-10-01 (no loopback in prod): plan pointed at the browser-side `VITE_*` fallbacks in shell-app/src; territory: the one loopback URL in the live bundle came from `vite.config.ts` — the `asset_foundry` federation remote has no `VITE_REMOTE_ASSET_FOUNDRY` in `.env.production`, so the build baked `http://localhost:3035/assets/remoteEntry.js` into `remotesMap`. Nothing imports `asset_foundry/*`, so made build-time remote defaults dev-server-only and left unset remotes out of the federation map (asset_foundry is simply absent in prod) instead of inventing a production URL for it.
- 2026-10-01 (no loopback in prod): consequence of the above — a production build with an *imported* remote's `VITE_REMOTE_*` unset now fails at build (rollup can't resolve `<remote>/Dashboard`) rather than silently shipping a loopback URL. All 8 imported remotes are set in the committed `.env.production`, so Vercel and CI builds are unaffected; kept the loud failure as the conservative choice.
- 2026-10-01 (no loopback in prod): plan said run lint; territory: `eslint` reports 2 pre-existing `react-hooks/exhaustive-deps` "rule not found" errors in `App.tsx` on `main` (plugin not configured). Out of scope; left untouched.
