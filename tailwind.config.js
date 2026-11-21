/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./blog/*.html", "./tools/*.html", "./src/**/*.astro"],
  theme: {
    extend: {
      colors: { primary: "#106473" },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
