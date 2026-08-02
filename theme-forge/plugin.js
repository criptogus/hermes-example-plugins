/**
 * theme-forge — Theme Forge for Hermes Desktop.
 *
 * An in-app theme authoring plugin. Contributes themes that extend the stock
 * DesktopTheme model with:
 *   - an extended color palette (the app's fixed --ui-* tokens: red, orange,
 *     yellow, green, cyan, blue, purple, warm, diff add/remove);
 *   - a background image (URL or data URI) with overlay + blur, painted behind
 *     the glass shell via body::before;
 *   - a bold-text level (bump font-weight one or two steps).
 *
 * The extra fields travel inside the theme object (the app ignores unknown
 * keys) and are read back by this plugin's CSS injection engine.
 *
 * Plain ESM, loaded uncompiled — UI is jsx() calls, not JSX syntax.
 * Only these imports resolve: @hermes/plugin-sdk, react, react/jsx-runtime.
 */

import {
  Badge,
  Button,
  cn,
  host,
  Input,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  Tip,
  PALETTE_AREA,
  THEMES_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  icons
} from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Presets — the forge ships three full themes + one editable custom theme.
// The custom theme starts as a clone of forge-cyber (the user's cyberpunk
// palette: #000 / #A8FF00 / #B026FF / #FFD700).
// ─────────────────────────────────────────────────────────────────────────────

const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", emoji'
const SANS =
  '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif, ' + EMOJI
const MONO = '"JetBrains Mono", "Cascadia Code", "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace, ' + EMOJI

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700;800&display=swap'

const SYSTEM_SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif, ' + EMOJI
const SYSTEM_MONO = '"SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace, ' + EMOJI

// Font presets for the Text tab — each sets typography.fontSans/fontMono/fontUrl
// on the custom theme; applyTheme() re-applies them (and injects fontUrl) on
// every registry-bump repaint.
const FONT_PRESETS = {
  system: { label: 'Sistema', fontSans: SYSTEM_SANS, fontMono: SYSTEM_MONO, fontUrl: null },
  inter: { label: 'Inter', fontSans: SANS, fontMono: MONO, fontUrl: FONT_URL },
  geist: {
    label: 'Geist',
    fontSans: '"Geist", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif, ' + EMOJI,
    fontMono: '"Geist Mono", "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace, ' + EMOJI,
    fontUrl: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;700&display=swap'
  },
  plex: {
    label: 'Plex',
    fontSans: '"IBM Plex Sans", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif, ' + EMOJI,
    fontMono: '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace, ' + EMOJI,
    fontUrl:
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap'
  },
  grotesk: {
    label: 'Grotesk',
    fontSans: '"Space Grotesk", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif, ' + EMOJI,
    fontMono: MONO,
    fontUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap'
  }
}

// Defaults for the Text-tab extras (merged into every theme's .forge).
const TEXT_DEFAULTS = {
  fontFamily: 'inter',
  fontSize: 13, // px base for the conversation text (app default: 13px)
  linkColor: null,
  headingColor: null,
  codeColor: null
}

const forgeCyber = {
  name: 'forge-cyber',
  label: 'Forge Cyber',
  description: 'Pure black, lime text, purple chrome, gold rings — the full cyberpunk palette',
  colors: {
    background: '#000000',
    foreground: '#A8FF00',
    card: '#060608',
    cardForeground: '#A8FF00',
    muted: '#0E0E12',
    mutedForeground: '#6D9900',
    popover: '#0A0A0D',
    popoverForeground: '#A8FF00',
    primary: '#A8FF00',
    primaryForeground: '#000000',
    secondary: '#14141A',
    secondaryForeground: '#8FCC00',
    accent: '#101018',
    accentForeground: '#BFFF00',
    border: '#2A103A',
    input: '#2A103A',
    ring: '#FFD700',
    midground: '#A8FF00',
    destructive: '#FF2E88',
    destructiveForeground: '#000000',
    sidebarBackground: '#000000',
    sidebarBorder: '#1A0828',
    userBubble: '#08080E',
    userBubbleBorder: '#2A103A'
  },
  darkColors: {
    background: '#000000',
    foreground: '#A8FF00',
    card: '#060608',
    cardForeground: '#A8FF00',
    muted: '#0E0E12',
    mutedForeground: '#6D9900',
    popover: '#0A0A0D',
    popoverForeground: '#A8FF00',
    primary: '#A8FF00',
    primaryForeground: '#000000',
    secondary: '#14141A',
    secondaryForeground: '#8FCC00',
    accent: '#101018',
    accentForeground: '#BFFF00',
    border: '#2A103A',
    input: '#2A103A',
    ring: '#FFD700',
    midground: '#A8FF00',
    destructive: '#FF2E88',
    destructiveForeground: '#000000',
    sidebarBackground: '#000000',
    sidebarBorder: '#1A0828',
    userBubble: '#08080E',
    userBubbleBorder: '#2A103A'
  },
  typography: { fontSans: SANS, fontMono: MONO, fontUrl: FONT_URL },
  forge: {
    backgroundImage: null,
    imageFit: 'cover',
    overlayOpacity: 0.15,
    blur: 0,
    boldLevel: 1,
    extraColors: {
      uiRed: '#FF2E88',
      uiOrange: '#FF8A3D',
      uiYellow: '#FFD700',
      uiGreen: '#A8FF00',
      uiCyan: '#00E5FF',
      uiBlue: '#4D7CFF',
      uiPurple: '#B026FF',
      uiWarm: '#FFD700'
    }
  }
}

const forgeGlass = {
  name: 'forge-glass',
  label: 'Forge Glass',
  description: 'Cool translucent neutrals with a cyan midground',
  colors: {
    background: '#0B0F14',
    foreground: '#DCE6F0',
    card: '#10161D',
    cardForeground: '#DCE6F0',
    muted: '#141C25',
    mutedForeground: '#7E8EA1',
    popover: '#121A22',
    popoverForeground: '#DCE6F0',
    primary: '#DCE6F0',
    primaryForeground: '#0B0F14',
    secondary: '#1A2430',
    secondaryForeground: '#B6C4D4',
    accent: '#16202B',
    accentForeground: '#C8D6E6',
    border: '#1E2A38',
    input: '#1E2A38',
    ring: '#00C8E8',
    midground: '#00C8E8',
    destructive: '#D64545',
    destructiveForeground: '#FFF5F5',
    sidebarBackground: '#090D11',
    sidebarBorder: '#141C24',
    userBubble: '#12202B',
    userBubbleBorder: '#1E3A48'
  },
  darkColors: {
    background: '#0B0F14',
    foreground: '#DCE6F0',
    card: '#10161D',
    cardForeground: '#DCE6F0',
    muted: '#141C25',
    mutedForeground: '#7E8EA1',
    popover: '#121A22',
    popoverForeground: '#DCE6F0',
    primary: '#DCE6F0',
    primaryForeground: '#0B0F14',
    secondary: '#1A2430',
    secondaryForeground: '#B6C4D4',
    accent: '#16202B',
    accentForeground: '#C8D6E6',
    border: '#1E2A38',
    input: '#1E2A38',
    ring: '#00C8E8',
    midground: '#00C8E8',
    destructive: '#D64545',
    destructiveForeground: '#FFF5F5',
    sidebarBackground: '#090D11',
    sidebarBorder: '#141C24',
    userBubble: '#12202B',
    userBubbleBorder: '#1E3A48'
  },
  typography: { fontSans: SANS, fontMono: MONO, fontUrl: FONT_URL },
  forge: {
    backgroundImage: null,
    imageFit: 'cover',
    overlayOpacity: 0.6,
    blur: 0,
    boldLevel: 0,
    extraColors: {
      uiRed: '#E5484D',
      uiOrange: '#E58B3D',
      uiYellow: '#D9B43C',
      uiGreen: '#30A46C',
      uiCyan: '#12A594',
      uiBlue: '#0091FF',
      uiPurple: '#8E4EC6',
      uiWarm: '#C99B7A'
    }
  }
}

