import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f3f0fa',
          100: '#e4dcf3',
          200: '#cbb8e8',
          300: '#ab8ad9',
          400: '#8b5fc9',
          500: '#6f3fb8',
          600: '#5c2fa0',
          700: '#4a2482',
          800: '#3b1c68',
          900: '#2e1552',
          DEFAULT: '#4a2482',
        },
        accent: {
          50: '#fdf8ec',
          100: '#faedc4',
          200: '#f5db8d',
          300: '#eec24f',
          400: '#e6ab2e',
          500: '#d4af37',
          600: '#b17817',
          700: '#8c5d14',
          DEFAULT: '#d4af37',
        },
        dark: {
          DEFAULT: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        'modal': '0 20px 60px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'scan-line': 'scanLine 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-10px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        scanLine: {
          '0%': { top: '10%' },
          '50%': { top: '90%' },
          '100%': { top: '10%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
