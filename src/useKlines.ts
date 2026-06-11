import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { TARGETS } from "./useLiveQuotes";

export interface Kline {
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  t: number; // bar start (unix seconds)
}

// Same GTS2 guest gateway as the tick feed. Historical candles are fetched with
// the platform's own protocol: emit("request", 0x10301, {period, num, code, seq})
// and the server replies on "quote_query" (newest-first) matched by seq.
const QUOTE_URL = "https://webkd.gmtradeweb1.com:7036";
const QUOTE_PATH = "/socket.io/";
const OPCODE = Number("0x10301"); // Req.quoteQuery

const norm = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const FEED: Record<string, string> = Object.fromEntries(TARGETS.map((t) => [t.sym, t.feed]));

export interface KlineOptions {
  num?: number;
  periodNum?: number;
  periodType?: number; // 1=min, 2=hour, 3=day, 4=week, 5=month
}

/**
 * Fetches real historical OHLC candles for one symbol from the GTS2 guest feed.
 * Refreshes when the symbol changes and on a slow interval to stay current.
 */
export function useKlines(sym: string, opts?: KlineOptions): Kline[] {
  const num = opts?.num ?? 160;
  const periodNum = opts?.periodNum ?? 5;
  const periodType = opts?.periodType ?? 1;

  const [klines, setKlines] = useState<Kline[]>([]);
  const [ready, setReady] = useState(false);
  const idMap = useRef<Record<string, number>>({});
  const socketRef = useRef<Socket | null>(null);
  const seqRef = useRef<string>("");

  // Connect once.
  useEffect(() => {
    const socket: Socket = io(QUOTE_URL, {
      path: QUOTE_PATH,
      transports: ["polling", "websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("addme", "Guest", "Guest", 128));
    socket.on(
      "init_prd_notify",
      (_hdr: unknown, map: Record<string, { uiCodeID: number; szShortName: string }>) => {
        const m: Record<string, number> = {};
        Object.values(map || {}).forEach((p) => {
          if (p?.szShortName) m[norm(p.szShortName)] = p.uiCodeID;
        });
        idMap.current = m;
        setReady(true);
      },
    );
    socket.on(
      "quote_query",
      (
        meta: { seq: number },
        bars: Record<string, { begin: number; end: number; highest: number; lowest: number; tm: number }>,
      ) => {
        if (String(meta?.seq) !== seqRef.current) return;
        const arr = Object.values(bars || {}).map((b) => ({
          o: b.begin,
          c: b.end,
          h: b.highest,
          l: b.lowest,
          t: b.tm,
        }));
        arr.sort((a, b) => a.t - b.t); // server sends newest-first
        setKlines(arr);
      },
    );

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  // Request (and periodically refresh) candles for the active symbol.
  useEffect(() => {
    if (!ready) return;
    const socket = socketRef.current;
    if (!socket) return;

    const request = () => {
      const feed = FEED[sym];
      const code = feed ? idMap.current[norm(feed)] : undefined;
      if (!code) return;
      const seq = String(Date.now()).slice(5);
      seqRef.current = seq;
      socket.emit("request", OPCODE, {
        time: 0,
        num,
        period_num: periodNum,
        period_type: periodType,
        flag: 0,
        code: Number(code),
        seq,
      });
    };

    setKlines([]);
    request();
    const iv = setInterval(request, 20000);
    return () => clearInterval(iv);
  }, [sym, ready, num, periodNum, periodType]);

  return klines;
}
