/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './*.js',
    './component/**/*.js',
    '!./node_modules/**'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

