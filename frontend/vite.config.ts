import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { IncomingMessage, ServerResponse } from "node:http";

const APP_BASE = "/scrabble/";

/** `vite preview` rejects unknown Host headers. Production sets PREVIEW_ALLOWED_HOSTS to its domain. */
const PREVIEW_ALLOWED_HOSTS = (process.env.PREVIEW_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);
const BARE_BASE = APP_BASE.slice(0, -1);

/** Vite's base middleware 404s `/scrabble` (no slash). Redirect before it runs. */
function redirectBareBase(): Plugin {
  const redirect = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const raw = req.url ?? "/";
    const q = raw.indexOf("?");
    const pathname = q === -1 ? raw : raw.slice(0, q);
    if (pathname !== BARE_BASE) {
      next();
      return;
    }
    const search = q === -1 ? "" : raw.slice(q);
    res.statusCode = 308;
    res.setHeader("Location", `${APP_BASE}${search}`);
    res.end();
  };

  return {
    name: "redirect-bare-base",
    configureServer(server) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

/** Vite prefixes `base` onto HTML URLs that already include `%BASE_URL%`. */
function collapseDoubleBase(): Plugin {
  const doubled = `${APP_BASE}${APP_BASE.slice(1)}`;
  return {
    name: "collapse-double-base",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replaceAll(doubled, APP_BASE);
      },
    },
  };
}

export default defineConfig({
  base: APP_BASE,
  plugins: [redirectBareBase(), collapseDoubleBase(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: [...PREVIEW_ALLOWED_HOSTS, "localhost"],
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
