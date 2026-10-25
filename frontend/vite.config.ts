import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    // Same-origin in development: the session cookie and SSE stream just work, no CORS.
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
});
