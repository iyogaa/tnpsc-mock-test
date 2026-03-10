export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Tamil', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Sora', 'sans-serif'],
      },
      colors: {
        navy: { 950: '#040d1f', 900: '#0a1628', 800: '#112040', 700: '#1a3260', 600: '#1e40af' },
        exam: { green: '#059669', red: '#dc2626', amber: '#d97706', purple: '#7c3aed', blue: '#2563eb' }
      }
    }
  },
  plugins: []
}
