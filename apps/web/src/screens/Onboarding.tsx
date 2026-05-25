import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { Recoverable } from "@unsyphn/shared";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import { VendorLogo } from "../components/VendorLogo.js";

type Stage = "intro" | "discovering" | "complete";

const VENDOR_NAMES = [
  "Notion", "Slack", "Figma", "Salesforce", "Stripe", "Datadog",
  "GitHub", "AWS", "Vercel", "Linear", "Asana", "Jira",
  "Confluence", "Atlassian", "HubSpot", "Okta", "Vanta", "Adobe",
  "Zoom", "Microsoft 365", "Google Workspace", "Brex", "Ramp", "Spendesk",
];
const TOTAL_VENDORS = 247;
const TICK_MS = 150;
const INCREMENT = Math.ceil(TOTAL_VENDORS / (8000 / TICK_MS));

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-7) var(--space-5)",
  },
  inner: {
    maxWidth: 720,
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
    gap: "var(--space-9)",
  },
  hero: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(2.5rem, 6vw, 4rem)",
    fontWeight: 600,
    letterSpacing: "-0.03em",
    color: "var(--text)",
    margin: 0,
  },
  subhead: {
    fontSize: "var(--text-lg)",
    fontWeight: 400,
    color: "var(--text-2)",
    margin: "var(--space-3) 0 0",
  },
  btnRow: {
    display: "flex",
    gap: "var(--space-4)",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    padding: "0 var(--space-6)",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-text)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    cursor: "pointer",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    padding: "0 var(--space-6)",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-text)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    cursor: "pointer",
  },
  btnGhost: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "var(--text-xs)",
    cursor: "pointer",
    padding: 0,
    fontFamily: "var(--font-text)",
  },
  trust: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    lineHeight: 1.7,
  },
  counter: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(3rem, 8vw, 5rem)",
    fontWeight: 700,
    letterSpacing: "-0.04em",
    color: "var(--accent)",
    lineHeight: 1,
    margin: 0,
  },
  logoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 56px)",
    gap: "var(--space-3)",
    justifyContent: "center",
  },
  logoCell: {
    width: 56,
    height: 56,
    borderRadius: "var(--radius-sm)",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 200ms ease",
  },
  wowCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-6)",
    width: "100%",
    textAlign: "left" as const,
  },
  wowAmount: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-3xl)",
    fontWeight: 600,
    color: "var(--success, #16a34a)",
    letterSpacing: "-0.03em",
    margin: "var(--space-2) 0 0",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "var(--space-2)",
    marginTop: "var(--space-4)",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    height: 28,
    padding: "0 var(--space-3)",
    background: "var(--surface-2)",
    color: "var(--text-2)",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--text-xs)",
    border: "1px solid var(--border)",
    whiteSpace: "nowrap" as const,
  },
} as const;

export function Onboarding(): JSX.Element {
  const [stage, setStage] = useState<Stage>("intro");
  const [counter, setCounter] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [recoverable, setRecoverable] = useState<Recoverable | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startDiscovery = (provider: "google" | "microsoft") => {
    const domain = provider === "google" ? "acme.com" : "contoso.com";
    setStage("discovering");
    setCounter(0);
    setRevealed(0);

    void fetch("/v1/onboarding/discover", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
      },
      body: JSON.stringify({ provider, domain }),
    }).catch(() => undefined);

    void fetch("/v1/recoverable", {
      headers: { Authorization: `Bearer ${DEMO_BEARER_TOKEN}` },
    })
      .then((r) => r.json() as Promise<Recoverable>)
      .then((data) => setRecoverable(data))
      .catch(() => undefined);

    stopInterval();
    intervalRef.current = setInterval(() => {
      setCounter((prev) => {
        const next = Math.min(prev + INCREMENT, TOTAL_VENDORS);
        const ratio = next / TOTAL_VENDORS;
        setRevealed(Math.floor(ratio * VENDOR_NAMES.length));
        if (next >= TOTAL_VENDORS) {
          stopInterval();
          setStage("complete");
        }
        return next;
      });
    }, TICK_MS);
  };

  useEffect(() => stopInterval, []);

  if (stage === "intro") return <IntroView onConnect={startDiscovery} />;
  if (stage === "discovering") return <DiscoveringView counter={counter} revealed={revealed} />;
  return <CompleteView recoverable={recoverable} />;
}

