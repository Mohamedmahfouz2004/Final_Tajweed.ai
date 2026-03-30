/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#044D29',
                    light: '#066b3b',
                    dark: '#033520',
                },
                secondary: {
                    DEFAULT: '#D4AF37',
                    light: '#F5D76E',
                    dark: '#B49428',
                },
                accent: '#F4E4BC',
                background: '#FDFCF5',
                glass: {
                    bg: 'rgba(255, 255, 255, 0.85)',
                    border: 'rgba(255, 255, 255, 0.6)',
                },
            },
            fontFamily: {
                amiri: ['Amiri', 'serif'],
                arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '20px',
                '3xl': '24px',
            },
            animation: {
                'fade-in': 'fadeIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 3s ease-in-out infinite',
                'glow': 'glowPulse 2.5s ease-in-out infinite',
                'spin-slow': 'spin 3s linear infinite',
            },
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    },
}
