/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useLiveQuotes } from "./useLiveQuotes";
import { useKlines } from "./useKlines";
import AetherDemo from "./components/AetherDemo";
import { 
  Activity, 
  Settings, 
  Send, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  Cpu, 
  TrendingUp, 
  RefreshCw, 
  Circle,
  HelpCircle,
  Clock,
  Info,
  X,
  Zap,
  Sparkles,
  Terminal,
  ArrowRight,
  Lock,
  Volume2
} from "lucide-react";

// Types
interface LP {
  name: string;
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  stage: number; // 0 = LP to Core, 1 = Core to Client
  t: number;     // lerp parameter [0, 1]
  sp: number;    // speed
  srcLP: string;
  c: string;     // color string
}

interface AppConfig {
  formEndpoint: string;
  calendlyUrl: string;
  fallbackEmail: string;
}

const DEFAULT_CONFIG: AppConfig = {
  formEndpoint: "https://formspree.io/f/mzdqakab",
  calendlyUrl: "",
  fallbackEmail: "sky.yu@xsyphon.com",
};


export default function App() {
  // --- Kiosk Config State ---
  // Merge any saved config over the defaults so a stale/blank Formspree
  // endpoint from an old localStorage entry never disables auto-submit.
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem("XSYPHON_CONFIG");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<AppConfig>;
        return {
          formEndpoint:
            (parsed.formEndpoint || "").trim() || DEFAULT_CONFIG.formEndpoint,
          calendlyUrl: parsed.calendlyUrl ?? DEFAULT_CONFIG.calendlyUrl,
          fallbackEmail:
            (parsed.fallbackEmail || "").trim() || DEFAULT_CONFIG.fallbackEmail,
        };
      } catch (e) {
        // fall through to defaults
      }
    }
    return { ...DEFAULT_CONFIG };
  });

  const [showConfig, setShowConfig] = useState(false);
  const [showAether, setShowAether] = useState(false);
  const [tempEndpoint, setTempEndpoint] = useState(config.formEndpoint);
  const [tempCalendly, setTempCalendly] = useState(config.calendlyUrl);
  const [tempEmail, setTempEmail] = useState(config.fallbackEmail);

  // --- Reduced Motion Preferences ---
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // --- Decoding Typography Intro Animated Hook ---
  const targetTitleText = "BUILT ON DEPTH. DEFINED BY PRECISION.";
  const [decodedTitle, setDecodedTitle] = useState("");
  const [isDecoding, setIsDecoding] = useState(true);

  // Trigger self-decoding animation
  useEffect(() => {
    if (reducedMotion) {
      setDecodedTitle(targetTitleText);
      setIsDecoding(false);
      return;
    }

    let iterations = 0;
    const interval = setInterval(() => {
      setDecodedTitle(prev => {
        return targetTitleText
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (char === "." || char === ",") return char;
            if (index < iterations) {
              return targetTitleText[index];
            }
            // random hacker character
            const chars = "0123456789X$/[]_%@#+*";
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");
      });

      if (iterations >= targetTitleText.length) {
        clearInterval(interval);
        setIsDecoding(false);
      }
      iterations += 1;
    }, 45);

    return () => clearInterval(interval);
  }, [reducedMotion]);

  // --- Instruments: live GTS2 quote feed (replaces the old random-walk sim) ---
  const { instruments, status: quoteStatus } = useLiveQuotes();

  const [selectedSym, setSelectedSym] = useState("EUR/USD");
  // Real historical OHLC candles for the selected symbol (5-minute bars).
  const klines = useKlines(selectedSym, { num: 160, periodNum: 5, periodType: 1 });

  // --- Cumulative Stats (illustrative; aligned with published figures) ---
  const [statsVolume, setStatsVolume] = useState(1.02); // $1B+ daily notional
  const [statsLatency, setStatsLatency] = useState(0.82); // 0.8ms routing core

  // --- Active LP (Liquidity Provider) Configuration ---
  // Anonymised tier-1 sources (no third-party / bank trademarks shown).
  const [lps, setLps] = useState<LP[]>(
    Array.from({ length: 12 }, (_, i) => ({ name: "LP-" + String(i + 1).padStart(2, "0"), active: true }))
  );

  // --- Control Coefficients ---
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [spawnIntensity, setSpawnIntensity] = useState(1.0);

  // --- System Logs Output ---
  const [kioskLogs, setKioskLogs] = useState<string[]>([
    `[${new Date().toISOString().substring(11, 19)}] Syphon OS core online · routing across 12 tier-1 liquidity sources.`,
    `[${new Date().toISOString().substring(11, 19)}] Aggregation engine loaded for iFX EXPO Cyprus 2026 · Booth 76.`,
    `[${new Date().toISOString().substring(11, 19)}] Zero last look · best bid/offer selected on every tick.`
  ]);

  const addLog = (msg: string) => {
    const timeStr = new Date().toISOString().substring(11, 19);
    setKioskLogs(prev => [`[${timeStr}] ${msg}`, ...prev.slice(0, 40)]);
  };

  // --- Pricing / Execution Rotor words in premium display banner ---
  const ROTOR_WORDS = ["Pricing", "Execution", "Liquidity", "Risk", "Aggregation", "Volume Optimization"];
  const [rotorIndex, setRotorIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setRotorIndex(prev => (prev + 1) % ROTOR_WORDS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  // --- Engine stats (illustrative): daily volume + core routing latency ---
  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setStatsVolume(v => {
        const next = v + (Math.random() - 0.3) * 0.004;
        return next < 1.0 ? 1.0 + Math.random() * 0.02 : next;
      });
      setStatsLatency(() => {
        const activeCount = lps.filter(x => x.active).length;
        if (activeCount === 0) return 45.1; // no feeds connected
        const baseLat = 0.8 + (12 - activeCount) * 0.25;
        const delta = (Math.random() - 0.5) * 0.08;
        return parseFloat(Math.max(0.6, baseLat + delta).toFixed(2));
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [reducedMotion, lps]);

  // --- Interactivity: Test Our Engine ---
  const [isTestingEngine, setIsTestingEngine] = useState(false);
  const [testStage, setTestStage] = useState(0); // 0 idle, 1 pinging, 2 calculating, 3 compiled
  const [testResult, setTestResult] = useState<{
    latency: number;
    slippage: number;
    fillRate: number;
    status: string;
    route: string;
  } | null>(null);

  const triggerSpeedTest = () => {
    if (isTestingEngine) return;
    setIsTestingEngine(true);
    setTestStage(1);
    addLog("Routing test: pinging 12 tier-1 liquidity sources...");
    
    setTimeout(() => {
      setTestStage(2);
      addLog("Aggregating depth-of-book · selecting best bid/offer · filtering last look...");
    }, 1000);

    setTimeout(() => {
      // Result scales with connected feeds (illustrative; 0.8ms routing core)
      const activeLPs = lps.filter(x => x.active).length;
      let calculatedLatency = 0.8 + (12 - activeLPs) * 0.25 + (Math.random() * 0.2);
      if (activeLPs === 0) calculatedLatency = 45.2;

      const randomSlippage = activeLPs >= 8 ? 0.0 : parseFloat((Math.random() * 0.15).toFixed(2));
      const calculatedFill = activeLPs >= 9 ? 99.7 : parseFloat((95.0 + Math.random() * 4.5).toFixed(1));

      setTestResult({
        latency: parseFloat(calculatedLatency.toFixed(2)),
        slippage: randomSlippage,
        fillRate: calculatedFill,
        status: activeLPs >= 6 ? "OPTIMAL" : activeLPs > 0 ? "DEGRADED" : "NO FEEDS",
        route: activeLPs > 0 ? "Smart order router · best of " + activeLPs : "—"
      });
      setTestStage(3);
      addLog(`Result: ${calculatedLatency.toFixed(2)}ms routing core · slippage ${randomSlippage} · fill ${calculatedFill}%.`);
    }, 2200);
  };

  const resetSpeedTest = () => {
    setIsTestingEngine(false);
    setTestStage(0);
    setTestResult(null);
  };

  // --- Dynamic Particle Simulation Pipeline ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Local storage properties mapping references for performance
  const lpsRef = useRef<LP[]>(lps);
  const simSpeedRef = useRef<number>(simSpeed);
  const spawnIntensityRef = useRef<number>(spawnIntensity);
  const activeCountRef = useRef<number>(12);
  // Marks the cached static layer (grids/rails/nodes/labels) as needing a redraw.
  const staticDirtyRef = useRef<boolean>(true);

  useEffect(() => {
    lpsRef.current = lps;
    activeCountRef.current = lps.filter(x => x.active).length;
    staticDirtyRef.current = true;
  }, [lps]);

  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);

  useEffect(() => {
    spawnIntensityRef.current = spawnIntensity;
  }, [spawnIntensity]);

  // Particle generator trigger effect
  useEffect(() => {
    if (reducedMotion) return;
    
    const interval = setInterval(() => {
      const activeBanksList = lpsRef.current.filter(x => x.active);
      if (activeBanksList.length === 0) return;

      const chosenLP = activeBanksList[Math.floor(Math.random() * activeBanksList.length)];
      const lpIndex = lpsRef.current.findIndex(lp => lp.name === chosenLP.name);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const coreX = W * 0.58;
      const coreY = H * 0.5;

      const startX = W * 0.08;
      const t = lpsRef.current.length === 1 ? 0.5 : lpIndex / (lpsRef.current.length - 1);
      const startY = H * 0.12 + t * H * 0.76;

      // Create glowing fluorescent green particle or special gold color for gold assets
      const isGoldAsset = selectedSym.includes("XAU");
      const col = isGoldAsset ? "rgba(212,175,55," : "rgba(61,220,108,";

      particlesRef.current.push({
        x: startX,
        y: startY,
        tx: coreX,
        ty: coreY,
        stage: 0,
        t: 0,
        sp: (0.01 + Math.random() * 0.01) * simSpeedRef.current,
        srcLP: chosenLP.name,
        c: col
      });

    }, Math.max(40, 140 / spawnIntensity));

    return () => clearInterval(interval);
  }, [reducedMotion, spawnIntensity, selectedSym]);

  // Core Canvas renderer loop.
  // Perf: the static scene (grids, LP rails, nodes, labels, base line, client node)
  // is rendered once onto an offscreen canvas and only redrawn on resize / LP toggle /
  // symbol change. Each animation frame just blits that bitmap and draws the moving
  // particles + the pulsing core glow — keeping per-frame work tiny.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bg = document.createElement("canvas");
    const bgCtx = bg.getContext("2d");
    if (!bgCtx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = canvas.clientWidth;
    let H = canvas.clientHeight;
    let coreX = W * 0.58;
    let coreY = H * 0.5;
    let clientX = W * 0.91;
    let clientY = H * 0.5;
    let corePulse = 0;

    const isGoldSelected = selectedSym.includes("XAU");

    const resize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bg.width = W * dpr;
      bg.height = H * dpr;
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      coreX = W * 0.58;
      coreY = H * 0.5;
      clientX = W * 0.91;
      clientY = H * 0.5;
      staticDirtyRef.current = true;
    };

    // Draw the static scene (only when something structural changes).
    const drawStatic = () => {
      const c = bgCtx;
      c.clearRect(0, 0, W, H);
      const activeBanks = lpsRef.current;

      // Dot-matrix background
      c.fillStyle = isGoldSelected ? "rgba(212, 175, 55, 0.02)" : "rgba(61, 220, 108, 0.02)";
      const dotSpacing = 16;
      for (let x = dotSpacing; x < W; x += dotSpacing) {
        for (let y = dotSpacing; y < H; y += dotSpacing) {
          if ((x + y) % (dotSpacing * 4) === 0) c.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }

      // Coordinate guide grid
      c.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.012)" : "rgba(61, 220, 108, 0.012)";
      c.lineWidth = 0.5;
      c.beginPath();
      for (let x = 32; x < W; x += 64) { c.moveTo(x, 0); c.lineTo(x, H); }
      for (let y = 32; y < H; y += 64) { c.moveTo(0, y); c.lineTo(W, y); }
      c.stroke();

      // LP rails
      activeBanks.forEach((lp, i) => {
        const t = activeBanks.length === 1 ? 0.5 : i / (activeBanks.length - 1);
        const yCoord = H * 0.12 + t * H * 0.76;
        const xCoord = W * 0.08;
        c.lineWidth = 0.8;
        c.strokeStyle = lp.active
          ? (isGoldSelected ? "rgba(212, 175, 55, 0.035)" : "rgba(61, 220, 108, 0.035)")
          : "rgba(244, 63, 94, 0.01)";
        c.beginPath();
        c.moveTo(xCoord, yCoord);
        c.lineTo(coreX, coreY);
        c.stroke();
      });

      // Base core -> client pipeline line
      const activeCount = activeBanks.filter(x => x.active).length;
      if (activeCount > 0) {
        c.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.08)" : "rgba(61, 220, 108, 0.08)";
        c.lineWidth = 1.0;
      } else {
        c.strokeStyle = "rgba(244, 63, 94, 0.05)";
        c.lineWidth = 0.8;
      }
      c.beginPath();
      c.moveTo(coreX, coreY);
      c.lineTo(clientX, clientY);
      c.stroke();

      // LP nodes + labels
      activeBanks.forEach((lp, i) => {
        const t = activeBanks.length === 1 ? 0.5 : i / (activeBanks.length - 1);
        const yCoord = H * 0.12 + t * H * 0.76;
        const xCoord = W * 0.08;
        c.fillStyle = "#04070a";
        if (lp.active) {
          c.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.8)" : "rgba(61, 220, 108, 0.85)";
          c.lineWidth = 1.35;
          c.beginPath();
          c.arc(xCoord, yCoord, 4, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          c.fillStyle = "rgba(180, 205, 190, 0.85)";
          c.font = "bold 9px ui-monospace, SFMono-Regular, Consolas, monospace";
          c.textAlign = "right";
          c.textBaseline = "alphabetic";
          c.fillText(lp.name, xCoord - 10, yCoord + 3.2);
        } else {
          c.strokeStyle = "rgba(244, 63, 94, 0.3)";
          c.lineWidth = 1;
          c.beginPath();
          c.arc(xCoord, yCoord, 3, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          c.fillStyle = "rgba(244, 63, 94, 0.35)";
          c.font = "8px ui-monospace, SFMono-Regular, Consolas, monospace";
          c.textBaseline = "middle";
          c.textAlign = "right";
          c.fillText(lp.name, xCoord - 8, yCoord);
        }
      });

      // Client "YOU" node (static)
      c.fillStyle = "#020406";
      if (activeCount > 0) {
        c.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.85)" : "rgba(61, 220, 108, 0.9)";
        c.lineWidth = 1.8;
      } else {
        c.strokeStyle = "rgba(244, 63, 94, 0.4)";
        c.lineWidth = 1.0;
      }
      c.beginPath();
      c.arc(clientX, clientY, 12, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = activeCount > 0 ? "#ffffff" : "rgba(244, 63, 94, 0.7)";
      c.font = "bold 8px ui-monospace, monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("YOU", clientX, clientY);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      if (staticDirtyRef.current) {
        drawStatic();
        staticDirtyRef.current = false;
      }

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0, W, H);

      const currentActiveCount = activeCountRef.current;

      // Flowing particles with gradient trails
      const particles = particlesRef.current;
      for (let k = particles.length - 1; k >= 0; k--) {
        const p = particles[k];

        const bankCheck = lpsRef.current.find(x => x.name === p.srcLP);
        if (p.stage === 0 && (!bankCheck || !bankCheck.active)) {
          particles.splice(k, 1);
          continue;
        }

        p.t += p.sp * simSpeedRef.current;

        const easedT = p.stage === 0
          ? Math.pow(p.t, 2.2)
          : 1 - Math.pow(1 - p.t, 2.5);

        const currentX = p.x + (p.tx - p.x) * easedT;
        const currentY = p.y + (p.ty - p.y) * easedT;

        if (p.t >= 1) {
          if (p.stage === 0) {
            p.stage = 1;
            p.x = coreX;
            p.y = coreY;
            p.tx = clientX;
            p.ty = clientY;
            p.t = 0;
            p.sp = 0.035 * simSpeedRef.current;
            corePulse = 1.3;
          } else {
            particles.splice(k, 1);
            continue;
          }
        }

        const alpha = 0.6 + 0.4 * Math.sin(p.t * Math.PI);

        const segments = 5;
        for (let i = segments; i >= 1; i--) {
          const ratio = i / segments;
          const trailT = Math.max(0, p.t - ratio * 0.16);
          const trailEasedT = p.stage === 0
            ? Math.pow(trailT, 2.2)
            : 1 - Math.pow(1 - trailT, 2.5);
          const trailX = p.x + (p.tx - p.x) * trailEasedT;
          const trailY = p.y + (p.ty - p.y) * trailEasedT;
          ctx.beginPath();
          ctx.moveTo(currentX, currentY);
          ctx.lineTo(trailX, trailY);
          ctx.lineWidth = p.stage === 0 ? (2.0 * (1 - ratio)) : (2.8 * (1 - ratio));
          ctx.strokeStyle = p.c + (alpha * (1 - ratio) * 0.42) + ")";
          ctx.stroke();
        }

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(currentX, currentY, p.stage === 1 ? 1.8 : 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.c + alpha + ")";
        ctx.beginPath();
        ctx.arc(currentX, currentY, p.stage === 1 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core glow (pulses on particle impact)
      corePulse *= 0.93;
      const coreRadius = 15 + corePulse * 8;
      const coreGrad = ctx.createRadialGradient(coreX, coreY, 2, coreX, coreY, coreRadius + 26);
      if (currentActiveCount > 0) {
        if (isGoldSelected) {
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
          coreGrad.addColorStop(0.2, "rgba(255, 246, 212, 0.95)");
          coreGrad.addColorStop(0.5, "rgba(212, 175, 55, 0.5)");
          coreGrad.addColorStop(1, "rgba(212, 175, 55, 0)");
        } else {
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
          coreGrad.addColorStop(0.2, "rgba(180, 255, 203, 0.95)");
          coreGrad.addColorStop(0.5, "rgba(61, 220, 108, 0.5)");
          coreGrad.addColorStop(1, "rgba(61, 220, 108, 0)");
        }
      } else {
        coreGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        coreGrad.addColorStop(0.3, "rgba(244, 63, 94, 0.6)");
        coreGrad.addColorStop(1, "rgba(244, 63, 94, 0)");
      }
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreRadius + 26, 0, Math.PI * 2);
      ctx.fill();

      if (currentActiveCount > 0) {
        ctx.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.25)" : "rgba(61, 220, 108, 0.25)";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(coreX, coreY, coreRadius + 9, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Core disc + symbol (drawn above the glow)
      ctx.save();
      if (currentActiveCount > 0) {
        ctx.shadowColor = isGoldSelected ? "rgba(212, 175, 55, 1.0)" : "rgba(61, 220, 108, 1.0)";
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowColor = "rgba(244, 63, 94, 1.0)";
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = "#030609";
      if (currentActiveCount > 0) {
        ctx.strokeStyle = isGoldSelected ? "#d4af37" : "#5ce880";
        ctx.lineWidth = 2.0;
      } else {
        ctx.strokeStyle = "rgba(244, 63, 94, 0.95)";
        ctx.lineWidth = 1.5;
      }
      ctx.beginPath();
      ctx.arc(coreX, coreY, 13.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = currentActiveCount > 0 ? "#ffffff" : "#f43f5e";
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("X", coreX, coreY);

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 9px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText("SyphonOS Core", coreX, coreY - 24);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };

  }, [reducedMotion, selectedSym]);

  // LP activation toggle handler
  const toggleLP = (lpName: string) => {
    setLps(prev => 
      prev.map(lp => {
        if (lp.name === lpName) {
          const toggledState = !lp.active;
          addLog(`${lpName} feed state altered to: ${toggledState ? 'ACTIVE' : 'OFFLINE'}`);
          return { ...lp, active: toggledState };
        }
        return lp;
      })
    );
  };

  // --- Leads Processing Handling ---
  const [leadInputs, setLeadInputs] = useState({
    name: "",
    company: "",
    email: "",
    volume: "10-50M",
    requirement: ""
  });
  const [formFeedback, setFormFeedback] = useState<{ type: "ok" | "err" | null; text: string }>({ type: null, text: "" });
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const handleLeadFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setLeadInputs(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback({ type: null, text: "" });

    if (!leadInputs.name || !leadInputs.email) {
      setFormFeedback({ type: "err", text: "Please enter your registration Name and Email." });
      return;
    }

    setFormIsSubmitting(true);
    const payload = {
      ...leadInputs,
      event: "iFX EXPO Cyprus 2026 · Booth 76",
      _subject: "New lead — iFX EXPO Cyprus 2026 (Booth 76)"
    };
    const endpoint = config.formEndpoint || "";
    const isLocalDemo = !endpoint || endpoint.toLowerCase().includes("formspree_id");
    const isOfflineMode = typeof navigator !== "undefined" && !navigator.onLine;

    if (isLocalDemo || isOfflineMode) {
      // Local mail fallback routine
      setTimeout(() => {
        let textBody = `xSyphon — iFX EXPO Cyprus 2026 · Booth 76 lead:\n\n`;
        textBody += `Name: ${leadInputs.name}\n`;
        textBody += `Company: ${leadInputs.company}\n`;
        textBody += `Email: ${leadInputs.email}\n`;
        textBody += `Expected monthly volume: ${leadInputs.volume}\n`;
        textBody += `Requirements: ${leadInputs.requirement || "—"}\n\n`;
        textBody += `[Sent from the booth kiosk]`;

        const mailtoLink = `mailto:${config.fallbackEmail || "sky.yu@xsyphon.com"}?subject=${encodeURIComponent("iFX EXPO Cyprus lead")}&body=${encodeURIComponent(textBody)}`;
        window.location.href = mailtoLink;

        setFormFeedback({
          type: "ok",
          text: "Registration intercepted. Redirecting to secure custom booth email provider..."
        });

        // Clear fields
        setLeadInputs({ name: "", company: "", email: "", volume: "10-50M", requirement: "" });
        setFormIsSubmitting(false);
      }, 800);
      return;
    }

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (resp.ok) {
        setFormFeedback({
          type: "ok",
          text: "Registration successfully recorded. Institutional desk notified!"
        });
        setLeadInputs({ name: "", company: "", email: "", volume: "10-50M", requirement: "" });
      } else {
        const errorData = await resp.json();
        setFormFeedback({
          type: "err",
          text: (errorData?.errors && errorData.errors[0]?.message) || "Transmission protocol error. Please contact sky.yu@xsyphon.com"
        });
      }
    } catch (err) {
      setFormFeedback({
        type: "err",
        text: "Connectivity degraded. Activating offline protocol mail pipeline..."
      });
      const mailtoLink = `mailto:${config.fallbackEmail || "sky.yu@xsyphon.com"}?subject=${encodeURIComponent("iFX EXPO Cyprus 2026 lead (Booth 76)")}&body=${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
      window.location.href = mailtoLink;
    } finally {
      setFormIsSubmitting(false);
    }
  };

  // --- Configuration Management ---
  const triggerSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      formEndpoint: tempEndpoint.trim(),
      calendlyUrl: tempCalendly.trim(),
      fallbackEmail: tempEmail.trim() || "sky.yu@xsyphon.com"
    };
    setConfig(updated);
    localStorage.setItem("XSYPHON_CONFIG", JSON.stringify(updated));
    setShowConfig(false);
    addLog("Custom kiosk operational credentials registered to storage.");
  };

  const loadKioskBoilerplate = (mode: "expo-onsite" | "reset") => {
    if (mode === "expo-onsite") {
      setTempEndpoint("https://formspree.io/f/mzdqakab");
      setTempCalendly("https://calendly.com/your-name/cyprus-20min");
      setTempEmail("sky.yu@xsyphon.com");
    } else {
      setTempEndpoint("https://formspree.io/f/mzdqakab");
      setTempCalendly("");
      setTempEmail("sky.yu@xsyphon.com");
    }
  };

  // Candlestick chart from REAL historical OHLC (GTS2 quote_query), with the
  // last bar tracking the live tick price.
  const renderCandles = (symbol: string) => {
    if (!klines.length) {
      return (
        <div className="relative w-full h-[88px] bg-black/40 rounded-lg border border-slate-900/60 flex items-center justify-center text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          Loading history…
        </div>
      );
    }

    const VISIBLE = 48;
    const slice = klines.slice(-VISIBLE).map((k) => ({ o: k.o, h: k.h, l: k.l, c: k.c }));

    // Let the newest bar follow the live price.
    const inst = instruments.find((x) => x.sym === symbol);
    if (inst?.px && slice.length) {
      const last = slice[slice.length - 1];
      last.c = inst.px;
      last.h = Math.max(last.h, inst.px);
      last.l = Math.min(last.l, inst.px);
    }

    const minVal = Math.min(...slice.map((c) => c.l));
    const maxVal = Math.max(...slice.map((c) => c.h));
    const range = maxVal - minVal || 1;

    const svgW = 260;
    const svgH = 88;
    const padY = 6;
    const padX = 3;
    const n = slice.length;
    const slot = (svgW - padX * 2) / n;
    const bodyW = Math.max(1.2, slot * 0.66);
    const yOf = (p: number) => svgH - padY - ((p - minVal) / range) * (svgH - padY * 2);

    const upColor = "#3ddc6c";
    const downColor = "#f43f5e";

    return (
      <div className="relative w-full h-[92px] bg-black/40 rounded-lg border border-slate-900/60 overflow-hidden">
        <svg className="w-full h-full" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
          {slice.map((c, i) => {
            const cx = padX + slot * (i + 0.5);
            const up = c.c >= c.o;
            const color = up ? upColor : downColor;
            const bodyTop = Math.min(yOf(c.o), yOf(c.c));
            const bodyH = Math.max(0.8, Math.abs(yOf(c.c) - yOf(c.o)));
            return (
              <g key={i}>
                <line x1={cx} x2={cx} y1={yOf(c.h)} y2={yOf(c.l)} stroke={color} strokeWidth="0.7" />
                <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} rx="0.3" />
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const selectedAsset = instruments.find(ins => ins.sym === selectedSym) || instruments[0];

  return (
    <div id="appContainer" className="min-h-screen bg-[#040608] text-slate-100 font-sans selection:bg-[#3ddc6c]/30 selection:text-[#3ddc6c] antialiased relative overflow-x-hidden flex flex-col justify-between">
      
      {/* Dynamic Grid / Star Backdrop Animation "The Hero Vault" */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#090d13_1px,transparent_1px),linear-gradient(to_bottom,#090d13_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
      
      {/* Premium glowing background lights */}
      <div className="absolute top-0 right-1/4 w-[420px] h-[420px] bg-[#3ddc6c]/6 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[340px] h-[340px] bg-yellow-500/3 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Structural Wrapper */}
      <div id="mainInterface" className="w-full max-w-[1530px] mx-auto px-4 py-3 flex-1 flex flex-col justify-between gap-3.5">
        
        {/* HEADER BRAND BLOCK */}
        <header id="appHeader" className="flex flex-col md:flex-row items-center justify-between gap-4 py-3.5 px-5 bg-black/60 border border-slate-900/80 rounded-2xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3ddc6c]/20 to-transparent" />
          
          <div className="flex items-center gap-3.5">
            {/* Real xSyphon wordmark (inverted to white on dark) */}
            <img src="/xsyphon-logo.png" alt="xSyphon" className="h-7 md:h-8 w-auto invert brightness-200" />
            <div className="flex flex-col gap-1 border-l border-slate-800 pl-3.5">
              <span className="px-2 py-0.5 text-[9px] uppercase font-mono font-bold tracking-widest bg-[#3ddc6c]/10 text-[#3ddc6c] border border-[#3ddc6c]/25 rounded w-max">
                iFX EXPO Cyprus · Booth 76
              </span>
              <p className="text-[11px] text-slate-400 font-mono tracking-wider">
                Syphon OS · Liquidity Aggregation Engine
              </p>
            </div>
          </div>

          {/* AI Rotor Performance Stats in Header */}
          <div className="flex items-center gap-2.5 bg-[#080d12]/90 border border-slate-900/90 px-4 py-2 rounded-xl font-mono text-xs w-full md:w-auto">
            <Cpu className="text-[#3ddc6c] w-4.5 h-4.5 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-slate-400">Core Matrix:</span>
            <span className="text-emerald-400 font-bold tracking-wider underline decoration-[#3ddc6c]/30 text-glow">
              {ROTOR_WORDS[rotorIndex]}
            </span>
            <span className="h-2 w-2 rounded-full bg-[#3ddc6c] animate-ping" />
          </div>

          <div className="flex items-center gap-3.5">
            {/* Ask Aether — AI live desk demo */}
            <button
              onClick={() => setShowAether(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#3ddc6c]/10 border border-[#3ddc6c]/30 hover:bg-[#3ddc6c]/20 text-[#3ddc6c] rounded-xl transition-all cursor-pointer font-mono text-[11px] font-bold tracking-wider uppercase group-hover:scale-105"
              title="Ask the Syphon Aether AI desk"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Aether</span>
            </button>

            {/* Booth Configuration Trigger */}
            <button
              onClick={() => {
                setTempEndpoint(config.formEndpoint);
                setTempCalendly(config.calendlyUrl);
                setTempEmail(config.fallbackEmail);
                setShowConfig(true);
              }}
              className="p-2.5 bg-slate-950 border border-slate-900 hover:border-[#3ddc6c]/50 text-slate-400 hover:text-[#3ddc6c] rounded-xl transition-all cursor-pointer relative group-hover:scale-105"
              title="Kiosk Configurator"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex flex-col text-right font-mono text-[10px] text-slate-500">
              <div>iFX EXPO Cyprus // Booth 76</div>
              <div className="text-[#3ddc6c] font-bold text-[9px] tracking-widest animate-pulse">● ENGINE ONLINE</div>
            </div>
          </div>
        </header>

        {/* HERO INTRO SUB-BANNER: Decrypting Title */}
        <section id="heroVault" className="py-7 px-6 bg-gradient-to-r from-slate-950/90 to-transparent border border-slate-900/60 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_right_top,rgba(61,220,108,0.06),transparent_65%)]" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <span className="text-[#3ddc6c] font-mono text-[10px] tracking-[0.25em] block uppercase font-bold">
                Institutional liquidity · AI-driven
              </span>
              <h2 className="text-xl md:text-2xl font-mono font-bold tracking-tight text-white">
                {decodedTitle}
                {isDecoding && <span className="animate-pulse ml-0.5 font-sans">|</span>}
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Institutional FX, precious metals and crypto-CFD liquidity aggregated from 12 tier-1 sources. Zero last look, 5ms execution, live in 5&ndash;10 days. One gateway to global liquidity.
              </p>
            </div>

            {/* Quick Stats on the screen styled as Glass Cards */}
            <div className="flex flex-wrap gap-2 md:shrink-0">
              <div className="glass-card px-4 py-2.5 rounded-xl border-slate-900/60 flex flex-col min-w-[100px]">
                <span className="text-[10px] text-slate-400 font-mono">DAILY VOLUME</span>
                <span className="text-lg font-bold font-mono text-white text-glow">$1B+</span>
              </div>
              <div className="glass-card px-4 py-2.5 rounded-xl border-slate-900/60 flex flex-col min-w-[100px]">
                <span className="text-[10px] text-slate-400 font-mono">TIER-1 LPs</span>
                <span className="text-lg font-bold font-mono text-[#3ddc6c]">12</span>
              </div>
              <div className="glass-card px-4 py-2.5 rounded-xl border-slate-900/60 flex flex-col min-w-[100px]">
                <span className="text-[10px] text-slate-400 font-mono">EXECUTION</span>
                <span className="text-lg font-bold font-mono text-white">5ms</span>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE REALTIME RATES MARQUEE (GTS2 guest feed) */}
        <section id="ratesMarquee" className="bg-[#030609]/95 border border-slate-900/70 rounded-xl overflow-hidden py-2.5 px-4 flex items-center relative gap-4">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#040608] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#040608] to-transparent z-10" />
          
          <div className={`font-mono text-[9px] font-bold tracking-widest shrink-0 uppercase bg-slate-950 px-2.5 py-1 border rounded shadow z-10 text-glow flex items-center gap-1 ${quoteStatus === "live" ? "text-[#3ddc6c] border-[#3ddc6c]/20" : "text-amber-300 border-amber-400/30"}`}>
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${quoteStatus === "live" ? "bg-[#3ddc6c]" : "bg-amber-400"}`} />
            {quoteStatus === "live" ? "LIVE" : "RECONNECTING"}
          </div>

          <div className="flex-1 overflow-hidden relative select-none">
            <div className="animate-marquee-loop whitespace-nowrap hover:[animation-play-state:paused] flex gap-10">
              {Array(2).fill(0).map((_, parentIdx) => (
                <div key={parentIdx} className="flex gap-10 shrink-0">
                  {instruments.map((ins) => {
                    const isGrowth = ins.chg >= 0;
                    const isGold = ins.sym.includes("XAU");
                    return (
                      <button
                        key={`${parentIdx}-${ins.sym}`}
                        onClick={() => setSelectedSym(ins.sym)}
                        className={`inline-flex items-center gap-2 font-mono text-xs cursor-pointer py-1 px-2.5 rounded-lg transition-all ${
                          selectedSym === ins.sym
                            ? (isGold 
                              ? "bg-amber-500/10 border border-amber-500/40 text-amber-300 font-bold" 
                              : "bg-[#3ddc6c]/10 border border-[#3ddc6c]/30 text-emerald-300 font-bold")
                            : "hover:bg-slate-900/50 text-slate-300"
                        }`}
                      >
                        <span className="text-slate-400">{ins.sym}</span>
                        <span className="text-white font-semibold">
                          {ins.px ? ins.px.toLocaleString("en-US", { minimumFractionDigits: ins.dp, maximumFractionDigits: ins.dp }) : "—"}
                        </span>
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${isGrowth ? "text-[#3ddc6c]" : "text-rose-400"}`}>
                          {isGrowth ? "▲ +" : "▼ "}{Math.abs(ins.chg).toFixed(2)}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRADING CORE HUD DIVISION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* COLUMN 1: LIVE FINTECH LIST & CHARTS (3/12 cols) */}
          <section className="lg:col-span-3 flex flex-col gap-4">
            
            <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-900/60 pb-2">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#3ddc6c] animate-pulse" />
                    Exchange Monitor
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive</span>
                </div>

                {/* Vertical rates lists */}
                <div className="space-y-1.5 max-h-[300px] lg:max-h-none overflow-y-auto pr-1 custom-scrollbar">
                  {instruments.map((ins) => {
                    const isGrowth = ins.chg >= 0;
                    const isSelected = selectedSym === ins.sym;
                    const isGold = ins.sym.includes("XAU");
                    
                    return (
                      <div
                        key={ins.sym}
                        onClick={() => setSelectedSym(ins.sym)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between relative ${
                          isSelected
                            ? (isGold 
                              ? "bg-amber-950/10 border-amber-500/40 shadow shadow-amber-500/5 transform scale-[1.01]" 
                              : "bg-[#3ddc6c]/5 border-[#3ddc6c]/30 shadow shadow-[#3ddc6c]/5 transform scale-[1.01]")
                            : "bg-[#070b0e]/80 border-slate-900 hover:bg-slate-900/40"
                        }`}
                      >
                        {isSelected && (
                          <div className={`absolute left-0 top-2 bottom-2 w-1.5 rounded-r ${isGold ? "bg-amber-500" : "bg-[#3ddc6c]"}`} />
                        )}

                        <div className="font-mono text-xs">
                          <div className={`font-bold tracking-wider ${isGold ? "text-amber-400" : "text-white"}`}>{ins.sym}</div>
                          <span className="text-[9px] text-slate-500">Tier-1 Direct Stream</span>
                        </div>

                        <div className="text-right font-mono text-xs">
                          <div className="font-bold text-slate-100">
                            {ins.px ? ins.px.toLocaleString("en-US", { minimumFractionDigits: ins.dp, maximumFractionDigits: ins.dp }) : "—"}
                          </div>
                          <span className={`text-[10px] font-semibold ${isGrowth ? "text-[#3ddc6c]" : "text-rose-400"}`}>
                            {isGrowth ? "▲ +" : "▼ "}{ins.chg.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Candlestick display */}
              <div className="pt-3 border-t border-slate-900/80">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <TrendingUp className="w-3.5 h-3.5 text-[#3ddc6c]" />
                    {selectedSym} · 5M
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {selectedAsset.px ? selectedAsset.px.toLocaleString("en-US", { minimumFractionDigits: selectedAsset.dp }) : "—"}
                  </span>
                </div>
                {renderCandles(selectedSym)}
                <div className="mt-1 text-[8px] font-mono text-slate-600 uppercase tracking-widest text-right">
                  Live 5-minute OHLC · GTS2 feed
                </div>
              </div>
            </div>

            {/* Simulated Live System Logs Output */}
            <div className="glass-card rounded-2xl p-4 h-[150px] flex flex-col justify-between font-mono text-[10px]">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2 text-slate-400">
                <span className="font-bold flex items-center gap-1.5 uppercase text-[9px] tracking-widest text-[#3ddc6c]">
                  <Database className="w-3.5 h-3.5" />
                  Kiosk Kernel Stream
                </span>
                <span className="text-[9px] text-[#3ddc6c] animate-pulse font-bold">● ONLINE FEED</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-slate-400 custom-scrollbar">
                {kioskLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed border-b border-slate-900/30 pb-1 text-[9.5px]">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* COLUMN 2: DISCOVERY AGGREGATOR PANEL (5/12 cols) */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            
            <div className="glass-card rounded-2xl p-4.5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                  <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-white flex items-center gap-2">
                    <Circle className="w-2.5 h-2.5 text-[#3ddc6c] fill-[#3ddc6c] animate-pulse" />
                    Aggregation Core Pipeline
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Real-time aggregation &amp; routing map
                  </span>
                </div>

                {/* Aggregator HTML5 Canvas component with 3D Holographic Perspective */}
                <div 
                  className="relative w-full aspect-[4/3.1] bg-[#05070a]/95 border border-slate-900/90 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group mb-4 transition-colors duration-500 hover:border-[#3ddc6c]/25"
                >
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair block z-10"
                  />
                  
                  {/* Floating Labels */}
                  <div className="absolute top-3 left-3 pointer-events-none font-mono text-[9px] bg-slate-950/80 border border-slate-900/50 px-2 py-0.5 rounded text-slate-400 z-20">
                    Tier-1 Feeds
                  </div>
                  <div className="absolute top-3 right-3 pointer-events-none font-mono text-[9px] bg-slate-950/80 border border-slate-900/50 px-2 py-0.5 rounded text-slate-400 z-20">
                    Integrated API Terminal
                  </div>
                  <div className="absolute bottom-3 left-3 pointer-events-none font-mono text-[9px] bg-emerald-950/40 border border-emerald-900/30 px-2' py-1 rounded text-[#3ddc6c] flex items-center gap-1.5 z-20">
                    <Zap className="w-2.5 h-2.5 text-[#3ddc6c] animate-bounce" />
                    Aggregation core
                  </div>

                  {lps.filter(x => x.active).length === 0 && (
                    <div className="absolute inset-0 bg-rose-950/20 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-5 z-20">
                      <AlertTriangle className="w-9 h-9 text-rose-500 mb-2 animate-bounce" />
                      <h4 className="text-white font-mono font-bold text-xs uppercase tracking-widest text-shadow">No Feeds Connected</h4>
                      <p className="text-rose-300 font-mono text-[10px] max-w-[250px] mt-1.5 leading-relaxed">
                        Toggle one or more tier-1 liquidity sources below to re-initiate aggregation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Multi bank activation toggles */}
                <div>
                  <div className="text-[10px] font-mono text-slate-400 mb-2 flex justify-between items-center bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-900/60">
                    <span className="font-bold text-[#3ddc6c] uppercase">Tier-1 liquidity sources</span>
                    <span>Toggle feeds to see the router re-aggregate</span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {lps.map((lp) => (
                      <button
                        key={lp.name}
                        onClick={() => toggleLP(lp.name)}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer text-center flex items-center justify-center gap-1 border ${
                          lp.active
                            ? "bg-[#3ddc6c]/5 border-[#3ddc6c]/25 text-[#3ddc6c] hover:bg-[#3ddc6c]/15"
                            : "bg-rose-950/5 border-rose-900/20 text-rose-500/70 hover:bg-rose-950/15"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${lp.active ? "bg-[#3ddc6c]" : "bg-rose-500"}`} />
                        {lp.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced adjustable simulation sliders */}
              <div className="mt-4 pt-3 border-t border-slate-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs font-mono">
                
                <div className="w-full sm:w-1/2 flex items-center gap-2">
                  <span className="text-slate-400 shrink-0 text-[10px] uppercase tracking-wider">Stream Delay:</span>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={simSpeed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSimSpeed(val);
                      addLog(`Custom latency coefficient shifted: ${val.toFixed(1)}x`);
                    }}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#3ddc6c]"
                  />
                  <span className="text-[#3ddc6c] text-[10px] w-12 text-right font-bold shrink-0">
                    {(statsLatency / simSpeed).toFixed(2)}ms
                  </span>
                </div>

                <div className="w-full sm:w-1/2 flex items-center gap-2">
                  <span className="text-slate-400 shrink-0 text-[10px] uppercase tracking-wider">Feed Intensity:</span>
                  <input
                    type="range"
                    min="0.3"
                    max="3.0"
                    step="0.2"
                    value={spawnIntensity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSpawnIntensity(val);
                      addLog(`Message interval frequency throttled at ${Math.round(val * 160)} ticks/sec`);
                    }}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#3ddc6c]"
                  />
                  <span className="text-[#3ddc6c] text-[10px] w-12 text-right font-bold shrink-0">
                    {Math.round(spawnIntensity * 160)}m/s
                  </span>
                </div>

              </div>
            </div>
          </section>

          {/* COLUMN 3: SALES CAPTURE & SPEED TESTING TERMINAL (4/12 cols) */}
          <section className="lg:col-span-4 flex flex-col gap-4">
            
            {/* KPI STATS ROW */}
            <div className="grid grid-cols-3 gap-2 bg-[#040608] border border-slate-900 rounded-2xl p-2">
              
              <div className="bg-black/60 p-3 rounded-xl border border-slate-900/60 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-mono tracking-widest text-[#3ddc6c] mb-1 block font-bold">Core Routing</span>
                <span className="text-sm font-bold tracking-tight text-white font-mono">
                  {statsLatency.toFixed(2)} ms
                </span>
              </div>

              <div className="bg-black/60 p-3 rounded-xl border border-slate-900/60 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 block font-bold">Aggregated</span>
                <span className="text-sm font-bold tracking-tight text-[#3ddc6c] font-mono">
                  {lps.filter(x => x.active).length} LPs
                </span>
              </div>

              <div className="bg-black/60 p-3 rounded-xl border border-slate-900/60 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 block leading-none font-bold">Daily Vol</span>
                <span className="text-sm font-bold tracking-tight text-white font-mono shrink-0">
                  ${statsVolume.toFixed(2)}B
                </span>
              </div>

            </div>

            {/* PREMIUM SPOTLIGHT: XAU/CNH GOLD CARD */}
            <div className="glass-card-gold rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 -translate-x-full animate-laser-sweep pointer-events-none" />
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded">
                  ★ EXCLUSIVE ADVANTAGE
                </span>
                <span className="text-[9px] text-slate-400 font-mono">GOLD MATRIX</span>
              </div>

              <h4 className="text-sm font-mono font-bold text-white tracking-widest uppercase mb-1">
                XAU/CNH — Gold vs Offshore RMB
              </h4>
              <p className="text-[11px] text-amber-200/85 mb-3 leading-relaxed">
                Rare streaming gold liquidity against the offshore yuan, with institutional STP execution from 50&nbsp;g and zero last look. A direct edge for Asian institutional flow.
              </p>

              {/* Golden Mini Specifications Box (published specs) */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-amber-100/90">
                <div className="bg-amber-950/20 px-2.5 py-1.5 rounded border border-amber-500/10">
                  <span className="text-slate-400 block text-[9px] uppercase">Min size:</span>
                  <span className="font-bold text-amber-400">50 g · 1 g step</span>
                </div>
                <div className="bg-amber-950/20 px-2.5 py-1.5 rounded border border-amber-500/10">
                  <span className="text-slate-400 block text-[9px] uppercase">Hours · Exec:</span>
                  <span className="font-bold text-amber-300">24/5 · STP</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE "PROOF OF SPEED" DIAGNOSTIC COMPONENT */}
            <div id="proofOfSpeed" className="glass-card rounded-2xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-[#3ddc6c]" />
                  Engine Speed Diagnostic
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">Test Unit</span>
              </div>

              {testStage === 0 && (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs text-slate-400 font-mono mb-3 leading-relaxed">
                    Test our network aggregate pipeline latency directly from this kiosk terminal.
                  </p>
                  <button
                    onClick={triggerSpeedTest}
                    className="w-full bg-[#3ddc6c] hover:bg-[#3ddc6c]/90 text-black py-2 px-3 rounded-xl font-mono text-xs font-bold tracking-widest cursor-pointer shadow-lg shadow-[#3ddc6c]/15 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    PING SYPHON CORE
                  </button>
                </div>
              )}

              {testStage === 1 && (
                <div className="space-y-2 p-1">
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-400">PING packets routed...</span>
                    <span className="text-[#3ddc6c] animate-pulse">TRANSMITTING</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950/80 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 animate-[pulse_1s_infinite]" style={{ width: '40%' }} />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono leading-none">Evaluation: active sockets...</p>
                </div>
              )}

              {testStage === 2 && (
                <div className="space-y-2 p-1">
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-400">Estimating spread matrix...</span>
                    <span className="text-amber-400 font-bold">CALCULATING</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950/80 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: '80%' }} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-none">Filtering "Last Look" flags...</p>
                </div>
              )}

              {testStage === 3 && testResult && (
                <div className="space-y-2 font-mono text-xs bg-black/40 p-3 rounded-xl border border-slate-900/85">
                  <div className="flex justify-between border-b border-slate-900 pb-1 text-[#3ddc6c] font-bold">
                    <span>PROTOCOL RESULT:</span>
                    <span className="text-glow">{testResult.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div>
                      <span className="text-slate-500 block">CORE LATENCY:</span>
                      <span className="text-white font-bold text-xs">{testResult.latency} ms</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SLIPPAGE:</span>
                      <span className="text-white font-bold text-xs">{testResult.slippage} Pips</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">FILL RATE:</span>
                      <span className="text-white font-bold text-xs">{testResult.fillRate}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ROUTE CONFIG:</span>
                      <span className="text-slate-200 text-[9px] truncate block" title={testResult.route}>
                        {testResult.route}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={resetSpeedTest}
                    className="w-full text-center text-slate-400 hover:text-white pt-2 text-[10px] uppercase font-bold border-t border-slate-900/60 block mt-2 cursor-pointer"
                  >
                    ← Clear Diagnostic Report
                  </button>
                </div>
              )}
            </div>

            {/* ON-SITE REGISTER CONSOLE FORM */}
            <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-900/80">
                  <span className="p-1 rounded bg-[#3ddc6c]/10 text-[#3ddc6c]">
                    <Send className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-mono font-bold tracking-wider text-white uppercase leading-none">
                      Lead Capture Hub
                    </h4>
                    <span className="text-[9px] text-slate-500 uppercase font-mono mt-0.5 block">
                      Register info for post-expo contact
                    </span>
                  </div>
                </div>

                <form onSubmit={submitLead} className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                      Business Contact Name <span className="text-[#3ddc6c] font-bold">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      name="name"
                      placeholder="e.g. Liam Sterling"
                      value={leadInputs.name}
                      onChange={handleLeadFormChange}
                      className="w-full bg-[#030609] border border-slate-900 focus:border-[#3ddc6c]/40 rounded-xl p-2 text-white font-mono outline-none focus:ring-1 focus:ring-[#3ddc6c]/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                        Institution / Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        placeholder="e.g. Apex Corp"
                        value={leadInputs.company}
                        onChange={handleLeadFormChange}
                        className="w-full bg-[#030609] border border-slate-900 focus:border-[#3ddc6c]/40 rounded-xl p-2 text-white font-mono outline-none focus:ring-1 focus:ring-[#3ddc6c]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                        Corporate Email <span className="text-[#3ddc6c] font-bold">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        name="email"
                        placeholder="e.g. liam@apex.io"
                        value={leadInputs.email}
                        onChange={handleLeadFormChange}
                        className="w-full bg-[#030609] hover:bg-black/20 focus:bg-[#030609] border border-slate-900 focus:border-[#3ddc6c]/40 rounded-xl p-2 text-white font-mono outline-none focus:ring-1 focus:ring-[#3ddc6c]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                      Expected Monthly Volume (USD)
                    </label>
                    <select
                      name="volume"
                      value={leadInputs.volume}
                      onChange={handleLeadFormChange}
                      className="w-full bg-[#030609] border border-slate-900 focus:border-[#3ddc6c]/40 rounded-xl p-2 text-white font-mono outline-none cursor-pointer"
                    >
                      <option value="Under 10M">Under $10M / month</option>
                      <option value="10-50M">$10M - $50M / month</option>
                      <option value="50-250M">$50M - $250M / month</option>
                      <option value="250M-1B">$250M - $1B / month</option>
                      <option value="1B+">$1B+ Institutional / month</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                      Special Requirements / Message
                    </label>
                    <textarea
                      name="requirement"
                      rows={2}
                      placeholder="e.g. API connectivity documentation request..."
                      value={leadInputs.requirement}
                      onChange={handleLeadFormChange}
                      className="w-full bg-[#030609] border border-slate-900 focus:border-[#3ddc6c]/40 rounded-xl p-2 text-white font-mono outline-none focus:ring-1 focus:ring-[#3ddc6c]/20 select-text resize-none"
                    />
                  </div>

                  <button
                    disabled={formIsSubmitting}
                    type="submit"
                    className="w-full bg-[#3ddc6c] hover:bg-[#3ddc6c]/90 text-black py-2 px-3 rounded-xl font-mono text-xs font-bold tracking-widest cursor-pointer shadow-md transition-all flex items-center justify-center gap-1"
                  >
                    {formIsSubmitting ? "TRANSMITTING..." : "SUBMIT REGISTRATION"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {formFeedback.text && (
                  <div className={`mt-2 p-2 rounded-xl text-[11px] font-mono border ${
                    formFeedback.type === "ok" 
                      ? "bg-[#3ddc6c]/10 border-[#3ddc6c]/20 text-[#3ddc6c]" 
                      : "bg-rose-950/20 border-rose-900/30 text-rose-400"
                  }`}>
                    {formFeedback.text}
                  </div>
                )}
              </div>

              {/* Book meeting + save contact */}
              <div className="mt-3 pt-3 border-t border-slate-950/60 flex flex-col gap-2">
                {config.calendlyUrl && (
                  <a
                    href={config.calendlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center font-mono text-[10px] text-[#3ddc6c] hover:text-emerald-300 font-bold tracking-wider block hover:underline"
                  >
                    📅 Book a meeting at the booth →
                  </a>
                )}
                <a
                  href="/xsyphon.vcf"
                  download
                  className="text-center font-mono text-[10px] text-slate-400 hover:text-white font-bold tracking-wider block hover:underline"
                >
                  💾 Save our contact (vCard)
                </a>
              </div>
            </div>

          </section>

        </div>

        {/* CORE TRADING CONDITIONS & LIQUIDITY DEPTH */}
        <section id="tradingConditions" className="glass-card rounded-2xl p-5 border-slate-900/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3ddc6c]/15 to-transparent" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-900/60 pb-3.5 mb-5">
            <div>
              <span className="text-[#3ddc6c] font-mono text-[9px] tracking-[0.2em] font-bold uppercase block mb-1">
                Institutional trading conditions
              </span>
              <h3 className="text-base font-mono font-bold tracking-tight text-white uppercase flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#3ddc6c]" />
                Core Trading Conditions
              </h3>
            </div>
            <div className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-3 py-1 rounded border border-slate-900/80">
              Indicative · iFX EXPO Cyprus 2026
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Condition 1 */}
            <div className="bg-[#05070a]/65 border border-slate-900/80 p-4 rounded-xl hover:border-[#3ddc6c]/20 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Fast settlement</span>
                <span className="h-2 w-2 rounded-full bg-[#3ddc6c] animate-pulse" />
              </div>
              <h4 className="text-[11px] font-mono text-slate-300 mb-1.5 font-bold uppercase tracking-wide">USDT fund turnover</h4>
              <div className="text-2xl font-bold font-mono text-white tracking-tight mb-1 text-glow">
                &lt; 30 <span className="text-lg text-[#3ddc6c]">mins</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Typical internal-ledger settlement back to your designated addresses within ~30 minutes.
              </p>
            </div>

            {/* Condition 2 */}
            <div className="bg-[#05070a]/65 border border-slate-900/80 p-4 rounded-xl hover:border-[#3ddc6c]/20 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Broker commission</span>
                <span className="h-2 w-2 rounded-full bg-[#3ddc6c] animate-pulse" />
              </div>
              <h4 className="text-[11px] font-mono text-slate-300 mb-1.5 font-bold uppercase tracking-wide">FX &amp; precious metals</h4>
              <div className="text-2xl font-bold font-mono text-[#3ddc6c] tracking-tight mb-1 text-glow">
                from $8 <span className="text-xs text-slate-400 font-normal">/ million</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Transparent flat commission on FX &amp; metals, with volume-based discount tiers for larger flow.
              </p>
            </div>

            {/* Condition 3 */}
            <div className="bg-[#05070a]/65 border border-slate-900/80 p-4 rounded-xl hover:border-[#3ddc6c]/20 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Risk capacity</span>
                <span className="h-2 w-2 rounded-full bg-[#3ddc6c] animate-pulse" />
              </div>
              <h4 className="text-[11px] font-mono text-slate-300 mb-1.5 font-bold uppercase tracking-wide">Aggregate NOP headroom</h4>
              <div className="text-2xl font-bold font-mono text-white tracking-tight mb-1 text-glow">
                $150M <span className="text-xs text-[#3ddc6c] font-normal uppercase">USD</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Aggregate Net Open Position headroom for high-frequency and copy-trading desk allocations.
              </p>
            </div>

            {/* Condition 4 */}
            <div className="bg-[#05070a]/65 border border-slate-900/80 p-4 rounded-xl hover:border-[#3ddc6c]/20 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Bullion depth</span>
                <span className="h-2 w-2 rounded-full bg-[#3ddc6c] animate-pulse" />
              </div>
              <h4 className="text-[11px] font-mono text-slate-300 mb-1.5 font-bold uppercase tracking-wide">XAU/USD single ticket</h4>
              <div className="text-2xl font-bold font-mono text-white tracking-tight mb-1 text-glow">
                $80M <span className="text-xs text-[#3ddc6c] font-normal uppercase">USD</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Deep gold order depth for continuous multi-million single-ticket fills without execution lag.
              </p>
            </div>

          </div>

          <p className="text-[9px] font-mono text-slate-600 mt-3.5 text-center">
            Indicative only — final terms confirmed per counterparty agreement.
          </p>
        </section>

      </div>

      {/* FOOTER */}
      <footer className="w-full py-4 text-center text-[10px] font-mono text-slate-600 bg-black/35 border-t border-slate-950/80 mt-4">
        <div className="text-slate-400">
          xSyphon Ltd · FSC Mauritius License No. GB25204632 · MiFID II / UK FCA frameworks · © 2026
        </div>
        <div className="text-[9px] mt-1 text-slate-500 max-w-3xl mx-auto leading-relaxed">
          For institutional and professional clients only. Trading involves risk. Quotes shown are live indicative prices via
          a guest market feed; the aggregation visual, engine metrics and the speed test are illustrative. Explore the full platform at
          <a href="https://xsyphon.com" target="_blank" rel="noopener noreferrer" className="text-[#3ddc6c] hover:underline"> xsyphon.com</a>.
        </div>
      </footer>

      {/* SYPHON AETHER — AI LIVE DESK DEMO OVERLAY */}
      <AetherDemo
        open={showAether}
        onClose={() => setShowAether(false)}
        instruments={instruments}
        selectedSym={selectedSym}
        onSelectSym={setSelectedSym}
      />

      {/* MODAL CONFIGURATOR PANEL OVERLAY */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#070b0e] border border-slate-900 rounded-2xl w-full max-w-md p-5 font-mono text-xs space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowConfig(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg border border-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="border-b border-slate-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#3ddc6c]" />
                Kiosk Config
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Establish external Formspree backend endpoints &amp; Calendly integrations.
              </p>
            </div>

            <form onSubmit={triggerSaveConfig} className="space-y-3">
              
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">
                  Formspree endpoint URL:
                </label>
                <input
                  type="text"
                  placeholder="https://formspree.io/f/xbjnqjpz"
                  value={tempEndpoint}
                  onChange={(e) => setTempEndpoint(e.target.value)}
                  className="w-full bg-[#030609] border border-slate-900 rounded-xl p-2 text-white font-mono outline-none"
                />
                <span className="text-[8.5px] text-slate-500 block mt-1 leading-normal">
                  Transmits submission payload instantly via AJAX. Leave blank to open default client email routing fallback.
                </span>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">
                  Calendly / Meeting Router:
                </label>
                <input
                  type="text"
                  placeholder="https://calendly.com/yourname/expo"
                  value={tempCalendly}
                  onChange={(e) => setTempCalendly(e.target.value)}
                  className="w-full bg-[#030609] border border-slate-900 rounded-xl p-2 text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">
                  Fallback Desk E-mail:
                </label>
                <input
                  type="email"
                  placeholder="sky.yu@xsyphon.com"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="w-full bg-[#030609] border border-slate-900 rounded-xl p-2 text-white font-mono outline-none"
                />
                <span className="text-[8.5px] text-slate-500 block mt-1 leading-normal">
                  Destination target for offline registration fallbacks. Default is sky.yu@xsyphon.com.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => loadKioskBoilerplate("expo-onsite")}
                  className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 py-2 px-3 rounded-xl border border-amber-500/20 text-[10px] uppercase font-bold cursor-pointer text-center"
                >
                  Load Expo Preset
                </button>
                <button
                  type="button"
                  onClick={() => loadKioskBoilerplate("reset")}
                  className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-400 py-2 px-3 rounded-xl border border-slate-900 text-[10px] uppercase font-bold cursor-pointer text-center"
                >
                  Clear Config
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-900/80">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-900 text-slate-400 hover:text-white rounded-xl text-[10px] uppercase font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3ddc6c] text-black font-bold text-[10px] rounded-xl uppercase hover:bg-[#3ddc6c]/90 cursor-pointer shadow shadow-[#3ddc6c]/20"
                >
                  Apply Configuration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