function IntroView({ onConnect }: { onConnect: (provider: "google" | "microsoft") => void }): JSX.Element {
  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div>
          <h1 style={S.hero}>UNSYPHN</h1>
          <p style={S.subhead}>
            Find every SaaS your company is wasting money on. In 60 seconds.
          </p>
        </div>

        <div style={S.btnRow}>
          <button
            type="button"
            style={S.btnPrimary}
            onClick={() => onConnect("google")}
            aria-label="Sign in with Google Workspace to start discovery"
          >
            Sign in with Google Workspace
          </button>
          <button
            type="button"
            style={S.btnSecondary}
            onClick={() => onConnect("microsoft")}
            aria-label="Sign in with Microsoft 365 to start discovery"
          >
            Microsoft 365
          </button>
        </div>

        <p style={S.trust}>
          We only read OAuth grants, email senders, and calendar metadata. We never read message bodies or attachments.<br /><ShieldCheck size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}} aria-hidden="true" />SOC 2 Type II &nbsp;·&nbsp; No-train AI guarantee &nbsp;·&nbsp; GDPR-ready
        </p>

        <button
          type="button"
          style={S.btnGhost}
          onClick={() => window.location.assign("/app/inbox")}
          aria-label="Skip onboarding and connect later"
        >
          Skip <ArrowRight size={12} style={{display:"inline",verticalAlign:"middle"}} aria-hidden="true" /> Connect later
        </button>
      </div>
    </div>
  );
}

function DiscoveringView({ counter, revealed }: { counter: number; revealed: number }): JSX.Element {
  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div>
          <h1 style={S.hero}>Discovering your stack&hellip;</h1>
          <p style={S.subhead}>
            We&apos;re scanning your Google Workspace metadata — no message bodies.
          </p>
        </div>

        <p
          style={S.counter}
          aria-live="polite"
          aria-atomic="true"
          aria-label={`${counter} vendors discovered`}
        >
          {counter}
        </p>

        <div style={S.logoGrid} aria-hidden="true">
          {VENDOR_NAMES.map((name, i) => (
            <div
              key={name}
              style={{ ...S.logoCell, opacity: i < revealed ? 1 : 0 }}
            >
              {i < revealed && <VendorLogo name={name} size={40} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompleteView({ recoverable }: { recoverable: Recoverable | null }): JSX.Element {
  const totalUsd = recoverable?.totalUsd ?? 135000;
  const formatted = totalUsd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div>
          <h1 style={S.hero}>Found 247 SaaS apps.</h1>
          <p style={S.subhead}>89 weren&apos;t in your IT inventory.</p>
        </div>

        <div style={S.wowCard}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
            Biggest waste we can see this quarter
          </p>
          <p style={S.wowAmount}>{formatted} recoverable</p>

          <div style={S.chipRow} role="list">
            <span style={S.chip} role="listitem">412 unused Salesforce seats ($815k/yr)</span>
            <span style={S.chip} role="listitem">12 changes this week</span>
            <span style={S.chip} role="listitem">8 renewals coming up</span>
          </div>
        </div>

        <div style={S.btnRow}>
          <button
            type="button"
            style={S.btnPrimary}
            onClick={() => window.location.assign("/app/inbox")}
          >
            Open my Inbox <ArrowRight size={14} style={{display:"inline",marginLeft:4,verticalAlign:"middle"}} aria-hidden="true" />
          </button>
          <button
            type="button"
            style={S.btnSecondary}
            onClick={() => window.location.assign("/app/vendors")}
          >
            View all 247 vendors
          </button>
        </div>
      </div>
    </div>
  );
}
