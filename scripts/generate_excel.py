#!/usr/bin/env python3
"""
Retail Modo — Excel report generator
Reads data/retail-data.json (single source of truth) and produces
Retail-Modo-Report.xlsx: 5 formatted sheets with native Excel charts.

Usage:  python3 scripts/generate_excel.py
"""

import json
import os
import sys
from datetime import date

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, PieChart, Reference
from openpyxl.formatting.rule import CellIsRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "data", "retail-data.json")
OUT_PATH = os.path.join(ROOT, "Retail-Modo-Report.xlsx")

# ── Palette ──────────────────────────────────────────────────────────
INK = "1E1B4B"        # deep indigo — title bands
HEADER = "4C1D95"     # violet — table headers
ACCENT = "7C3AED"     # brand violet
ACCENT2 = "0891B2"    # brand cyan
STRIPE = "F5F3FF"     # alternating row
BORDER_C = "DDD6FE"
GOOD = "059669"
BAD = "DC2626"

THIN = Side(style="thin", color=BORDER_C)
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
HEAD_FILL = PatternFill("solid", fgColor=HEADER)
STRIPE_FILL = PatternFill("solid", fgColor=STRIPE)
TITLE_FILL = PatternFill("solid", fgColor=INK)

F_TITLE = Font(name="Segoe UI", size=16, bold=True, color="FFFFFF")
F_SUB = Font(name="Segoe UI", size=10, color="C7D2FE")
F_HEAD = Font(name="Segoe UI", size=10.5, bold=True, color="FFFFFF")
F_BODY = Font(name="Segoe UI", size=10.5)
F_BOLD = Font(name="Segoe UI", size=10.5, bold=True)
F_KPI = Font(name="Segoe UI", size=14, bold=True, color=INK)
F_GOOD = Font(name="Segoe UI", size=10.5, bold=True, color=GOOD)
F_BAD = Font(name="Segoe UI", size=10.5, bold=True, color=BAD)

CENTER = Alignment(horizontal="center", vertical="center")
LEFT = Alignment(horizontal="left", vertical="center")
RIGHT = Alignment(horizontal="right", vertical="center")

FMT_MONEY = '$#,##0'
FMT_MONEY2 = '$#,##0.00'
FMT_INT = '#,##0'
FMT_PCT = '0.0%'
FMT_STAR = '0.0"★"'


def load_data():
    with open(DATA_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def sheet_title(ws, text, subtitle, span=9):
    """Merged dark banner across the top of a sheet."""
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=span)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=span)
    c = ws.cell(row=1, column=1, value=text)
    c.font, c.fill, c.alignment = F_TITLE, TITLE_FILL, CENTER
    s = ws.cell(row=2, column=1, value=subtitle)
    s.font, s.fill, s.alignment = F_SUB, TITLE_FILL, CENTER
    ws.row_dimensions[1].height = 30
    ws.row_dimensions[2].height = 18


def write_header(ws, row, headers, start_col=1):
    for j, h in enumerate(headers, start=start_col):
        c = ws.cell(row=row, column=j, value=h)
        c.font, c.fill, c.border, c.alignment = F_HEAD, HEAD_FILL, BORDER, CENTER
    ws.row_dimensions[row].height = 22


def style_rows(ws, first_row, last_row, ncols, money_cols=(), int_cols=(),
               pct_cols=(), money2_cols=(), star_cols=(), bold_cols=()):
    for r in range(first_row, last_row + 1):
        for j in range(1, ncols + 1):
            c = ws.cell(row=r, column=j)
            c.border = BORDER
            c.font = F_BOLD if j in bold_cols else F_BODY
            if r % 2 == 0:
                c.fill = STRIPE_FILL
            if j in money_cols:
                c.number_format = FMT_MONEY
                c.alignment = RIGHT
            elif j in money2_cols:
                c.number_format = FMT_MONEY2
                c.alignment = RIGHT
            elif j in int_cols:
                c.number_format = FMT_INT
                c.alignment = RIGHT
            elif j in pct_cols:
                c.number_format = FMT_PCT
                c.alignment = RIGHT
            elif j in star_cols:
                c.number_format = FMT_STAR
                c.alignment = CENTER


