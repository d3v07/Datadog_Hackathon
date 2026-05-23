// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock @stripe/stripe-js so loadStripe never tries to talk to js.stripe.com.
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(async () => ({})),
}));

// Mock @stripe/react-stripe-js with createElement (no JSX) so the hoisted
// factory has no transform-order surprises. The real Elements is a Context
// Provider that doesn't wrap its children in a div, which made the mock
// detection unreliable when written as JSX.
const confirmPayment = vi.fn(async () => ({ error: undefined }));
vi.mock("@stripe/react-stripe-js", () => {
  return {
    Elements: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "elements" }, children),
    PaymentElement: () =>
      React.createElement("div", { "data-testid": "payment-element" }),
    useStripe: () => ({ confirmPayment }),
    useElements: () => ({}),
  };
});

import { StripeModal } from "../../apps/web/src/screens/StripeModal.js";

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  public readyState = 1;
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  private listeners = new Map<string, Set<(e: MessageEvent) => void>>();
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
  addEventListener(name: string, fn: (e: MessageEvent) => void): void {
    const set = this.listeners.get(name) ?? new Set();
    set.add(fn);
    this.listeners.set(name, set);
  }
  removeEventListener(name: string, fn: (e: MessageEvent) => void): void {
    this.listeners.get(name)?.delete(fn);
  }
  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }
  dispatch(event: string, data: unknown): void {
    const fns = this.listeners.get(event);
    if (!fns) return;
    const ev = new MessageEvent(event, { data: JSON.stringify(data) });
    for (const fn of fns) fn(ev);
  }
}

function mockFetch(handlers: Record<string, () => Response>) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const path = new URL(url, "http://test").pathname;
    const h = handlers[path];
    if (!h) throw new Error(`No mock for ${path}`);
    return h();
  }) as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  // @ts-expect-error — inject global EventSource for jsdom
  globalThis.EventSource = MockEventSource;
  MockEventSource.instances = [];
  confirmPayment.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StripeModal", () => {
  it("loads the product and shows the upgrade CTA", async () => {
    mockFetch({
      "/v1/billing/products": () =>
        jsonResponse(200, {
          data: [
            {
              id: "compliance-pack",
              name: "Compliance Pack",
              description: "test",
              priceUsdCents: 99900,
              currency: "usd",
              billing: "one-time",
              features: ["A", "B"],
            },
          ],
          orgEntitlements: { compliancePack: false },
        }),
    });
    render(<StripeModal onClose={() => undefined} />);
    expect(await screen.findByTestId("begin-payment")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Compliance Pack/i })).toBeInTheDocument();
  });

  it("short-circuits to success when the org is already entitled", async () => {
    mockFetch({
      "/v1/billing/products": () =>
        jsonResponse(200, {
          data: [
            {
              id: "compliance-pack",
              name: "Compliance Pack",
              description: "",
              priceUsdCents: 99900,
              currency: "usd",
              billing: "one-time",
              features: [],
            },
          ],
          orgEntitlements: { compliancePack: true },
        }),
    });
    render(<StripeModal onClose={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText(/already has the Compliance Pack/i)).toBeInTheDocument();
    });
  });

  it("creates a PaymentIntent, mounts Elements, and flips to success on entitlement SSE", async () => {
    const user = userEvent.setup();
    mockFetch({
      "/v1/billing/products": () =>
        jsonResponse(200, {
          data: [
            {
              id: "compliance-pack",
              name: "Compliance Pack",
              description: "",
              priceUsdCents: 99900,
              currency: "usd",
              billing: "one-time",
              features: [],
            },
          ],
          orgEntitlements: { compliancePack: false },
        }),
      "/v1/billing/payment-intents": () =>
        jsonResponse(200, {
          paymentIntentId: "pi_test",
          clientSecret: "pi_test_secret_abc",
          amountUsdCents: 99900,
          currency: "usd",
          publishableKey: "pk_test_x",
        }),
    });

    render(<StripeModal onClose={() => undefined} />);
    await user.click(await screen.findByTestId("begin-payment"));

    expect(await screen.findByTestId("confirm-payment")).toBeInTheDocument();

    // Push the entitlement event via the SSE mock.
    const es = MockEventSource.instances[0];
    expect(es).toBeDefined();
    es!.dispatch("org.entitlements.changed", {
      compliancePack: true,
      auditorPortal: false,
      changedAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText(/Compliance Pack unlocked/i)).toBeInTheDocument();
    });
  });

  it("Shift+Enter triggers the simulate-success fallback", async () => {
    const user = userEvent.setup();
    const simulateCall = vi.fn(() =>
      jsonResponse(200, { ok: true, paymentIntentId: "pi_dev_fake" }),
    );
    mockFetch({
      "/v1/billing/products": () =>
        jsonResponse(200, {
          data: [
            {
              id: "compliance-pack",
              name: "Compliance Pack",
              description: "",
              priceUsdCents: 99900,
              currency: "usd",
              billing: "one-time",
              features: [],
            },
          ],
          orgEntitlements: { compliancePack: false },
        }),
      "/v1/billing/simulate-success": simulateCall,
    });

    render(<StripeModal onClose={() => undefined} />);
    await screen.findByTestId("begin-payment");

    // Press Shift+Enter at the document level.
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    await waitFor(() => {
      expect(simulateCall).toHaveBeenCalledTimes(1);
    });
  });

  it("renders a Retry button and re-tries the PaymentIntent when payment-intent creation fails", async () => {
    const user = userEvent.setup();
    let intentCallCount = 0;
    mockFetch({
      "/v1/billing/products": () =>
        jsonResponse(200, {
          data: [
            {
              id: "compliance-pack",
              name: "Compliance Pack",
              description: "",
              priceUsdCents: 99900,
              currency: "usd",
              billing: "one-time",
              features: [],
            },
          ],
          orgEntitlements: { compliancePack: false },
        }),
      "/v1/billing/payment-intents": () => {
        intentCallCount += 1;
        if (intentCallCount === 1) {
          return jsonResponse(502, {
            error: { code: "upstream-failed", message: "stripe is down" },
          });
        }
        return jsonResponse(200, {
          paymentIntentId: "pi_test_2",
          clientSecret: "pi_test_2_secret",
          amountUsdCents: 99900,
          currency: "usd",
          publishableKey: "pk_test_x",
        });
      },
    });

    render(<StripeModal onClose={() => undefined} />);
    await user.click(await screen.findByTestId("begin-payment"));

    const retry = await screen.findByTestId("retry");
    await user.click(retry);

    expect(await screen.findByTestId("confirm-payment")).toBeInTheDocument();
    expect(intentCallCount).toBe(2);
  });
});
