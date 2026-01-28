import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 8080,
        host: '0.0.0.0',
        watch: {
            usePolling: true,
        },
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'https://localhost:8443',
                changeOrigin: true,
                secure: false, // Allow self-signed certificates
            },
        },
    },
});
