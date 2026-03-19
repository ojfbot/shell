/**
 * Frame OS design tokens — TypeScript surface for the --ojf-* CSS custom properties
 * defined in packages/shell-app/src/themes/tokens.css.
 *
 * These are references to CSS variables, not hardcoded values. Swap themes by
 * updating tokens.css — nothing in component code needs to change.
 */

export const tokens = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  colorAccent:       'var(--ojf-accent)',
  colorAccentHover:  'var(--ojf-accent-hover)',
  colorAccentActive: 'var(--ojf-accent-active)',
  colorAccentSubtle: 'var(--ojf-accent-subtle)',

  // ── Surfaces ──────────────────────────────────────────────────────────────
  colorBackground: 'var(--ojf-bg)',
  colorSurface1:   'var(--ojf-surface-1)',
  colorSurface2:   'var(--ojf-surface-2)',
  colorSurface3:   'var(--ojf-surface-3)',

  // ── Borders ───────────────────────────────────────────────────────────────
  colorBorder:       'var(--ojf-border)',
  colorBorderSubtle: 'var(--ojf-border-subtle)',

  // ── Text ──────────────────────────────────────────────────────────────────
  colorTextPrimary:   'var(--ojf-text-primary)',
  colorTextSecondary: 'var(--ojf-text-secondary)',
  colorTextMuted:     'var(--ojf-text-muted)',

  // ── Typography ────────────────────────────────────────────────────────────
  fontSans: "var(--ojf-font-sans, 'IBM Plex Sans', sans-serif)",
  fontMono: "var(--ojf-font-mono, 'IBM Plex Mono', monospace)",

  // ── Spacing (Carbon 8px grid) ─────────────────────────────────────────────
  spacingXs:  '4px',
  spacingSm:  '8px',
  spacingMd:  '16px',
  spacingLg:  '24px',
  spacingXl:  '32px',
  spacing2xl: '48px',

  // ── Motion ────────────────────────────────────────────────────────────────
  easeStandard:   'var(--ojf-ease, cubic-bezier(0.16, 1, 0.3, 1))',
  easeExpressive: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
  durationFast:   'var(--ojf-duration-fast, 120ms)',
  durationBase:   'var(--ojf-duration-base, 200ms)',
} as const

export type TokenKey = keyof typeof tokens
