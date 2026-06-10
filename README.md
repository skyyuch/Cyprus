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
- **Lead capture** — name / company / email / volume / requirement, tagged `event: iFX EXPO Cyprus 2026 · Booth 76`.
  Posts to Formspree if configured, otherwise opens a pre-filled email. Plus Calendly + vCard CTAs.

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

**Cloudflare Pages / Vercel:** connect this repo →
- Build command: `npm run build`
- Output directory: `dist`

You'll get a URL like `xsyphon-cyprus.pages.dev`. Later you can add a custom domain
(e.g. `cyprus.xsyphon.com`) via CNAME.

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
