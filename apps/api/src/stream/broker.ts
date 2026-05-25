import type { OrgId, StoredStreamEvent, StreamEventDataMap, StreamEventName } from "@unsyphn/shared";
import { validateStreamEvent, compareEventIds } from "./events.js";

export interface EventBrokerOptions {
  maxHistory?: number;
  now?: () => Date;
}

export class EventBroker {
  private readonly maxHistory: number;
  private readonly now: () => Date;
  private sequence = 0;
  private history: StoredStreamEvent[] = [];
  private readonly subscribers = new Set<(event: StoredStreamEvent) => void>();

  constructor(options: EventBrokerOptions = {}) {
    this.maxHistory = options.maxHistory ?? 500;
    this.now = options.now ?? (() => new Date());
  }

  publish<TName extends StreamEventName>(
    orgId: OrgId,
    eventName: TName,
    data: StreamEventDataMap[TName],
  ): StoredStreamEvent<TName> {
    const event: StoredStreamEvent<TName> = {
      id: `evt_${String(++this.sequence).padStart(6, "0")}`,
      orgId,
      event: eventName,
      data: validateStreamEvent(eventName, data),
      createdAt: this.now().toISOString(),
    };

    this.history = [...this.history, event].slice(-this.maxHistory);
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }

    return event;
  }

  replayAfter(orgId: OrgId, lastEventId?: string | null): StoredStreamEvent[] {
    const orgEvents = this.history.filter((event) => event.orgId === orgId);
    if (!lastEventId) {
      return [];
    }

    return orgEvents.filter((event) => compareEventIds(event.id, lastEventId) > 0);
  }

  subscribe(orgId: OrgId, callback: (event: StoredStreamEvent) => void): () => void {
    const subscriber = (event: StoredStreamEvent) => {
      if (event.orgId === orgId) {
        callback(event);
      }
    };

    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  listHistory(orgId?: OrgId): StoredStreamEvent[] {
    return this.history.filter((event) => orgId === undefined || event.orgId === orgId);
  }
}

export function createEventBroker(options: EventBrokerOptions = {}): EventBroker {
  return new EventBroker(options);
}
