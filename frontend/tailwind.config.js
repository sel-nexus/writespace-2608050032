/** Define light editorial tokens; Georgia gives writing a publication voice. */
import colors from 'tailwindcss/colors';
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.indigo, secondary: colors.violet, neutral: colors.slate,
        background: '#f8fafc', surface: '#ffffff', 'surface-raised': '#eef2ff',
        foreground: '#1e293b', 'foreground-muted': '#475569', border: '#e2e8f0', ring: '#6366f1',
        success: { DEFAULT: '#15803d', light: '#f0fdf4' },
        warning: { DEFAULT: '#92400e', light: '#fffbeb' },
        error: { DEFAULT: '#b91c1c', light: '#fef2f2' },
        info: { DEFAULT: '#4338ca', light: '#eef2ff' },
      },
      fontFamily: { sans: ['Arial', 'sans-serif'], display: ['Georgia', 'serif'] },
      borderRadius: { card: '16px', control: '8px' },
      boxShadow: { editorial: '0 24px 60px -24px rgba(30,41,59,0.3)' },
      keyframes: { float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } } },
      animation: { float: 'float 6s ease-in-out infinite' },
      transitionDuration: { gentle: '200ms' },
    },
  },
  plugins: [],
};
