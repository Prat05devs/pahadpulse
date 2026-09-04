import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-light': '#FAF8F4',
        'bg-dark': '#10241D',
        'text-light': '#14201C',
        'text-dark': '#EAF0EC',
        'accent': '#E4681F',
        'border': '#D4CCBE',
        'surface': '#FFFFFF',
        'surface-hover': '#F5F3F0',
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-anek-devanagari)', 'serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      spacing: {
        'rail': '264px',
      },
      width: {
        'rail': '264px',
      },
    },
  },
  plugins: [],
};

export default config;
