/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
        colors: {
            brand: {
            red:   '#E30613',
            wine:  '#7B1633', 
            black: '#121212', 
            white: '#FFFFFF',
            },
            primary:   '#E30613',
            secondary: '#7B1633',
        },
        },
    },
    plugins: [],
};
