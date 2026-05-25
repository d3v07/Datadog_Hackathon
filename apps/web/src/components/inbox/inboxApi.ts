import { DEMO_BEARER_TOKEN } from "../../lib/api.js";

export async function postLifecycle(
  id: string,
  action: "acknowledge" | "snooze" | "resolve",
  body: Record<string, unknown>,
): Promise<void> {
  const resp = await fetch(`/v1/changes/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Request failed (${resp.status})`);
  }
}
