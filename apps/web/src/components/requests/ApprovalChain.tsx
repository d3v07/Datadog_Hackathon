import { ChevronRight } from "lucide-react";
import type { RequestDto } from "./types.js";

interface Props {
  request: RequestDto;
}

interface ChainStep {
  label: string;
  sublabel: string;
  state: "done" | "current" | "pending";
}

function chainSteps(request: RequestDto): ChainStep[] {
  const submitter: ChainStep = {
    label: request.requesterName,
    sublabel: "Submitter",
    state: "done",
  };
  const finalLabel = request.approverName ?? "Approver";
  const finalSublabel = request.status === "pending" ? "Approver" : "Final approval";

  if (request.status === "routed") {
    const routedTo = request.routeTo ?? "review";
    return [
      submitter,
      { label: routedTo.charAt(0).toUpperCase() + routedTo.slice(1), sublabel: "Routed review", state: "current" },
      { label: finalLabel, sublabel: finalSublabel, state: "pending" },
    ];
  }

  if (request.status === "pending") {
    return [
      submitter,
      { label: finalLabel, sublabel: "Awaiting decision", state: "current" },
      { label: "Done", sublabel: "Final approval", state: "pending" },
    ];
  }

  return [
    submitter,
    { label: finalLabel, sublabel: request.status === "approved" ? "Approved" : "Rejected", state: "done" },
    { label: request.status === "approved" ? "Approved" : "Rejected", sublabel: "Final", state: "done" },
  ];
}

function colorsFor(state: ChainStep["state"]): { bg: string; border: string; color: string; glow: string } {
  if (state === "current") {
    return {
      bg: "var(--accent-soft)",
      border: "1px solid var(--accent)",
      color: "var(--accent)",
      glow: "0 0 0 3px rgba(94,106,210,0.18)",
    };
  }
  if (state === "done") {
    return {
      bg: "var(--surface)",
      border: "1px solid var(--border)",
      color: "var(--text-strong)",
      glow: "none",
    };
  }
  return {
    bg: "var(--surface)",
    border: "1px dashed var(--border)",
    color: "var(--text-muted)",
    glow: "none",
  };
}

export function ApprovalChain({ request }: Props): JSX.Element {
  const steps = chainSteps(request);
  return (
    <ol
      aria-label="Approval chain"
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        flexWrap: "wrap",
      }}
    >
      {steps.map((step, idx) => {
        const c = colorsFor(step.state);
        const dotSize = 10;
        return (
          <li key={`${step.label}-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "var(--text-xs)",
                color: c.color,
                background: c.bg,
                border: c.border,
                padding: "2px var(--space-2)",
                borderRadius: "var(--radius-full)",
                boxShadow: c.glow,
                lineHeight: 1.2,
                height: 22,
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  background: step.state === "current" ? "var(--accent)" : step.state === "done" ? "var(--text-2)" : "var(--text-muted)",
                  flexShrink: 0,
                }}
              />
              <span>
                <strong style={{ fontWeight: 500 }}>{step.label}</strong>
                <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>· {step.sublabel}</span>
              </span>
            </span>
            {idx < steps.length - 1 && (
              <ChevronRight size={14} aria-hidden="true" style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
