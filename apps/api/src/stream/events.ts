import {
  parseStreamEventData,
  type Action,
  type ActionDeliveryStatus,
  type OrgId,
  type StoredStreamEvent,
  type StreamEventDataMap,
  type StreamEventName,
} from "@redline/shared";

export type StreamSubscriber = (event: StoredStreamEvent) => void;

export interface EventPublisher {
  publish<TName extends StreamEventName>(
    orgId: OrgId,
    eventName: TName,
    data: StreamEventDataMap[TName],
  ): unknown | Promise<unknown>;
}

function eventSequence(id: string): number | null {
  const match = id.match(/^evt_(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function compareEventIds(left: string, right: string): number {
  const leftSequence = eventSequence(left);
  const rightSequence = eventSequence(right);

  if (leftSequence !== null && rightSequence !== null) {
    return leftSequence - rightSequence;
  }

  return 0;
}

export function formatSseEvent(event: StoredStreamEvent): string {
  return `id: ${event.id}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function formatHeartbeat(): string {
  return ":heartbeat\n\n";
}

export function validateStreamEvent<TName extends StreamEventName>(
  eventName: TName,
  data: unknown,
): StreamEventDataMap[TName] {
  return parseStreamEventData(eventName, data);
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
