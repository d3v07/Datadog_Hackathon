import {
  parseStreamEventData,
  type Action,
  type ActionDeliveryStatus,
  type OrgId,
  type StoredStreamEvent,
  type StreamEventDataMap,
  type StreamEventName,
} from "@redline/shared";

export interface EventPublisher {
  publish<TName extends StreamEventName>(
    orgId: OrgId,
    eventName: TName,
    data: StreamEventDataMap[TName],
  ): unknown | Promise<unknown>;
}

export interface InMemoryEventPublisherOptions {
  now?: () => Date;
}

export class InMemoryEventPublisher implements EventPublisher {
  private readonly now: () => Date;
  private sequence = 0;
  private events: StoredStreamEvent[] = [];

  constructor(options: InMemoryEventPublisherOptions = {}) {
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
      data: parseStreamEventData(eventName, data),
      createdAt: this.now().toISOString(),
    };

    this.events = [...this.events, event];
    return structuredClone(event);
  }

  list(orgId?: OrgId): StoredStreamEvent[] {
    return this.events.filter((event) => orgId === undefined || event.orgId === orgId).map((event) => structuredClone(event));
  }
}

export function createInMemoryEventPublisher(options: InMemoryEventPublisherOptions = {}): InMemoryEventPublisher {
  return new InMemoryEventPublisher(options);
}

export async function publishActionDelivered(events: EventPublisher | undefined, action: Action): Promise<void> {
  if (!events || !action.changeReportId) {
    return;
  }

  await events.publish(action.orgId, "action.delivered", {
    actionId: action.id,
    changeReportId: action.changeReportId,
    kind: action.kind,
    status: deliveryStatus(action.status),
    ...(action.externalId ? { externalId: action.externalId } : {}),
  });
}

function deliveryStatus(status: Action["status"]): ActionDeliveryStatus {
  if (status === "acknowledged") {
    return "delivered";
  }

  return status;
}
