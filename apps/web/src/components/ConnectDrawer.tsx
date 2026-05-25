import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Upload, Loader2, ExternalLink } from "lucide-react";
import { Drawer } from "./Drawer.js";
import { VendorLogo } from "./VendorLogo.js";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";

export interface IntegrationField {
  key: string;
  label: string;
  placeholder?: string;
  sensitive?: boolean;
  optional?: boolean;
}

export interface IntegrationDto {
  id: string;
  name: string;
  slug: string;
  category: "inbound" | "outbound";
  description: string;
  authType: "oauth" | "api-key" | "saml";
  iconSlug?: string;
  iconColor?: string;
  requiredFields: IntegrationField[];
  defaultScopes: string[];
  connected: boolean;
  scopes?: string[];
  connectedAs?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

interface Props {
  integration: IntegrationDto;
  open: boolean;
  onClose: () => void;
  onConnected: (next: IntegrationDto) => void;
}

const S = {
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-3)",
    marginBottom: "var(--space-4)",
  } as React.CSSProperties,
  headerText: { minWidth: 0, flex: 1 } as React.CSSProperties,
  title: {
    fontSize: "var(--text-base)",
    fontWeight: 600,
    color: "var(--text)",
    margin: 0,
  } as React.CSSProperties,
  categoryChip: {
    display: "inline-block",
    marginTop: 4,
    fontSize: "var(--text-xs)",
    color: "var(--text-2)",
    background: "var(--surface-2)",
    borderRadius: "var(--radius-pill)",
    padding: "2px 8px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  description: {
    fontSize: "var(--text-sm)",
    color: "var(--text-2)",
    lineHeight: 1.55,
    marginBottom: "var(--space-5)",
  } as React.CSSProperties,
  fieldGroup: { marginBottom: "var(--space-4)" } as React.CSSProperties,
  label: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    color: "var(--text-2)",
    marginBottom: "var(--space-2)",
  } as React.CSSProperties,
  optional: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    fontWeight: 400,
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "8px var(--space-3)",
    fontSize: "var(--text-sm)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface)",
    color: "var(--text)",
    boxSizing: "border-box" as const,
  },
  fileBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    padding: "8px 12px",
    border: "1px dashed var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface)",
    color: "var(--text-2)",
    cursor: "pointer",
  },
  oauthBtn: {
    width: "100%",
    padding: "10px var(--space-4)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-md)",
    background: "var(--surface)",
    color: "var(--text)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  } as React.CSSProperties,
  oauthSuccess: {
    fontSize: "var(--text-xs)",
    color: "var(--success)",
    marginTop: "var(--space-2)",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,
  scopesBlock: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-3) var(--space-4)",
    marginBottom: "var(--space-4)",
  } as React.CSSProperties,
  scopeLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
    fontSize: "var(--text-sm)",
    color: "var(--text)",
    cursor: "pointer",
  } as React.CSSProperties,
  webhookRow: {
    display: "flex",
    gap: "var(--space-2)",
    alignItems: "center",
  } as React.CSSProperties,
  webhookInput: {
    flex: 1,
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    padding: "8px var(--space-3)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface-2)",
    color: "var(--text-2)",
    boxSizing: "border-box" as const,
  },
  copyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 12px",
    fontSize: "var(--text-xs)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface)",
    color: "var(--text-2)",
    cursor: "pointer",
  } as React.CSSProperties,
  sectionHeading: {
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    marginBottom: "var(--space-2)",
  } as React.CSSProperties,
  footer: {
    display: "flex",
    gap: "var(--space-3)",
    marginTop: "var(--space-5)",
  } as React.CSSProperties,
  submit: {
    flex: 1,
    padding: "10px var(--space-4)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    background: "var(--accent)",
    color: "#fff",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  } as React.CSSProperties,
  cancel: {
    padding: "10px var(--space-4)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    background: "var(--surface)",
    color: "var(--text-2)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
  } as React.CSSProperties,
  error: {
    fontSize: "var(--text-xs)",
    color: "var(--danger)",
    marginTop: "var(--space-3)",
  } as React.CSSProperties,
} as const;

function shortToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

function domainFor(slug: string): string {
  const map: Record<string, string> = {
    "google-workspace": "google.com",
    "microsoft-365": "microsoft.com",
    "okta-saml": "okta.com",
    "azure-ad": "microsoft.com",
    "microsoft-teams": "microsoft.com",
    "aws-cost-explorer": "aws.amazon.com",
    "gcp-billing": "cloud.google.com",
  };
  return map[slug] ?? `${slug.replace(/-/g, "")}.com`;
}

function fakeAuthorizedEmail(slug: string): string {
  const domain = domainFor(slug);
  const handles = ["priya.shah", "marcus.chen", "lin.park", "ada.owens"];
  const handle = handles[Math.floor(Math.random() * handles.length)] ?? "priya.shah";
  return `${handle}@${domain}`;
}

export function ConnectDrawer({ integration, open, onClose, onConnected }: Props): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({});
  const [scopes, setScopes] = useState<string[]>(integration.defaultScopes);
  const [oauthState, setOauthState] = useState<"idle" | "authorizing" | "authorized">("idle");
  const [authorizedEmail, setAuthorizedEmail] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state on open so the drawer is clean each time.
  useEffect(() => {
    if (!open) return;
    setValues({});
    setScopes(integration.defaultScopes);
    setOauthState("idle");
    setAuthorizedEmail(null);
    setFileName(null);
    setSubmitting(false);
    setError(null);
    setCopied(false);
  }, [open, integration.id, integration.defaultScopes]);

  const webhookUrl = useMemo(
    () => `https://api.unsyphn.com/v1/webhooks/inbound/${integration.id}/${shortToken()}`,
    // Regenerate each open cycle; integration.id makes it differ per integration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, integration.id],
  );

  const needsWebhook = integration.requiredFields.some((f) => f.key === "webhookUrl");

  function setField(key: string, val: string): void {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function toggleScope(scope: string): void {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  function simulateOauth(): void {
    setOauthState("authorizing");
    window.setTimeout(() => {
      setOauthState("authorized");
      setAuthorizedEmail(fakeAuthorizedEmail(integration.slug));
    }, 1200);
  }

  function copyWebhook(): void {
    void navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  function canSubmit(): boolean {
    if (integration.authType === "oauth") return oauthState === "authorized";
    const required = integration.requiredFields.filter((f) => !f.optional && f.key !== "webhookUrl");
    return required.every((f) => (values[f.key] ?? "").trim().length > 0);
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit() || submitting) return;
    setSubmitting(true);
    setError(null);
    const submitValues: Record<string, string> = { ...values };
    if (needsWebhook && !submitValues.webhookUrl) submitValues.webhookUrl = webhookUrl;
    if (fileName) submitValues.certificateFile = fileName;
    try {
      const resp = await fetch(`/v1/integrations/${encodeURIComponent(integration.id)}/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
        },
        body: JSON.stringify({
          values: submitValues,
          scopes: integration.authType === "oauth" ? scopes : integration.defaultScopes,
          ...(authorizedEmail ? { connectedAs: authorizedEmail } : {}),
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as { integration: IntegrationDto };
      onConnected(json.integration);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Connect integration">
      <div style={S.header}>
        <VendorLogo name={integration.name} domain={domainFor(integration.slug)} size={36} />
        <div style={S.headerText}>
          <h3 style={S.title}>{integration.name}</h3>
          <span style={S.categoryChip}>{integration.category}</span>
        </div>
      </div>
      <p style={S.description}>{integration.description}</p>

      <form onSubmit={(e) => void submit(e)} className="fade-up">
        {integration.authType === "oauth" && (
          <div style={S.fieldGroup}>
            {integration.requiredFields.map((f) => (
              <div key={f.key} style={S.fieldGroup}>
                <label htmlFor={`f-${f.key}`} style={S.label}>
                  {f.label}
                  {f.optional && <span style={S.optional}>· optional</span>}
                </label>
                <input
                  id={`f-${f.key}`}
                  type="text"
                  placeholder={f.placeholder ?? ""}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="focus-glow"
                  style={S.input}
                  required={!f.optional}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={simulateOauth}
              disabled={oauthState !== "idle"}
              className="button-pop"
              style={{ ...S.oauthBtn, opacity: oauthState !== "idle" ? 0.85 : 1 }}
            >
              {oauthState === "authorizing" ? (
                <>
                  <Loader2 size={14} aria-hidden="true" className="spin" />
                  Authorizing on {integration.name}…
                </>
              ) : oauthState === "authorized" ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  Reauthorize
                </>
              ) : (
                <>
                  Authorize on {integration.name}
                  <ExternalLink size={12} aria-hidden="true" />
                </>
              )}
            </button>
            {oauthState === "authorized" && authorizedEmail && (
              <div style={S.oauthSuccess}>
                <Check size={12} aria-hidden="true" />
                Connected as {authorizedEmail}
              </div>
            )}
          </div>
        )}

        {integration.authType === "api-key" &&
          integration.requiredFields
            .filter((f) => f.key !== "webhookUrl")
            .map((f) => (
              <div key={f.key} style={S.fieldGroup}>
                <label htmlFor={`f-${f.key}`} style={S.label}>
                  {f.label}
                  {f.optional && <span style={S.optional}>· optional</span>}
                </label>
                <input
                  id={`f-${f.key}`}
                  type={f.sensitive ? "password" : "text"}
                  placeholder={f.placeholder ?? ""}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="focus-glow"
                  style={S.input}
                  required={!f.optional}
                  autoComplete="off"
                  spellCheck={false}
                />
                {f.optional && (
                  <div style={{ ...S.optional, marginTop: 4 }}>
                    Leave blank to use the default
                  </div>
                )}
              </div>
            ))}

        {integration.authType === "saml" && (
          <>
            {integration.requiredFields.map((f) => (
              <div key={f.key} style={S.fieldGroup}>
                <label htmlFor={`f-${f.key}`} style={S.label}>
                  {f.label}
                </label>
                <input
                  id={`f-${f.key}`}
                  type="text"
                  placeholder={f.placeholder ?? ""}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="focus-glow"
                  style={S.input}
                  required
                />
              </div>
            ))}
            <div style={S.fieldGroup}>
              <span style={S.label}>SAML certificate</span>
              <label style={S.fileBtn}>
                <Upload size={12} aria-hidden="true" />
                {fileName ?? "Upload .cer or .pem"}
                <input
                  type="file"
                  accept=".cer,.pem,.crt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFileName(f.name);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </>
        )}

        {integration.authType === "oauth" && integration.defaultScopes.length > 0 && (
          <div style={S.fieldGroup}>
            <div style={S.sectionHeading}>Scopes</div>
            <div style={S.scopesBlock}>
              {integration.defaultScopes.map((scope) => (
                <label key={scope} style={S.scopeLabel}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <code style={{ fontSize: 12 }}>{scope}</code>
                </label>
              ))}
            </div>
          </div>
        )}

        {needsWebhook && (
          <div style={S.fieldGroup}>
            <div style={S.sectionHeading}>Webhook URL</div>
            <div style={S.webhookRow}>
              <input value={webhookUrl} readOnly style={S.webhookInput} aria-label="Webhook URL" />
              <button type="button" className="button-pop" style={S.copyBtn} onClick={copyWebhook}>
                {copied ? (
                  <>
                    <Check size={12} aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} aria-hidden="true" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && <div style={S.error}>{error}</div>}

        <div style={S.footer}>
          <button type="button" onClick={onClose} className="button-pop" style={S.cancel}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit() || submitting}
            className="button-pop"
            style={{ ...S.submit, opacity: !canSubmit() || submitting ? 0.55 : 1 }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} aria-hidden="true" className="spin" />
                Connecting…
              </>
            ) : (
              `Connect to ${integration.name}`
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
