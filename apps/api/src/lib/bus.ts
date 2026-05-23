import type { SseEvent } from "@redline/shared";

// Tiny in-process pub/sub. SSE subscribers register here; the stub runner
// publishes scheduler.tick / run.stage / run.completed. Per-org ring buffer
// keeps the last N events so an EventSource reconnect with Last-Event-ID can
// resume without holes (handoff/API §09).

export interface BusEnvelope {
  id: string;
  orgId: string;
  emittedAt: number;
  payload: SseEvent;
}

export type BusSubscriber = (env: BusEnvelope) => void;

const RING_SIZE = 100;

export class EventBus {
  private subscribersByOrg = new Map<string, Set<BusSubscriber>>();
  private ringByOrg = new Map<string, BusEnvelope[]>();
  private seq = 0;

  publish(orgId: string, payload: SseEvent): BusEnvelope {
    this.seq += 1;
    const envelope: BusEnvelope = {
      id: `${Date.now().toString(36)}-${this.seq.toString(36)}`,
      orgId,
      emittedAt: Date.now(),
      payload,
    };
    const ring = this.ringByOrg.get(orgId) ?? [];
    ring.push(envelope);
    if (ring.length > RING_SIZE) ring.splice(0, ring.length - RING_SIZE);
    this.ringByOrg.set(orgId, ring);

    const subs = this.subscribersByOrg.get(orgId);
    if (subs) {
      for (const sub of subs) {
        try {
          sub(envelope);
        } catch {
          // Subscriber errors must not break the bus.
        }
      }
    }
    return envelope;
  }

  subscribe(
    orgId: string,
    subscriber: BusSubscriber,
    sinceEventId?: string,
  ): () => void {
    const subs = this.subscribersByOrg.get(orgId) ?? new Set<BusSubscriber>();
    subs.add(subscriber);
    this.subscribersByOrg.set(orgId, subs);

    if (sinceEventId) {
      const ring = this.ringByOrg.get(orgId) ?? [];
      const idx = ring.findIndex((e) => e.id === sinceEventId);
      const replayFrom = idx >= 0 ? idx + 1 : 0;
      for (let i = replayFrom; i < ring.length; i += 1) {
        try {
          subscriber(ring[i]!);
        } catch {
          // ignore
        }
      }
    }

    return () => {
      const set = this.subscribersByOrg.get(orgId);
      if (set) {
        set.delete(subscriber);
        if (set.size === 0) this.subscribersByOrg.delete(orgId);
      }
    };
  }
}

export const bus = new EventBus();
