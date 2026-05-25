import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { install as installMockApi } from "./mock-api/index.js";
import { App } from "./App.js";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/public.css";
import "./styles/polish.css";

// In-frontend mock API for the static (Vercel) deploy. When VITE_API_BASE is
// unset (or empty) every /v1/* fetch is intercepted and served from bundled
// seed JSON, so the SPA renders fully without a real backend. Pointing
// VITE_API_BASE at a real host disables the mock entirely.
const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
if (apiBase.length === 0) {
  installMockApi();
}

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
