import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function isAppDocumentRequest(url?: string): boolean {
  if (!url) return false;
  const path = url.split("?")[0] ?? "";
  return path === "/app/" || path === "/app/index.html" || (path.startsWith("/app/") && !path.split("/").pop()?.includes("."));
}

function appIndexHtml(): string {
  return readFileSync(resolve(__dirname, "public/app/index.html"), "utf8");
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "app-directory-redirect",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/app") {
            res.statusCode = 302;
            res.setHeader("Location", "/app/");
            res.end();
            return;
          }
          if (isAppDocumentRequest(req.url)) {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(appIndexHtml());
            return;
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/app") {
            res.statusCode = 302;
            res.setHeader("Location", "/app/");
            res.end();
            return;
          }
          if (isAppDocumentRequest(req.url)) {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(appIndexHtml());
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 4004,
    strictPort: true,
    proxy: {
      "/v1": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
