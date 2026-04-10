/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0e1a',
        primary: '#7c3aed',
        secondary: '#06b6d4',
        success: '#22c55e',
        accent: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