def set_widths(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


def delta_font(ws, cell_ref, positive):
    ws[cell_ref].font = F_GOOD if positive else F_BAD


# ══════════════════════════════════════════════════════════════════════
# Sheet 1 — Dashboard
# ══════════════════════════════════════════════════════════════════════
def build_dashboard(wb, data):
    ws = wb.active
    ws.title = "Dashboard"
    ws.sheet_properties.tabColor = INK
    sheet_title(ws, "  RETAIL MODO — EXECUTIVE DASHBOARD",
                f"  {data['meta']['period']}  ·  generated {data['meta']['generated']}  ·  all values USD", span=8)

    # ── KPI band ──
    row = 4
    ws.cell(row=row, column=1, value="KEY PERFORMANCE INDICATORS").font = Font(
        name="Segoe UI", size=11, bold=True, color=ACCENT)
    row += 1
    write_header(ws, row, ["Metric", "Value", "Δ vs last year", "Notes"])
    kpi_rows = []
    for k in data["kpis"]:
        row += 1
        if k["format"] == "currency":
            val, fmt = k["value"] if k["id"] == "aov" else k["value"], FMT_MONEY2 if k["id"] == "aov" else FMT_MONEY
        elif k["format"] == "percent":
            val, fmt = k["value"] / 100, FMT_PCT
        else:
            val, fmt = k["value"], FMT_INT
        ws.cell(row=row, column=1, value=k["label"])
        c = ws.cell(row=row, column=2, value=val)
        c.number_format = fmt
        d = ws.cell(row=row, column=3, value=k["delta"] / 100)
        d.number_format = '+0.0"%";-0.0"%"'
        ws.cell(row=row, column=4, value=k["hint"])
        kpi_rows.append(row)
    style_rows(ws, kpi_rows[0], kpi_rows[-1], 4, money_cols={2} if False else set(),
               money2_cols=set(), int_cols=set())
    # per-row value formats (mixed) — restyle explicitly
    for i, k in enumerate(data["kpis"]):
        r = kpi_rows[i]
        vc = ws.cell(row=r, column=2)
        if k["format"] == "currency":
            vc.number_format = FMT_MONEY2 if k["id"] == "aov" else FMT_MONEY
        elif k["format"] == "percent":
            vc.number_format = FMT_PCT
        else:
            vc.number_format = FMT_INT
        vc.font, vc.alignment = F_KPI, RIGHT
        dc = ws.cell(row=r, column=3)
        dc.font = F_GOOD if k["delta"] >= 0 else F_BAD
        dc.alignment = RIGHT
    ws.conditional_formatting.add(
        f"C{kpi_rows[0]}:C{kpi_rows[-1]}",
        CellIsRule(operator="lessThan", formula=["0"], font=Font(color=BAD, bold=True)))

    # ── Annual target ──
    row += 2
    ws.cell(row=row, column=1, value="ANNUAL TARGET PROGRESS").font = Font(
        name="Segoe UI", size=11, bold=True, color=ACCENT)
    row += 1
    write_header(ws, row, ["Target FY26", "Booked", "Progress"])
    row += 1
    ws.cell(row=row, column=1, value=data["meta"]["annualTarget"]).number_format = FMT_MONEY
    ws.cell(row=row, column=2, value=4716200).number_format = FMT_MONEY
    pc = ws.cell(row=row, column=3, value=4716200 / data["meta"]["annualTarget"])
    pc.number_format = FMT_PCT
    style_rows(ws, row, row, 3, money_cols={1, 2}, pct_cols={3})
    goal_row = row

    # ── Category summary ──
    row += 2
    ws.cell(row=row, column=1, value="REVENUE BY CATEGORY (all-time gross)").font = Font(
        name="Segoe UI", size=11, bold=True, color=ACCENT)
    row += 1
    cat_header = row
    write_header(ws, row, ["Category", "Revenue", "Units", "Share", "YoY growth"])
    first_cat = row + 1
    for cat in data["categories"]:
        row += 1
        ws.cell(row=row, column=1, value=cat["name"])
        ws.cell(row=row, column=2, value=cat["revenue"]).number_format = FMT_MONEY
        ws.cell(row=row, column=3, value=cat["units"]).number_format = FMT_INT
        ws.cell(row=row, column=4, value=cat["share"] / 100).number_format = FMT_PCT
        gc = ws.cell(row=row, column=5, value=cat["growth"] / 100)
        gc.number_format = '+0.0%;-0.0%'
    style_rows(ws, first_cat, row, 5, money_cols={2}, int_cols={3}, pct_cols={4}, bold_cols={1})
    for r in range(first_cat, row + 1):
        delta_font(ws, f"E{r}", data["categories"][r - first_cat]["growth"] >= 0)
    ws.conditional_formatting.add(
        f"B{first_cat}:B{row}",
        DataBarRule(start_type="num", start_value=0, end_type="max",
                    color=ACCENT, showValue=True))

    # Category bar chart
    chart = BarChart()
    chart.type, chart.style = "col", 10
    chart.title = "Revenue by category"
    chart.y_axis.title = "Revenue (USD)"
    chart.legend = None
    cats = Reference(ws, min_col=1, min_row=first_cat, max_row=row)
    vals = Reference(ws, min_col=2, min_row=cat_header, max_row=row)
    chart.add_data(vals, titles_from_data=True)
    chart.set_categories(cats)
    chart.height, chart.width = 8.5, 15
    s = chart.series[0]
    s.graphicalProperties.solidFill = ACCENT
    ws.add_chart(chart, "G12")

    # Notes
    row += 2
    ws.cell(row=row, column=1, value="HOW TO READ THIS WORKBOOK").font = Font(
        name="Segoe UI", size=11, bold=True, color=ACCENT)
    notes = [
        "• Dashboard — KPIs, target progress and category mix for the trailing 12 months.",
        "• Monthly Sales — net revenue, orders, AOV and month-over-month growth, with trend chart.",
        "• Products — full catalog with margins (data bars) and a top-products chart.",
        "• Channel Mix — sales channels and regional split with pie charts.",
        "• Orders — the latest order log, filterable via the header dropdowns.",
        f"• Source of truth: data/retail-data.json · Product figures are all-time gross; KPIs are trailing-12-month net.",
    ]
    for n in notes:
        row += 1
        ws.cell(row=row, column=1, value=n).font = F_BODY

    set_widths(ws, [24, 16, 15, 26, 13, 3, 3, 3])
    ws.freeze_panes = "A6"
    ws.sheet_view.showGridLines = False
    return ws, goal_row


# ══════════════════════════════════════════════════════════════════════
# Sheet 2 — Monthly Sales
# ══════════════════════════════════════════════════════════════════════
def build_monthly(wb, data):
    ws = wb.create_sheet("Monthly Sales")
    ws.sheet_properties.tabColor = ACCENT
    sheet_title(ws, "  MONTHLY SALES — TRAILING 12 MONTHS",
                "  Net revenue · orders · average order value · month-over-month growth", span=6)

    write_header(ws, 4, ["Month", "Net revenue", "Orders", "AOV", "MoM growth"])
    first = 5
    prev = None
    for i, m in enumerate(data["monthly"]):
        r = first + i
        ws.cell(row=r, column=1, value=m["month"])
        ws.cell(row=r, column=2, value=m["revenue"]).number_format = FMT_MONEY
        ws.cell(row=r, column=3, value=m["orders"]).number_format = FMT_INT
        ws.cell(row=r, column=4, value=m["aov"]).number_format = FMT_MONEY2
        if prev:
            ws.cell(row=r, column=5, value=(m["revenue"] - prev) / prev).number_format = '+0.0%;-0.0%'
        prev = m["revenue"]
    last = first + len(data["monthly"]) - 1
    style_rows(ws, first, last, 5, money_cols={2}, int_cols={3}, money2_cols={4},
               pct_cols={5}, bold_cols={1})
    for r in range(first + 1, last + 1):
        delta_font(ws, f"E{r}", ws.cell(row=r, column=5).value >= 0)

    # Totals row
    tr = last + 1
    total_rev = sum(m["revenue"] for m in data["monthly"])
    total_ord = sum(m["orders"] for m in data["monthly"])
    ws.cell(row=tr, column=1, value="TOTAL")
    ws.cell(row=tr, column=2, value=total_rev).number_format = FMT_MONEY
    ws.cell(row=tr, column=3, value=total_ord).number_format = FMT_INT
    ws.cell(row=tr, column=4, value=round(total_rev / total_ord, 2)).number_format = FMT_MONEY2
    for j in range(1, 6):
        c = ws.cell(row=tr, column=j)
        c.font = Font(name="Segoe UI", size=10.5, bold=True, color="FFFFFF")
        c.fill = HEAD_FILL
        c.border = BORDER
        if j in (2,):
            c.number_format = FMT_MONEY
            c.alignment = RIGHT
        elif j == 3:
            c.number_format = FMT_INT
            c.alignment = RIGHT
        elif j == 4:
            c.number_format = FMT_MONEY2
            c.alignment = RIGHT

    # Combo chart: revenue bars + orders line (secondary axis)
    bar = BarChart()
    bar.type, bar.style = "col", 10
    bar.title = "Revenue vs orders by month"
    bar.y_axis.title = "Net revenue (USD)"
    rev = Reference(ws, min_col=2, min_row=4, max_row=last)
    cats = Reference(ws, min_col=1, min_row=first, max_row=last)
    bar.add_data(rev, titles_from_data=True)
    bar.set_categories(cats)
    bar.series[0].graphicalProperties.solidFill = ACCENT

    line = LineChart()
    line.y_axis.axId = 200
    line.y_axis.title = "Orders"
    line.y_axis.majorGridlines = None
    ords = Reference(ws, min_col=3, min_row=4, max_row=last)
    line.add_data(ords, titles_from_data=True)
    line.series[0].graphicalProperties.line.solidFill = ACCENT2
    line.series[0].graphicalProperties.line.width = 28000
    line.series[0].smooth = True

    bar.y_axis.crosses = "autoZero"
    bar += line
    bar.height, bar.width = 10, 26
    ws.add_chart(bar, "G4")

    set_widths(ws, [13, 15, 11, 12, 12])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════
# Sheet 3 — Products
# ══════════════════════════════════════════════════════════════════════
def build_products(wb, data):
    ws = wb.create_sheet("Products")
    ws.sheet_properties.tabColor = ACCENT2
    sheet_title(ws, "  PRODUCT CATALOG — FULL DETAIL",
                "  All-time gross revenue · margin with data bars · ratings · YoY growth", span=10)

    write_header(ws, 4, ["SKU", "Product", "Category", "Price", "Cost", "Margin",
                         "Stock", "Units sold", "Revenue", "Rating", "YoY"])
    first = 5
    rows = sorted(data["products"], key=lambda p: p["price"] * p["sold"], reverse=True)
    for i, p in enumerate(rows):
        r = first + i
        margin = (p["price"] - p["cost"]) / p["price"]
        ws.cell(row=r, column=1, value=p["sku"])
        ws.cell(row=r, column=2, value=p["name"])
        ws.cell(row=r, column=3, value=p["category"])
        ws.cell(row=r, column=4, value=p["price"]).number_format = FMT_MONEY2
        ws.cell(row=r, column=5, value=p["cost"]).number_format = FMT_MONEY2
        ws.cell(row=r, column=6, value=margin).number_format = FMT_PCT
        ws.cell(row=r, column=7, value=p["stock"]).number_format = FMT_INT
        ws.cell(row=r, column=8, value=p["sold"]).number_format = FMT_INT
        ws.cell(row=r, column=9, value=p["price"] * p["sold"]).number_format = FMT_MONEY
        ws.cell(row=r, column=10, value=p["rating"]).number_format = FMT_STAR
        ws.cell(row=r, column=11, value=p["growth"] / 100).number_format = '+0.0%;-0.0%'
    last = first + len(rows) - 1
    style_rows(ws, first, last, 11, money_cols={9}, money2_cols={4, 5}, int_cols={7, 8},
               pct_cols={6}, star_cols={10}, bold_cols={2})
    for i, p in enumerate(rows):
        delta_font(ws, f"K{first + i}", p["growth"] >= 0)
        ws.cell(row=first + i, column=11).alignment = RIGHT

    # Data bars: revenue + margin
    ws.conditional_formatting.add(
        f"I{first}:I{last}",
        DataBarRule(start_type="num", start_value=0, end_type="max", color=ACCENT, showValue=True))
    ws.conditional_formatting.add(
        f"F{first}:F{last}",
        DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1,
                    color=ACCENT2, showValue=True))
    ws.conditional_formatting.add(
        f"K{first}:K{last}",
        CellIsRule(operator="lessThan", formula=["0"], font=Font(color=BAD, bold=True)))

    # Auto filter + totals
    ws.auto_filter.ref = f"A4:K{last}"
    tr = last + 1
    ws.cell(row=tr, column=2, value="TOTAL / AVG")
    ws.cell(row=tr, column=7, value=sum(p["stock"] for p in rows)).number_format = FMT_INT
    ws.cell(row=tr, column=8, value=sum(p["sold"] for p in rows)).number_format = FMT_INT
    ws.cell(row=tr, column=9, value=sum(p["price"] * p["sold"] for p in rows)).number_format = FMT_MONEY
    for j in range(1, 12):
        c = ws.cell(row=tr, column=j)
        c.font = Font(name="Segoe UI", size=10.5, bold=True, color="FFFFFF")
        c.fill = HEAD_FILL
        c.border = BORDER
    for j, fmt in ((7, FMT_INT), (8, FMT_INT), (9, FMT_MONEY)):
        ws.cell(row=tr, column=j).number_format = fmt
        ws.cell(row=tr, column=j).alignment = RIGHT

    # Top-8 revenue bar chart (horizontal)
    top_n = min(8, len(rows))
    chart = BarChart()
    chart.type, chart.style = "bar", 10
    chart.title = "Top products by revenue"
    vals = Reference(ws, min_col=9, min_row=4, max_row=first + top_n - 1)
    cats = Reference(ws, min_col=2, min_row=first, max_row=first + top_n - 1)
    chart.add_data(vals, titles_from_data=True)
    chart.set_categories(cats)
    chart.legend = None
    chart.series[0].graphicalProperties.solidFill = ACCENT
    chart.height, chart.width = 10.5, 17
    ws.add_chart(chart, "M4")

    set_widths(ws, [12, 27, 13, 9, 9, 9, 9, 11, 13, 8, 9])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════
