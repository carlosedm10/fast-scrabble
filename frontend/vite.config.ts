import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/scrabble/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/scrabble/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/scrabble/, ""),
      },
      "/scrabble/socket.io": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true,
        rewrite: (p) => p.replace(/^\/scrabble/, ""),
      },
    },
  },
});
