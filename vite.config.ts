import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['pdf-lib'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'sonner', 'clsx', 'tailwind-merge'],
          'clerk': ['@clerk/clerk-react'],
          'query': ['@tanstack/react-query'],
          'markdown': ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
});
