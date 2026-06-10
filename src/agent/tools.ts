/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Live Desk — tool declarations + local executors.
 *
 * The agent (Gemini, via the /api/agent proxy) emits functionCalls; we execute
 * them locally against the simulated world (simState) using real live mids, then
 * feed the structured result back to the model. All numbers are illustrative /
 * simulated and must be presented as such.
 */

import {
  COMMISSION_PER_MILLION_USD,
  SYMBOL_SPECS,
  aggregateNopUsd,
  lps,
  params,
  pipSize,
  risk,
  tickSize,
  type LpProfile,
  type RoutingStrategy,
} from "./simState";

/** Live quote lookup injected by the React layer (real GTS2 mids). */
export interface QuoteProvider {
  getMid: (sym: string) => number | null;
}

export interface ToolResult {
  ok: boolean;
  /** Structured payload returned to the model as the functionResponse. */
  data: Record<string, unknown>;
  /** True when the call mutated sim state (UI dashboard should refresh). */
  mutated?: boolean;
}

// --- Anthropic tool definitions (JSON Schema via input_schema) ---
export const TOOL_DEFINITIONS = [
  {
    name: "get_market_data",
    description:
      "Get the current live mid, derived bid/ask and intraday change for an instrument. Prices are real (guest feed); spreads are illustrative.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Instrument, e.g. 'EUR/USD', 'XAU/USD'." },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_lp_quotes",
    description:
      "Return each anonymised liquidity provider's simulated bid/ask/spread for a symbol, ranked by liquidity score. Use to compare LPs.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Instrument, e.g. 'EUR/USD'." },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_best_spread",
    description:
      "Aggregate top-of-book across active LPs: best bid, best ask, effective spread (pips) and the resulting client price after mark-up.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Instrument, e.g. 'EUR/USD'." },
        client_tier: {
          type: "string",
          description: "Client tier for the mark-up: 'tier1', 'tier2' or 'tier3'. Defaults to tier1.",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "set_parameter",
    description:
      "Adjust a Pricing/Routing/Risk parameter and return the before/after values plus the expected impact.",
    input_schema: {
      type: "object",
      properties: {
        param: {
          type: "string",
          description:
            "One of: 'markup_tier1','markup_tier2','markup_tier3' (pips), 'spread_floor' (pips, needs symbol), 'routing_strategy' ('best_price'|'lowest_latency'|'balanced'), 'ab_book_threshold_usd', 'aggregated_lp_count'.",
        },
        value: {
          type: "string",
          description: "New value. Numeric params accept a number as string; routing_strategy accepts the enum.",
        },
        symbol: { type: "string", description: "Required only when param is 'spread_floor'." },
      },
      required: ["param", "value"],
    },
  },
  {
    name: "get_routing_status",
    description: "Return the current routing strategy, A/B-book threshold and number of aggregated LPs.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "route_order",
    description:
      "Decide how an order would be routed WITHOUT executing it: A-book vs B-book, chosen LP and rationale based on the current routing strategy.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Instrument." },
        side: { type: "string", description: "'buy' or 'sell'." },
        size_usd: { type: "number", description: "Order notional in USD." },
      },
      required: ["symbol", "side", "size_usd"],
    },
  },
  {
    name: "get_risk_status",
    description:
      "Return NOP usage vs limit (per symbol or all symbols), aggregate NOP usage and margin usage vs margin-call/stop-out levels.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Optional. Omit to get all symbols + aggregate." },
      },
    },
  },
  {
    name: "suggest_hedge",
    description:
      "If a symbol's NOP is near its limit, suggest a hedge (size + LP) to bring it back within risk appetite.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Instrument to evaluate for hedging." },
      },
      required: ["symbol"],
    },
  },
  {
    name: "execute_order",
    description:
      "Simulate executing an order: pre-trade risk gate (NOP limit), routed LP, fill price with slippage, latency and commission. Rejected if it would breach a NOP limit. Mutates the risk book.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Instrument." },
        side: { type: "string", description: "'buy' or 'sell'." },
        size_usd: { type: "number", description: "Order notional in USD." },
      },
      required: ["symbol", "side", "size_usd"],
    },
  },
] as const;

