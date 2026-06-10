/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Live Desk — simulated world state.
 *
 * Everything here is an ILLUSTRATIVE / SIMULATED overlay used by the booth demo.
 * Live mid prices come from the real GTS2 guest feed; this module derives a
 * deterministic (seeded) set of anonymised LPs, pricing parameters and a risk
 * book on top of those prices. Risk limits are aligned with the published
 * xSyphon trading conditions (see .cursor/reference/xsyphon.md).
 */

// --- Deterministic RNG (mulberry32) so the demo is reproducible across reloads ---
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type AssetClass = "FX majors" | "EM FX" | "Metals" | "Crypto";

export interface SymbolSpec {
  sym: string;
  dp: number;
  /** Base aggregated spread expressed in ticks (1 tick = 10^-dp). Illustrative. */
  baseSpreadTicks: number;
  assetClass: AssetClass;
  /** Indicative mid used only when the live feed has not provided a price yet. */
  refMid: number;
}

// Tick = 10^-dp. baseSpreadTicks chosen so EUR/USD floor ≈ 0.2 pip, scaling out
// to wider EM / metals / crypto books. All illustrative.
export const SYMBOL_SPECS: Record<string, SymbolSpec> = {
  "EUR/USD": { sym: "EUR/USD", dp: 5, baseSpreadTicks: 2, assetClass: "FX majors", refMid: 1.08 },
  "GBP/USD": { sym: "GBP/USD", dp: 5, baseSpreadTicks: 4, assetClass: "FX majors", refMid: 1.27 },
  "USD/JPY": { sym: "USD/JPY", dp: 3, baseSpreadTicks: 4, assetClass: "FX majors", refMid: 156.0 },
  "AUD/USD": { sym: "AUD/USD", dp: 5, baseSpreadTicks: 3, assetClass: "FX majors", refMid: 0.66 },
  "USD/CNH": { sym: "USD/CNH", dp: 5, baseSpreadTicks: 20, assetClass: "EM FX", refMid: 7.25 },
  "XAU/USD": { sym: "XAU/USD", dp: 2, baseSpreadTicks: 25, assetClass: "Metals", refMid: 2350.0 },
  "XAG/USD": { sym: "XAG/USD", dp: 3, baseSpreadTicks: 20, assetClass: "Metals", refMid: 30.0 },
  "BTC/USD": { sym: "BTC/USD", dp: 2, baseSpreadTicks: 600, assetClass: "Crypto", refMid: 68000.0 },
  "ETH/USD": { sym: "ETH/USD", dp: 1, baseSpreadTicks: 15, assetClass: "Crypto", refMid: 3500.0 },
};

export interface LpProfile {
  id: string; // LP-01 .. LP-12
  tier: 1 | 2;
  specialties: AssetClass[];
  /** Multiplier on the base spread for this LP (lower = tighter). */
  spreadBias: number;
  /** Probability a marketable order is fully filled. */
  fillRate: number;
  /** Quote/ack latency in ms. */
  latencyMs: number;
  /** Quote reliability score 0..1 used by liquidity scoring. */
  reliability: number;
}

const ASSET_CLASSES: AssetClass[] = ["FX majors", "EM FX", "Metals", "Crypto"];

function buildLps(seed: number): LpProfile[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: 12 }, (_, i) => {
    const tier: 1 | 2 = i < 9 ? 1 : 2; // first 9 tier-1, last 3 tier-2
    // Each LP specialises in 1-2 asset classes (tighter on those).
    const primary = ASSET_CLASSES[Math.floor(rnd() * ASSET_CLASSES.length)];
    const specialties: AssetClass[] = [primary];
    if (rnd() > 0.55) {
      const secondary = ASSET_CLASSES[Math.floor(rnd() * ASSET_CLASSES.length)];
      if (secondary !== primary) specialties.push(secondary);
    }
    const spreadBias = parseFloat((0.85 + rnd() * 0.55).toFixed(3)); // 0.85 .. 1.40
    const fillRate = parseFloat((0.965 + rnd() * 0.033).toFixed(4)); // 0.965 .. 0.998
    const latencyMs = parseFloat((2 + rnd() * 9).toFixed(1)); // 2 .. 11 ms
    const reliability = parseFloat((0.9 + rnd() * 0.099).toFixed(3));
    return {
      id: "LP-" + String(i + 1).padStart(2, "0"),
      tier,
      specialties,
      spreadBias,
      fillRate,
      latencyMs,
      reliability,
    };
  });
}

export type RoutingStrategy = "best_price" | "lowest_latency" | "balanced";

export interface ParamState {
  /** Client mark-up added on top of the aggregated price, in pips, per client tier. */
  markupPips: { tier1: number; tier2: number; tier3: number };
  /** Per-symbol spread floor in pips (the desk will not quote tighter than this). */
  spreadFloorPips: Record<string, number>;
  routingStrategy: RoutingStrategy;
  /** Orders at/above this notional are A-booked (hedged to LPs); below are eligible for B-book. */
  abBookThresholdUsd: number;
  /** How many LPs the aggregator blends for top-of-book. */
  aggregatedLpCount: number;
}

