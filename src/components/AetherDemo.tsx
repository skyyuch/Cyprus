/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Syphon Aether — Live Desk demo overlay.
 *
 * Left: chat with the Gemini-driven Aether agent (function-calling).
 * Right: a live dashboard (LP ranking, current parameters, risk gauges) that
 * reflects tool calls in real time. All LP/pricing/risk figures are simulated;
 * prices are the real live guest feed.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  ChevronDown,
  ChevronRight,
  Cpu,
  Gauge,
  Layers,
  ShieldAlert,
  Wifi,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import type { LiveInstrument } from "../useLiveQuotes";
import { useAgent, type ToolCallRecord } from "../agent/useAgent";
import { lpQuotesFor } from "../agent/tools";
import { SYMBOL_SPECS, type SimSnapshot } from "../agent/simState";

interface AetherDemoProps {
  open: boolean;
  onClose: () => void;
  instruments: LiveInstrument[];
  selectedSym: string;
  onSelectSym: (sym: string) => void;
}

const SUGGESTIONS = [
  "Which LP has the tightest EUR/USD spread right now?",
  "Tighten XAU/USD client spreads by 0.2 pips.",
  "Show me NOP usage and margin headroom.",
  "Route a 5M EUR/USD buy order.",
  "Execute a 30M XAU/USD buy.",
];

