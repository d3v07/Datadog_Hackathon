import { useEffect, useState } from "react";
import { Command } from "lucide-react";
import { SensoBrief } from "./screens/SensoBrief.js";
import { Portfolio } from "./screens/Portfolio.js";
import { ChangeReport } from "./screens/ChangeReport.js";
import { Onboarding } from "./screens/Onboarding.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { Inbox } from "./screens/Inbox.js";
import { VendorDetail } from "./screens/VendorDetail.js";
import { Requests } from "./screens/Requests.js";
import { Renewals } from "./screens/Renewals.js";
import { Findings } from "./screens/Findings.js";
import { Reports } from "./screens/Reports.js";
import { Pricing } from "./screens/Pricing.js";
import { AuditorMode } from "./screens/AuditorMode.js";
import { Settings } from "./screens/Settings.js";
import { TrustCenter } from "./screens/TrustCenter.js";
import { Demo } from "./screens/Demo.js";
import { Contact } from "./screens/Contact.js";
import { Privacy } from "./screens/Privacy.js";
import { Terms } from "./screens/Terms.js";
import { Docs } from "./screens/Docs.js";

function VendorDetailPlaceholder(): JSX.Element {
  return (
    <main className="page" style={{ padding: "var(--space-9) var(--space-6)" }}>
      <h1 className="h1">Vendor Detail</h1>
      <p className="lead">Vendor detail coming in W4.</p>
    </main>
  );
}


function PoliciesPlaceholder(): JSX.Element {
  return (
    <main className="page" style={{ padding: "var(--space-9) var(--space-6)" }}>
      <h1 className="h1">Policies</h1>
      <p className="lead">Policy Studio coming soon.</p>
    </main>
  );
}

function SettingsPlaceholder(): JSX.Element {
  return (
    <main className="page" style={{ padding: "var(--space-9) var(--space-6)" }}>
      <h1 className="h1">Settings</h1>
      <p className="lead">Settings coming in W7.</p>
    </main>
  );
}

function isAppRoute(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

function parseEvidenceId(pathname: string): string | undefined {
  const match = pathname.match(/^\/app\/evidence\/([^/?#]+)\/?$/);
  return match?.[1];
}

function parseVendorId(pathname: string): string | undefined {
  const match = pathname.match(/^\/app\/vendors\/([^/?#]+)\/?$/);
  return match?.[1];
}

function parseChangeId(pathname: string): string | undefined {
  const match = pathname.match(/^\/app\/change\/([^/?#]+)\/?$/);
  return match?.[1];
}

type ActiveNav =
  | "inbox"
  | "vendors"
  | "renewals"
  | "requests"
  | "findings"
  | "reports"
  | "settings"
  | null;

function currentNav(pathname: string): ActiveNav {
  if (pathname === "/app" || pathname === "/app/" || pathname.startsWith("/app/inbox")) return "inbox";
  if (pathname.startsWith("/app/vendors")) return "vendors";
  if (pathname.startsWith("/app/renewals")) return "renewals";
  if (pathname.startsWith("/app/requests")) return "requests";
  if (pathname.startsWith("/app/findings")) return "findings";
  if (pathname.startsWith("/app/reports")) return "reports";
  if (pathname.startsWith("/app/settings")) return "settings";
  return null;
}

export function App(): JSX.Element | null {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";

  const inApp = isAppRoute(pathname);

  useEffect(() => {
    document.title = "Unsyphn";
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

  useEffect(() => {
    if (!inApp) return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    let raf = 0;
    const handler = (e: PointerEvent): void => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--cursor-x", String(x));
        document.documentElement.style.setProperty("--cursor-y", String(y));
      });
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handler);
      cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty("--cursor-x");
      document.documentElement.style.removeProperty("--cursor-y");
    };
  }, [inApp]);

  if (pathname === "/pricing") return <Pricing />;
  if (pathname === "/trust") return <TrustCenter />;
  if (pathname === "/demo") return <Demo />;
  if (pathname === "/contact") return <Contact />;
  if (pathname === "/privacy") return <Privacy />;
  if (pathname === "/terms") return <Terms />;
  if (pathname === "/docs") return <Docs />;
  const auditorMatch = pathname.match(/^\/auditor\/([^/?#]+)\/?$/);
  if (auditorMatch?.[1]) return <AuditorMode sessionToken={auditorMatch[1]} />;
  if (!inApp) return null;

  const evidenceId = parseEvidenceId(pathname);
  const vendorId = parseVendorId(pathname);
  const changeId = parseChangeId(pathname);
  const activeNav = currentNav(pathname);

  return (
    <>
      <TopBar activeNav={activeNav} />
      <main className="app-content">
        {evidenceId ? (
          <SensoBrief changeReportId={evidenceId} />
        ) : pathname === "/app" || pathname === "/app/" || pathname.startsWith("/app/inbox") ? (
          <Inbox />
        ) : vendorId ? (
          <VendorDetail />
        ) : pathname.startsWith("/app/vendors") ? (
          <Portfolio />
        ) : changeId ? (
          <ChangeReport changeId={changeId} />
        ) : pathname.startsWith("/app/renewals") ? (
          <Renewals />
        ) : pathname.startsWith("/app/requests") ? (
          <Requests />
        ) : pathname.startsWith("/app/findings") ? (
          <Findings />
        ) : pathname.startsWith("/app/reports") ? (
          <Reports />
        ) : pathname.startsWith("/app/policies") ? (
          <PoliciesPlaceholder />
        ) : pathname.startsWith("/app/onboarding") ? (
          <Onboarding />
        ) : pathname.startsWith("/app/settings") ? (
          <Settings />
        ) : null}
      </main>
      <CommandPalette />
    </>
  );
}

interface TopBarProps {
  activeNav: ActiveNav;
}

function TopBar({ activeNav }: TopBarProps): JSX.Element {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={scrolled ? "topbar topbar-scrolled" : "topbar"}
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
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          color: "var(--text-strong)",
          userSelect: "none",
        }}
        aria-label="Unsyphn home"
      >
        <img
          src="/unsyphn-mark.png"
          alt=""
          aria-hidden="true"
          width={42}
          height={28}
          style={{ display: "block", objectFit: "contain" }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "var(--text-base)",
            color: "var(--text-strong)",
            letterSpacing: "0.04em",
          }}
        >
          Unsyphn
        </span>
      </a>

      <nav
        aria-label="Main navigation"
        style={{ display: "flex", gap: "var(--space-2)", flex: 1 }}
      >
        {(
          [
            ["inbox", "Inbox", "/app/inbox"],
            ["vendors", "Vendors", "/app/vendors"],
            ["renewals", "Renewals", "/app/renewals"],
            ["requests", "Requests", "/app/requests"],
            ["findings", "Findings", "/app/findings"],
            ["reports", "Reports", "/app/reports"],
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

      <button
        type="button"
        aria-label="Open command palette"
        onClick={() => window.dispatchEvent(new CustomEvent("unsyphn:openPalette"))}
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
        <Command size={12} aria-hidden="true" />
        {" "}K
      </button>
    </header>
  );
}
