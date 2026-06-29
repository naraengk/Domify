import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configuration for the frontend
// During development the dev server proxies API and upload requests to the
// FastAPI backend so the browser does not need to deal with CORS
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Application JSON endpoints
      "/api": "http://localhost:8000",
      // Avatar images and any other static files served from the backend
      "/uploads": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
