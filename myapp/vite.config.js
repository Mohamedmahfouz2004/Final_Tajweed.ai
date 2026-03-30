import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-motion': ['framer-motion'],
                    'vendor-charts': ['recharts'],
                    'vendor-icons': ['lucide-react'],
                    'vendor-state': ['zustand'],
                    'vendor-audio': ['howler'],
                    'vendor-lottie': ['lottie-react', 'lottie-web'],
                },
            },
        },
    },
});

