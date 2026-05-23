import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      "/v1": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
