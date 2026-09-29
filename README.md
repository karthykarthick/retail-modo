# 💜 Retail Modo

> **Commerce, in a richer light.** — an animated, glassmorphic retail command center + a one-click Excel report, built with **zero frameworks** (vanilla HTML/CSS/JS) and **one shared dataset**.

![status](https://img.shields.io/badge/status-live-brightgreen) ![stack](https://img.shields.io/badge/stack-vanilla%20JS-7c3aed) ![excel](https://img.shields.io/badge/report-.xlsx%20·%205%20sheets-0891b2) ![deps](https://img.shields.io/badge/frontend%20deps-0-success) ![license](https://img.shields.io/badge/license-MIT-ec4899)

---

## ✨ What's inside

| | |
|---|---|
| 🖥️ **Animated dashboard site** (`index.html`) | Preloader, drifting gradient blobs, word rotator, 3D-tilt product cards, self-drawing canvas revenue chart with hover tooltips, animated donut & bars, count-up KPIs, sortable/filterable tables, light–dark themes, scroll-reveal everywhere |
| 📊 **Excel report** (`Retail-Modo-Report.xlsx`) | 5 formatted sheets — *Dashboard, Monthly Sales, Products, Channel Mix, Orders* — with native Excel charts, data bars, conditional formatting, auto-filters and frozen headers |
| 🗃️ **Single source of truth** (`data/retail-data.json`) | One JSON file drives **both** the website and the workbook. Change it, re-run the generator, everything stays in sync |

## 🚀 Quick start

```bash
# 1. Serve the site (any static server works)
python3 -m http.server 4173 --bind 0.0.0.0
# → open http://localhost:4173

# 2. Regenerate the Excel report after editing the data
pip install openpyxl
python3 scripts/generate_excel.py
```

## 🧭 Site tour

| Section | Highlights |
|---|---|
| **Hero** | Animated gradient mesh, rotating headline word, floating glass revenue card with self-drawing sparkline, magnetic CTA buttons |
| **Ticker** | Infinite marquee of business highlights (pauses on hover) |
| **Overview** | 6 KPI cards with count-up numbers, YoY deltas, sparklines and a cursor-following spotlight |
| **Trends** | Canvas revenue chart that draws itself on scroll — hover any month for orders/AOV/MoM; annual-target progress bar; insight cards |
| **Mix** | Animated category donut, channel & region bars with shine sweeps, category growth tiles |
| **Catalog** | 16 product cards with 3D tilt + cursor shine, category chips, plus a searchable/sortable table with inline margin bars |
| **Orders** | Live-feeling order feed — status pills, channel/status filters, search, sortable columns, footer totals |
| **Extras** | Scroll-progress bar, active-section nav highlighting, back-to-top, ripple buttons, toast notifications, `prefers-reduced-motion` support, fully responsive |

## 📊 Excel workbook contents

| Sheet | What you get |
|---|---|
| **Dashboard** | KPI table with Δ vs LY, annual-target progress, category summary with data bars + column & pie charts, reading guide |
| **Monthly Sales** | 12 months of net revenue / orders / AOV / MoM growth + combo chart (revenue bars vs orders line on a secondary axis) |
| **Products** | Full catalog with margins, data-bar conditional formatting, auto-filter and a Top-8-by-revenue bar chart |
| **Channel Mix** | Channel and regional splits with data bars + two pie charts |
| **Orders** | Latest order log with status color-coding, auto-filter and totals |

## 🗂️ Project structure

```
retail-modo/
├── index.html                 # The whole experience (semantic, accessible)
├── css/styles.css             # Design system: themes, glassmorphism, animations
├── js/app.js                  # Charts, counters, tilt, filters — all vanilla JS
├── js/data.js                 # Auto-generated fetch() fallback (from the JSON)
├── data/retail-data.json      # ⭐ Single source of truth
├── scripts/generate_excel.py  # openpyxl report builder
└── Retail-Modo-Report.xlsx    # Generated artifact (don't edit by hand)
```

## 🔧 Extend it

1. Edit `data/retail-data.json` (add products, months, orders…)
2. Refresh the browser — the site picks it up
3. Run `python3 scripts/generate_excel.py` — the workbook follows

```jsonc
// data/retail-data.json shape
{
  "meta":      { "period", "annualTarget", … },
  "kpis":      [{ "label", "value", "format", "delta" }],
  "monthly":   [{ "month", "revenue", "orders", "aov" }],
  "categories":[{ "name", "revenue", "units", "share", "growth" }],
  "channels":  [{ "name", "share", "revenue" }],
  "regions":   [{ "name", "share", "revenue" }],
  "products":  [{ "sku", "name", "category", "price", "cost", "stock", "sold", "rating", "growth" }],
  "orders":    [{ "id", "date", "customer", "product", "qty", "channel", "region", "status", "amount" }]
}
```

> ℹ️ KPIs are **trailing-12-month net** figures; product revenues are **all-time gross** — the workbook labels both.

---

Built with 🎨 vanilla HTML · CSS · JS — no frameworks, no build step, no chart libraries. Excel via Python `openpyxl`.
