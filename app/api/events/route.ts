import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import {
  nextSubscriberId,
  subscribe,
  unsubscribe,
  type RealtimeEvent,
  type Subscriber,
} from "@/lib/realtime";

// SSE needs a long-lived Node response; better-sqlite3 forces Node runtime anyway.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return new Response("Unauthorized", { status: 401 });

  const path = request.nextUrl.searchParams.get("path") || "/";
  const encoder = new TextEncoder();

  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let sub: Subscriber | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      sub = {
        id: nextSubscriberId(),
        userId: session.userId!,
        name: session.displayName ?? session.username ?? "ผู้ใช้",
        path,
        send,
      };

      // registering broadcasts presence to everyone, including this new client
      subscribe(sub);

      // keep proxies / idle timeouts from closing the stream
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* closed; cancel() handles teardown */
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (sub) unsubscribe(sub);
    },
  });

  // also release presence if the request is aborted (navigation / tab close)
  request.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (sub) unsubscribe(sub);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