// --- Helpers ---

function resolveMid(sym: string, quotes: QuoteProvider): { mid: number; live: boolean } {
  const live = quotes.getMid(sym);
  if (live && Number.isFinite(live) && live > 0) return { mid: live, live: true };
  const spec = SYMBOL_SPECS[sym];
  return { mid: spec ? spec.refMid : 0, live: false };
}

function round(sym: string, px: number): number {
  const spec = SYMBOL_SPECS[sym];
  const dp = spec ? spec.dp : 5;
  return parseFloat(px.toFixed(dp));
}

function specialtyFactor(lp: LpProfile, sym: string): number {
  const spec = SYMBOL_SPECS[sym];
  if (spec && lp.specialties.includes(spec.assetClass)) return 0.78; // tighter on specialty
  return 1.12;
}

export interface LpQuote {
  id: string;
  tier: number;
  bid: number;
  ask: number;
  spreadPips: number;
  latencyMs: number;
  fillRate: number;
  liquidityScore: number;
}

export function lpQuotesFor(sym: string, mid: number): LpQuote[] {
  const spec = SYMBOL_SPECS[sym];
  if (!spec || !mid) return [];
  const baseSpreadPrice = spec.baseSpreadTicks * tickSize(sym);
  const pip = pipSize(sym);
  return lps.map((lp) => {
    const spreadPrice = baseSpreadPrice * lp.spreadBias * specialtyFactor(lp, sym);
    const bid = round(sym, mid - spreadPrice / 2);
    const ask = round(sym, mid + spreadPrice / 2);
    const spreadPips = parseFloat(((ask - bid) / pip).toFixed(2));
    // Liquidity score: tighter spread + higher fill + lower latency + reliability.
    const liquidityScore = parseFloat(
      (
        (1 / Math.max(spreadPips, 0.01)) * 4 +
        lp.fillRate * 40 +
        (1 / Math.max(lp.latencyMs, 0.5)) * 6 +
        lp.reliability * 20
      ).toFixed(2),
    );
    return {
      id: lp.id,
      tier: lp.tier,
      bid,
      ask,
      spreadPips,
      latencyMs: lp.latencyMs,
      fillRate: lp.fillRate,
      liquidityScore,
    };
  });
}

/**
 * The subset of LPs the aggregator actually blends for top-of-book / routing,
 * honouring params.aggregatedLpCount (top-N by liquidity score). get_lp_quotes
 * still shows the full panel for comparison.
 */
function aggregatedQuotes(sym: string, mid: number): LpQuote[] {
  const ranked = lpQuotesFor(sym, mid).sort((a, b) => b.liquidityScore - a.liquidityScore);
  return ranked.slice(0, Math.max(1, Math.min(ranked.length, params.aggregatedLpCount)));
}

const ILLUSTRATIVE = "All figures simulated/illustrative for the booth demo.";

function num(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : NaN;
}

function fmtUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

