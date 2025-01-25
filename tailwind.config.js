/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FFFBF2',
          100: '#FDF6E3',
          200: '#FAECD3',
          300: '#F7E2C3',
          400: '#F4D8B3',
          500: '#F1CEA3',
          600: '#EEC493',
          700: '#EBBA83',
          800: '#E8B073',
          900: '#E5A663'
        },
        ink: {
          DEFAULT: '#2D3748',
          light: '#4A5568',
          dark: '#1A202C'
        }
      },
      backgroundImage: {
        'parchment-texture': "url('https://images.unsplash.com/photo-1615800098746-73af8261e3df?auto=format&fit=crop&q=80&w=2000')",
      },
      fontFamily: {
        medieval: ['Crimson Text', 'serif'],
        script: ['MedievalSharp', 'cursive']
      },
      boxShadow: {
        'parchment': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};