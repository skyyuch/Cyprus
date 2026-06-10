# xSyphon — iFX EXPO Cyprus 2026 (Booth 76)

Interactive booth microsite for the xSyphon liquidity desk. Built as a single-screen
"trading HUD" optimised for an iPad kiosk and for visitors who scan the booth QR code.

Stack: React 19 + Vite 6 + Tailwind 4. Offline-capable PWA (installable on iPad).
Self-contained — no live market feed, no backend required to run.

## What's on screen

- **Decoding hero** — "Built on Depth. Defined by Precision." + $1B+ daily volume, 12 tier-1 LPs, 5ms execution.
- **Live specs marquee + exchange monitor** — simulated tick prices, sparklines (illustrative).
- **Aggregation core canvas** — 12 anonymised tier-1 sources (`LP-01…LP-12`) → Syphon OS core → client.
  Toggle feeds on/off to watch the smart router re-aggregate; speed/intensity sliders.
- **XAU/CNH spotlight** — gold-vs-offshore-RMB edge (from 50 g, 24/5, STP, zero last look).
- **Ping Syphon Core** — interactive speed test (0.8ms routing core, slippage, fill 99.7%).
- **Ask Aether** — a live, Gemini-driven AI execution desk (see below).
- **Lead capture** — name / company / email / volume / requirement, tagged `event: iFX EXPO Cyprus 2026 · Booth 76`.
  Posts to Formspree if configured, otherwise opens a pre-filled email. Plus Calendly + vCard CTAs.

## Ask Aether (AI live desk demo)

The **Ask Aether** button (top-right) opens an overlay where a real Gemini agent
prices, routes and risk-manages institutional flow by calling desk tools over the
live feed. It demonstrates five scenarios: LP spread comparison, parameter changes,
order routing (A/B-book), risk/NOP status, and simulated execution.

- **Real LLM:** Gemini (`gemini-2.5-flash`, function calling) via a stateless proxy.
- **The key never reaches the browser.** The front-end posts to `/api/agent`; the
  proxy injects `GEMINI_API_KEY` server-side and forwards to Gemini.
  - Local dev: a Vite middleware (`vite.config.ts`) serves `/api/agent`, reading
    `GEMINI_API_KEY` from `.env`.
  - Production: a Cloudflare Pages Function (`functions/api/agent.ts`) does the same,
    reading the key from a Pages secret. Both share `functions/_lib/gemini.ts`.
- **Simulated world, real prices:** LPs (`LP-01…LP-12`), pricing parameters, the
  routing engine and the risk book are a deterministic simulation in `src/agent/`.
  Mid prices come from the live guest feed. Everything is labelled illustrative.
- **Offline:** if `/api/agent` or the network is unreachable, the chat shows
  "AI desk offline" while the dashboard and live prices keep working.

Set up the key locally:

```bash
cp .env.example .env
# edit .env and set GEMINI_API_KEY=your-real-key
npm run dev
```

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build to dist/
npm run preview  # serve the production build
npm run lint     # tsc --noEmit
```

## Configure (no code edits)

Click the **gear icon** (top-right) on the kiosk to set, per-device:

- **Formspree endpoint** — e.g. `https://formspree.io/f/xxxxxx` (sign up at formspree.io, create a form).
  Leave blank to use the email fallback instead.
- **Calendly URL** — your meeting-booking link.
- **Fallback desk email** — where offline leads are sent (default `desk@xsyphon.com`).

Settings are saved in the browser's `localStorage` (`XSYPHON_CONFIG`), so each iPad keeps its own config.

## Deploy

Any static host works (output dir is `dist/`).

**Cloudflare Pages (recommended — runs the Aether proxy):** connect this repo →
- Build command: `npm run build`
- Output directory: `dist`
- The `functions/` folder is auto-deployed as Pages Functions (gives you `/api/agent`).
- In **Settings → Environment variables**, add a secret `GEMINI_API_KEY` (and optionally
  `GEMINI_MODEL`). Without it, the booth still works but "Ask Aether" shows AI offline.

You'll get a URL like `xsyphon-cyprus.pages.dev`. Later you can add a custom domain
(e.g. `cyprus.xsyphon.com`) via CNAME.

> **Vercel / other static hosts:** the static site works, but `/api/agent` won't exist
> unless you port `functions/api/agent.ts` to that platform's serverless function format.
> Cloudflare Pages is the path of least resistance here.

## iPad kiosk (offline-ready)

1. Open the deployed URL in **Safari once while online** (this caches the app + fonts).
2. Share → **Add to Home Screen**.
3. Launch from the home-screen icon → runs full-screen, works even if booth Wi-Fi drops.
4. Optional: enable **Guided Access** (Settings → Accessibility) to lock the iPad to this app.

## QR code + printable card (`booth/`)

```bash
cd booth
python3 -m venv .venv && source .venv/bin/activate
pip install segno
python gen-qr.py https://YOUR-DEPLOYED-URL   # writes qr.png / qr.svg (brand colours)
```

Then open `booth/qr-card.html` in a browser and print to A5/A6 for a "Scan me" stand card.

## Booth checklist

- [ ] Deploy and confirm the public URL loads.
- [ ] Regenerate the QR with the **real** URL (`booth/gen-qr.py`).
- [ ] On the iPad: open online once → Add to Home Screen → test offline (airplane mode).
- [ ] In-app gear: set Formspree endpoint, Calendly link, fallback email.
- [ ] Submit one test lead and confirm it arrives.
- [ ] Update `public/xsyphon.vcf` with your real contact details.
- [ ] Print `booth/qr-card.html`.

## Data & compliance notes

- All prices, latency figures and the speed test are **client-side simulations**, labelled illustrative — not a live feed.
- LP nodes are **anonymised** (`LP-01…LP-12`); no third-party / bank trademarks are shown.
- Figures align with published xsyphon.com / internal KB values:
  $1B+ daily volume · 12 tier-1 LPs · 5ms execution · 0.8ms routing core · 99.7% fill · zero last look ·
  co-location LD4/NY4/TY3/SG1 · 50+ instruments. XAU/CNH: from 50 g, 24/5, STP.
- Footer carries the regulatory line (FSC Mauritius GB25204632 · MiFID II / UK FCA) and a risk disclosure.

> Review all on-screen copy with compliance before the expo if anything changes.
