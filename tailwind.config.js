// tailwind.config.js
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}", // Проверь, включена ли твоя папка!
    "./MainApp.{js,jsx,ts,tsx}"   // Если файл в корне
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}