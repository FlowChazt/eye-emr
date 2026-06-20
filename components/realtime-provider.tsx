"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { RealtimeEvent } from "@/lib/realtime";

type Viewers = Record<number, string[]>;

interface PresenceValue {
  viewers: Viewers;
  myUserId: number;
  myName: string;
}

const PresenceContext = createContext<PresenceValue>({
  viewers: {},
  myUserId: 0,
  myName: "",
});

/** Names of *other* users currently viewing the given visit. */
export function useVisitViewers(visitId: number): string[] {
  const { viewers, myName } = useContext(PresenceContext);
  return (viewers[visitId] ?? []).filter((n) => n !== myName);
}

type Toast = { id: number; text: string };

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available / blocked — ignore */
  }
}

export function RealtimeProvider({
  myUserId,
  myName,
  notifyNewVisit,
  notifySound,
  children,
}: {
  myUserId: number;
  myName: string;
  notifyNewVisit: boolean;
  notifySound: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [viewers, setViewers] = useState<Viewers>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSeq = useRef(0);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 300);
  }, [router]);

  const pushToast = useCallback((text: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  // Reconnect whenever the pathname changes so server-side presence reflects
  // which page each user is actually on.
  useEffect(() => {
    const es = new EventSource(`/api/events?path=${encodeURIComponent(pathname)}`);

    es.onmessage = (e) => {
      let event: RealtimeEvent;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (event.type === "presence") {
        setViewers(event.viewers);
      } else if (event.type === "new-visit") {
        scheduleRefresh();
        if (event.byUserId !== myUserId && notifyNewVisit) {
          pushToast(`ผู้ป่วยใหม่: ${event.patientName}`);
          if (notifySound) playBeep();
        }
      } else if (event.type === "changed") {
        scheduleRefresh();
      }
    };

    return () => es.close();
  }, [pathname, myUserId, notifyNewVisit, notifySound, scheduleRefresh, pushToast]);

  return (
    <PresenceContext.Provider value={{ viewers, myUserId, myName }}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-lg border border-teal-200 bg-paper px-4 py-3 text-sm font-medium text-teal-900 shadow-lg"
            role="status"
          >
            🔔 {t.text}
          </div>
        ))}
      </div>
    </PresenceContext.Provider>
  );
}
