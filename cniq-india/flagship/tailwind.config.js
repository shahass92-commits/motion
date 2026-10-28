/** Compass Nexus iQ flagship · Tailwind theme (shares CNIQ India's cobalt / gold and type). */
module.exports = {
  content: ['./index.html', './assets/js/flagship.js'],
  theme: {
    extend: {
      colors: {
        night: '#04060c',
        abyss: '#070c1a',
        navy: { DEFAULT: '#0a1430', 2: '#0f1d44', 3: '#16295c' },
        cobalt: { DEFAULT: '#1d4eff', soft: '#5b82ff', ice: '#a9bcff' },
        gold: { DEFAULT: '#e2b100', soft: '#f2cf55', pale: '#f8e7a8' },
        paper: { DEFAULT: '#f5f4f0', 2: '#ebe9e2' },
        ink: { DEFAULT: '#0d0e10', 2: '#3c4049' },
        mist: '#9aa3b5',
      },
      fontFamily: {
        sans: ['Archivo', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['Archivo', '"Arial Black"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"Martian Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: { label: '.18em' },
      maxWidth: { site: '88rem' },
      transitionTimingFunction: { out: 'cubic-bezier(.16,1,.3,1)' },
    },
  },
  plugins: [],
};
