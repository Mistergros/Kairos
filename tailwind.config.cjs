/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0f172a',
        fog: '#f8fafc',
        ocean: '#0ea5e9',
        sunset: '#fb7185',
        lime: '#84cc16',
        slate: '#334155',
        kairos: '#5b61f6',
        azure: '#00b3ff',
        lilac: '#9b8cff',
        mint: '#5dd39e',
      },
    },
  },
  plugins: [],
};
