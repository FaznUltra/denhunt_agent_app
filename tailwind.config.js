/** @type {import('tailwindcss').Config} */
// DenHunt colour tokens — see docs/denhunt-design-system.md
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#EBF1FF',
          100: '#C3D4FC',
          200: '#92AEFA',
          400: '#4F7CF5',
          600: '#1B4FDC', // primary brand
          800: '#1338A0',
          900: '#0A1F6B',
        },
        gray: {
          50: '#F6F7F9', // page bg
          100: '#F0F0F0', // dividers
          200: '#E5E7EB', // borders
          400: '#9CA3AF', // placeholder
          500: '#6B7280', // muted
          700: '#374151', // body
          900: '#0F1419', // headings
        },
        success: { DEFAULT: '#ECFDF5', fg: '#065F46' },
        warning: { DEFAULT: '#FFF4E0', fg: '#92400E' },
        error: { DEFAULT: '#FEF2F2', fg: '#991B1B' },
        info: { DEFAULT: '#EBF1FF', fg: '#1B4FDC' },
      },
      fontFamily: {
        regular: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
