import type { Finding } from "../../lib/api.js";

interface Props {
  findings: ReadonlyArray<Finding>;
  onOpen: (finding: Finding) => void;
}

const TYPE_LABEL: Record<Finding["type"], string> = {
  change: "Change",
  compliance: "Compliance",
  subprocessor: "Sub-processor",
  spend: "Spend",
  security: "Security",
};

const STATE_LABEL: Record<Finding["state"], string> = {
  open: "Open",
  "under-review": "Under review",
  resolved: "Resolved",
};

function severityClass(sev: Finding["severity"]): string {
  if (sev === "P1") return "badge badge-danger";
  if (sev === "P2") return "badge badge-warning";
  return "badge badge-neutral";
}

function stateClass(state: Finding["state"]): string {
  if (state === "open") return "badge badge-warning";
  if (state === "under-review") return "badge badge-accent";
  return "badge badge-neutral";
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function FindingsTable({ findings, onOpen }: Props): JSX.Element {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "var(--text-sm)",
        }}
      >
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <Th>Severity</Th>
            <Th>Title</Th>
            <Th>Vendor</Th>
            <Th>Type</Th>
            <Th>Detected</Th>
            <Th>State</Th>
            <Th align="right">Action</Th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr
              key={f.id}
              style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
              onClick={() => onOpen(f)}
            >
              <Td>
                <span className={severityClass(f.severity)}>{f.severity}</span>
              </Td>
              <Td>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(f);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--accent)",
                    fontWeight: 500,
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "var(--text-sm)",
                  }}
                  aria-label={`Open finding ${f.title}`}
                >
                  {f.title}
                </button>
              </Td>
              <Td>
                <a
                  href={`/app/vendors/${encodeURIComponent(f.vendorId)}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: "var(--text-strong)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {f.vendorName}
                </a>
              </Td>
              <Td>{TYPE_LABEL[f.type]}</Td>
              <Td style={{ color: "var(--text-muted)" }}>{fmtDate(f.detectedAt)}</Td>
              <Td>
                <span className={stateClass(f.state)}>{STATE_LABEL[f.state]}</span>
              </Td>
              <Td align="right">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: "var(--text-xs)", height: 26, padding: "0 10px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(f);
                  }}
                >
                  Open
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }): JSX.Element {
  return (
    <th
      scope="col"
      style={{
        padding: "10px 14px",
        textAlign: align ?? "left",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  style,
}: {
  children: React.ReactNode;
  align?: "right";
  style?: React.CSSProperties;
}): JSX.Element {
  return (
    <td
      style={{
        padding: "12px 14px",
        textAlign: align ?? "left",
        color: "var(--text)",
        verticalAlign: "middle",
        ...(style ?? {}),
      }}
    >
      {children}
    </td>
  );
}