export interface RiskState {
  /** Current net open position per symbol in USD (signed: + long / - short). */
  nop: Record<string, number>;
  /** Per-symbol NOP limit in USD (aligned with published trading conditions). */
  limits: Record<string, number>;
  aggregateLimitUsd: number;
  /** Current aggregate margin usage as a % of the margin requirement. */
  marginUsagePct: number;
  marginCallLevel: number; // 130
  stopOutLevel: number; // 50
}

// Per-symbol NOP limits (USD). Values aligned with xsyphon.md trading conditions.
// Symbols without a published per-symbol cap use an illustrative demo default.
const NOP_LIMITS: Record<string, number> = {
  "XAU/USD": 80_000_000,
  "XAG/USD": 30_000_000,
  "USD/CNH": 10_000_000,
  "USD/HKD": 10_000_000,
  "XAU/CNH": 10_000_000, // XAUGCNH cap
  "EUR/USD": 60_000_000,
  "GBP/USD": 50_000_000,
  "USD/JPY": 50_000_000,
  "AUD/USD": 40_000_000,
  "BTC/USD": 15_000_000,
  "ETH/USD": 15_000_000,
};

const AGGREGATE_LIMIT_USD = 150_000_000;
export const MARGIN_CALL_LEVEL = 130;
export const STOP_OUT_LEVEL = 50;
export const COMMISSION_PER_MILLION_USD = 8;

function buildParams(): ParamState {
  const floors: Record<string, number> = {};
  // Default spread floors (pips) per asset class, illustrative.
  Object.values(SYMBOL_SPECS).forEach((s) => {
    if (s.assetClass === "FX majors") floors[s.sym] = 0.2;
    else if (s.assetClass === "EM FX") floors[s.sym] = 1.5;
    else if (s.assetClass === "Metals") floors[s.sym] = 12;
    else floors[s.sym] = 25;
  });
  return {
    markupPips: { tier1: 0.3, tier2: 0.5, tier3: 0.8 },
    spreadFloorPips: floors,
    routingStrategy: "balanced",
    abBookThresholdUsd: 2_000_000,
    aggregatedLpCount: 12,
  };
}

function buildRisk(seed: number): RiskState {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const nop: Record<string, number> = {};
  Object.keys(SYMBOL_SPECS).forEach((sym) => {
    const limit = NOP_LIMITS[sym] ?? 50_000_000;
    // Seed an illustrative usage between -55% and +55% of the limit...
    let usage = (rnd() * 1.1 - 0.55) * limit;
    // ...but push XAU/USD close to its cap so the hedge demo is meaningful.
    if (sym === "XAU/USD") usage = limit * 0.72;
    nop[sym] = Math.round(usage / 100_000) * 100_000;
  });
  return {
    nop,
    limits: { ...NOP_LIMITS },
    aggregateLimitUsd: AGGREGATE_LIMIT_USD,
    marginUsagePct: 41 + Math.round(rnd() * 18), // 41..59 %
    marginCallLevel: MARGIN_CALL_LEVEL,
    stopOutLevel: STOP_OUT_LEVEL,
  };
}

// --- Mutable singleton sim state ---
const DEMO_SEED = 1337;

export const lps: LpProfile[] = buildLps(DEMO_SEED);
export const params: ParamState = buildParams();
export const risk: RiskState = buildRisk(DEMO_SEED);

export interface SimSnapshot {
  params: ParamState;
  risk: RiskState;
  lps: LpProfile[];
}

export function getSnapshot(): SimSnapshot {
  return {
    params: JSON.parse(JSON.stringify(params)),
    risk: JSON.parse(JSON.stringify(risk)),
    lps: JSON.parse(JSON.stringify(lps)),
  };
}

export function resetSim(): void {
  const fresh = buildRisk(DEMO_SEED);
  risk.nop = fresh.nop;
  risk.marginUsagePct = fresh.marginUsagePct;
  const p = buildParams();
  params.markupPips = p.markupPips;
  params.spreadFloorPips = p.spreadFloorPips;
  params.routingStrategy = p.routingStrategy;
  params.abBookThresholdUsd = p.abBookThresholdUsd;
  params.aggregatedLpCount = p.aggregatedLpCount;
}

export function aggregateNopUsd(): number {
  return Object.values(risk.nop).reduce((acc, v) => acc + Math.abs(v), 0);
}

export function tickSize(sym: string): number {
  const spec = SYMBOL_SPECS[sym];
  return spec ? Math.pow(10, -spec.dp) : 0.00001;
}

export function pipSize(sym: string): number {
  // For 3/5 dp FX a pip is 10 ticks; for metals/crypto we treat 1 pip = 1 tick
  // of the quoted price (illustrative convention used across the demo).
  const spec = SYMBOL_SPECS[sym];
  if (!spec) return 0.0001;
  if (spec.assetClass === "FX majors" || spec.assetClass === "EM FX") {
    return tickSize(sym) * 10;
  }
  return tickSize(sym);
}