// --- Executor ---

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  quotes: QuoteProvider,
): ToolResult {
  switch (name) {
    case "get_market_data": {
      const sym = String(args.symbol || "");
      const spec = SYMBOL_SPECS[sym];
      if (!spec) return notFound(sym);
      const { mid, live } = resolveMid(sym, quotes);
      const qs = aggregatedQuotes(sym, mid);
      const bestBid = Math.max(...qs.map((q) => q.bid));
      const bestAsk = Math.min(...qs.map((q) => q.ask));
      return {
        ok: true,
        data: {
          symbol: sym,
          mid: round(sym, mid),
          best_bid: bestBid,
          best_ask: bestAsk,
          aggregated_lp_count: params.aggregatedLpCount,
          price_source: live ? "live guest feed" : "indicative reference (feed unavailable)",
          asset_class: spec.assetClass,
          note: ILLUSTRATIVE,
        },
      };
    }

    case "get_lp_quotes": {
      const sym = String(args.symbol || "");
      if (!SYMBOL_SPECS[sym]) return notFound(sym);
      const { mid, live } = resolveMid(sym, quotes);
      const ranked = lpQuotesFor(sym, mid).sort((a, b) => b.liquidityScore - a.liquidityScore);
      return {
        ok: true,
        data: {
          symbol: sym,
          price_source: live ? "live" : "indicative",
          best_lp: ranked[0]?.id,
          lp_quotes: ranked.map((q) => ({
            lp: q.id,
            tier: q.tier,
            bid: q.bid,
            ask: q.ask,
            spread_pips: q.spreadPips,
            latency_ms: q.latencyMs,
            fill_rate: q.fillRate,
            liquidity_score: q.liquidityScore,
          })),
          note: ILLUSTRATIVE,
        },
      };
    }

    case "get_best_spread": {
      const sym = String(args.symbol || "");
      if (!SYMBOL_SPECS[sym]) return notFound(sym);
      const tier = (["tier1", "tier2", "tier3"].includes(String(args.client_tier))
        ? String(args.client_tier)
        : "tier1") as "tier1" | "tier2" | "tier3";
      const { mid, live } = resolveMid(sym, quotes);
      const qs = aggregatedQuotes(sym, mid);
      if (!qs.length) return notFound(sym);
      const bestBid = Math.max(...qs.map((q) => q.bid));
      const bestAsk = Math.min(...qs.map((q) => q.ask));
      const pip = pipSize(sym);
      let effSpreadPips = parseFloat(((bestAsk - bestBid) / pip).toFixed(2));
      const floor = params.spreadFloorPips[sym] ?? 0;
      const flooredApplied = effSpreadPips < floor;
      if (flooredApplied) effSpreadPips = floor;
      const markup = params.markupPips[tier];
      const halfClient = ((effSpreadPips + markup * 2) / 2) * pip;
      const clientBid = round(sym, mid - halfClient);
      const clientAsk = round(sym, mid + halfClient);
      const topLps = [...qs]
        .sort((a, b) => a.spreadPips - b.spreadPips)
        .slice(0, 3)
        .map((q) => q.id);
      return {
        ok: true,
        data: {
          symbol: sym,
          price_source: live ? "live" : "indicative",
          aggregated_best_bid: bestBid,
          aggregated_best_ask: bestAsk,
          raw_spread_pips: parseFloat(((bestAsk - bestBid) / pip).toFixed(2)),
          spread_floor_pips: floor,
          spread_floor_applied: flooredApplied,
          client_tier: tier,
          client_markup_pips: markup,
          client_bid: clientBid,
          client_ask: clientAsk,
          client_spread_pips: effSpreadPips + markup * 2,
          tightest_lps: topLps,
          aggregated_lp_count: params.aggregatedLpCount,
          note: ILLUSTRATIVE,
        },
      };
    }

    case "set_parameter": {
      const param = String(args.param || "");
      const rawValue = args.value;
      switch (param) {
        case "markup_tier1":
        case "markup_tier2":
        case "markup_tier3": {
          const tierKey = ("tier" + param.slice(-1)) as "tier1" | "tier2" | "tier3";
          const v = num(rawValue);
          if (Number.isNaN(v) || v < 0) return badValue(param, rawValue);
          const before = params.markupPips[tierKey];
          params.markupPips[tierKey] = parseFloat(v.toFixed(3));
          return {
            ok: true,
            mutated: true,
            data: {
              module: "Pricing",
              param,
              before_pips: before,
              after_pips: params.markupPips[tierKey],
              impact: `Client ${tierKey} pricing ${v > before ? "widened" : "tightened"} by ${Math.abs(v - before).toFixed(2)} pips on every quote.`,
              note: ILLUSTRATIVE,
            },
          };
        }
        case "spread_floor": {
          const sym = String(args.symbol || "");
          if (!SYMBOL_SPECS[sym]) return notFound(sym);
          const v = num(rawValue);
          if (Number.isNaN(v) || v < 0) return badValue(param, rawValue);
          const before = params.spreadFloorPips[sym] ?? 0;
          params.spreadFloorPips[sym] = parseFloat(v.toFixed(2));
          return {
            ok: true,
            mutated: true,
            data: {
              module: "Pricing",
              param,
              symbol: sym,
              before_pips: before,
              after_pips: params.spreadFloorPips[sym],
              impact: `Minimum quoted spread on ${sym} is now ${v} pips.`,
              note: ILLUSTRATIVE,
            },
          };
        }
        case "routing_strategy": {
          const v = String(rawValue) as RoutingStrategy;
          if (!["best_price", "lowest_latency", "balanced"].includes(v)) return badValue(param, rawValue);
          const before = params.routingStrategy;
          params.routingStrategy = v;
          return {
            ok: true,
            mutated: true,
            data: { module: "Routing", param, before, after: v, note: ILLUSTRATIVE },
          };
        }
        case "ab_book_threshold_usd": {
          const v = num(rawValue);
          if (Number.isNaN(v) || v < 0) return badValue(param, rawValue);
          const before = params.abBookThresholdUsd;
          params.abBookThresholdUsd = Math.round(v);
          return {
            ok: true,
            mutated: true,
            data: {
              module: "Routing",
              param,
              before_usd: before,
              after_usd: params.abBookThresholdUsd,
              impact: `Orders ≥ ${fmtUsd(params.abBookThresholdUsd)} are A-booked (hedged); smaller orders are B-book eligible.`,
              note: ILLUSTRATIVE,
            },
          };
        }
        case "aggregated_lp_count": {
          const v = num(rawValue);
          if (Number.isNaN(v) || v < 1 || v > 12) return badValue(param, rawValue);
          const before = params.aggregatedLpCount;
          params.aggregatedLpCount = Math.round(v);
          return {
            ok: true,
            mutated: true,
            data: { module: "Liquidity", param, before, after: params.aggregatedLpCount, note: ILLUSTRATIVE },
          };
        }
        default:
          return badValue("param", param);
      }
    }

    case "get_routing_status": {
      return {
        ok: true,
        data: {
          routing_strategy: params.routingStrategy,
          ab_book_threshold_usd: params.abBookThresholdUsd,
          ab_book_threshold: fmtUsd(params.abBookThresholdUsd),
          aggregated_lp_count: params.aggregatedLpCount,
          note: ILLUSTRATIVE,
        },
      };
    }

    case "route_order": {
      const sym = String(args.symbol || "");
      if (!SYMBOL_SPECS[sym]) return notFound(sym);
      const side = String(args.side || "buy").toLowerCase();
      const sizeUsd = num(args.size_usd);
      if (Number.isNaN(sizeUsd) || sizeUsd <= 0) return badValue("size_usd", args.size_usd);
      const { mid } = resolveMid(sym, quotes);
      const decision = decideRoute(sym, side, sizeUsd, mid);
      return { ok: true, data: { ...decision, executed: false, note: ILLUSTRATIVE } };
    }

    case "get_risk_status": {
      const sym = args.symbol ? String(args.symbol) : "";
      if (sym) {
        if (!(sym in risk.limits) && !SYMBOL_SPECS[sym]) return notFound(sym);
        const limit = risk.limits[sym] ?? 50_000_000;
        const used = risk.nop[sym] ?? 0;
        return {
          ok: true,
          data: { symbol: sym, ...nopRow(sym, used, limit), note: ILLUSTRATIVE },
        };
      }
      const rows = Object.keys(SYMBOL_SPECS).map((s) => {
        const limit = risk.limits[s] ?? 50_000_000;
        return { symbol: s, ...nopRow(s, risk.nop[s] ?? 0, limit) };
      });
      const agg = aggregateNopUsd();
      return {
        ok: true,
        data: {
          per_symbol: rows,
          aggregate_nop_usd: agg,
          aggregate_nop: fmtUsd(agg),
          aggregate_limit_usd: risk.aggregateLimitUsd,
          aggregate_limit: fmtUsd(risk.aggregateLimitUsd),
          aggregate_usage_pct: parseFloat(((agg / risk.aggregateLimitUsd) * 100).toFixed(1)),
          margin_usage_pct: risk.marginUsagePct,
          margin_call_level_pct: risk.marginCallLevel,
          stop_out_level_pct: risk.stopOutLevel,
          note: ILLUSTRATIVE,
        },
      };
    }

    case "suggest_hedge": {
      const sym = String(args.symbol || "");
      if (!SYMBOL_SPECS[sym]) return notFound(sym);
      const limit = risk.limits[sym] ?? 50_000_000;
      const used = risk.nop[sym] ?? 0;
      const usagePct = (Math.abs(used) / limit) * 100;
      const { mid } = resolveMid(sym, quotes);
      // Target bringing usage back to ~50% of the limit.
      const target = limit * 0.5;
      const reduceUsd = Math.max(0, Math.abs(used) - target);
      const hedgeSide = used > 0 ? "sell" : "buy";
      // Pick the best LP from the aggregated set (specialty + liquidity).
      const ranked = aggregatedQuotes(sym, mid);
      return {
        ok: true,
        data: {
          symbol: sym,
          current_nop: fmtUsd(used),
          limit: fmtUsd(limit),
          usage_pct: parseFloat(usagePct.toFixed(1)),
          hedge_needed: reduceUsd > 0,
          recommended_action:
            reduceUsd > 0
              ? `${hedgeSide.toUpperCase()} ${fmtUsd(reduceUsd)} of ${sym} via ${ranked[0]?.id} to bring NOP usage to ~50%.`
              : `Within appetite (${usagePct.toFixed(0)}% of limit). No hedge required.`,
          hedge_side: reduceUsd > 0 ? hedgeSide : null,
          hedge_size_usd: reduceUsd > 0 ? Math.round(reduceUsd) : 0,
          suggested_lp: reduceUsd > 0 ? ranked[0]?.id : null,
          note: ILLUSTRATIVE,
        },
      };
    }

    case "execute_order": {
      const sym = String(args.symbol || "");
      if (!SYMBOL_SPECS[sym]) return notFound(sym);
      const side = String(args.side || "buy").toLowerCase();
      const sizeUsd = num(args.size_usd);
      if (Number.isNaN(sizeUsd) || sizeUsd <= 0) return badValue("size_usd", args.size_usd);
      const limit = risk.limits[sym] ?? 50_000_000;
      const signed = side === "sell" ? -sizeUsd : sizeUsd;
      const projected = (risk.nop[sym] ?? 0) + signed;
      const projAgg = aggregateNopUsd() - Math.abs(risk.nop[sym] ?? 0) + Math.abs(projected);

      // Pre-trade risk gate.
      if (Math.abs(projected) > limit) {
        return {
          ok: true,
          data: {
            executed: false,
            rejected: true,
            reason: `Pre-trade risk gate: would push ${sym} NOP to ${fmtUsd(projected)}, above the ${fmtUsd(limit)} limit.`,
            symbol: sym,
            side,
            size_usd: sizeUsd,
            note: ILLUSTRATIVE,
          },
        };
      }
      if (projAgg > risk.aggregateLimitUsd) {
        return {
          ok: true,
          data: {
            executed: false,
            rejected: true,
            reason: `Pre-trade risk gate: would push aggregate NOP to ${fmtUsd(projAgg)}, above the ${fmtUsd(risk.aggregateLimitUsd)} aggregate limit.`,
            symbol: sym,
            side,
            size_usd: sizeUsd,
            note: ILLUSTRATIVE,
          },
        };
      }

      const { mid } = resolveMid(sym, quotes);
      const route = decideRoute(sym, side, sizeUsd, mid);
      const qs = aggregatedQuotes(sym, mid);
      const chosen = qs.find((q) => q.id === route.routed_lp) || qs[0];
      const pip = pipSize(sym);
      // Slippage scales mildly with size; specialty LPs slip less.
      const sizeFactor = Math.min(sizeUsd / 5_000_000, 3);
      const slippagePips = parseFloat((sizeFactor * (chosen ? (1 - chosen.fillRate) * 6 : 0.3)).toFixed(2));
      const fillPrice =
        side === "buy"
          ? round(sym, (chosen ? chosen.ask : mid) + slippagePips * pip)
          : round(sym, (chosen ? chosen.bid : mid) - slippagePips * pip);
      const commission = parseFloat(((sizeUsd / 1_000_000) * COMMISSION_PER_MILLION_USD).toFixed(2));

      // Mutate the risk book.
      risk.nop[sym] = projected;
      risk.marginUsagePct = Math.min(
        129,
        parseFloat((risk.marginUsagePct + sizeFactor * 1.5).toFixed(1)),
      );

      return {
        ok: true,
        mutated: true,
        data: {
          executed: true,
          rejected: false,
          symbol: sym,
          side,
          size_usd: sizeUsd,
          book: route.book,
          routed_lp: route.routed_lp,
          fill_price: fillPrice,
          slippage_pips: slippagePips,
          fill_rate: chosen ? chosen.fillRate : null,
          latency_ms: chosen ? chosen.latencyMs : null,
          commission_usd: commission,
          new_symbol_nop: fmtUsd(projected),
          new_symbol_nop_usd: projected,
          symbol_limit_usd: limit,
          note: ILLUSTRATIVE,
        },
      };
    }

    default:
      return { ok: false, data: { error: `Unknown tool: ${name}` } };
  }
}

