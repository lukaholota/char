/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/app/**/*.{js,ts,jsx,tsx}',
        './src/components/**/*.{js,ts,jsx,tsx}',
    ],
    safelist: [
        "bg-violet-700",
        "bg-violet-900",
        "hover:bg-violet-700",
        "hover:bg-violet-800",
        "border-slate-700",
        "border-slate-800",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}