const forgePaper = {
  name: 'forge-paper',
  label: 'Forge Paper',
  description: 'Warm light paper with ink text and a terracotta accent',
  colors: {
    background: '#FAF6F0',
    foreground: '#23201C',
    card: '#FFFFFF',
    cardForeground: '#23201C',
    muted: '#F1EAE0',
    mutedForeground: '#7A7166',
    popover: '#FFFDF9',
    popoverForeground: '#23201C',
    primary: '#B4552D',
    primaryForeground: '#FFFFFF',
    secondary: '#F4EDE3',
    secondaryForeground: '#4A4238',
    accent: '#EFE6D8',
    accentForeground: '#3A332B',
    border: '#E4DACA',
    input: '#E4DACA',
    ring: '#B4552D',
    midground: '#B4552D',
    destructive: '#C0392B',
    destructiveForeground: '#FFF5F2',
    sidebarBackground: '#F3ECE1',
    sidebarBorder: '#E2D6C4',
    userBubble: '#F4E9DB',
    userBubbleBorder: '#E2D2BC'
  },
  darkColors: {
    background: '#141210',
    foreground: '#E8E0D4',
    card: '#1B1815',
    cardForeground: '#E8E0D4',
    muted: '#241F1B',
    mutedForeground: '#9C9184',
    popover: '#1F1B17',
    popoverForeground: '#E8E0D4',
    primary: '#D9804F',
    primaryForeground: '#1B1109',
    secondary: '#2A241E',
    secondaryForeground: '#C8BCAC',
    accent: '#262019',
    accentForeground: '#DCCFC0',
    border: '#332B23',
    input: '#332B23',
    ring: '#D9804F',
    midground: '#D9804F',
    destructive: '#D64545',
    destructiveForeground: '#FFF5F5',
    sidebarBackground: '#100E0C',
    sidebarBorder: '#241F1A',
    userBubble: '#241C15',
    userBubbleBorder: '#3A2E22'
  },
  typography: { fontSans: SANS, fontMono: MONO, fontUrl: FONT_URL },
  forge: {
    backgroundImage: null,
    imageFit: 'cover',
    overlayOpacity: 0.25,
    blur: 0,
    boldLevel: 0,
    extraColors: {
      uiRed: '#C0392B',
      uiOrange: '#D4760A',
      uiYellow: '#B58A1E',
      uiGreen: '#3E7C4F',
      uiCyan: '#3A7E8C',
      uiBlue: '#3A6EA5',
      uiPurple: '#7D5BA6',
      uiWarm: '#B4552D'
    }
  }
}

/** Matrix — pure black, phosphor green, animated digital rain background. */
const forgeMatrix = {
  name: 'forge-matrix',
  label: 'Forge Matrix',
  description: 'Pure black with phosphor green and an animated digital-rain backdrop',
  colors: {
    background: '#000000',
    foreground: '#00FF41',
    card: '#00140A',
    cardForeground: '#00FF41',
    muted: '#002A12',
    mutedForeground: '#2E8B57',
    popover: '#001A0A',
    popoverForeground: '#00FF41',
    primary: '#00FF41',
    primaryForeground: '#000000',
    secondary: '#002A12',
    secondaryForeground: '#66FF99',
    accent: '#001A0A',
    accentForeground: '#7CFFAB',
    border: '#0A3D1A',
    input: '#0A3D1A',
    ring: '#00FF41',
    midground: '#00FF41',
    destructive: '#FF2E88',
    destructiveForeground: '#000000',
    sidebarBackground: '#000000',
    sidebarBorder: '#062B12',
    userBubble: '#00140A',
    userBubbleBorder: '#0A3D1A'
  },
  darkColors: {
    background: '#000000',
    foreground: '#00FF41',
    card: '#00140A',
    cardForeground: '#00FF41',
    muted: '#002A12',
    mutedForeground: '#2E8B57',
    popover: '#001A0A',
    popoverForeground: '#00FF41',
    primary: '#00FF41',
    primaryForeground: '#000000',
    secondary: '#002A12',
    secondaryForeground: '#66FF99',
    accent: '#001A0A',
    accentForeground: '#7CFFAB',
    border: '#0A3D1A',
    input: '#0A3D1A',
    ring: '#00FF41',
    midground: '#00FF41',
    destructive: '#FF2E88',
    destructiveForeground: '#000000',
    sidebarBackground: '#000000',
    sidebarBorder: '#062B12',
    userBubble: '#00140A',
    userBubbleBorder: '#0A3D1A'
  },
  typography: { fontSans: SANS, fontMono: MONO, fontUrl: FONT_URL },
  forge: {
    backgroundImage: null,
    imageFit: 'cover',
    overlayOpacity: 0.3,
    blur: 0,
    boldLevel: 0,
    matrixRain: true,
    extraColors: {
      uiRed: '#FF2E88',
      uiOrange: '#FF8A3D',
      uiYellow: '#D4FF00',
      uiGreen: '#00FF41',
      uiCyan: '#00E5FF',
      uiBlue: '#00A8FF',
      uiPurple: '#B026FF',
      uiWarm: '#00FF41'
    }
  }
}

/** Hacker — lime terminal on black with purple chrome and gold highlights. */
const forgeHacker = {
  name: 'forge-hacker',
  label: 'Forge Hacker',
  description: 'Lime terminal green, purple chrome, gold rings — hacker ASCII vibes',
  colors: {
    background: '#050505',
    foreground: '#A8FF00',
    card: '#0C0C0C',
    cardForeground: '#A8FF00',
    muted: '#121212',
    mutedForeground: '#6D9900',
    popover: '#0F0F0F',
    popoverForeground: '#A8FF00',
    primary: '#A8FF00',
    primaryForeground: '#050505',
    secondary: '#161616',
    secondaryForeground: '#8FCC00',
    accent: '#111111',
    accentForeground: '#C6FF2E',
    border: '#2A103A',
    input: '#2A103A',
    ring: '#FFD700',
    midground: '#A8FF00',
    destructive: '#FF2E88',
    destructiveForeground: '#050505',
    sidebarBackground: '#050505',
    sidebarBorder: '#1A0828',
    userBubble: '#0A0A0A',
    userBubbleBorder: '#2A103A'
  },
  darkColors: {
    background: '#050505',
    foreground: '#A8FF00',
    card: '#0C0C0C',
    cardForeground: '#A8FF00',
    muted: '#121212',
    mutedForeground: '#6D9900',
    popover: '#0F0F0F',
    popoverForeground: '#A8FF00',
    primary: '#A8FF00',
    primaryForeground: '#050505',
    secondary: '#161616',
    secondaryForeground: '#8FCC00',
    accent: '#111111',
    accentForeground: '#C6FF2E',
    border: '#2A103A',
    input: '#2A103A',
    ring: '#FFD700',
    midground: '#A8FF00',
    destructive: '#FF2E88',
    destructiveForeground: '#050505',
    sidebarBackground: '#050505',
    sidebarBorder: '#1A0828',
    userBubble: '#0A0A0A',
    userBubbleBorder: '#2A103A'
  },
  typography: { fontSans: SANS, fontMono: MONO, fontUrl: FONT_URL },
  forge: {
    backgroundImage: null,
    imageFit: 'cover',
    overlayOpacity: 0.4,
    blur: 0,
    boldLevel: 1,
    scanlines: true,
    extraColors: {
      uiRed: '#FF2E88',
      uiOrange: '#FF8A3D',
      uiYellow: '#FFD700',
      uiGreen: '#A8FF00',
      uiCyan: '#00E5FF',
      uiBlue: '#4D7CFF',
      uiPurple: '#B026FF',
      uiWarm: '#FFD700'
    }
  }
}

