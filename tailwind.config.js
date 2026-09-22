/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF1F6', 100: '#D9DFEA', 200: '#B3BFD4', 300: '#8496B5',
          400: '#5A6E93', 500: '#3E5275', 600: '#2E3E5E', 700: '#24324D',
          800: '#1E2B45', 900: '#162036', 950: '#0F1626',
        },
        burgundy: {
          50: '#FBEFF1', 100: '#F4D9DE', 200: '#E6B0BA', 300: '#D07F8F',
          400: '#B04F64', 500: '#933548', 600: '#7A2336', 700: '#6E2032',
          800: '#561A28', 900: '#3F1320',
        },
        sand: { 50: '#FBF8F3', 100: '#F3ECE1', 200: '#E6D8C3', 300: '#D6C1A1', 400: '#C2A57C' },
        gold: { 300: '#D8C08E', 400: '#C6A86E', 500: '#B8975A', 600: '#9A7B43' },
        paper: '#F7F6F3',
        ink: '#1B2233',
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
        quran: ['Amiri', 'Tajawal', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(30,43,69,.04), 0 8px 24px -12px rgba(30,43,69,.12)',
        lift: '0 2px 4px rgba(30,43,69,.05), 0 18px 40px -18px rgba(30,43,69,.28)',
        ticket: '0 24px 48px -24px rgba(122,35,54,.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': { from: { opacity: '0', transform: 'translateY(8px) scale(.98)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        rise: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
        'pop-in': 'pop-in .25s cubic-bezier(.2,.8,.2,1)',
        'slide-in': 'slide-in .28s cubic-bezier(.2,.8,.2,1)',
        rise: 'rise .7s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
