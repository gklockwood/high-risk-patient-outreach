/** Design tokens — primary actions (healthcare enterprise blue, distinct from status badge blues) */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1D4ED8",
          hover: "#1E40AF",
          pressed: "#1E3A8A",
          foreground: "#FFFFFF",
          ring: "rgba(29, 78, 216, 0.4)"
        }
      }
    }
  },
  plugins: []
}
