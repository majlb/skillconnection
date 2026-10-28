/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff', 100: '#d9eaff', 200: '#bcdaff', 300: '#8ec3ff', 400: '#59a2ff',
          500: '#337dff', 600: '#1b5ef5', 700: '#1449e1', 800: '#173cb6', 900: '#19378f',
        },
        accent: { 500: '#ff5a5f', 600: '#e0484d' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 6px 24px -8px rgba(0,0,0,0.12)' },
    },
  },
  plugins: [],
};
