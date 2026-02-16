/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: "#10b981",
                secondary: "#059669",
                accent: "#34d399",
                background: "#030712",
                surface: "#1f2937",
            }
        },
    },
    plugins: [],
}
