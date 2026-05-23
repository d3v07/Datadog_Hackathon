import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Onboard } from "../../apps/web/src/screens/Onboard.js";

// Mock EventSource — the stream hook subscribes via this. We push events
// imperatively from the test to drive the UI.

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
    const msgEvent = new MessageEvent(event, { data: JSON.stringify(data) });
    for (const fn of fns) fn(msgEvent);
  }
}

beforeEach(() => {
  // @ts-expect-error — install global EventSource for jsdom
  globalThis.EventSource = MockEventSource;
  MockEventSource.instances = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as typeof fetch;
}

describe("Onboard screen", () => {
  it("renders the form with all four fields", () => {
    render(<Onboard />);
    expect(screen.getByLabelText(/vendor name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/homepage url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^owner$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/criticality tier/i)).toBeInTheDocument();
    expect(screen.getByText(/data classes/i)).toBeInTheDocument();
  });

  it("blocks submit when fields are invalid", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    mockFetch(fetchSpy as never);

    render(<Onboard />);
    await user.click(screen.getByRole("button", { name: /add vendor/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getAllByText(/required|at least|valid/i).length).toBeGreaterThan(0);
    });
  });

  it("submits, swaps to the first-scan panel, and lights up stage chips on SSE", async () => {
    const user = userEvent.setup();
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          id: "vnd_test",
          name: "Acme Co",
          firstScanRunId: "run_test_123",
          discoveredUrls: {
            homepage: "https://acme.test",
            terms: "https://acme.test/terms",
            pricing: "https://acme.test/pricing",
            dpa: "https://acme.test/dpa",
            subProcessors: "https://acme.test/subprocessors",
            security: "https://acme.test/security",
            sla: "https://acme.test/sla",
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );

    render(<Onboard />);
    await user.type(screen.getByLabelText(/vendor name/i), "Acme Co");
    await user.type(screen.getByLabelText(/homepage url/i), "https://acme.test");
    await user.selectOptions(screen.getByLabelText(/^owner$/i), "usr_priya");
    await user.click(screen.getByRole("button", { name: /add vendor/i }));

    await waitFor(() =>
      expect(screen.getByText(/first scan running/i)).toBeInTheDocument(),
    );

    // The hook opened an EventSource — push a run.stage event.
    const es = MockEventSource.instances[0];
    expect(es).toBeDefined();
    es!.dispatch("run.stage", {
      runId: "run_test_123",
      vendorId: "vnd_test",
      stage: "fetch",
      status: "completed",
    });

    await waitFor(() => {
      const chip = screen.getByText("fetch").closest(".stage");
      expect(chip?.className).toContain("stage--completed");
    });

    es!.dispatch("run.completed", {
      runId: "run_test_123",
      vendorId: "vnd_test",
      status: "unchanged",
      endedAt: new Date().toISOString(),
      durationMs: 1234,
    });

    await waitFor(() =>
      expect(screen.getByText(/first scan complete/i)).toBeInTheDocument(),
    );
  });

  it("renders the server error envelope when the API returns 409 duplicate", async () => {
    const user = userEvent.setup();
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "duplicate",
            message: "A vendor with this homepage already exists",
          },
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      ),
    );

    render(<Onboard />);
    await user.type(screen.getByLabelText(/vendor name/i), "Acme Co");
    await user.type(screen.getByLabelText(/homepage url/i), "https://acme.test");
    await user.selectOptions(screen.getByLabelText(/^owner$/i), "usr_priya");
    await user.click(screen.getByRole("button", { name: /add vendor/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/duplicate/i),
    );
    // Stays on the form, doesn't swap to the first-scan panel.
    expect(screen.queryByText(/first scan running/i)).not.toBeInTheDocument();
  });
});
