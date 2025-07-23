/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6563FF',
          light: '#8785FF',
          dark: '#4340FF',
        },
        secondary: {
          DEFAULT: '#FF4F00',
          light: '#FF7433',
          dark: '#CC3F00',
        },
        success: '#00CC66',
        error: '#FF4F00',
        background: {
          DEFAULT: '#F9F9F9',
          paper: '#FFFFFF',
        },
        text: {
          primary: '#222222',
          secondary: '#666666',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}