/** Spider-Man — near-black with a bold hero red. */
const forgeSpidey = {
  name: 'forge-spidey',
  label: 'Forge Spider-Man',
  description: 'Near-black surfaces with hero red accents',
  colors: {
    background: '#0A0A0C',
    foreground: '#F2F2F2',
    card: '#131316',
    cardForeground: '#F2F2F2',
    muted: '#1C1C21',
    mutedForeground: '#8E8E99',
    popover: '#17171B',
    popoverForeground: '#F2F2F2',
    primary: '#E62429',
    primaryForeground: '#FFFFFF',
    secondary: '#232329',
    secondaryForeground: '#C9C9D2',
    accent: '#1E1E24',
    accentForeground: '#E0E0E6',
    border: '#3A1518',
    input: '#3A1518',
    ring: '#E62429',
    midground: '#E62429',
    destructive: '#FF2E2E',
    destructiveForeground: '#FFFFFF',
    sidebarBackground: '#070708',
    sidebarBorder: '#2A1012',
    userBubble: '#18181D',
    userBubbleBorder: '#4A1A1E'
  },
  darkColors: {
    background: '#0A0A0C',
    foreground: '#F2F2F2',
    card: '#131316',
    cardForeground: '#F2F2F2',
    muted: '#1C1C21',
    mutedForeground: '#8E8E99',
    popover: '#17171B',
    popoverForeground: '#F2F2F2',
    primary: '#E62429',
    primaryForeground: '#FFFFFF',
    secondary: '#232329',
    secondaryForeground: '#C9C9D2',
    accent: '#1E1E24',
    accentForeground: '#E0E0E6',
    border: '#3A1518',
    input: '#3A1518',
    ring: '#E62429',
    midground: '#E62429',
    destructive: '#FF2E2E',
    destructiveForeground: '#FFFFFF',
    sidebarBackground: '#070708',
    sidebarBorder: '#2A1012',
    userBubble: '#18181D',
    userBubbleBorder: '#4A1A1E'
  },
  typography: { fontSans: SANS, fontMono: MONO, fontUrl: FONT_URL },
  forge: {
    backgroundImage: null,
    imageFit: 'cover',
    overlayOpacity: 0.35,
    blur: 0,
    boldLevel: 1,
    extraColors: {
      uiRed: '#E62429',
      uiOrange: '#FF8A3D',
      uiYellow: '#FFD700',
      uiGreen: '#2ECC71',
      uiCyan: '#4DD0E1',
      uiBlue: '#3D5AFE',
      uiPurple: '#7E57C2',
      uiWarm: '#E62429'
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Small color helpers (same math family as the app's themes/color.ts).
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function readableOn(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#FFFFFF'
  const [r, g, b] = rgb.map(v => v / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.5 ? '#000000' : '#FFFFFF'
}

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  if (!a || !b) return hexA
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// Film-inspired presets — generated from a 6-color palette so every theme has
// the full DesktopTheme shape the app expects (dark + light derived).
// ─────────────────────────────────────────────────────────────────────────────

function filmTheme({ name, label, description, bg, fg, accent, border, destructive, mutedFg, extraColors, boldLevel = 1, overlayOpacity = 0.3, scanlines, matrixRain }) {
  const dark = {
    background: bg,
    foreground: fg,
    card: mix(bg, fg, 0.05),
    cardForeground: fg,
    muted: mix(bg, fg, 0.08),
    mutedForeground: mutedFg || mix(fg, bg, 0.35),
    popover: mix(bg, fg, 0.04),
    popoverForeground: fg,
    primary: accent,
    primaryForeground: readableOn(accent),
    secondary: mix(bg, accent, 0.16),
    secondaryForeground: fg,
    accent: mix(bg, accent, 0.12),
    accentForeground: fg,
    border,
    input: border,
    ring: accent,
    midground: accent,
    destructive,
    destructiveForeground: readableOn(destructive),
    sidebarBackground: bg,
    sidebarBorder: mix(bg, fg, 0.12),
    userBubble: mix(bg, accent, 0.1),
    userBubbleBorder: border
  }
  const forge = {
    backgroundImage: null,
    imageFit: 'cover',
    overlayOpacity,
    blur: 0,
    boldLevel,
    extraColors: extraColors || {}
  }
  if (scanlines) forge.scanlines = true
  if (matrixRain) forge.matrixRain = true
  return {
    name,
    label,
    description,
    colors: dark,
    darkColors: dark,
    typography: { fontSans: SANS, fontMono: MONO, fontUrl: FONT_URL },
    forge
  }
}

const forgeWolverine = filmTheme({
  name: 'forge-wolverine',
  label: 'Forge Wolverine',
  description: 'Adamantium and mustard-gold with a fierce red accent',
  bg: '#16100A',
  fg: '#F2E3C2',
  accent: '#E8A90C',
  border: '#5A4A1E',
  destructive: '#B0413E',
  mutedFg: '#A8946A',
  extraColors: { uiYellow: '#E8A90C', uiBlue: '#2F6FAB', uiRed: '#B0413E', uiOrange: '#D97B29', uiGreen: '#7A8B3E', uiCyan: '#4A8C8C', uiPurple: '#8E6A4E', uiWarm: '#C9A86A' }
})

const forgeDeadpool = filmTheme({
  name: 'forge-deadpool',
  label: 'Forge Deadpool',
  description: 'Merc red on black with high-contrast white text',
  bg: '#120607',
  fg: '#F0E6E6',
  accent: '#D21F3C',
  border: '#5A1420',
  destructive: '#8B0000',
  mutedFg: '#A88888',
  extraColors: { uiRed: '#D21F3C', uiWarm: '#E8B10A', uiOrange: '#E8721B', uiYellow: '#E8B10A', uiGreen: '#3E8C5A', uiCyan: '#4A8C8C', uiBlue: '#5A7CA8', uiPurple: '#8E4EC6' }
})

const forgeIronman = filmTheme({
  name: 'forge-ironman',
  label: 'Forge Iron Man',
  description: 'Arc-reactor red and reactor gold on warm dark',
  bg: '#120A05',
  fg: '#F5EDE0',
  accent: '#C0392B',
  border: '#7A2018',
  destructive: '#8A1010',
  mutedFg: '#B09780',
  extraColors: { uiRed: '#C0392B', uiYellow: '#D4A017', uiOrange: '#E8721B', uiWarm: '#D4A017', uiGreen: '#3E8C5A', uiCyan: '#4A9C9C', uiBlue: '#3E5C8C', uiPurple: '#8E4EC6' }
})

const forgeBatman = filmTheme({
  name: 'forge-batman',
  label: 'Forge Batman',
  description: 'Gotham black with the bat-signal yellow',
  bg: '#0A0A0D',
  fg: '#E8E8EE',
  accent: '#F5C518',
  border: '#3A3A44',
  destructive: '#7A1020',
  mutedFg: '#8A8A99',
  extraColors: { uiYellow: '#F5C518', uiBlue: '#2E3E5E', uiRed: '#B03030', uiOrange: '#D97B29', uiGreen: '#3E8C5A', uiCyan: '#4A8C9C', uiPurple: '#6E5A8E', uiWarm: '#C9A86A' }
})

const forgeDune = filmTheme({
  name: 'forge-dune',
  label: 'Forge Dune',
  description: 'Arrakis sand and spice amber under a desert night',
  bg: '#1A140C',
  fg: '#E8DCC0',
  accent: '#C77B2F',
  border: '#5A4526',
  destructive: '#8A2E2E',
  mutedFg: '#A89778',
  extraColors: { uiOrange: '#C77B2F', uiYellow: '#D9A441', uiCyan: '#3E7A7A', uiWarm: '#D9A441', uiRed: '#B0413E', uiGreen: '#7A8B3E', uiBlue: '#5A6E8C', uiPurple: '#8E6A4E' }
})

const forgeTerminator = filmTheme({
  name: 'forge-terminator',
  label: 'Forge Terminator',
  description: 'HUD red on gunmetal with CRT scanlines',
  bg: '#0D0D10',
  fg: '#D8D8E0',
  accent: '#FF2A2A',
  border: '#3A3A44',
  destructive: '#B30000',
  mutedFg: '#80808C',
  scanlines: true,
  extraColors: { uiRed: '#FF2A2A', uiCyan: '#6EE7E7', uiOrange: '#FF8A3D', uiYellow: '#E8D44D', uiGreen: '#30A46C', uiBlue: '#4D7CFF', uiPurple: '#B026FF', uiWarm: '#FF8A3D' }
})

const forgeSith = filmTheme({
  name: 'forge-sith',
  label: 'Forge Sith',
  description: 'Imperial black with the red lightsaber blade',
  bg: '#0A0A0C',
  fg: '#E6E6EA',
  accent: '#D9252E',
  border: '#3A2030',
  destructive: '#A01020',
  mutedFg: '#8A8A94',
  extraColors: { uiRed: '#D9252E', uiPurple: '#8E4EC6', uiOrange: '#E8721B', uiYellow: '#D4A017', uiGreen: '#30A46C', uiCyan: '#4A8C9C', uiBlue: '#3E5C8C', uiWarm: '#C9A86A' }
})

// ─────────────────────────────────────────────────────────────────────────────
// The forge state: the editable custom theme + its extras. Persisted as JSON
// in ctx.storage (namespace hermes.plugin.theme-forge.*).
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'forge-custom-v1'
const PRESETS = [forgeCyber, forgeGlass, forgePaper, forgeMatrix, forgeHacker, forgeSpidey, forgeWolverine, forgeDeadpool, forgeIronman, forgeBatman, forgeDune, forgeTerminator, forgeSith]
const CUSTOM_NAME = 'forge-custom'

let storage = null // injected from register(ctx)
let themeMap = new Map() // name -> theme object (with .forge extras)
let customTheme = null // live-editable custom theme
let customDisposer = null // registry disposer for the custom theme contribution

function defaultCustom() {
  const base = JSON.parse(JSON.stringify(forgeCyber))
  return {
    ...base,
    name: CUSTOM_NAME,
    label: 'Theme Forge · Custom',
    description: 'Editable theme — tweak it in the Theme Forge pane',
    forge: { ...TEXT_DEFAULTS, ...base.forge }
  }
}

function loadCustom() {
  try {
    const raw = storage?.get(STORAGE_KEY, null)
    if (!raw) return defaultCustom()
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.colors && parsed.forge) {
      const base = defaultCustom()
      // Deep-merge extras so older stored customs (missing the Text-tab keys)
      // keep working without losing their saved values.
      return {
        ...base,
        ...parsed,
        forge: { ...TEXT_DEFAULTS, ...base.forge, ...(parsed.forge || {}) }
      }
    }
    return defaultCustom()
  } catch {
    return defaultCustom()
  }
}

let saveWarned = false

function saveCustom() {
  try {
    storage?.set(STORAGE_KEY, JSON.stringify(customTheme))
    saveWarned = false
  } catch {
    // localStorage quota exceeded (large data-URI wallpaper). It still works
    // for this session, but won't survive a restart — warn once.
    if (!saveWarned && typeof host !== 'undefined') {
      saveWarned = true
      host.notify({
        kind: 'error',
        message:
          'Tema não pôde ser salvo no armazenamento (imagem muito grande). Funciona nesta sessão, mas some ao reiniciar — use uma imagem menor.'
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS injection engine.
//
// The app's applyTheme() paints --theme-* / --dt-* seeds + data-hermes-theme
// on <html>. We watch those attributes (same technique as the app's own
// onThemeRepaint) and, when the active theme is one of ours, mount a <style>
// that:
//   - paints the background image behind the shell (body::before) with an
//     overlay (body::after) and re-tints the shell surfaces translucent via
//     color-mix so the image shows through the glass;
//   - overrides the app's fixed --ui-* accent palette with our extra colors;
//   - bumps font-weight per the bold level.
// ─────────────────────────────────────────────────────────────────────────────

const OBSERVED_ATTRS = ['data-hermes-theme', 'data-hermes-mode', 'class', 'style']
const CSS_ID = 'theme-forge-css'
let observer = null
let prevHtmlBg = null

function buildCss(theme) {
  const f = theme.forge || {}
  const extra = f.extraColors || {}
  const hasImage = Boolean(f.backgroundImage)
  const glassy = hasImage || Boolean(f.matrixRain)
  const dark = (document.documentElement.dataset.hermesMode || 'dark') !== 'light'
  const chromeMix = glassy ? (dark ? '50%' : '82%') : '100%'
  const sidebarMix = glassy ? (dark ? '74%' : '92%') : '100%'
  const editorMix = glassy ? (dark ? '34%' : '64%') : '100%'
  const elevatedMix = glassy ? (dark ? '46%' : '74%') : '100%'

  const lines = []
  lines.push(`html[data-hermes-theme="${theme.name}"] { background: transparent; }`)

  // NOTE: the background image itself is painted directly on <body> from
  // applyForge() (inline style wins over the app's body background) — not via
  // a body::before pseudo, which would sit *behind* the app's body paint.
  // The overlay is a div inside the FX container (see startFx).

  lines.push(
    `html[data-hermes-theme="${theme.name}"] {`,
    `  --ui-bg-chrome: color-mix(in srgb, var(--theme-background-seed) ${chromeMix}, transparent);`,
    `  --ui-bg-sidebar: color-mix(in srgb, var(--theme-sidebar-seed) ${sidebarMix}, transparent);`,
    `  --ui-bg-editor: color-mix(in srgb, var(--theme-card-seed) ${editorMix}, transparent);`,
    `  --ui-bg-elevated: color-mix(in srgb, var(--theme-elevated-seed) ${elevatedMix}, transparent);`,
    `}`
  )

  // Extended palette — the app's fixed --ui-* accents.
  const extraVars = {
    uiRed: '--ui-red',
    uiOrange: '--ui-orange',
    uiYellow: '--ui-yellow',
    uiGreen: '--ui-green',
    uiCyan: '--ui-cyan',
    uiBlue: '--ui-blue',
    uiPurple: '--ui-purple',
    uiWarm: '--ui-warm',
    diffAdd: '--ui-diff-add-border',
    diffAddBg: '--ui-diff-add-background',
    diffAddFg: '--ui-diff-add-foreground',
    diffRemove: '--ui-diff-remove-border',
    diffRemoveBg: '--ui-diff-remove-background',
    diffRemoveFg: '--ui-diff-remove-foreground'
  }
  const setExtra = Object.entries(extra).filter(([k]) => extraVars[k])
  if (setExtra.length > 0) {
    lines.push(`html[data-hermes-theme="${theme.name}"] {`)
    for (const [k, v] of setExtra) lines.push(`  ${extraVars[k]}: ${v};`)
    lines.push(`}`)
  }

  // Bold level: bump one or two steps on elements that already carry a weight.
  const bold = Number(f.boldLevel) || 0
  if (bold === 1) {
    lines.push(
      `html[data-tf-bold="1"] .font-medium { font-weight: 600; }`,
      `html[data-tf-bold="1"] .font-semibold { font-weight: 700; }`,
      `html[data-tf-bold="1"] .font-bold { font-weight: 800; }`
    )
  } else if (bold === 2) {
    lines.push(
      `html[data-tf-bold="2"] .font-medium { font-weight: 600; }`,
      `html[data-tf-bold="2"] .font-semibold { font-weight: 700; }`,
      `html[data-tf-bold="2"] .font-bold { font-weight: 800; }`,
      `html[data-tf-bold="2"] body { font-weight: 450; }`
    )
  }

  // Conversation text size — override the app's --conversation-* tokens.
  const fontSize = Number(f.fontSize) || 13
  if (fontSize !== 13) {
    const rem = (fontSize / 16).toFixed(4)
    const lineRem = ((fontSize * 1.3846) / 16).toFixed(4) // app line-height ratio
    lines.push(
      `html[data-hermes-theme="${theme.name}"] {`,
      `  --conversation-text-font-size: ${rem}rem;`,
      `  --conversation-line-height: ${lineRem}rem;`,
      `}`
    )
  }

  // Accent colors for chat markdown (typography plugin uses :where() with
  // zero specificity, so these plain rules win).
  if (f.headingColor) {
    lines.push(
      `html[data-hermes-theme="${theme.name}"] .prose :is(h1,h2,h3,h4) { color: ${f.headingColor}; }`
    )
  }
  if (f.linkColor) {
    lines.push(`html[data-hermes-theme="${theme.name}"] .prose a { color: ${f.linkColor}; }`)
  }
  if (f.codeColor) {
    lines.push(
      `html[data-hermes-theme="${theme.name}"] .prose code { color: ${f.codeColor}; }`,
      `html[data-hermes-theme="${theme.name}"] .prose pre { border-color: color-mix(in srgb, ${f.codeColor} 40%, transparent); }`
    )
  }

  return lines.filter(Boolean).join('\n')
}

function applyForge(theme) {
  const doc = document.documentElement
  let el = document.getElementById(CSS_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = CSS_ID
    document.head.appendChild(el)
  }
  el.textContent = buildCss(theme)

  // Paint the html background transparent so the image (painted on <body>)
  // is actually visible; restore when leaving the forge theme.
  if (prevHtmlBg === null) prevHtmlBg = doc.style.background || ''
  doc.style.background = 'transparent'

  const bold = Number(theme.forge?.boldLevel) || 0
  if (bold > 0) doc.dataset.tfBold = String(bold)
  else delete doc.dataset.tfBold

  paintBodyBackdrop(theme)
  startFx(theme)
}

// Paint the background image directly on <body> (inline style wins over the
// app's body paint) and keep the overlay inside the FX container.
const prevBodyStyle = {}

function paintBodyBackdrop(theme) {
  const f = theme.forge || {}
  const img = f.backgroundImage || ''
  const body = document.body
  if (!body) return

  if (prevBodyStyle.backgroundImage === undefined) {
    prevBodyStyle.backgroundImage = body.style.backgroundImage
    prevBodyStyle.backgroundSize = body.style.backgroundSize
    prevBodyStyle.backgroundPosition = body.style.backgroundPosition
    prevBodyStyle.backgroundRepeat = body.style.backgroundRepeat
    prevBodyStyle.backgroundColor = body.style.backgroundColor
  }

  if (img) {
    const blurPx = Math.max(0, Number(f.blur) || 0)
    body.style.backgroundImage = `url("${String(img).replace(/"/g, '%22')}")`
    body.style.backgroundSize = f.imageFit === 'contain' ? 'contain' : 'cover'
    body.style.backgroundPosition = 'center'
    body.style.backgroundRepeat = 'no-repeat'
    body.style.backgroundColor = 'transparent'
    if (blurPx > 0) body.style.filter = `blur(${blurPx}px) scale(${(1 + blurPx * 0.015).toFixed(3)})`
    else body.style.filter = ''
  } else {
    body.style.backgroundImage = ''
    body.style.backgroundColor = ''
    body.style.filter = ''
  }
}

function clearBodyBackdrop() {
  const body = document.body
  if (!body) return
  body.style.backgroundImage = prevBodyStyle.backgroundImage || ''
  body.style.backgroundSize = prevBodyStyle.backgroundSize || ''
  body.style.backgroundPosition = prevBodyStyle.backgroundPosition || ''
  body.style.backgroundRepeat = prevBodyStyle.backgroundRepeat || ''
  body.style.backgroundColor = prevBodyStyle.backgroundColor || ''
  body.style.filter = ''
  Object.keys(prevBodyStyle).forEach(k => delete prevBodyStyle[k])
}

function clearForge() {
  const el = document.getElementById(CSS_ID)
  if (el) el.remove()
  const doc = document.documentElement
  if (prevHtmlBg !== null) {
    doc.style.background = prevHtmlBg
    prevHtmlBg = null
  }
  delete doc.dataset.tfBold
  clearBodyBackdrop()
  stopFx()
}

function refresh() {
  const active = document.documentElement.dataset.hermesTheme
  const theme = active ? themeMap.get(active) : null
  if (theme) applyForge(theme)
  else clearForge()
}

function ensureObserver() {
  if (observer || typeof document === 'undefined') return
  observer = new MutationObserver(refresh)
  observer.observe(document.documentElement, {
    attributeFilter: OBSERVED_ATTRS,
    attributes: true
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// FX engine — animated backdrop effects the stock theme model can't do:
// matrix rain (canvas) and CRT scanlines. Both live in a fixed container
// behind the glass shell (z-index: -1), owned by the active forge theme.
// ─────────────────────────────────────────────────────────────────────────────

const FX_ID = 'theme-forge-fx'
const RAIN_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF'
const RAIN_FONT_SIZE = 15

let fxContainer = null
let rainCanvas = null
let rainCtx = null
let rainRaf = null
let rainCols = []
let fxResizeObserver = null
let overlayEl = null

function ensureFxContainer() {
  if (fxContainer) return fxContainer
  fxContainer = document.createElement('div')
  fxContainer.id = FX_ID
  fxContainer.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;'
  document.body.appendChild(fxContainer)
  return fxContainer
}

function removeFx() {
  if (rainRaf) {
    cancelAnimationFrame(rainRaf)
    rainRaf = null
  }
  if (fxResizeObserver) {
    fxResizeObserver.disconnect()
    fxResizeObserver = null
  }
  rainCanvas = null
  rainCtx = null
  rainCols = []
  overlayEl = null
  if (fxContainer) {
    fxContainer.remove()
    fxContainer = null
  }
}

function resizeRain() {
  if (!rainCanvas) return
  rainCanvas.width = window.innerWidth
  rainCanvas.height = window.innerHeight
  const cols = Math.ceil(rainCanvas.width / RAIN_FONT_SIZE)
  rainCols = Array.from({ length: cols }, () => Math.floor(Math.random() * -rainCanvas.height) / RAIN_FONT_SIZE)
}

function tickRain() {
  if (!rainCtx || !rainCanvas) return
  const ctx = rainCtx
  const w = rainCanvas.width
  const h = rainCanvas.height
  ctx.fillStyle = 'rgba(0, 0, 0, 0.09)'
  ctx.fillRect(0, 0, w, h)
  // Resolve the accent once per frame from the live theme (never hardcode).
  const color =
    getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim() || '#00FF41'
  ctx.fillStyle = color
  ctx.font = RAIN_FONT_SIZE + 'px "JetBrains Mono", ui-monospace, monospace'
  for (let i = 0; i < rainCols.length; i++) {
    const ch = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]
    ctx.fillText(ch, i * RAIN_FONT_SIZE, rainCols[i] * RAIN_FONT_SIZE)
    if (rainCols[i] * RAIN_FONT_SIZE > h && Math.random() > 0.975) rainCols[i] = 0
    rainCols[i]++
  }
  rainRaf = requestAnimationFrame(tickRain)
}
function startMatrixRain() {
  if (rainCanvas || typeof document === 'undefined') return
  const host = ensureFxContainer()
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;'
  host.appendChild(canvas)
  rainCanvas = canvas
  rainCtx = canvas.getContext('2d')
  resizeRain()
  fxResizeObserver = new ResizeObserver(resizeRain)
  fxResizeObserver.observe(document.body)
  rainRaf = requestAnimationFrame(tickRain)
}

function addScanlines() {
  if (typeof document === 'undefined') return
  const host = ensureFxContainer()
  if (host.querySelector('.forge-scanlines')) return
  const el = document.createElement('div')
  el.className = 'forge-scanlines'
  el.style.cssText =
    'position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px);'
  host.appendChild(el)
}

function startFx(theme) {
  const f = theme.forge || {}
  // Overlay sits between the body image and the rain/scanlines.
  if (f.overlayOpacity > 0) {
    const host = ensureFxContainer()
    if (!overlayEl) {
      overlayEl = document.createElement('div')
      overlayEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;'
      host.appendChild(overlayEl)
    }
    const dark = (document.documentElement.dataset.hermesMode || 'dark') !== 'light'
    overlayEl.style.background = dark ? `rgba(0,0,0,${f.overlayOpacity})` : `rgba(245,242,235,${f.overlayOpacity})`
  } else if (overlayEl) {
    overlayEl.remove()
    overlayEl = null
  }
  if (f.matrixRain) startMatrixRain()
  if (f.scanlines) addScanlines()
}

function stopFx() {
  removeFx()
}

// ─────────────────────────────────────────────────────────────────────────────
// Live authoring: push an updated custom theme into the registry so the app
// repaints the active skin in place ($registryVersion bumps → ThemeProvider
// re-derives + re-applies). The extras ride along in the object.
// ─────────────────────────────────────────────────────────────────────────────

function publishCustom() {
  if (customDisposer) {
    customDisposer()
    customDisposer = null
  }
  if (!customTheme) return
  customDisposer = registerTheme(customTheme)
  saveCustom()
  refresh()
}

function registerTheme(theme) {
  // Every theme carries the Text-tab defaults in its .forge extras (the app
  // ignores unknown keys; we read them back in buildCss).
  const merged = { ...theme, forge: { ...TEXT_DEFAULTS, ...(theme.forge || {}) } }
  themeMap.set(merged.name, merged)
  if (merged.name === CUSTOM_NAME) customTheme = merged
  return ctxOf.register({ id: 'theme:' + merged.name, area: THEMES_AREA, data: merged })
}

// Holds the plugin context (set in register); needed because live authoring
// happens outside register().
let ctxOf = null

// ─────────────────────────────────────────────────────────────────────────────
// Apply — activate a forge theme as the live skin.
//
// The desktop has NO programmatic setTheme for plugins, so we ride the
// canonical skin path: write `$HERMES_HOME/skins/<name>.yaml` + set
// `display.skin` via the plugin's Python backend (ctx.rest). The gateway's
// skin watcher then broadcasts `skin.changed` and the app repaints — the same
// live path `/skin` uses. Works for any Hermes surface, not just desktop.
// ─────────────────────────────────────────────────────────────────────────────

function skinTokensFromTheme(theme) {
  const c = theme.darkColors || theme.colors
  return {
    background: c.background,
    ui_text: c.foreground,
    ui_accent: c.midground || c.ring || c.primary,
    ui_primary: c.primary,
    ui_border: c.border,
    ui_error: c.destructive,
    banner_dim: c.mutedForeground,
    banner_title: c.foreground,
    banner_text: c.foreground,
    status_bar_bg: c.background,
    completion_menu_bg: c.popover,
    ui_ok: '#30A46C',
    ui_warn: c.ring || '#FFD700'
  }
}

async function activateSkin(theme) {
  const name = String(theme.name || '').replace(/[^a-z0-9-]/gi, '')
  if (!name) {
    host.notify({ kind: 'error', message: 'Nome de tema inválido.' })
    return null
  }
  try {
    const res = await ctxOf.rest('/activate', {
      method: 'POST',
      body: {
        name,
        label: theme.label,
        description: theme.description,
        colors: skinTokensFromTheme(theme)
      }
    })
    host.notify({ kind: 'info', message: `"${theme.label}" aplicado — repintando em ~1s` })
    return res
  } catch (e) {
    host.notify({
      kind: 'error',
      message: 'Falha ao aplicar. Ative manualmente: ⌘K → Themes → ' + theme.label + '. (' + (e && e.message ? e.message : String(e)) + ')'
    })
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The pane UI.
// ─────────────────────────────────────────────────────────────────────────────

const MAIN_TOKENS = [
  ['background', 'Background'],
  ['foreground', 'Foreground'],
  ['primary', 'Primary'],
  ['midground', 'Midground (accent)'],
  ['ring', 'Ring / focus'],
  ['accent', 'Accent soft'],
  ['accentForeground', 'Accent fg'],
  ['border', 'Border'],
  ['input', 'Input'],
  ['mutedForeground', 'Muted fg'],
  ['secondary', 'Secondary'],
  ['destructive', 'Destructive'],
  ['userBubble', 'User bubble'],
  ['card', 'Card']
]

const EXTRA_TOKENS = [
  ['uiRed', 'Red'],
  ['uiOrange', 'Orange'],
  ['uiYellow', 'Yellow'],
  ['uiGreen', 'Green'],
  ['uiCyan', 'Cyan'],
  ['uiBlue', 'Blue'],
  ['uiPurple', 'Purple'],
  ['uiWarm', 'Warm']
]

const BOLD_OPTIONS = [
  [0, 'Normal'],
  [1, 'Médio'],
  [2, 'Forte']
]

function ColorField({ label, value, onChange }) {
  return jsxs('label', {
    className: 'flex items-center gap-2 text-xs text-(--ui-text-secondary)',
    children: [
      jsx('input', {
        type: 'color',
        value: value,
        onChange: e => onChange(e.target.value),
        className: 'h-6 w-9 cursor-pointer rounded border border-(--ui-stroke-secondary) bg-transparent p-0'
      }),
      jsx('span', { className: 'min-w-0 flex-1 truncate', children: label }),
      jsx('span', { className: 'font-mono text-[0.625rem] text-(--ui-text-quaternary)', children: value })
    ]
  })
}

// ColorField variant that supports "unset" (null): the picker is ALWAYS
// visible so a color can be chosen even from the auto state; the reset
// affordance returns to the theme default.
function ColorResetField({ label, value, onChange, onReset, defaultColor }) {
  const shown = value || defaultColor || '#808080'
  const isAuto = !value
  return jsxs('div', {
    className: 'flex items-center gap-2 text-xs text-(--ui-text-secondary)',
    children: [
      jsx('div', {
        className: 'relative shrink-0',
        children: [
          jsx('input', {
            type: 'color',
            value: shown,
            onChange: e => onChange(e.target.value),
            className: cn(
              'h-6 w-9 cursor-pointer rounded border bg-transparent p-0',
              isAuto ? 'border-dashed border-(--ui-stroke-secondary)' : 'border-(--ui-stroke-secondary)'
            ),
            title: isAuto ? 'Usando a cor padrão do tema — escolha para personalizar' : 'Cor personalizada'
          }),
          isAuto &&
            jsx('span', {
              className: 'pointer-events-none absolute -right-1 -top-1 h-2 w-2 rounded-full border border-(--ui-bg-elevated) bg-(--ui-yellow)',
              title: 'Auto'
            })
        ]
      }),
      jsx('span', { className: 'min-w-0 flex-1 truncate', children: label }),
      jsx('button', {
        type: 'button',
        onClick: onReset,
        className: 'rounded p-1 text-(--ui-text-quaternary) transition-colors hover:bg-(--ui-row-hover-background) hover:text-(--ui-text-secondary)',
        title: 'Resetar para a cor padrão do tema',
        children: jsx(icons.RefreshCw, { className: 'h-3 w-3' })
      })
    ]
  })
}

function Segmented({ options, value, onChange, className }) {
  return jsx('div', {
    className: cn('flex rounded-md border border-(--ui-stroke-secondary) p-0.5', className),
    children: options.map(([v, label]) =>
      jsx(
        'button',
        {
          key: String(v),
          type: 'button',
          onClick: () => onChange(v),
          className: cn(
            'flex-1 rounded-[0.3125rem] px-2 py-1 text-[0.6875rem] font-medium transition-colors',
            value === v
              ? 'bg-(--ui-accent) text-(--ui-bg-primary)'
              : 'text-(--ui-text-secondary) hover:bg-(--ui-row-hover-background)'
          ),
          children: label
        },
        String(v)
      )
    )
  })
}

function Section({ title, children }) {
  return jsxs('div', {
    className: 'flex flex-col gap-2',
    children: [
      jsx('div', {
        className: 'text-[0.6875rem] font-semibold uppercase tracking-wide text-(--ui-text-quaternary)',
        children: title
      }),
      children
    ]
  })
}


function activeThemeName() {
  return typeof document !== 'undefined' ? document.documentElement.dataset.hermesTheme || 'nous' : 'nous'
}

// Re-render the pane header when the active theme changes.
function useActiveTheme() {
  const [name, setName] = useState(activeThemeName())
  useEffect(() => {
    if (typeof document === 'undefined') return
    const obs = new MutationObserver(() => setName(activeThemeName()))
    obs.observe(document.documentElement, { attributeFilter: ['data-hermes-theme'], attributes: true })
    return () => obs.disconnect()
  }, [])
  return name
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin entry.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  id: 'theme-forge',
  name: 'Theme Forge',
  register(ctx) {
    ctxOf = ctx
    storage = ctx.storage
    customTheme = loadCustom()

    // Clean up any FX container left behind by a previous incarnation of this
    // module (hot-reload re-evaluates the file; the DOM keeps old canvases).
    const staleFx = document.getElementById(FX_ID)
    if (staleFx) staleFx.remove()

    for (const theme of PRESETS) registerTheme(theme)
    customDisposer = registerTheme(customTheme)

    ctx.register({
      id: 'pane',
      area: 'panes',
      title: 'theme forge',
      data: { placement: 'right', width: '340px' },
      render: () => jsx(ForgePane, {})
    })

    // Full page + sidebar nav row — discoverable next to the app's other
    // menu entries (Capabilities, Messaging, Artifacts).
    ctx.registerMany([
      {
        id: 'page',
        area: ROUTES_AREA,
        data: { path: '/theme-forge' },
        render: () => jsx(ForgePage, {})
      },
      {
        id: 'nav',
        area: SIDEBAR_NAV_AREA,
        data: { path: '/theme-forge', label: 'Theme Forge', codicon: 'project' }
      },
      {
        id: 'open',
        area: PALETTE_AREA,
        data: {
          id: 'theme-forge.open',
          label: 'Theme Forge · Abrir editor',
          keywords: ['theme', 'forge', 'tema', 'editor', 'wallpaper'],
          run: () => host.navigate('/theme-forge')
        }
      }
    ])

    ctx.register({
      id: 'reset',
      area: PALETTE_AREA,
      data: {
        id: 'theme-forge.reset',
        label: 'Theme Forge · Reset custom theme',
        keywords: ['theme', 'forge', 'reset', 'tema'],
        run: () => {
          customTheme = defaultCustom()
          publishCustom()
          host.notify({ kind: 'info', message: 'Theme Forge: custom theme reset' })
        }
      }
    })

    // Paint as soon as we load (the forge theme may already be active) and
    // keep watching for theme switches.
    ensureObserver()
    refresh()
  }
}

// Pane component must see fresh theme-name state; wrap in a component using
// the hook so the header badge stays live.
function ForgePane() {
  const activeTheme = useActiveTheme()
  const isForgeActive = activeTheme === CUSTOM_NAME || PRESETS.some(p => p.name === activeTheme)
  return jsx(PaneInner, { activeTheme: activeTheme, isForgeActive: isForgeActive })
}

// Full-page version of the same editor (route /theme-forge).
function ForgePage() {
  const activeTheme = useActiveTheme()
  const isForgeActive = activeTheme === CUSTOM_NAME || PRESETS.some(p => p.name === activeTheme)
  return jsx('div', {
    className: 'h-full w-full',
    children: jsx(PaneInner, { activeTheme: activeTheme, isForgeActive: isForgeActive, wide: true })
  })
}

function PaneInner({ activeTheme, isForgeActive, wide = false }) {
  const [tab, setTab] = useState('colors')
  const [palette, setPalette] = useState('dark')
  const [state, setState] = useState(() => cloneState())
  const [saved, setSaved] = useState(true)
  const [localFile, setLocalFile] = useState(null) // { name, size } of the picked file
  const [applyName, setApplyName] = useState(CUSTOM_NAME)
  const timer = useRef(null)
  const fileInputRef = useRef(null)
  const inactiveWarned = useRef(false)

  const colors = palette === 'dark' ? state.darkColors : state.colors
  const extras = state.forge

  function cloneState() {
    const t = loadCustom()
    return JSON.parse(JSON.stringify(t))
  }

  // Local image picker: input[type=file] → FileReader → data URI. Electron
  // gives us the real File, so no backend/bridge is needed.
  function pickLocalImage(file) {
    if (!file) return
    const MAX = 2.5 * 1024 * 1024
    if (file.size > MAX) {
      host.notify({
        kind: 'error',
        message: 'Imagem muito grande (>2.5MB). Use uma menor ou cole uma URL — imagens grandes não cabem no armazenamento do app.'
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLocalFile({ name: file.name, size: file.size })
      bumpExtras({ backgroundImage: reader.result })
    }
    reader.onerror = () => host.notify({ kind: 'error', message: 'Falha ao ler o arquivo de imagem.' })
    reader.readAsDataURL(file)
  }

  function clearLocalFile() {
    setLocalFile(null)
    bumpExtras({ backgroundImage: null })
  }

  function fmtSize(bytes) {
    return bytes >= 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(bytes / 1024) + ' KB'
  }

  function bump(patch) {
    setState(prev => ({ ...prev, ...patch }))
    setSaved(false)
  }

  function bumpColors(patch) {
    setState(prev => {
      const target = palette === 'dark' ? prev.darkColors : prev.colors
      return { ...prev, [palette === 'dark' ? 'darkColors' : 'colors']: { ...target, ...patch } }
    })
    setSaved(false)
  }

  function bumpExtras(patch) {
    setState(prev => ({ ...prev, forge: { ...prev.forge, ...patch } }))
    setSaved(false)
  }

  function bumpExtraColor(key, value) {
    setState(prev => ({ ...prev, forge: { ...prev.forge, extraColors: { ...prev.forge.extraColors, [key]: value } } }))
    setSaved(false)
  }

  useEffect(() => {
    if (isForgeActive) inactiveWarned.current = false
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      customTheme = JSON.parse(JSON.stringify(state))
      publishCustom()
      setSaved(true)
      // Edited while the forge theme is NOT active → nothing visibly changed.
      // Warn once per editing session so the user knows why.
      if (!isForgeActive && !inactiveWarned.current) {
        inactiveWarned.current = true
        host.notify({
          kind: 'info',
          message: 'Mudança salva no Theme Forge — ative o tema para ver: ⌘K → Themes → Theme Forge · Custom'
        })
      }
    }, 180)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [state])

  function resetAll() {
    customTheme = defaultCustom()
    publishCustom()
    setState(JSON.parse(JSON.stringify(customTheme)))
    setSaved(true)
  }

  return jsxs(ScrollArea, {
    className: 'h-full',
    children: [
      jsx('div', {
        className: cn('flex h-full flex-col gap-4 text-sm', wide ? 'mx-auto w-full max-w-2xl p-6' : 'p-3'),
        children: [
          jsxs('div', {
            className: 'flex items-center justify-between gap-2',
            children: [
              jsxs('div', {
                className: 'flex items-center gap-1.5',
                children: [
                  jsx(icons.Palette, { className: 'h-3.5 w-3.5 text-(--ui-accent)' }),
                  jsx('div', { className: 'text-[0.8125rem] font-semibold', children: 'Theme Forge' }),
                  jsx(Badge, {
                    variant: 'outline',
                    children: isForgeActive ? 'tema forge ativo' : 'ativo: ' + activeTheme
                  })
                ]
              }),
              jsx(Tip, {
                label: 'Reset custom theme',
                children: jsx(Button, {
                  variant: 'ghost',
                  size: 'sm',
                  onClick: resetAll,
                  children: jsx(icons.RefreshCw, { className: 'h-3.5 w-3.5' })
                })
              })
            ]
          }),
          jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              jsx('select', {
                value: applyName,
                onChange: e => setApplyName(e.target.value),
                className: cn(
                  'h-7 min-w-0 flex-1 rounded-md border border-(--ui-stroke-secondary) bg-(--ui-bg-elevated) px-2 text-[0.6875rem]',
                  'text-(--ui-text-primary) outline-none focus:border-(--ui-accent)'
                ),
                children: [
                  jsx('option', { value: CUSTOM_NAME, children: 'Custom (editado)' }),
                  PRESETS.map(p => jsx('option', { key: p.name, value: p.name, children: p.label }))
                ]
              }),
              jsx(Button, {
                size: 'sm',
                onClick: () => {
                  const theme =
                    applyName === CUSTOM_NAME ? state : PRESETS.find(p => p.name === applyName) || state
                  void activateSkin(theme)
                },
                children: 'Aplicar'
              })
            ]
          }),
          !isForgeActive &&
            jsxs('div', {
              className: 'flex flex-col gap-1.5 rounded-md border border-(--ui-yellow) bg-(--ui-bg-secondary) p-2.5 text-[0.6875rem] leading-relaxed text-(--ui-text-secondary)',
              children: [
                jsxs('div', {
                  className: 'flex items-center gap-1.5 font-medium text-(--ui-text-primary)',
                  children: [
                    jsx(icons.Info, { className: 'h-3.5 w-3.5 text-(--ui-yellow)' }),
                    'O tema forge ainda não está ativo — as mudanças abaixo não aparecem.'
                  ]
                }),
                jsx('p', {
                  className: 'text-[0.625rem]',
                  children:
                    'Tudo que você editar fica salvo. Para ver: ⌘K → Themes → escolha "Theme Forge · Custom" (ou Forge Cyber / Glass / Paper).'
                })
              ]
            }),
          jsx(Tabs, {
            value: tab,
            onValueChange: setTab,
            children: [
              jsx(TabsList, {
                children: [
                  jsx(TabsTrigger, { value: 'colors', children: 'Cores' }),
                  jsx(TabsTrigger, { value: 'image', children: 'Imagem' }),
                  jsx(TabsTrigger, { value: 'text', children: 'Texto' })
                ]
              }),
              tab === 'colors' &&
                jsxs('div', {
                  className: 'flex flex-col gap-4 pt-1',
                  children: [
                    jsx(Segmented, {
                      options: [
                        ['dark', 'Escuro'],
                        ['light', 'Claro']
                      ],
                      value: palette,
                      onChange: setPalette
                    }),
                    jsxs(Section, {
                      title: 'Núcleo',
                      children: jsx('div', {
                        className: 'grid grid-cols-1 gap-1.5',
                        children: MAIN_TOKENS.map(([key, label]) =>
                          jsx(ColorField, {
                            key: key,
                            label: label,
                            value: colors[key] || '#000000',
                            onChange: v => bumpColors({ [key]: v })
                          })
                        )
                      })
                    }),
                    jsxs(Section, {
                      title: 'Paleta estendida (fixa no app)',
                      children: jsxs('div', {
                        className: 'grid grid-cols-1 gap-1.5',
                        children: [
                          jsx('p', {
                            className: 'text-[0.625rem] leading-relaxed text-(--ui-text-quaternary)',
                            children: 'Cores que o app mantém fixas (status, diffs, sintaxe). O forge as sobrescreve.'
                          }),
                          EXTRA_TOKENS.map(([key, label]) =>
                            jsx(ColorField, {
                              key: key,
                              label: label,
                              value: extras.extraColors[key] || '#888888',
                              onChange: v => bumpExtraColor(key, v)
                            })
                          )
                        ]
                      })
                    })
                  ]
                }),
              tab === 'image' &&
                jsxs('div', {
                  className: 'flex flex-col gap-4 pt-1',
                  children: [
                    jsxs(Section, {
                      title: 'Imagem de fundo',
                      children: [
                        jsxs('div', {
                          className: 'flex items-center gap-2',
                          children: [
                            jsx('input', {
                              ref: fileInputRef,
                              type: 'file',
                              accept: 'image/*',
                              className: 'hidden',
                              onChange: e => {
                                pickLocalImage(e.target.files && e.target.files[0])
                                e.target.value = ''
                              }
                            }),
                            jsx(Button, {
                              variant: 'outline',
                              size: 'sm',
                              onClick: () => fileInputRef.current && fileInputRef.current.click(),
                              children: jsxs('span', {
                                className: 'flex items-center gap-1.5',
                                children: [
                                  jsx(icons.FolderOpen, { className: 'h-3.5 w-3.5' }),
                                  'Procurar no Mac…'
                                ]
                              })
                            }),
                            localFile &&
                              jsx('span', {
                                className: 'min-w-0 flex-1 truncate text-[0.625rem] text-(--ui-text-tertiary)',
                                children: localFile.name + ' · ' + fmtSize(localFile.size)
                              })
                          ]
                        }),
                        jsx(Input, {
                          placeholder: '…ou cole uma URL (https://)',
                          value: extras.backgroundImage && !extras.backgroundImage.startsWith('data:') ? extras.backgroundImage : '',
                          onChange: e => bumpExtras({ backgroundImage: e.target.value || null })
                        }),
                        jsx(Segmented, {
                          options: [
                            ['cover', 'Cobrir'],
                            ['contain', 'Ajustar']
                          ],
                          value: extras.imageFit,
                          onChange: v => bumpExtras({ imageFit: v })
                        })
                      ]
                    }),
                    jsxs(Section, {
                      title: 'Overlay (escurece para legibilidade)',
                      children: jsx('div', {
                        className: 'flex items-center gap-2',
                        children: [
                          jsx('input', {
                            type: 'range',
                            min: 0,
                            max: 0.9,
                            step: 0.05,
                            value: extras.overlayOpacity,
                            onChange: e => bumpExtras({ overlayOpacity: Number(e.target.value) }),
                            className: 'flex-1 accent-(--ui-accent)'
                          }),
                          jsx('span', {
                            className: 'w-9 text-right font-mono text-[0.625rem] text-(--ui-text-tertiary)',
                            children: Math.round(extras.overlayOpacity * 100) + '%'
                          })
                        ]
                      })
                    }),
                    jsxs(Section, {
                      title: 'Blur',
                      children: jsx('div', {
                        className: 'flex items-center gap-2',
                        children: [
                          jsx('input', {
                            type: 'range',
                            min: 0,
                            max: 12,
                            step: 1,
                            value: extras.blur,
                            onChange: e => bumpExtras({ blur: Number(e.target.value) }),
                            className: 'flex-1 accent-(--ui-accent)'
                          }),
                          jsx('span', {
                            className: 'w-9 text-right font-mono text-[0.625rem] text-(--ui-text-tertiary)',
                            children: extras.blur + 'px'
                          })
                        ]
                      })
                    }),
                    extras.backgroundImage
                      ? jsx(Button, {
                          variant: 'outline',
                          size: 'sm',
                          onClick: clearLocalFile,
                          children: 'Remover imagem'
                        })
                      : jsx('p', {
                          className: 'text-[0.625rem] text-(--ui-text-quaternary)',
                          children: 'Sem imagem — o tema usa cor sólida.'
                        })
                  ]
                }),
              tab === 'text' &&
                jsxs('div', {
                  className: 'flex flex-col gap-4 pt-1',
                  children: [
                    jsxs(Section, {
                      title: 'Bold no texto',
                      children: [
                        jsx(Segmented, {
                          options: BOLD_OPTIONS,
                          value: extras.boldLevel,
                          onChange: v => bumpExtras({ boldLevel: v })
                        }),
                        jsx('p', {
                          className: 'text-[0.625rem] leading-relaxed text-(--ui-text-quaternary)',
                          children:
                            'Médio: textos com peso (medium/semibold/bold) sobem um degrau. Forte: o corpo inteiro fica mais pesado.'
                        })
                      ]
                    }),
                    jsxs(Section, {
                      title: 'Fonte',
                      children: [
                        jsx(Segmented, {
                          options: Object.entries(FONT_PRESETS).map(([key, p]) => [key, p.label]),
                          value: extras.fontFamily,
                          onChange: v => {
                            const preset = FONT_PRESETS[v]
                            if (!preset) return
                            bump({
                              typography: { fontSans: preset.fontSans, fontMono: preset.fontMono, fontUrl: preset.fontUrl },
                              forge: { ...extras, fontFamily: v }
                            })
                          }
                        }),
                        jsx('p', {
                          className: 'text-[0.625rem] leading-relaxed text-(--ui-text-quaternary)',
                          children: 'Aplicada a todo o app (sans + mono). Fontes do Google são carregadas sob demanda.'
                        })
                      ]
                    }),
                    jsxs(Section, {
                      title: 'Tamanho do texto',
                      children: jsx('div', {
                        className: 'flex items-center gap-2',
                        children: [
                          jsx('input', {
                            type: 'range',
                            min: 11,
                            max: 18,
                            step: 0.5,
                            value: extras.fontSize,
                            onChange: e => bumpExtras({ fontSize: Number(e.target.value) }),
                            className: 'flex-1 accent-(--ui-accent)'
                          }),
                          jsx('span', {
                            className: 'w-12 text-right font-mono text-[0.625rem] text-(--ui-text-tertiary)',
                            children: extras.fontSize + 'px'
                          })
                        ]
                      })
                    }),
                    jsxs(Section, {
                      title: 'Cores de destaque',
                      children: jsxs('div', {
                        className: 'grid grid-cols-1 gap-1.5',
                        children: [
                          jsx('p', {
                            className: 'text-[0.625rem] leading-relaxed text-(--ui-text-quaternary)',
                            children: 'Títulos, links e código/arquivos do markdown do chat. Vazio = cor padrão do tema.'
                          }),
                          jsx(ColorResetField, {
                            label: 'Títulos (h1–h4)',
                            value: extras.headingColor,
                            defaultColor: colors.foreground,
                            onChange: v => bumpExtras({ headingColor: v }),
                            onReset: () => bumpExtras({ headingColor: null })
                          }),
                          jsx(ColorResetField, {
                            label: 'Links',
                            value: extras.linkColor,
                            defaultColor: colors.midground || colors.ring || colors.primary,
                            onChange: v => bumpExtras({ linkColor: v }),
                            onReset: () => bumpExtras({ linkColor: null })
                          }),
                          jsx(ColorResetField, {
                            label: 'Código / nomes de arquivo',
                            value: extras.codeColor,
                            defaultColor: colors.mutedForeground,
                            onChange: v => bumpExtras({ codeColor: v }),
                            onReset: () => bumpExtras({ codeColor: null })
                          })
                        ]
                      })
                    }),
                    saved
                      ? jsx('p', {
                          className: 'text-[0.625rem] text-(--ui-text-quaternary)',
                          children: '✓ Alterações salvas e aplicadas ao vivo'
                        })
                      : jsx('p', {
                          className: 'text-[0.625rem] text-(--ui-text-tertiary)',
                          children: '…aplicando'
                        })
                  ]
                })
            ]
          })
        ]
      })
    ]
  })
}
