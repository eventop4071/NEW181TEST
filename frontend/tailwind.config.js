/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          500: '#543b2b',
          700: '#3D2817', // Main shelf color
          900: '#2A180D', // Deep shadow
        },
        brass: {
          400: '#cdb675',
          500: '#a38440',
          600: '#755B25'
        }
      },
      fontFamily: {
        serif: ['"Noto Serif KR"', 'serif'],
        sans: ['"Pretendard"', 'sans-serif']
      },
      boxShadow: {
        'book': '5px 5px 15px rgba(0, 0, 0, 0.4), inset 2px 0px 5px rgba(255,255,255,0.2)',
        'book-hover': '15px 20px 25px rgba(0, 0, 0, 0.6), inset 2px 0px 5px rgba(255,255,255,0.3)',
        'shelf': '0 10px 15px -3px rgba(0, 0, 0, 0.8), inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)',
        'brass': '0 4px 6px -1px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
      }
    },
  },
  plugins: [],
}

