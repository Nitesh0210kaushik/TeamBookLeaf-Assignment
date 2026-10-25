import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Dev-server settings come from .env without the VITE_ prefix, so they never reach the browser bundle.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    server: {
      port: Number(env.DEV_SERVER_PORT) || 5173,
      // Fail loudly instead of silently moving to another port (the backend CORS list expects this one).
      strictPort: true,
      // Same-origin in development: the session cookie and SSE stream just work, no CORS.
      proxy: {
        "/api": { target: env.API_PROXY_TARGET || "http://localhost:5000", changeOrigin: true },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Long-lived vendor chunks stay cached across app deploys.
          codeSplitting: {
            groups: [
              {
                name: "react",
                test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
              },
              {
                name: "redux",
                test: /node_modules[\\/](@reduxjs|redux|react-redux|immer|reselect)[\\/]/,
              },
              { name: "vendor", test: /node_modules[\\/]/ },
            ],
          },
        },
      },
    },
    preview: {
      port: Number(env.DEV_SERVER_PORT) || 5173,
      strictPort: true,
    },
  };
});
