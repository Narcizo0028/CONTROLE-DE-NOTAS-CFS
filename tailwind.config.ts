import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf6eb',
          100: '#f0e8d0',
          200: '#e0d0a8',
          300: '#cdb87e',
          400: '#b89d55',
          500: '#a3863a',
          600: '#8a6f2e',
          700: '#6d5624',
          800: '#57441f',
          900: '#48391c',
        },
        pmmg: {
          khaki: {
            50: '#f7f4ed',
            100: '#ede6d5',
            200: '#ddd0b0',
            300: '#c9b484',
            400: '#b89a5e',
            500: '#a88648',
            600: '#916d3a',
            700: '#755432',
            800: '#61452e',
            900: '#533b29',
          },
          gold: {
            50: '#fbf8ef',
            100: '#f5eed3',
            200: '#ead9a5',
            300: '#ddc06f',
            400: '#d4af37',
            500: '#c49a1f',
            600: '#a87a18',
            700: '#865c17',
            800: '#6f4a1a',
            900: '#5c3e19',
          },
          black: {
            DEFAULT: '#1a1a1a',
            light: '#2d2d2d',
            dark: '#0d0d0d',
          },
          gray: {
            50: '#f5f5f5',
            100: '#e8e8e8',
            200: '#d4d4d4',
            300: '#b0b0b0',
            400: '#8a8a8a',
            500: '#6b6b6b',
            600: '#525252',
            700: '#404040',
            800: '#2e2e2e',
            900: '#1f1f1f',
          },
        },
        military: {
          50: '#f7f4ed',
          100: '#ede6d5',
          500: '#a88648',
          700: '#755432',
          800: '#61452e',
          900: '#533b29',
        },
      },
      backgroundImage: {
        'pmmg-gradient': 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #2d2d2d 100%)',
        'pmmg-gold-line': 'linear-gradient(90deg, transparent 0%, #d4af37 50%, transparent 100%)',
      },
      boxShadow: {
        pmmg: '0 4px 20px rgba(0, 0, 0, 0.15)',
        'pmmg-gold': '0 4px 14px rgba(212, 175, 55, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
