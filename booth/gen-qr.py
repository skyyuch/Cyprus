#!/usr/bin/env python3
"""Generate the booth QR code for the xSyphon Cyprus microsite.

Usage:
    python3 gen-qr.py "https://your-deployed-url.pages.dev"

Outputs (in this folder):
    qr.png  — brand-coloured QR (neon green on near-black) for the printable card
    qr.svg  — vector version (scales to any size without blur)

After deploying the site, run this with the real URL, then re-print qr-card.html.
"""
import sys
import segno

URL = sys.argv[1] if len(sys.argv) > 1 else "https://REPLACE-WITH-DEPLOYED-URL.pages.dev"

DARK = "#060807"   # near-black background (matches site)
LIGHT = "#3ddc6c"  # neon green modules (matches brand)

qr = segno.make(URL, error="h")  # high error correction = robust scanning at the booth
qr.save("qr.png", scale=16, border=4, dark=LIGHT, light=DARK)
qr.save("qr.svg", scale=16, border=4, dark=LIGHT, light=DARK)

print("QR generated for: %s" % URL)
print("  -> qr.png / qr.svg")
if "REPLACE-WITH-DEPLOYED-URL" in URL:
    print("\n[!] Placeholder URL used. Re-run with your real deployed URL before the expo:")
    print('    python3 gen-qr.py "https://xsyphon-cyprus.pages.dev"')
