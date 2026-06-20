/**
 * In-process realtime hub for the single-server clinic app.
 *
 * Every mutation runs in this same Node process (one shared SQLite connection),
 * so a plain in-memory pub/sub reaches every connected browser — no WebSocket
 * server, Redis, or external broker needed. Browsers subscribe over SSE
 * (see app/api/events/route.ts); mutations call notifyChanged()/notifyNewVisit().
 *
 * If the app ever ran on more than one server process this would need a shared
 * broker, but the clinic points every client at one machine.
 */

export type RealtimeEvent =
  | { type: "changed" }
  | { type: "new-visit"; patientName: string; byUserId: number }
  | { type: "presence"; viewers: Record<number, string[]> };

export interface Subscriber {
  id: number;
  userId: number;
  name: string;
  /** current client pathname, e.g. "/visits/42" — drives presence */
  path: string;
  send: (event: RealtimeEvent) => void;
}

// Survive Next.js dev hot-reloads, same trick as db/index.ts.
const globalForRt = globalThis as unknown as {
  __rtSubscribers?: Set<Subscriber>;
  __rtSeq?: number;
};

const subscribers = (globalForRt.__rtSubscribers ??= new Set<Subscriber>());

export function nextSubscriberId(): number {
  globalForRt.__rtSeq = (globalForRt.__rtSeq ?? 0) + 1;
  return globalForRt.__rtSeq;
}

export function subscribe(sub: Subscriber): void {
  subscribers.add(sub);
  broadcastPresence();
}

export function unsubscribe(sub: Subscriber): void {
  if (subscribers.delete(sub)) broadcastPresence();
}

function broadcast(event: RealtimeEvent): void {
  for (const sub of subscribers) {
    try {
      sub.send(event);
    } catch {
      // dead connection — drop it; its abort handler will also clean up
      subscribers.delete(sub);
    }
  }
}

/** A row somewhere changed; clients re-fetch their current page. */
export function notifyChanged(): void {
  broadcast({ type: "changed" });
}

/** A new patient visit was opened — drives the live queue + the toast. */
export function notifyNewVisit(patientName: string, byUserId: number): void {
  broadcast({ type: "new-visit", patientName, byUserId });
  broadcastPresence();
}

/** Map of visitId → names of users currently viewing that visit page. */
export function currentViewers(): Record<number, string[]> {
  const viewers: Record<number, string[]> = {};
  for (const sub of subscribers) {
    const m = /^\/visits\/(\d+)/.exec(sub.path);
    if (!m) continue;
    const visitId = Number(m[1]);
    (viewers[visitId] ??= []).push(sub.name);
  }
  return viewers;
}

export function broadcastPresence(): void {
  const viewers = currentViewers();
  broadcast({ type: "presence", viewers });
}