# Sheet 4 — Channel Mix
# ══════════════════════════════════════════════════════════════════════
def build_channel_mix(wb, data):
    ws = wb.create_sheet("Channel Mix")
    ws.sheet_properties.tabColor = "EC4899"
    sheet_title(ws, "  CHANNEL & REGIONAL MIX",
                "  Where revenue comes from — channels and regions, trailing 12 months", span=5)

    # Channels
    ws.cell(row=4, column=1, value="SALES CHANNELS").font = Font(
        name="Segoe UI", size=11, bold=True, color=ACCENT)
    write_header(ws, 5, ["Channel", "Share", "Revenue"])
    first_c = 6
    for i, c in enumerate(data["channels"]):
        r = first_c + i
        ws.cell(row=r, column=1, value=c["name"])
        ws.cell(row=r, column=2, value=c["share"] / 100).number_format = FMT_PCT
        ws.cell(row=r, column=3, value=c["revenue"]).number_format = FMT_MONEY
    last_c = first_c + len(data["channels"]) - 1
    style_rows(ws, first_c, last_c, 3, money_cols={3}, pct_cols={2}, bold_cols={1})
    ws.conditional_formatting.add(
        f"B{first_c}:B{last_c}",
        DataBarRule(start_type="num", start_value=0, end_type="num", end_value=0.5,
                    color=ACCENT, showValue=True))

    # Regions
    r0 = last_c + 2
    ws.cell(row=r0, column=1, value="REGIONS").font = Font(
        name="Segoe UI", size=11, bold=True, color=ACCENT)
    write_header(ws, r0 + 1, ["Region", "Share", "Revenue"])
    first_r = r0 + 2
    for i, reg in enumerate(data["regions"]):
        r = first_r + i
        ws.cell(row=r, column=1, value=reg["name"])
        ws.cell(row=r, column=2, value=reg["share"] / 100).number_format = FMT_PCT
        ws.cell(row=r, column=3, value=reg["revenue"]).number_format = FMT_MONEY
    last_r = first_r + len(data["regions"]) - 1
    style_rows(ws, first_r, last_r, 3, money_cols={3}, pct_cols={2}, bold_cols={1})
    ws.conditional_formatting.add(
        f"B{first_r}:B{last_r}",
        DataBarRule(start_type="num", start_value=0, end_type="num", end_value=0.35,
                    color=ACCENT2, showValue=True))

    # Pie charts
    pie1 = PieChart()
    pie1.title = "Revenue by channel"
    pie1.add_data(Reference(ws, min_col=3, min_row=first_c - 1, max_row=last_c), titles_from_data=True)
    pie1.set_categories(Reference(ws, min_col=1, min_row=first_c, max_row=last_c))
    pie1.height, pie1.width = 8.5, 11
    ws.add_chart(pie1, "E4")

    pie2 = PieChart()
    pie2.title = "Revenue by region"
    pie2.add_data(Reference(ws, min_col=3, min_row=first_r - 1, max_row=last_r), titles_from_data=True)
    pie2.set_categories(Reference(ws, min_col=1, min_row=first_r, max_row=last_r))
    pie2.height, pie2.width = 8.5, 11
    ws.add_chart(pie2, "E21")

    set_widths(ws, [18, 10, 14])
    ws.sheet_view.showGridLines = False


