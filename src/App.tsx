/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
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
interface Instrument {
  sym: string;
  px: number;
  dp: number; // decimal places
  base: number;
  chg: number;
}

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

export default function App() {
  // --- Kiosk Config State ---
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem("XSYPHON_CONFIG");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return {
      formEndpoint: "",
      calendlyUrl: "",
      fallbackEmail: "desk@xsyphon.com",
    };
  });

  const [showConfig, setShowConfig] = useState(false);
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

  // --- Instrument State (Random Walk simulation) ---
  const [instruments, setInstruments] = useState<Instrument[]>([
    { sym: "EUR/USD", px: 1.16720, dp: 5, base: 1.16720, chg: 0 },
    { sym: "GBP/USD", px: 1.31840, dp: 5, base: 1.31840, chg: 0 },
    { sym: "USD/JPY", px: 160.215, dp: 3, base: 160.215, chg: 0 },
    { sym: "AUD/USD", px: 0.62510, dp: 5, base: 0.62510, chg: 0 },
    { sym: "USD/CNH", px: 7.28400, dp: 4, base: 7.28400, chg: 0 },
    { sym: "XAU/USD", px: 4724.50, dp: 2, base: 4724.50, chg: 0 },
    { sym: "XAG/USD", px: 32.185, dp: 3, base: 32.185, chg: 0 },
    { sym: "XAU/CNH", px: 1102.40, dp: 2, base: 1102.40, chg: 0 }, // Black Gold highlight
    { sym: "BTC/USD", px: 71240.0, dp: 1, base: 71240.0, chg: 0 }
  ]);

  const [selectedSym, setSelectedSym] = useState("EUR/USD");
  const [historyMap, setHistoryMap] = useState<Record<string, number[]>>(() => {
    return {
      "EUR/USD": [1.1668, 1.1670, 1.1665, 1.1673, 1.1671, 1.1672, 1.1670, 1.1673, 1.1672],
      "GBP/USD": [1.3180, 1.3185, 1.3179, 1.3182, 1.3186, 1.3184, 1.3181, 1.3185, 1.3184],
      "USD/JPY": [160.15, 160.20, 160.10, 160.25, 160.18, 160.215, 160.19, 160.23, 160.215],
      "AUD/USD": [0.6248, 0.6252, 0.6245, 0.6250, 0.6253, 0.6251, 0.6249, 0.6252, 0.6251],
      "USD/CNH": [7.2820, 7.2850, 7.2810, 7.2835, 7.2842, 7.2840, 7.2830, 7.2845, 7.2840],
      "XAU/USD": [4722.0, 4725.2, 4721.5, 4726.0, 4723.8, 4724.50, 4723.0, 4725.5, 4724.50],
      "XAG/USD": [32.150, 32.200, 32.120, 32.190, 32.175, 32.185, 32.160, 32.210, 32.185],
      "XAU/CNH": [1101.5, 1103.0, 1100.8, 1102.5, 1102.1, 1102.40, 1101.9, 1102.8, 1102.40],
      "BTC/USD": [71190.0, 71280.0, 71150.0, 71260.0, 71210.0, 71240.0, 71220.0, 71270.0, 71240.0]
    };
  });

  // --- Cumulative Stats ---
  const [statsVolume, setStatsVolume] = useState(4820.45);
  const [statsLatency, setStatsLatency] = useState(1.85);

  // --- Active LP (Liquidity Provider) Configuration ---
  const [lps, setLps] = useState<LP[]>([
    { name: "JPM", active: true },
    { name: "BofA", active: true },
    { name: "Citi", active: true },
    { name: "GS", active: true },
    { name: "HSBC", active: true },
    { name: "UBS", active: true },
    { name: "DB", active: true },
    { name: "BNP", active: true },
    { name: "Nomura", active: true },
    { name: "SMBC", active: true },
    { name: "MS", active: true },
    { name: "Barclays", active: true }
  ]);

  // --- Control Coefficients ---
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [spawnIntensity, setSpawnIntensity] = useState(1.0);

  // --- System Logs Output ---
  const [kioskLogs, setKioskLogs] = useState<string[]>([
    `[${new Date().toISOString().substring(11, 19)}] Aggregation core operating on premium sub-2ms network pipeline.`,
    `[${new Date().toISOString().substring(11, 19)}] xSyphon SyphonOS successfully loaded for iFX EXPO Cyprus 2026.`,
    `[${new Date().toISOString().substring(11, 19)}] Initialized zero-knowledge secure lead caching mechanics.`
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

  // --- Random Walk Tick Simulator Effect ---
  useEffect(() => {
    if (reducedMotion) return;
    
    const interval = setInterval(() => {
      setInstruments(prev => {
        const next = prev.map(item => {
          const vol = item.base * 0.00015 + (item.dp <= 2 ? item.base * 0.00015 : 0);
          const pxDelta = (Math.random() - 0.5) * vol * 3.5 * simSpeed;
          const nextPx = Math.max(0.0001, item.px + pxDelta);
          const nextChg = ((nextPx - item.base) / item.base) * 100;
          return {
            ...item,
            px: nextPx,
            chg: nextChg
          };
        });

        // Save selected symbol history inside historyMap
        const currentSelected = next.find(x => x.sym === selectedSym);
        if (currentSelected) {
          setHistoryMap(prevMap => {
            const h = prevMap[selectedSym] || [];
            // limit history length to 30 elements
            const nextH = [...h.slice(-29), currentSelected.px];
            return {
              ...prevMap,
              [selectedSym]: nextH
            };
          });
        }

        return next;
      });

      // Fluctuate statistics slightly for dynamic presentation
      setStatsVolume(v => v + 0.12 * (Math.random() * 1.5));
      setStatsLatency(() => {
        const activeCount = lps.filter(x => x.active).length;
        if (activeCount === 0) return 45.1; // offline lag
        const baseLat = 1.05 + (12 - activeCount) * 0.4;
        const delta = (Math.random() - 0.5) * 0.12;
        return parseFloat(Math.max(0.18, baseLat + delta).toFixed(2));
      });

    }, 1200);

    return () => clearInterval(interval);
  }, [reducedMotion, selectedSym, lps, simSpeed]);

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
    addLog("Diagnostic sequence active: sending ping message packets to 12 target LP clusters...");
    
    setTimeout(() => {
      setTestStage(2);
      addLog("Core calculation module: checking spread matrix, evaluating best bid-ask configuration...");
    }, 1000);

    setTimeout(() => {
      // Create optimal result base on connected banks
      const activeLPs = lps.filter(x => x.active).length;
      let calculatedLatency = 1.25 + (12 - activeLPs) * 0.4 + (Math.random() * 0.3);
      if (activeLPs === 0) calculatedLatency = 45.2;

      const randomSlippage = activeLPs >= 8 ? 0.0 : parseFloat((Math.random() * 0.15).toFixed(2));
      const calculatedFill = activeLPs >= 9 ? 100.0 : parseFloat((95.0 + Math.random() * 4.9).toFixed(1));

      setTestResult({
        latency: parseFloat(calculatedLatency.toFixed(2)),
        slippage: randomSlippage,
        fillRate: calculatedFill,
        status: activeLPs >= 6 ? "OPTIMAL" : activeLPs > 0 ? "DEGRADED" : "CRITICAL SHUTDOWN",
        route: activeLPs >= 8 ? "Direct Memory Access (DMA)" : "Smart Request Router"
      });
      setTestStage(3);
      addLog(`Execution diagnostic results printed: ${calculatedLatency.toFixed(2)}ms latency. slippage: ${randomSlippage} pips.`);
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

  useEffect(() => {
    lpsRef.current = lps;
    activeCountRef.current = lps.filter(x => x.active).length;
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

  // Core Canvas renderer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = canvas.clientWidth;
    let H = canvas.clientHeight;
    let coreX = W * 0.58;
    let coreY = H * 0.5;
    let clientX = W * 0.91;
    let clientY = H * 0.5;
    let corePulse = 0;

    const resize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      coreX = W * 0.58;
      coreY = H * 0.5;
      clientX = W * 0.91;
      clientY = H * 0.5;
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      // Clear black background
      ctx.clearRect(0, 0, W, H);

      const activeBanks = lpsRef.current;
      const isGoldSelected = selectedSym.includes("XAU");

      // 1. Draw subtle dot-matrix background grid for precise quantitative feel
      ctx.fillStyle = isGoldSelected ? "rgba(212, 175, 55, 0.02)" : "rgba(61, 220, 108, 0.02)";
      const dotSpacing = 16;
      for (let x = dotSpacing; x < W; x += dotSpacing) {
        for (let y = dotSpacing; y < H; y += dotSpacing) {
          if ((x + y) % (dotSpacing * 4) === 0) {
            ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
          }
        }
      }

      // 2. Draw modern high-precision coordinate guide grids
      ctx.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.012)" : "rgba(61, 220, 108, 0.012)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 32; x < W; x += 64) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = 32; y < H; y += 64) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();

      // LP to core connection lines (Thin dimmer rail lines)
      activeBanks.forEach((lp, i) => {
        const t = activeBanks.length === 1 ? 0.5 : i / (activeBanks.length - 1);
        const yCoord = H * 0.12 + t * H * 0.76;
        const xCoord = W * 0.08;

        ctx.lineWidth = 0.8;
        if (lp.active) {
          ctx.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.035)" : "rgba(61, 220, 108, 0.035)";
        } else {
          ctx.strokeStyle = "rgba(244, 63, 94, 0.01)";
        }
        ctx.beginPath();
        ctx.moveTo(xCoord, yCoord);
        ctx.lineTo(coreX, coreY);
        ctx.stroke();
      });

      // Core to Client pipeline stream line (Dim underlying track, always Glowing)
      const currentActiveCount = activeCountRef.current;
      if (currentActiveCount > 0) {
        ctx.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.08)" : "rgba(61, 220, 108, 0.08)";
        ctx.lineWidth = 1.0;
      } else {
        ctx.strokeStyle = "rgba(244, 63, 94, 0.05)";
        ctx.lineWidth = 0.8;
      }
      ctx.beginPath();
      ctx.moveTo(coreX, coreY);
      ctx.lineTo(clientX, clientY);
      ctx.stroke();

      // Draw LP nodes on the left side
      activeBanks.forEach((lp, i) => {
        const t = activeBanks.length === 1 ? 0.5 : i / (activeBanks.length - 1);
        const yCoord = H * 0.12 + t * H * 0.76;
        const xCoord = W * 0.08;

        ctx.fillStyle = "#04070a";
        if (lp.active) {
          ctx.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.8)" : "rgba(61, 220, 108, 0.85)";
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          ctx.arc(xCoord, yCoord, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Render bank label with crisp styling
          ctx.fillStyle = "rgba(180, 205, 190, 0.85)";
          ctx.font = "bold 9px ui-monospace, SFMono-Regular, Consolas, monospace";
          ctx.textAlign = "right";
          ctx.fillText(lp.name, xCoord - 10, yCoord + 3.2);
        } else {
          ctx.strokeStyle = "rgba(244, 63, 94, 0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(xCoord, yCoord, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "rgba(244, 63, 94, 0.35)";
          ctx.font = "8px ui-monospace, SFMono-Regular, Consolas, monospace";
          ctx.textBaseline = "middle";
          ctx.textAlign = "right";
          ctx.fillText(lp.name, xCoord - 8, yCoord);
        }
      });

      // Render flowing particles with high-speed gradient trailing laser beams
      const particles = particlesRef.current;
      for (let k = particles.length - 1; k >= 0; k--) {
        const p = particles[k];

        // Terminate particle path if source LP is toggled active -> inactive
        const bankCheck = activeBanks.find(x => x.name === p.srcLP);
        if (p.stage === 0 && (!bankCheck || !bankCheck.active)) {
          particles.splice(k, 1);
          continue;
        }

        p.t += p.sp * simSpeedRef.current;

        // Custom cubic-bezier easing to emulate exponential speed rocket launch:
        // stage 0 (lp to core): ultra speed-up as it approaches core
        // stage 1 (core to client): fast shooting leap
        const easedT = p.stage === 0 
          ? Math.pow(p.t, 2.2) // ease-in feel
          : 1 - Math.pow(1 - p.t, 2.5); // ease-out snap leap

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
            p.sp = 0.035 * simSpeedRef.current; // even faster projection
            corePulse = 1.3; // increase glow pulse on impact
          } else {
            particles.splice(k, 1);
            continue;
          }
        }

        const alpha = 0.6 + 0.4 * Math.sin(p.t * Math.PI);

        // Draw elegant high-precision trail lines
        const segments = 8;
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

        // Star core point (White focus point)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(currentX, currentY, p.stage === 1 ? 1.8 : 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Main particle envelope glow
        ctx.fillStyle = p.c + alpha + ")";
        ctx.beginPath();
        ctx.arc(currentX, currentY, p.stage === 1 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render CORE "Syphon OS" central hub node with high-precision glowing structure
      corePulse *= 0.93;
      const coreRadius = 15 + corePulse * 8;
      const coreGrad = ctx.createRadialGradient(coreX, coreY, 2, coreX, coreY, coreRadius + 26);

      if (currentActiveCount > 0) {
        if (isGoldSelected) {
          // Inner bright light, fading to amber gold
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
          coreGrad.addColorStop(0.2, "rgba(255, 246, 212, 0.95)");
          coreGrad.addColorStop(0.5, "rgba(212, 175, 55, 0.5)");
          coreGrad.addColorStop(1, "rgba(212, 175, 55, 0)");
        } else {
          // Inner bright light, fading to brand neon green
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

      // Draw multi-layered outer glow ring
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreRadius + 26, 0, Math.PI * 2);
      ctx.fill();

      // Double laser-radius ring
      if (currentActiveCount > 0) {
        ctx.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.25)" : "rgba(61, 220, 108, 0.25)";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(coreX, coreY, coreRadius + 9, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Apply canvas drop-shadow effect specifically on center disc
      ctx.save();
      if (currentActiveCount > 0) {
        ctx.shadowColor = isGoldSelected ? "rgba(212, 175, 55, 1.0)" : "rgba(61, 220, 108, 1.0)";
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowColor = "rgba(244, 63, 94, 1.0)";
        ctx.shadowBlur = 8;
      }

      // Solid central core card back
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
      ctx.restore(); // Restore shadow setting right away so it doesn't affect other text

      // "X" core symbol inside Central Spot with white-to-green crisp text
      ctx.fillStyle = currentActiveCount > 0 ? "#ffffff" : "#f43f5e";
      ctx.font = "bold 12px ui-monospace, SFMono-Regular, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("X", coreX, coreY);

      // Labeling aggregate info inside canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 9px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText("SyphonOS Core", coreX, coreY - 24);

      // Render CLIENT "YOU" Node
      ctx.fillStyle = "#020406";
      if (currentActiveCount > 0) {
        ctx.strokeStyle = isGoldSelected ? "rgba(212, 175, 55, 0.85)" : "rgba(61, 220, 108, 0.9)";
        ctx.lineWidth = 1.8;
      } else {
        ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
        ctx.lineWidth = 1.0;
      }

      ctx.beginPath();
      ctx.arc(clientX, clientY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = currentActiveCount > 0 ? "#ffffff" : "rgba(244, 63, 94, 0.7)";
      ctx.font = "bold 8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("YOU", clientX, clientY);

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
    const endpoint = config.formEndpoint || "";
    const isLocalDemo = !endpoint || endpoint.toLowerCase().includes("formspree_id");
    const isOfflineMode = typeof navigator !== "undefined" && !navigator.onLine;

    if (isLocalDemo || isOfflineMode) {
      // Local mail fallback routine
      setTimeout(() => {
        let textBody = `xSyphon Cyprus 2026 Kiosk Booth Registration:\n\n`;
        textBody += `Contact Name: ${leadInputs.name}\n`;
        textBody += `Institutional Company: ${leadInputs.company}\n`;
        textBody += `Email Contact: ${leadInputs.email}\n`;
        textBody += `Simulated Volume Level: ${leadInputs.volume}\n`;
        textBody += `Message requirement: ${leadInputs.requirement || "NONE"}\n\n`;
        textBody += `[Transmitted offline via interactive touch kiosk UI]`;

        const mailtoLink = `mailto:${config.fallbackEmail || "desk@xsyphon.com"}?subject=${encodeURIComponent("iFX EXPO Cyprus lead")}&body=${encodeURIComponent(textBody)}`;
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
        body: JSON.stringify(leadInputs),
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
          text: (errorData?.errors && errorData.errors[0]?.message) || "Transmission protocol error. Please contact desk@xsyphon.com"
        });
      }
    } catch (err) {
      setFormFeedback({
        type: "err",
        text: "Connectivity degraded. Activating offline protocol mail pipeline..."
      });
      const mailtoLink = `mailto:${config.fallbackEmail || "desk@xsyphon.com"}?subject=${encodeURIComponent("iFX EXPO Cyprus backup lead")}&body=${encodeURIComponent(JSON.stringify(leadInputs))}`;
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
      fallbackEmail: tempEmail.trim() || "desk@xsyphon.com"
    };
    setConfig(updated);
    localStorage.setItem("XSYPHON_CONFIG", JSON.stringify(updated));
    setShowConfig(false);
    addLog("Custom kiosk operational credentials registered to storage.");
  };

  const loadKioskBoilerplate = (mode: "expo-onsite" | "reset") => {
    if (mode === "expo-onsite") {
      setTempEndpoint("https://formspree.io/f/xbjnqjpz");
      setTempCalendly("https://calendly.com/xsyphon-liquidity/2026-cyprus");
      setTempEmail("cyprus-desk@xsyphon.com");
    } else {
      setTempEndpoint("");
      setTempCalendly("");
      setTempEmail("desk@xsyphon.com");
    }
  };

  // Sparkline Chart generation function
  const renderSparkline = (symbol: string) => {
    const historicalSeries = historyMap[symbol] || [];
    if (historicalSeries.length < 2) return null;

    const minVal = Math.min(...historicalSeries);
    const maxVal = Math.max(...historicalSeries);
    const valRange = maxVal - minVal || 1;

    const svgW = 190;
    const svgH = 50;
    const paddingOffset = 5;

    const coordinateString = historicalSeries.map((price, idx) => {
      const x = paddingOffset + (idx / (historicalSeries.length - 1)) * (svgW - paddingOffset * 2);
      const y = svgH - paddingOffset - ((price - minVal) / valRange) * (svgH - paddingOffset * 2);
      return `${x},${y}`;
    }).join(" ");

    const finalVal = historicalSeries[historicalSeries.length - 1];
    const initialVal = historicalSeries[historicalSeries.length - 2];
    const isGrowing = finalVal >= initialVal;
    
    // Choose neon golden hue for gold symbols, brand neon green for others
    const isGold = symbol.includes("XAU");
    const strokeLineColor = isGold ? "#D4AF37" : (isGrowing ? "#3ddc6c" : "#f43f5e");

    return (
      <div className="relative w-full h-[52px] bg-black/40 rounded-lg border border-slate-900/60 overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={strokeLineColor}
            strokeWidth="2.0"
            points={coordinateString}
          />
          <path
            d={`M ${paddingOffset},${svgH} L ${coordinateString} L ${svgW - paddingOffset},${svgH} Z`}
            fill={`url(#line-grad-${symbol.replace("/", "-")})`}
            opacity="0.12"
          />
          <defs>
            <linearGradient id={`line-grad-${symbol.replace("/", "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeLineColor} />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle
            cx={paddingOffset + (historicalSeries.length - 1) / (historicalSeries.length - 1) * (svgW - paddingOffset * 2)}
            cy={svgH - paddingOffset - ((finalVal - minVal) / valRange) * (svgH - paddingOffset * 2)}
            r="3"
            fill={strokeLineColor}
            className="animate-ping"
          />
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
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#3ddc6c]/6 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-yellow-500/3 rounded-full blur-[110px] pointer-events-none" />

      {/* Main Structural Wrapper */}
      <div id="mainInterface" className="w-full max-w-[1530px] mx-auto px-4 py-3 flex-1 flex flex-col justify-between gap-3.5">
        
        {/* HEADER BRAND BLOCK */}
        <header id="appHeader" className="flex flex-col md:flex-row items-center justify-between gap-4 py-3.5 px-5 bg-black/60 border border-slate-900/80 rounded-2xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3ddc6c]/20 to-transparent" />
          
          <div className="flex items-center gap-3.5">
            {/* Geometric Glowing Logo */}
            <div className="h-11 w-11 relative flex items-center justify-center bg-slate-950 border border-[#3ddc6c]/35 rounded-xl shadow-lg shadow-[#3ddc6c]/5">
              <svg className="w-7 h-7 text-[#3ddc6c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                <path d="M4 4l16 16M20 4L4 20" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3.2" fill="#040608" stroke="currentColor" strokeWidth="2" />
                <circle cx="4" cy="4" r="1.5" fill="#3ddc6c" className="animate-pulse" />
                <circle cx="20" cy="20" r="1.5" fill="#3ddc6c" className="animate-pulse" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-display tracking-tight text-white">xSyphon</span>
                <span className="px-2 py-0.5 text-[9px] uppercase font-mono font-bold tracking-widest bg-[#3ddc6c]/10 text-[#3ddc6c] border border-[#3ddc6c]/25 rounded">
                  iFX CYPRUS 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-wider">
                SYPHON OS CORE // INSTARS AGGREGATION &amp; DISCOVERY
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
              <div>Kiosk ID // #cy-0414</div>
              <div className="text-[#3ddc6c] font-bold text-[9px] tracking-widest animate-pulse">● PROTOCOL ONLINE</div>
            </div>
          </div>
        </header>

        {/* HERO INTRO SUB-BANNER: Decrypting Title */}
        <section id="heroVault" className="py-7 px-6 bg-gradient-to-r from-slate-950/90 to-transparent border border-slate-900/60 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_right_top,rgba(61,220,108,0.06),transparent_65%)]" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <span className="text-[#3ddc6c] font-mono text-[10px] tracking-[0.25em] block uppercase font-bold">
                Premium liquidity infrastructure
              </span>
              <h2 className="text-xl md:text-2xl font-mono font-bold tracking-tight text-white">
                {decodedTitle}
                {isDecoding && <span className="animate-pulse ml-0.5 font-sans">|</span>}
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Experience institutional FX &amp; metals aggregation with zero markup and direct, sub-millisecond execution. Bypass complex clearing channels and access primary liquidity through a single, secure gateway.
              </p>
            </div>

            {/* Quick Stats on the screen styled as Glass Cards */}
            <div className="flex flex-wrap gap-2 md:shrink-0">
              <div className="glass-card px-4 py-2.5 rounded-xl border-slate-900/60 flex flex-col min-w-[100px]">
                <span className="text-[10px] text-slate-400 font-mono">LIQUIDITY</span>
                <span className="text-lg font-bold font-mono text-white text-glow">$1B+</span>
              </div>
              <div className="glass-card px-4 py-2.5 rounded-xl border-slate-900/60 flex flex-col min-w-[100px]">
                <span className="text-[10px] text-slate-400 font-mono">CHANNELS</span>
                <span className="text-lg font-bold font-mono text-[#3ddc6c]">12 T-1</span>
              </div>
              <div className="glass-card px-4 py-2.5 rounded-xl border-slate-900/60 flex flex-col min-w-[100px]">
                <span className="text-[10px] text-slate-400 font-mono">LATENCY</span>
                <span className="text-lg font-bold font-mono text-white">~1.5ms</span>
              </div>
            </div>
          </div>
        </section>

        {/* COMPREHENSIVE SIMULATED REALTIME RATES MARQUEE */}
        <section id="ratesMarquee" className="bg-[#030609]/95 border border-slate-900/70 rounded-xl overflow-hidden py-2.5 px-4 flex items-center relative gap-4">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#040608] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#040608] to-transparent z-10" />
          
          <div className="font-mono text-[9px] font-bold tracking-widest text-[#3ddc6c] shrink-0 uppercase bg-slate-950 px-2.5 py-1 border border-[#3ddc6c]/20 rounded shadow z-10 text-glow flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc6c] animate-pulse" />
            LIVE SPECS
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
                          {ins.px.toLocaleString("en-US", { minimumFractionDigits: ins.dp, maximumFractionDigits: ins.dp })}
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
                            {ins.px.toLocaleString("en-US", { minimumFractionDigits: ins.dp, maximumFractionDigits: ins.dp })}
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

              {/* Sparklines display */}
              <div className="pt-3 border-t border-slate-900/80">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <TrendingUp className="w-3.5 h-3.5 text-[#3ddc6c]" />
                    {selectedSym} Sparkline (30t)
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {selectedAsset.px.toLocaleString("en-US", { minimumFractionDigits: selectedAsset.dp })}
                  </span>
                </div>
                {renderSparkline(selectedSym)}
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
                    Realtime WebGL Network Frame Map
                  </span>
                </div>

                {/* Aggregator HTML5 Canvas component with 3D Holographic Perspective */}
                <div 
                  className="relative w-full aspect-[4/3.1] bg-[#05070a]/95 border border-slate-900/90 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group mb-4 transition-all duration-500 hover:border-[#3ddc6c]/25"
                  style={{ 
                    perspective: "1200px",
                    transformStyle: "preserve-3d"
                  }}
                >
                  <div 
                    className="absolute inset-0 w-full h-full transition-all duration-700 ease-out"
                    style={{
                      transform: "rotateY(-10deg) rotateX(5deg) scale(0.98) translateZ(0)",
                      transformStyle: "preserve-3d"
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full cursor-crosshair block z-10"
                    />
                  </div>
                  
                  {/* Floating Labels */}
                  <div className="absolute top-3 left-3 pointer-events-none font-mono text-[9px] bg-slate-950/80 border border-slate-900/50 px-2 py-0.5 rounded text-slate-400 z-20">
                    Tier-1 Feeds
                  </div>
                  <div className="absolute top-3 right-3 pointer-events-none font-mono text-[9px] bg-slate-950/80 border border-slate-900/50 px-2 py-0.5 rounded text-slate-400 z-20">
                    Integrated API Terminal
                  </div>
                  <div className="absolute bottom-3 left-3 pointer-events-none font-mono text-[9px] bg-emerald-950/40 border border-emerald-900/30 px-2' py-1 rounded text-[#3ddc6c] flex items-center gap-1.5 z-20">
                    <Zap className="w-2.5 h-2.5 text-[#3ddc6c] animate-bounce" />
                    Direct Memory Core
                  </div>

                  {lps.filter(x => x.active).length === 0 && (
                    <div className="absolute inset-0 bg-rose-950/20 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-5 z-20">
                      <AlertTriangle className="w-9 h-9 text-rose-500 mb-2 animate-bounce" />
                      <h4 className="text-white font-mono font-bold text-xs uppercase tracking-widest text-shadow">No Feeds Connected</h4>
                      <p className="text-rose-300 font-mono text-[10px] max-w-[250px] mt-1.5 leading-relaxed">
                        Toggle one or more Tier-1 institutional banks below to re-initiate aggregation pipelines.
                      </p>
                    </div>
                  )}
                </div>

                {/* Multi bank activation toggles */}
                <div>
                  <div className="text-[10px] font-mono text-slate-400 mb-2 flex justify-between items-center bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-900/60">
                    <span className="font-bold text-[#3ddc6c] uppercase">Interactive Banks cluster</span>
                    <span>Toggle channels to filter liquidity pools</span>
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
                <span className="text-[9px] uppercase font-mono tracking-widest text-[#3ddc6c] mb-1 block font-bold">Latency</span>
                <span className="text-sm font-bold tracking-tight text-white font-mono">
                  {statsLatency.toFixed(2)} ms
                </span>
              </div>

              <div className="bg-black/60 p-3 rounded-xl border border-slate-900/60 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 mb-1 block font-bold">Aggregated</span>
                <span className="text-sm font-bold tracking-tight text-[#3ddc6c] font-mono">
                  {lps.filter(x => x.active).length} Banks
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
                XAU/CNH Liquidity Vault
              </h4>
              <p className="text-[11px] text-amber-200/85 mb-3 leading-relaxed">
                Unlock competitive cross-hedging spreads. Discover rare Chinese Renminbi bullion pairing with zero last-look constraints under Syphon Smart Routing patterns.
              </p>

              {/* Golden Mini Specifications Box */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-amber-100/90">
                <div className="bg-amber-950/20 px-2.5 py-1.5 rounded border border-amber-500/10">
                  <span className="text-slate-400 block text-[9px] uppercase">Spread Spec:</span>
                  <span className="font-bold text-amber-400">0.12 Pips Flat</span>
                </div>
                <div className="bg-amber-950/20 px-2.5 py-1.5 rounded border border-amber-500/10">
                  <span className="text-slate-400 block text-[9px] uppercase">Execution Level:</span>
                  <span className="font-bold text-amber-300">100% DMA Fill</span>
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

              {/* Book meeting call to action */}
              {config.calendlyUrl && (
                <div className="mt-3 pt-3 border-t border-slate-950/60">
                  <a
                    href={config.calendlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center font-mono text-[10px] text-amber-400 hover:text-amber-300 font-bold tracking-wider block hover:underline"
                  >
                    📅 OR SCHEDULE PRIVATE DISCUSSIONS AT BOOTH →
                  </a>
                </div>
              )}
            </div>

          </section>

        </div>

      </div>

      {/* FOOTER */}
      <footer className="w-full py-4 text-center text-[10px] font-mono text-slate-600 bg-black/35 border-t border-slate-950/80 mt-4">
        <div>
          xSyphon © 2026. Custom Institutional Liquidity Widget for iPad/Booth Kiosk operations.
        </div>
        <div className="text-[9px] mt-1 text-slate-500">
          All live streams and pricing data generated in high fidelity simulation representing global liquidity vaults.
        </div>
      </footer>

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
                  placeholder="desk@xsyphon.com"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="w-full bg-[#030609] border border-slate-900 rounded-xl p-2 text-white font-mono outline-none"
                />
                <span className="text-[8.5px] text-slate-500 block mt-1 leading-normal">
                  Destination target for offline registration fallbacks. Default is desk@xsyphon.com.
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
