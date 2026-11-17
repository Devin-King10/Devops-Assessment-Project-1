/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warehouse: {
          navy: '#14213D',
          dark: '#0B132B',
          blue: '#2563EB',
          'blue-hover': '#1D4ED8',
          bg: '#F5F7FB',
          card: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#64748B',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
        }
      }
    },
  },
  plugins: [],
}
