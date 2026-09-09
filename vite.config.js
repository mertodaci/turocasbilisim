import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// base44 vite plugin KALDIRILDI
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-excel': ['xlsx'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['date-fns', '@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Tüm /api isteklerini backend'e yönlendir
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
