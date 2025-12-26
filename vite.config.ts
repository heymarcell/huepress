import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
        manualChunks(id) {
          // React core
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // React Router
          if (id.includes('node_modules/react-router') || 
              id.includes('node_modules/@remix-run/')) {
            return 'vendor-router';
          }
          // Clerk auth
          if (id.includes('node_modules/@clerk/')) {
            return 'vendor-clerk';
          }
          // Stripe
          if (id.includes('node_modules/@stripe/')) {
            return 'vendor-stripe';
          }
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // UI utilities (radix, class-variance, clsx, tailwind-merge)
          if (id.includes('node_modules/@radix-ui/') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'vendor-ui';
          }
          // Date/time libs
          if (id.includes('node_modules/date-fns') ||
              id.includes('node_modules/dayjs')) {
            return 'vendor-date';
          }
          // Other large node_modules go to vendor-misc
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
});