# ══════════════════════════════════════════════════════════════════════
# Sheet 5 — Orders
# ══════════════════════════════════════════════════════════════════════
def build_orders(wb, data):
    ws = wb.create_sheet("Orders")
    ws.sheet_properties.tabColor = "F59E0B"
    sheet_title(ws, "  ORDER LOG — LATEST TRANSACTIONS",
                "  Filter with the header dropdowns · status and channel views", span=9)

    write_header(ws, 4, ["Order", "Date", "Customer", "Product", "Qty",
                         "Channel", "Region", "Status", "Amount"])
    first = 5
    for i, o in enumerate(data["orders"]):
        r = first + i
        ws.cell(row=r, column=1, value=o["id"])
        ws.cell(row=r, column=2, value=o["date"])
        ws.cell(row=r, column=3, value=o["customer"])
        ws.cell(row=r, column=4, value=o["product"])
        ws.cell(row=r, column=5, value=o["qty"]).number_format = FMT_INT
        ws.cell(row=r, column=6, value=o["channel"])
        ws.cell(row=r, column=7, value=o["region"])
        ws.cell(row=r, column=8, value=o["status"])
        ws.cell(row=r, column=9, value=o["amount"]).number_format = FMT_MONEY2
    last = first + len(data["orders"]) - 1
    style_rows(ws, first, last, 9, money2_cols={9}, int_cols={5}, bold_cols={1, 8})

    # Status colour coding
    ws.conditional_formatting.add(
        f"H{first}:H{last}",
        CellIsRule(operator="equal", formula=['"Delivered"'], font=Font(color=GOOD, bold=True)))
    ws.conditional_formatting.add(
        f"H{first}:H{last}",
        CellIsRule(operator="equal", formula=['"Shipped"'], font=Font(color="2563EB", bold=True)))
    ws.conditional_formatting.add(
        f"H{first}:H{last}",
        CellIsRule(operator="equal", formula=['"Processing"'], font=Font(color="D97706", bold=True)))

    ws.auto_filter.ref = f"A4:I{last}"
    tr = last + 1
    ws.cell(row=tr, column=4, value="TOTAL")
    ws.cell(row=tr, column=5, value=sum(o["qty"] for o in data["orders"])).number_format = FMT_INT
    ws.cell(row=tr, column=9, value=round(sum(o["amount"] for o in data["orders"]), 2)).number_format = FMT_MONEY2
    for j in range(1, 10):
        c = ws.cell(row=tr, column=j)
        c.font = Font(name="Segoe UI", size=10.5, bold=True, color="FFFFFF")
        c.fill = HEAD_FILL
        c.border = BORDER
    ws.cell(row=tr, column=5).alignment = RIGHT
    ws.cell(row=tr, column=9).alignment = RIGHT

    set_widths(ws, [11, 12, 16, 27, 6, 16, 9, 12, 11])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False


def main():
    data = load_data()
    wb = Workbook()
    dashboard, _ = build_dashboard(wb, data)
    build_monthly(wb, data)
    build_products(wb, data)
    build_channel_mix(wb, data)
    build_orders(wb, data)

    # Dashboard pie now that Channel Mix exists
    pie = PieChart()
    pie.title = "Revenue by channel"
    ws_mix = wb["Channel Mix"]
    pie.add_data(Reference(ws_mix, min_col=3, min_row=5, max_row=5 + len(data["channels"])),
                 titles_from_data=True)
    pie.set_categories(Reference(ws_mix, min_col=1, min_row=6, max_row=5 + len(data["channels"])))
    pie.height, pie.width = 8.5, 11
    dashboard.add_chart(pie, "G29")

    wb.save(OUT_PATH)
    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"✅ Retail-Modo-Report.xlsx written ({size_kb:.1f} KB) — 5 sheets: "
          f"{', '.join(wb.sheetnames)}")


if __name__ == "__main__":
    sys.exit(main())
