export const tokens = {
  // ============================================
  // COLORS
  // ============================================
  colors: {
    bg: {
      app: '#0a0a0a',        // app background (was #0e0e0e — slightly darker)
      surface: '#121212',    // cards, panels (was #141414)
      raised: '#181818',     // hover states, nested cards
      sunken: '#0a0a0a',     // inputs, code blocks
    },
    border: {
      subtle: '#1f1f1f',     // hairline borders (was #1a1a1a)
      default: '#2a2a2a',    // card borders
      strong: '#3a3a3a',     // hover borders
    },
    text: {
      primary: '#f0ede8',    // headers, bold text
      secondary: '#c4c4c4',  // body text (was #aaa — better readability)
      tertiary: '#888888',   // helper text, captions
      muted: '#555555',      // labels, disabled
    },
    accent: {
      mirai: '#1D9E75',      // primary brand green
      miraiSoft: 'rgba(29,158,117,0.1)',
      miraiBorder: 'rgba(29,158,117,0.3)',
      blue: '#378ADD',
      blueSoft: 'rgba(55,138,221,0.1)',
      amber: '#BA7517',
      purple: '#7F77DD',
      red: '#D85A30',
    },
  },

  // ============================================
  // SPACING (use these instead of raw pixel values)
  // ============================================
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
    xxxl: '48px',
  },

  // ============================================
  // RADIUS
  // ============================================
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  font: {
    sans: 'Syne, system-ui, sans-serif',
    mono: '"DM Mono", "JetBrains Mono", monospace',
  },
  text: {
    // Display - page titles
    display: { fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', fontFamily: 'Syne, sans-serif' },
    // Heading - section titles
    heading: { fontSize: 15, fontWeight: 600, fontFamily: 'Syne, sans-serif' },
    // Subheading - card titles
    subheading: { fontSize: 13, fontWeight: 500, fontFamily: 'Syne, sans-serif' },
    // Body - main reading text
    body: { fontSize: 14, fontWeight: 400, lineHeight: 1.6, fontFamily: 'Syne, sans-serif' },
    // Caption - helper text
    caption: { fontSize: 12, fontWeight: 400, lineHeight: 1.5, fontFamily: 'Syne, sans-serif' },
    // Label - small uppercase labels (mono)
    label: { fontSize: 10, fontWeight: 500, fontFamily: '"DM Mono", monospace', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
    // Mono - data values, code
    mono: { fontSize: 12, fontFamily: '"DM Mono", monospace' },
    // Big - KPI numbers
    big: { fontSize: 36, fontWeight: 700, letterSpacing: '-1px', fontFamily: 'Syne, sans-serif' },
  },

  // ============================================
  // SHADOWS (subtle)
  // ============================================
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.2)',
    md: '0 2px 8px rgba(0,0,0,0.3)',
    lg: '0 8px 24px rgba(0,0,0,0.4)',
  },

  // ============================================
  // TRANSITIONS
  // ============================================
  transition: {
    fast: 'all 0.15s ease',
    base: 'all 0.2s ease',
    slow: 'all 0.3s ease',
  },
} as const

// Convenience exports
export const c = tokens.colors
export const s = tokens.space
export const r = tokens.radius
export const t = tokens.text
export const f = tokens.font