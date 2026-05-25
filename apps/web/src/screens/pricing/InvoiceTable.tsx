import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadInvoicePdf, listInvoices, type BillingInvoice } from "../../lib/api.js";

const S = {
  section: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "0 var(--space-5) var(--space-7)",
  } as React.CSSProperties,
  h2: {
    fontFamily: "var(--font-display)",
    color: "var(--text-strong)",
    marginBottom: "var(--space-2)",
  } as React.CSSProperties,
  ytd: {
    fontSize: "var(--text-sm)",
    color: "var(--text-2)",
    marginBottom: "var(--space-4)",
  } as React.CSSProperties,
  card: {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--surface)",
    overflow: "auto" as const,
  },
  th: {
    padding: "var(--space-2) var(--space-5)",
    textAlign: "left" as const,
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-2)",
  },
  td: {
    padding: "var(--space-3) var(--space-5)",
    fontSize: "var(--text-sm)",
    color: "var(--text-2)",
    borderBottom: "1px solid var(--border)",
  } as React.CSSProperties,
  mono500: { fontFamily: "var(--font-mono)", fontWeight: 500 } as React.CSSProperties,
  badge: {
    display: "inline-block" as const,
    padding: "2px 8px",
    background: "rgba(63,207,142,0.10)",
    color: "var(--success)",
    border: "1px solid rgba(63,207,142,0.25)",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-xs)",
    textTransform: "capitalize" as const,
  },
} as const;

function dollars(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoiceTable(): JSX.Element | null {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [downloadingId, setDownloadingId] = useState<string | undefined>();
  const [downloadError, setDownloadError] = useState<string | undefined>();

  async function handleDownload(inv: BillingInvoice): Promise<void> {
    setDownloadingId(inv.id);
    setDownloadError(undefined);
    try {
      const blob = await downloadInvoicePdf(inv.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unsyphn-invoice-${inv.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : `Could not download ${inv.id}`,
      );
    } finally {
      setDownloadingId(undefined);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await listInvoices();
        if (cancelled) return;
        setInvoices(resp.invoices);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const thisYear = new Date().getFullYear();
  const ytdCents = invoices
    .filter(
      (inv) => inv.status === "paid" && new Date(inv.issuedAt).getFullYear() === thisYear,
    )
    .reduce((sum, inv) => sum + inv.amountUsdCents, 0);

  if (loading) {
    return (
      <section aria-label="Your invoices" style={S.section}>
        <h2 className="h2" style={S.h2}>Your invoices</h2>
        <p style={S.ytd}>Loading…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section aria-label="Your invoices" style={S.section}>
        <h2 className="h2" style={S.h2}>Your invoices</h2>
        <p style={S.ytd}>{error}</p>
      </section>
    );
  }
  if (invoices.length === 0) return null;

  return (
    <section aria-label="Your invoices" style={S.section}>
      <h2 className="h2" style={S.h2}>Your invoices</h2>
      <p style={S.ytd}>
        Total billed YTD:{" "}
        <span style={{ ...S.mono500, color: "var(--text-strong)" }}>{dollars(ytdCents)}</span>
      </p>
      {downloadError ? (
        <p
          role="alert"
          style={{ ...S.ytd, color: "var(--danger, #b91c1c)" }}
        >
          {downloadError}
        </p>
      ) : null}
      <div style={S.card}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th scope="col" style={S.th}>Date</th>
              <th scope="col" style={S.th}>Description</th>
              <th scope="col" style={S.th}>Amount</th>
              <th scope="col" style={S.th}>Status</th>
              <th scope="col" style={{ ...S.th, textAlign: "right" }}>Download</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td style={S.td}>
                  <span style={S.mono500}>{inv.period}</span>
                </td>
                <td style={S.td}>{inv.id}</td>
                <td style={{ ...S.td, ...S.mono500, color: "var(--text-strong)" }}>
                  {dollars(inv.amountUsdCents)}
                </td>
                <td style={S.td}>
                  <span style={S.badge}>{inv.status}</span>
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => handleDownload(inv)}
                    disabled={downloadingId === inv.id}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: downloadingId === inv.id ? "wait" : "pointer",
                      color: "var(--accent)",
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "var(--text-sm)",
                      fontFamily: "inherit",
                    }}
                    aria-label={`Download invoice ${inv.id}`}
                    aria-busy={downloadingId === inv.id}
                  >
                    {downloadingId === inv.id ? (
                      <Loader2
                        size={14}
                        aria-hidden="true"
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Download size={14} aria-hidden="true" />
                    )}
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
