/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
        },
        accent: {
          indigo: '#6366f1',
          blue: '#3b82f6',
          amber: '#f59e0b',
          red: '#ef4444',
          green: '#10b981',
          purple: '#8b5cf6',
        }
      }
    },
  },
  plugins: [],
}
