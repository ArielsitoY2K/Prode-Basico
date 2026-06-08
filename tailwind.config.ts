import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: '#C8FF2E',
        'gray-2': '#1a1a1a',
        'gray-3': '#222222',
        'gray-4': '#333333',
        'gray-5': '#555555',
        'gray-6': '#888888',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        bebas: ['Bebas Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
