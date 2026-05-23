import type { ChangeStateChangedEvent, OrgId } from "@redline/shared";

export type StreamEventName = "change.stateChanged";

export interface StreamEvent<TData = unknown> {
  id: string;
  orgId: OrgId;
  event: StreamEventName;
  data: TData;
  createdAt: string;
}

export class EventBroker {
  private sequence = 0;
  private readonly events: StreamEvent[] = [];
  private readonly subscribers = new Set<(event: StreamEvent) => void>();

  publishChangeStateChanged(orgId: OrgId, data: ChangeStateChangedEvent): StreamEvent<ChangeStateChangedEvent> {
    const event: StreamEvent<ChangeStateChangedEvent> = {
      id: `evt_${++this.sequence}`,
      orgId,
      event: "change.stateChanged",
      data,
      createdAt: new Date().toISOString(),
    };

    this.events.push(event);
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
    return event;
  }

  listEvents(orgId?: OrgId): StreamEvent[] {
    return this.events.filter((event) => orgId === undefined || event.orgId === orgId);
  }

  subscribe(orgId: OrgId, callback: (event: StreamEvent) => void): () => void {
    const subscriber = (event: StreamEvent) => {
      if (event.orgId === orgId) {
        callback(event);
      }
    };

    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }
}

export function createEventBroker(): EventBroker {
  return new EventBroker();
}
