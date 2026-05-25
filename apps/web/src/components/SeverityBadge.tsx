import type { Severity } from "@unsyphn/shared";

interface Props {
  severity: Severity;
}

const CLASS_MAP: Record<Severity, string> = {
  P1: "badge badge-danger",
  P2: "badge badge-warning",
  P3: "badge badge-success",
};

export function SeverityBadge({ severity }: Props): JSX.Element {
  return (
    <span className={CLASS_MAP[severity]} aria-label={`Severity ${severity}`}>
      · {severity}
    </span>
  );
}
