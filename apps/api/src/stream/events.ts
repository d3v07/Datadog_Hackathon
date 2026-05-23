import {
  parseStreamEventData,
  type OrgId,
  type StoredStreamEvent,
  type StreamEventDataMap,
  type StreamEventName,
} from "@redline/shared";

export type StreamSubscriber = (event: StoredStreamEvent) => void;

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
