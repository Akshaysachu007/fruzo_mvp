/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        fruzo: {
          yellow: "#FFDC16",
          cream: "#FFF7CC",
          dark: "#1C1B16",
        },
      },
    },
  },
  plugins: [],
};