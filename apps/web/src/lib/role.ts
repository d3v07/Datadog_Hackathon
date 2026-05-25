import { useEffect, useState } from "react";

export type Role = "procurement" | "legal" | "security" | "finance" | "it" | "audit";

export function parseRole(search: string): Role {
  const r = new URLSearchParams(search).get("role");
  if (r === "legal" || r === "security" || r === "finance" || r === "it" || r === "audit") return r;
  return "procurement";
}

export function useRole(): [Role, (r: Role) => void] {
  const [role, setRoleState] = useState<Role>(parseRole(window.location.search));
  const setRole = (r: Role) => {
    const url = new URL(window.location.href);
    url.searchParams.set("role", r);
    window.history.replaceState({}, "", url.toString());
    setRoleState(r);
  };
  useEffect(() => {
    const onPop = () => setRoleState(parseRole(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return [role, setRole];
}

export const ROLE_LABELS: Record<Role, string> = {
  procurement: "Procurement",
  legal: "Legal",
  security: "Security",
  finance: "Finance",
  it: "IT",
  audit: "Audit",
};

export const ALL_ROLES: Role[] = ["procurement", "legal", "security", "finance"];

export const ROLES: Role[] = ["procurement", "legal", "security", "finance", "it", "audit"];
