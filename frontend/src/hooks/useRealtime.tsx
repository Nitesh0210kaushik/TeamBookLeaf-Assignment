import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL, baseApi } from "@/store/api/baseApi";
import { useAppDispatch } from "@/store";

type RealtimeState = { connected: boolean };

const RealtimeContext = createContext<RealtimeState>({ connected: false });

/** Polling interval used only while the live connection is down. */
const FALLBACK_POLL_MS = 20_000;

/**
 * Opens one Server-Sent Events connection per session. Each `ticket.updated` event just
 * invalidates the matching RTK Query cache entries, so the affected views refetch through the
 * normal REST endpoints (and their access checks). EventSource reconnects automatically.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/realtime/stream`, {
      withCredentials: true,
    });

    source.addEventListener("connected", () => setConnected(true));
    source.addEventListener("ticket.updated", (event) => {
      const { ticketId, reason } = JSON.parse((event as MessageEvent<string>).data) as {
        ticketId: string;
        reason: string;
      };
      dispatch(
        baseApi.util.invalidateTags([
          { type: "Ticket", id: ticketId },
          "TicketList",
          "Stats",
          // A new author message makes the cached reply draft stale.
          ...(reason === "author_replied" || reason === "triaged"
            ? [{ type: "Draft" as const, id: ticketId }]
            : []),
        ]),
      );
    });
    source.onerror = () => setConnected(false);

    return () => source.close();
  }, [dispatch]);

  return <RealtimeContext.Provider value={{ connected }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

/** pollingInterval for RTK Query: 0 while live updates work, a safety-net interval otherwise. */
export function useFallbackPolling() {
  return useRealtime().connected ? 0 : FALLBACK_POLL_MS;
}
