/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          bg: 'var(--primary-bg)',
          text: 'var(--primary-text)',
        },
        secondary: {
          bg: 'var(--secondary-bg)',
          text: 'var(--secondary-text)',
        },
        accent: 'var(--accent-color)',
        pink: {
          200: '#fbcfe8',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
        }
      },
    },
  },
  plugins: [],
}