function decideRoute(sym: string, side: string, sizeUsd: number, mid: number) {
  const qs = aggregatedQuotes(sym, mid);
  const book = sizeUsd >= params.abBookThresholdUsd ? "A-book (hedged to LP)" : "B-book eligible";
  let pool = [...qs];
  if (params.routingStrategy === "best_price") {
    pool.sort((a, b) => (side === "buy" ? a.ask - b.ask : b.bid - a.bid));
  } else if (params.routingStrategy === "lowest_latency") {
    pool.sort((a, b) => a.latencyMs - b.latencyMs);
  } else {
    pool.sort((a, b) => b.liquidityScore - a.liquidityScore);
  }
  const chosen = pool[0];
  return {
    symbol: sym,
    side,
    size_usd: sizeUsd,
    book,
    routing_strategy: params.routingStrategy,
    routed_lp: chosen ? chosen.id : null,
    rationale: chosen
      ? `Strategy '${params.routingStrategy}' selected ${chosen.id} (spread ${chosen.spreadPips} pips, ${chosen.latencyMs}ms, fill ${(chosen.fillRate * 100).toFixed(1)}%).`
      : "No active LP available.",
  };
}

function nopRow(sym: string, used: number, limit: number) {
  const usagePct = parseFloat(((Math.abs(used) / limit) * 100).toFixed(1));
  return {
    nop_usd: used,
    nop: fmtUsd(used),
    direction: used > 0 ? "long" : used < 0 ? "short" : "flat",
    limit_usd: limit,
    limit: fmtUsd(limit),
    usage_pct: usagePct,
    status: usagePct >= 90 ? "near limit" : usagePct >= 70 ? "elevated" : "ok",
  };
}

function notFound(sym: string): ToolResult {
  return {
    ok: false,
    data: {
      error: `Unknown or non-streamed instrument: '${sym}'. Available: ${Object.keys(SYMBOL_SPECS).join(", ")}.`,
    },
  };
}

function badValue(param: string, value: unknown): ToolResult {
  return { ok: false, data: { error: `Invalid value for '${param}': ${JSON.stringify(value)}.` } };
}
