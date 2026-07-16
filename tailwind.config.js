/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./blog/*.html"],
  theme: {
    extend: {
      colors: { primary: "#106473" },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