export default function AetherDemo({
  open,
  onClose,
  instruments,
  selectedSym,
  onSelectSym,
}: AetherDemoProps) {
  const { messages, busy, offline, snapshot, focusSymbol, send, reset } = useAgent(instruments);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keep the main app's selected symbol in sync with what the agent is discussing.
  useEffect(() => {
    if (focusSymbol && SYMBOL_SPECS[focusSymbol] && focusSymbol !== selectedSym) {
      onSelectSym(focusSymbol);
    }
  }, [focusSymbol, selectedSym, onSelectSym]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const activeSym = focusSymbol && SYMBOL_SPECS[focusSymbol] ? focusSymbol : selectedSym;

  if (!open) return null;

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    send(text);
    setInput("");
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="w-full max-w-[1200px] h-[94vh] bg-[#05080b] border border-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3ddc6c]/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-900 bg-black/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#3ddc6c]/10 text-[#3ddc6c] border border-[#3ddc6c]/25">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase leading-none flex items-center gap-2">
                Syphon Aether · Live Desk
              </h3>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                Pricing · Routing · Risk · Liquidity
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded border ${
                offline
                  ? "text-amber-300 border-amber-500/30 bg-amber-500/5"
                  : "text-[#3ddc6c] border-[#3ddc6c]/25 bg-[#3ddc6c]/5"
              }`}
            >
              {offline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {offline ? "AI offline" : "AI online"}
            </span>
            <button
              onClick={reset}
              title="Clear conversation"
              className="p-2 text-slate-400 hover:text-white border border-slate-900 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white border border-slate-900 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Illustrative banner */}
        <div className="px-4 py-1.5 bg-[#0a0f0c] border-b border-slate-900/80 text-[9.5px] text-slate-500 tracking-wide flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc6c] animate-pulse shrink-0" />
          Live prices · simulated LPs, parameters &amp; execution. Illustrative for demonstration only.
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
          {/* Chat */}
          <div className="lg:col-span-3 flex flex-col overflow-hidden border-r border-slate-900">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.length === 0 && <EmptyState onPick={submit} />}
              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} text={m.text} error={m.error} toolCalls={m.toolCalls} />
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-[11px] text-[#3ddc6c]">
                  <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "2s" }} />
                  Aether is working…
                </div>
              )}
            </div>

            {/* Suggestion chips */}
            <div className="px-3 pt-2 flex flex-wrap gap-1.5 border-t border-slate-900/70">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  disabled={busy}
                  className="text-[10px] text-slate-300 bg-[#070d0a] hover:bg-[#3ddc6c]/10 hover:text-[#3ddc6c] border border-slate-900 hover:border-[#3ddc6c]/30 rounded-full px-2.5 py-1 cursor-pointer disabled:opacity-40 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
              className="p-3 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the desk — quotes, parameters, routing, risk, execution…"
                className="flex-1 bg-[#030609] border border-slate-900 focus:border-[#3ddc6c]/40 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#3ddc6c]/20"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="bg-[#3ddc6c] hover:bg-[#3ddc6c]/90 disabled:opacity-40 text-black px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Dashboard */}
          <div className="lg:col-span-2 overflow-y-auto p-4 space-y-4 bg-[#04070a] custom-scrollbar">
            <Dashboard activeSym={activeSym} instruments={instruments} snapshot={snapshot} onSelectSym={onSelectSym} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
      <span className="p-3 rounded-2xl bg-[#3ddc6c]/10 text-[#3ddc6c] border border-[#3ddc6c]/25 mb-3">
        <Sparkles className="w-6 h-6" />
      </span>
      <h4 className="text-white font-bold text-sm mb-1">Ask the Syphon Aether desk</h4>
      <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed mb-4">
        A live agent that prices, routes and risk-manages institutional flow. It calls real desk
        tools over the live feed — try one:
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTIONS.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-[10px] text-slate-200 bg-[#070d0a] hover:bg-[#3ddc6c]/10 hover:text-[#3ddc6c] border border-slate-900 hover:border-[#3ddc6c]/30 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  text,
  error,
  toolCalls,
}: {
  role: "user" | "assistant";
  text: string;
  error?: boolean;
  toolCalls?: ToolCallRecord[];
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] space-y-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {toolCalls && toolCalls.length > 0 && (
          <div className="space-y-1.5">
            {toolCalls.map((tc, i) => (
              <ToolCallCard key={i} call={tc} />
            ))}
          </div>
        )}
        {text && (
          <div
            className={`text-xs leading-relaxed rounded-2xl px-3 py-2 border ${
              isUser
                ? "bg-[#3ddc6c]/10 border-[#3ddc6c]/25 text-emerald-50"
                : error
                  ? "bg-amber-950/20 border-amber-500/25 text-amber-200"
                  : "bg-[#080d11] border-slate-900 text-slate-200"
            }`}
          >
            {text}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallCard({ call }: { call: ToolCallRecord }) {
  const [open, setOpen] = useState(false);
  const argStr = Object.entries(call.args)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" · ");
  const failed = call.result && call.result.ok === false;
  return (
    <div className="bg-[#060b0e] border border-slate-900 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left cursor-pointer hover:bg-slate-900/30"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
        )}
        <Layers className="w-3 h-3 text-[#3ddc6c] shrink-0" />
        <span className="text-[10px] font-bold text-[#3ddc6c]">{call.name}</span>
        {argStr && <span className="text-[9.5px] text-slate-500 truncate">{argStr}</span>}
        {failed && <span className="ml-auto text-[9px] text-rose-400 shrink-0">error</span>}
      </button>
      {open && (
        <pre className="text-[9.5px] text-slate-400 px-3 pb-2 overflow-x-auto whitespace-pre-wrap break-words border-t border-slate-900/60 pt-2">
          {JSON.stringify(call.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Gaugebar({ label, pct, danger }: { label: string; pct: number; danger?: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const hot = danger != null && pct >= danger;
  const warn = pct >= 70;
  const color = hot || pct >= 90 ? "bg-rose-500" : warn ? "bg-amber-400" : "bg-[#3ddc6c]";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={`font-bold ${hot || pct >= 90 ? "text-rose-400" : warn ? "text-amber-300" : "text-[#3ddc6c]"}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function Dashboard({
  activeSym,
  instruments,
  snapshot,
  onSelectSym,
}: {
  activeSym: string;
  instruments: LiveInstrument[];
  snapshot: SimSnapshot;
  onSelectSym: (s: string) => void;
}) {
  const mid = useMemo(() => {
    const ins = instruments.find((i) => i.sym === activeSym);
    return ins && ins.px ? ins.px : SYMBOL_SPECS[activeSym]?.refMid || 0;
  }, [instruments, activeSym]);

  const ranked = useMemo(
    () => lpQuotesFor(activeSym, mid).sort((a, b) => b.liquidityScore - a.liquidityScore).slice(0, 5),
    [activeSym, mid],
  );

  const { params, risk } = snapshot;
  const symNop = risk.nop[activeSym] ?? 0;
  const symLimit = risk.limits[activeSym] ?? 50_000_000;
  const symUsage = (Math.abs(symNop) / symLimit) * 100;
  const aggNop = Object.values(risk.nop).reduce((a, v) => a + Math.abs(v), 0);
  const aggUsage = (aggNop / risk.aggregateLimitUsd) * 100;

  return (
    <>
      {/* Symbol picker */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.keys(SYMBOL_SPECS).map((s) => (
          <button
            key={s}
            onClick={() => onSelectSym(s)}
            className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${
              s === activeSym
                ? "bg-[#3ddc6c]/10 border-[#3ddc6c]/40 text-[#3ddc6c] font-bold"
                : "border-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* LP ranking */}
      <div className="bg-[#060b0e] border border-slate-900 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
          <Gauge className="w-3.5 h-3.5 text-[#3ddc6c]" /> LP ranking · {activeSym}
        </div>
        <div className="space-y-1">
          {ranked.length === 0 && <div className="text-[10px] text-slate-500">No quotes.</div>}
          {ranked.map((q, i) => (
            <div
              key={q.id}
              className={`flex items-center justify-between text-[10px] px-2 py-1 rounded ${
                i === 0 ? "bg-[#3ddc6c]/8 border border-[#3ddc6c]/20" : "bg-slate-950/40"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`font-bold ${i === 0 ? "text-[#3ddc6c]" : "text-slate-300"}`}>{q.id}</span>
                <span className="text-slate-600">T{q.tier}</span>
              </span>
              <span className="flex items-center gap-2.5 text-slate-400">
                <span className="text-slate-200">{q.spreadPips} pip</span>
                <span>{q.latencyMs}ms</span>
                <span className="text-[#3ddc6c]/80">{(q.fillRate * 100).toFixed(1)}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk gauges */}
      <div className="bg-[#060b0e] border border-slate-900 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          <ShieldAlert className="w-3.5 h-3.5 text-[#3ddc6c]" /> Risk book
        </div>
        <Gaugebar label={`${activeSym} NOP / limit`} pct={symUsage} />
        <Gaugebar label="Aggregate NOP / 150M limit" pct={aggUsage} />
        <Gaugebar label="Margin usage (call @130%)" pct={risk.marginUsagePct} danger={90} />
        <div className="grid grid-cols-2 gap-2 text-[9.5px] text-slate-500 pt-1">
          <div>
            {activeSym}: <span className="text-slate-300">{fmt(symNop)}</span> / {fmt(symLimit)}
          </div>
          <div className="text-right">
            Agg: <span className="text-slate-300">{fmt(aggNop)}</span> / {fmt(risk.aggregateLimitUsd)}
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="bg-[#060b0e] border border-slate-900 rounded-xl p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
          <Cpu className="w-3.5 h-3.5 text-[#3ddc6c]" /> Live parameters
        </div>
        <ParamRow label="Routing strategy" value={params.routingStrategy} />
        <ParamRow label="A/B-book threshold" value={fmt(params.abBookThresholdUsd)} />
        <ParamRow label="Aggregated LPs" value={String(params.aggregatedLpCount)} />
        <ParamRow
          label="Markup (T1 / T2 / T3)"
          value={`${params.markupPips.tier1} / ${params.markupPips.tier2} / ${params.markupPips.tier3} pip`}
        />
        <ParamRow label={`Spread floor · ${activeSym}`} value={`${params.spreadFloorPips[activeSym] ?? "—"} pip`} />
      </div>
    </>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-semibold">{value}</span>
    </div>
  );
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}
