# अंतरिक्ष — Antariksh 2026

**Conclave · Awards · Expo**  
India's premier forum for Vedic Sciences, Astrology & Conscious Living.  
_An initiative by NBT Astro, presented by Times Internet._

---

## Overview

Antariksh 2026 is a world-class B2B/B2C event platform for the Vedic Sciences community. This repository contains the production-ready static website featuring:

- 🪐 **Immersive hero** with canvas starfield, animated zodiac wheel, and parallax depth layers
- 🏛️ **Multi-page SPA** — Home, Conclave, Awards, Expo, Partners, Registration, Consultation
- 🎖️ **Award nomination system** with category cards and eligibility criteria
- 📋 **Speaker / Jury / Expert directory** with discipline badges
- 💸 **Tiered registration & sponsorship** with interactive pricing cards
- 📍 **Venue & agenda** explorer with tabbed schedule
- 📱 **Fully responsive** — optimised across mobile, tablet, and desktop
- ♿ **Accessible** — reduced-motion support, semantic HTML, keyboard navigable

---

## Tech Stack

| Layer | Choice |
|---|---|
| Markup | HTML5 (semantic) |
| Styling | Vanilla CSS (custom design tokens, no framework) |
| Logic | Vanilla JS (IIFE, no bundler required) |
| Fonts | Google Fonts — Outfit · Inter · Noto Sans Devanagari |
| Assets | Inline SVG sprites (zero external image requests) |

---

## Project Structure

```
antariksh/
├── index.html              # Single-page entry point (all pages via hash routing)
├── styles.css              # Full design system — tokens, layout, components, responsive
├── app.js                  # SPA router, loader, scroll FX, parallax, form validation
├── particles.js            # Canvas 2D starfield (hero background, desktop only)
├── antariksh_content.json  # Source-of-truth content (all sections, speakers, schedule…)
└── .gitignore
```

---

## Local Development

No build step required — serve any static file server:

```bash
# Python (built-in)
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080).

---

## Content Source

All content is driven by `antariksh_content.json`. This file is the single source of truth for:
- Navigation structure
- Speaker & jury profiles
- Award categories
- Agenda / schedule
- Pricing tiers
- Partner / sponsor tiers

---

## Performance Notes

- Hero starfield uses tiled `background-size` (10 gradients) instead of 55+ individual gradient definitions
- Nebula blur is scoped to a sized `::before` pseudo-element — not full-screen
- `backdrop-filter` removed from stat items; reduced to `blur(8px)` on cards
- `touch-action: manipulation` on all interactive elements eliminates 300ms tap delay on mobile
- Safe area insets (`env(safe-area-inset-*)`) applied to navbar and floating CTA
- Loader uses power-curve easing (`Math.pow(t, 0.65)`) — no 99% stall
- All heavy animations disabled on `prefers-reduced-motion: reduce`

---

## License

© 2026 NBT Astro / Times Internet. All rights reserved.
