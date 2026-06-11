import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export interface LiveInstrument {
  sym: string;
  px: number;
  dp: number;
  base: number; // previous close, used for % change
  chg: number;
  open: number; // session open (from feed)
  high: number; // session high (from feed)
  low: number; // session low (from feed)
}

export type QuoteStatus = "connecting" | "live" | "reconnecting";

// GTS2 quote gateway (Socket.IO v4). Guest connection is read-only and needs no key.
// NOTE: this endpoint is embedded in the public bundle — anyone can see it.
const QUOTE_URL = "https://webkd.gmtradeweb1.com:7036";
const QUOTE_PATH = "/socket.io/";

// Display label -> feed szShortName (normalised) + decimal places.
export const TARGETS: { sym: string; feed: string; dp: number }[] = [
  { sym: "EUR/USD", feed: "EURUSD", dp: 5 },
  { sym: "GBP/USD", feed: "GBPUSD", dp: 5 },
  { sym: "USD/JPY", feed: "USDJPY", dp: 3 },
  { sym: "AUD/USD", feed: "AUDUSD", dp: 5 },
  { sym: "USD/CNH", feed: "USDCNH", dp: 5 },
  { sym: "XAU/USD", feed: "XAUUSD", dp: 2 },
  { sym: "XAG/USD", feed: "XAGUSD", dp: 3 },
  { sym: "BTC/USD", feed: "BTCUSDT", dp: 2 },
  { sym: "ETH/USD", feed: "ETHUSDT", dp: 1 },
];

const norm = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Subscribes to the GTS2 quote feed as Guest and returns live instruments.
 * Ticks arrive as a firehose; updates are buffered and flushed ~3x/sec to keep React light.
 */
export function useLiveQuotes() {
  const [instruments, setInstruments] = useState<LiveInstrument[]>(
    TARGETS.map((t) => ({ sym: t.sym, px: 0, dp: t.dp, base: 0, chg: 0, open: 0, high: 0, low: 0 }))
  );
  const [status, setStatus] = useState<QuoteStatus>("connecting");

  const codeToIdx = useRef<Record<number, number>>({});
  const latest = useRef<LiveInstrument[]>(
    TARGETS.map((t) => ({ sym: t.sym, px: 0, dp: t.dp, base: 0, chg: 0, open: 0, high: 0, low: 0 }))
  );
  const dirty = useRef(false);

  useEffect(() => {
    const socket: Socket = io(QUOTE_URL, {
      path: QUOTE_PATH,
      transports: ["polling", "websocket"],
      reconnection: true,
    });

    socket.on("connect", () => {
      setStatus("live");
      socket.emit("addme", "Guest", "Guest", 128);
    });
    socket.on("disconnect", () => setStatus("reconnecting"));
    socket.io.on("reconnect_attempt", () => setStatus("reconnecting"));

    socket.on("init_prd_notify", (_hdr: unknown, map: Record<string, { uiCodeID: number; szShortName: string }>) => {
      const byFeed: Record<string, number> = {};
      TARGETS.forEach((t, i) => {
        byFeed[t.feed] = i;
      });
      const next: Record<number, number> = {};
      Object.values(map || {}).forEach((p) => {
        const key = norm(p?.szShortName);
        if (key in byFeed) next[p.uiCodeID] = byFeed[key];
      });
      codeToIdx.current = next;
    });

    socket.on(
      "tick",
      (
        _flag: unknown,
        map: Record<
          string,
          { uiCodeID: number; bid: number; newP: number; preclose: number; open?: number; high?: number; low?: number }
        >,
      ) => {
        const m = codeToIdx.current;
        let changed = false;
        Object.values(map || {}).forEach((q) => {
          const idx = m[q?.uiCodeID];
          if (idx === undefined) return;
          const px = Number(q.newP ?? q.bid);
          if (!Number.isFinite(px)) return;
          const base = Number(q.preclose) || px;
          const prev = latest.current[idx];
          const open = Number(q.open) || prev.open || px;
          const high = Math.max(Number(q.high) || px, px, prev.high || px);
          const low = Math.min(Number(q.low) || px, px, prev.low || px);
          latest.current[idx] = {
            ...prev,
            px,
            base,
            chg: base ? ((px - base) / base) * 100 : 0,
            open,
            high,
            low,
          };
          changed = true;
        });
        if (changed) dirty.current = true;
      },
    );

    const flush = setInterval(() => {
      if (dirty.current) {
        dirty.current = false;
        setInstruments(latest.current.slice());
      }
    }, 300);

    return () => {
      clearInterval(flush);
      socket.close();
    };
  }, []);

  return { instruments, status };
}
