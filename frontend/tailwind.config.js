/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Game Colors
        background: '#0a0e1a',
        'gba-bg': '#1a1a2e',
        'gba-panel': '#16213e',
        'gba-text': '#eaeaea',
        
        // GBA Palette (retro 16-bit era)
        primary: '#7c3aed',
        secondary: '#06b6d4',
        success: '#22c55e',
        accent: '#f59e0b',
        danger: '#ef4444',
        
        // Retro/GBA specific colors
        'retro-purple': '#6d28d9',
        'retro-cyan': '#0d9488',
        'retro-orange': '#ea580c',
        'retro-blue': '#0369a1',
        'retro-indigo': '#4338ca',
        'retro-sky': '#0ea5e9',
        'retro-pink': '#ec4899',
        'retro-lime': '#a3e635',
        
        // UI Window Colors
        'window-dark': '#1a1a2e',
        'window-border': '#06b6d4',
        'window-text': '#eaeaea',
        'window-shadow': 'rgba(0, 0, 0, 0.8)',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'scanlines': 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)',
        'scanlines-thin': 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 1px, transparent 1px, transparent 3px)',
      },
      boxShadow: {
        'pixel': '2px 2px 0px rgba(0, 0, 0, 0.5), 4px 4px 0px rgba(0, 0, 0, 0.3)',
        'pixel-lg': '4px 4px 0px rgba(0, 0, 0, 0.5), 8px 8px 0px rgba(0, 0, 0, 0.3)',
        'pixel-inset': 'inset 2px 2px 0px rgba(0, 0, 0, 0.5), inset -2px -2px 0px rgba(255, 255, 255, 0.1)',
        'neon-glow': '0 0 10px rgba(124, 58, 237, 0.8), inset 0 0 10px rgba(124, 58, 237, 0.3)',
        'gba-panel': '0 4px 16px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'pixel-bounce': 'pixel-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
        'text-pop': 'text-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'damage-flash': 'damage-flash 0.3s ease-in-out',
        'scanline-flicker': 'scanline-flicker 0.15s infinite',
      },
      keyframes: {
        'pixel-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'text-pop': {
          '0%': { transform: 'scale(0.8) translateY(8px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'damage-flash': {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.8)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'scanline-flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.98' },
        },
      },
    },
  },
  plugins: [],
}
