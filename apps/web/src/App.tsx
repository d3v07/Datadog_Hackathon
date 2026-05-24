import { useEffect } from "react";
import { SensoBrief } from "./screens/SensoBrief.js";
import { Portfolio } from "./screens/Portfolio.js";
import { ChangeReport } from "./screens/ChangeReport.js";
import { Onboarding } from "./screens/Onboarding.js";
import { RoleSwitcher } from "./components/RoleSwitcher.js";
import { CommandPalette } from "./components/CommandPalette.js";

function isAppRoute(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

function parseEvidenceId(pathname: string): string | undefined {
  const match = pathname.match(/^\/app\/evidence\/([^/?#]+)\/?$/);
  return match?.[1];
}

function parseVendorId(pathname: string): string | undefined {
  const match = pathname.match(/^\/app\/vendor\/([^/?#]+)\/?$/);
  return match?.[1];
}

function parseChangeId(pathname: string): string | undefined {
  const match = pathname.match(/^\/app\/change\/([^/?#]+)\/?$/);
  return match?.[1];
}

function currentNav(pathname: string): "portfolio" | "policy" | "settings" | null {
  if (
    pathname === "/app" ||
    pathname === "/app/" ||
    pathname.startsWith("/app/vendor") ||
    pathname.startsWith("/app/change") ||
    pathname.startsWith("/app/evidence")
  ) return "portfolio";
  if (pathname.startsWith("/app/policy")) return "policy";
  if (pathname.startsWith("/app/settings")) return "settings";
  return null;
}

export function App(): JSX.Element | null {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";

  const inApp = isAppRoute(pathname);

  useEffect(() => {
    document.title = "Redline";
  }, []);

  useEffect(() => {
    if (inApp) {
      document.body.classList.add("app-mode");
    } else {
      document.body.classList.remove("app-mode");
    }
    return () => {
      document.body.classList.remove("app-mode");
    };
  }, [inApp]);

  if (!inApp) return null;

  const evidenceId = parseEvidenceId(pathname);
  const activeNav = currentNav(pathname);

  return (
    <>
      <TopBar activeNav={activeNav} />
      <main className="app-content">
        {evidenceId ? (
          <SensoBrief changeReportId={evidenceId} />
        ) : pathname === "/app" || pathname === "/app/" ? (
          <Portfolio />
        ) : parseVendorId(pathname) ? (
          <div className="placeholder">Vendor Detail (Wave 3)</div>
        ) : parseChangeId(pathname) ? (
          <ChangeReport changeId={parseChangeId(pathname)!} />
        ) : pathname.startsWith("/app/policy") ? (
          <div className="placeholder">Policy Studio coming soon</div>
        ) : pathname.startsWith("/app/onboarding") ? (
          <Onboarding />
        ) : pathname.startsWith("/app/settings") ? (
          <div className="placeholder">Settings (Wave 3)</div>
        ) : null}
      </main>
      <CommandPalette />
    </>
  );
}

interface TopBarProps {
  activeNav: "portfolio" | "policy" | "settings" | null;
}

function TopBar({ activeNav }: TopBarProps): JSX.Element {
  return (
    <header
      className="topbar"
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        padding: "0 var(--space-5)",
        borderBottom: "1px solid var(--border)",
        gap: "var(--space-5)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "var(--text-sm)",
          color: "var(--text-strong)",
          letterSpacing: "-0.01em",
          userSelect: "none",
        }}
      >
        Redline
      </span>

      <nav
        aria-label="Main navigation"
        style={{ display: "flex", gap: "var(--space-2)", flex: 1 }}
      >
        {(
          [
            ["portfolio", "Portfolio", "/app"],
            ["policy", "Policy", "/app/policy"],
            ["settings", "Settings", "/app/settings"],
          ] as const
        ).map(([key, label, href]) => (
          <a
            key={key}
            href={href}
            className={activeNav === key ? "is-active" : ""}
            style={{
              fontFamily: "var(--font-text)",
              fontWeight: 400,
              fontSize: "var(--text-sm)",
              color:
                activeNav === key ? "var(--accent)" : "var(--text-2)",
              padding: "4px var(--space-3)",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              transition: "color var(--dur-fast)",
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      <RoleSwitcher />

      <button
        type="button"
        aria-label="Open command palette"
        onClick={() => window.dispatchEvent(new CustomEvent("redline:openPalette"))}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--muted)",
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "2px 6px",
          cursor: "pointer",
        }}
      >
        ⌘K
      </button>
    </header>
  );
}
