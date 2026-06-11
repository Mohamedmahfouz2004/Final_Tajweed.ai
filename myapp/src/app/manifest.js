// Next App Router manifest — served at /manifest.webmanifest and auto-linked.
// Replaces the old Create-React-App public/manifest.json (deleted).
export default function manifest() {
    return {
        name: 'تجويد.ai · معلّم التجويد التفاعلي',
        short_name: 'تجويد',
        description: 'تعلّم التجويد وحلّل تلاوتك بالذكاء الاصطناعي.',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0A3527',
        background_color: '#FDFAF3',
        categories: ['education', 'books', 'lifestyle'],
        icons: [
            { src: '/logo192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/logo512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/logo512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
