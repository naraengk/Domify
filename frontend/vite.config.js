import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// proxy /api to fastapi in dev so we don't fight cors
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
