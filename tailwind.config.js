/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090A0C',
        surface: '#111318',
        'surface-hover': '#181B22',
        'surface-border': '#222631',
        sidebar: '#0D0F14',
        accent: {
          DEFAULT: '#E2E8F0',
          muted: '#94A3B8',
          subtle: '#334155',
          gold: '#C5A059',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'card': '0 4px 12px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
