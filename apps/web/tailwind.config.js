/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)', surface: 'var(--color-surface)', border: 'var(--color-border)',
        text: 'var(--color-text)', muted: 'var(--color-muted)', primary: 'var(--color-primary)',
        'primary-soft': 'var(--color-primary-soft)', success: 'var(--color-success)',
        warning: 'var(--color-warning)', danger: 'var(--color-danger)', info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: { control: '8px', card: '12px', dialog: '16px' }
    }
  },
  plugins: []
}

