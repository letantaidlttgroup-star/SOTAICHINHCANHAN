/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        backdrop: 'var(--backdrop)', bg: 'var(--bg)', surface: 'var(--surface)',
        surface2: 'var(--surface2)', ink: 'var(--ink)', mut: 'var(--mut)',
        faint: 'var(--faint)', gold: 'var(--gold)', pos: 'var(--pos)',
        neg: 'var(--neg)', line: 'var(--line)', keypad: 'var(--keypad)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
