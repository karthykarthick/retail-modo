/* ═══════════════════════════════════════════════════════════
   RETAIL MODO — animation & interaction engine
   Vanilla JS · IntersectionObserver · Canvas · zero dependencies
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CAT_COLORS = {
    "Audio": "#7c3aed",
    "Wearables": "#ec4899",
    "Smart Home": "#06b6d4",
    "Accessories": "#f59e0b"
  };
  const CAT_EMOJI = {
    "Audio": "🎧", "Wearables": "⌚", "Smart Home": "🏠", "Accessories": "🔌"
  };
  const PRODUCT_EMOJI = {
    "Aura Wireless Headphones": "🎧", "Pulse Bone-Conduction Buds": "🎵",
    "Echo Smart Speaker Mini": "🔊", "Vista Soundbar 500": "📺",
    "Nova Fit Smartwatch": "⌚", "Orbit Fitness Ring": "💍", "Volt AR Glasses": "🥽",
    "Lumen Smart Bulb 4-Pack": "💡", "Sentry Video Doorbell": "🔔",
    "Breeze Air Purifier": "🌬️", "Chefio Smart Kettle": "🫖",
    "Flux 65W GaN Charger": "⚡", "Glide Laptop Stand Pro": "💻",
    "Terra Eco Phone Case": "📱", "Pixel Light Mouse": "🖱️", "Nomad 20K Power Bank": "🔋"
  };

  /* ─────────────── Formatting helpers ─────────────── */
  const fmt = {
    currency: v => "$" + Math.round(v).toLocaleString("en-US"),
    "currency-short": v => {
      if (Math.abs(v) >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
      if (Math.abs(v) >= 1e3) return "$" + (v / 1e3).toFixed(0) + "k";
      return "$" + Math.round(v);
    },
    number: v => Math.round(v).toLocaleString("en-US"),
    percent: v => v.toFixed(2).replace(/\.?0+$/, "") + "%"
  };

  /* ─────────────── Count-up engine ─────────────── */
  function countUp(el, target, { format = "number", decimals = 0, duration = 1600 } = {}) {
    const finalText = decimals
      ? target.toFixed(decimals)
      : (fmt[format] ? fmt[format](target) : Math.round(target).toLocaleString("en-US"));
    if (REDUCED) { el.textContent = finalText; return; }
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(2, -10 * p); // easeOutExpo
      const val = target * eased;
      el.textContent = decimals ? val.toFixed(decimals) : (fmt[format] ? fmt[format](val) : Math.round(val).toLocaleString("en-US"));
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = finalText;
    };
    requestAnimationFrame(tick);
  }

  /* ─────────────── Toast ─────────────── */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3400);
  }

  /* ═══════════════ BOOT ═══════════════ */
  async function loadData() {
    try {
      const res = await fetch("data/retail-data.json");
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch {
      return window.RETAIL_DATA; // offline / file:// fallback
    }
  }

  loadData().then(data => {
    if (!data) { toast("⚠️ Could not load retail data."); return; }
    initTheme();
    initNav();
    initTicker(data);
    initRotator();
    renderKPIs(data);
    renderTrendExtras(data);
    initRevenueChart(data);
    renderMix(data);
    renderProducts(data);
    renderOrders(data);
    initReveals();
    initMicroInteractions();
    initPreloader();
    $("[data-generated]").textContent = data.meta.generated;
  });

  /* ═══════════════ Preloader ═══════════════ */
  function initPreloader() {
    const pre = $("#preloader");
    const hide = () => {
      setTimeout(() => {
        pre.classList.add("is-done");
        document.body.classList.remove("no-scroll");
        setTimeout(() => pre.remove(), 700);
      }, REDUCED ? 0 : 650);
    };
    document.body.classList.add("no-scroll");
    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide, { once: true });
    setTimeout(hide, 2600); // hard cap
  }

  /* ═══════════════ Theme ═══════════════ */
  function initTheme() {
    const saved = localStorage.getItem("modo-theme");
    if (saved) document.documentElement.dataset.theme = saved;
    $("#themeToggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("modo-theme", next);
      toast(next === "dark" ? "🌙 Dark mode — rich and moody" : "☀️ Light mode — crisp and clean");
      // Redraw canvas chart with new theme
      window.dispatchEvent(new Event("modo:theme"));
    });
  }

  /* ═══════════════ Nav: scroll state, active link, mobile ═══════════════ */
  function initNav() {
    const nav = $("#navbar");
    const progress = $("#scrollProgress");
    const toTop = $("#toTop");

    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 12);
      toTop.classList.toggle("is-visible", y > 700);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));

    // Active link highlighting
    const links = $$("#navLinks a");
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const secObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(a => a.classList.remove("is-active"));
          map.get(e.target.id)?.classList.add("is-active");
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) secObs.observe(s); });

    // Mobile burger
    const burger = $("#navBurger"), mobile = $("#navMobile");
    burger.addEventListener("click", () => {
      burger.classList.toggle("is-open");
      mobile.classList.toggle("is-open");
    });
    $$("a", mobile).forEach(a => a.addEventListener("click", () => {
      burger.classList.remove("is-open");
      mobile.classList.remove("is-open");
    }));

    // Excel download toast
    $$('a[href$=".xlsx"]').forEach(a => a.addEventListener("click", () =>
      toast("📦 Downloading Retail-Modo-Report.xlsx — 5 formatted sheets, charts included…")));
    $("#regenBtn").addEventListener("click", () =>
      toast("🛠 Built from data/retail-data.json → scripts/generate_excel.py (openpyxl) → Retail-Modo-Report.xlsx"));
  }

  /* ═══════════════ Ticker ═══════════════ */
  function initTicker(data) {
    const best = [...data.products].sort((a, b) => b.sold * b.price - a.sold * a.price)[0];
    const peak = [...data.monthly].sort((a, b) => b.revenue - a.revenue)[0];
    const items = [
      `💰 Net revenue <b>${fmt["currency-short"](4716200)}</b>`,
      `🏆 Top product <b>${best.name}</b>`,
      `⚡ Peak month <b>${peak.month}</b>`,
      `⌚ Wearables up <b>+19.4%</b>`,
      `🛍 <b>${fmt.number(48930)}</b> orders fulfilled`,
      `📦 <b>${data.products.length}</b> SKUs · 4 categories`,
      `💜 Avg rating <b>4.6★</b>`,
      `🌍 <b>4</b> regions · <b>4</b> sales channels`
    ];
    const html = items.map(i => `<span>${i}</span>`).join("");
    $("#tickerTrack").innerHTML = html + html; // duplicate for seamless loop
  }

  /* ═══════════════ Word rotator ═══════════════ */
  function initRotator() {
    const words = $$("#wordRotator .rotator__word");
    if (REDUCED || words.length < 2) return;
    let i = 0;
    setInterval(() => {
      words[i].classList.remove("is-active");
      words[i].classList.add("is-leaving");
      const prev = i;
      i = (i + 1) % words.length;
      words[i].classList.remove("is-leaving");
      words[i].classList.add("is-active");
      setTimeout(() => words[prev].classList.remove("is-leaving"), 700);
    }, 2400);
  }

  /* ═══════════════ KPI cards ═══════════════ */
  function sparkPath(values, w = 84, h = 30) {
    const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
    const step = w / (values.length - 1);
    const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - ((v - min) / range) * (h - 6)).toFixed(1)}`);
    return `M${pts.join(" L")}`;
  }

  function renderKPIs(data) {
    const icons = { revenue: "💰", orders: "🧾", aov: "🛒", customers: "👥", conv: "🎯", repeat: "🔁" };
    const tints = [
      ["rgba(124,58,237,.14)", "rgba(124,58,237,.35)"],
      ["rgba(6,182,212,.14)", "rgba(6,182,212,.35)"],
      ["rgba(236,72,153,.14)", "rgba(236,72,153,.35)"],
      ["rgba(245,158,11,.14)", "rgba(245,158,11,.35)"],
      ["rgba(52,211,153,.14)", "rgba(52,211,153,.35)"],
      ["rgba(96,165,250,.14)", "rgba(96,165,250,.35)"]
    ];
    const grid = $("#kpiGrid");
    // Synthetic-but-plausible sparkline shapes per KPI
    const sparks = {
      revenue: [32, 48, 52, 30, 28, 34, 36, 38, 40, 42, 45, 47],
      orders: [34, 51, 55, 31, 30, 35, 37, 39, 41, 43, 46, 48],
      aov: [47, 45, 45, 47, 48, 47, 46, 46, 47, 46, 47, 47],
      customers: [28, 42, 55, 44, 40, 46, 52, 58, 63, 70, 76, 84],
      conv: [42, 50, 54, 40, 38, 41, 43, 44, 46, 47, 49, 50],
      repeat: [30, 33, 36, 34, 36, 38, 37, 39, 40, 41, 42, 43]
    };
    data.kpis.forEach((k, idx) => {
      const [tint, tintBorder] = tints[idx % tints.length];
      const card = document.createElement("article");
      card.className = "kpi-card";
      card.dataset.reveal = "";
      card.style.setProperty("--reveal-delay", `${idx * 0.07}s`);
      card.style.setProperty("--kpi-tint", tint);
      card.style.setProperty("--kpi-tint-border", tintBorder);
      card.style.setProperty("--glow", tint.replace(/[\d.]+\)$/, "0.2)"));
      const up = k.delta >= 0;
      card.innerHTML = `
        <div class="kpi-card__top">
          <span class="kpi-card__icon">${icons[k.id] || "📈"}</span>
          <span class="kpi-card__label">${k.label}</span>
        </div>
        <div class="kpi-card__value" data-count="${k.value}" data-format="${k.format}">—</div>
        <div class="kpi-card__foot">
          <span class="delta ${up ? "delta--up" : "delta--down"}">${up ? "▲" : "▼"} ${k.delta}${k.format === "percent" ? " pp" : "%"} vs LY</span>
          <svg class="kpi-card__spark" viewBox="0 0 84 30" preserveAspectRatio="none">
            <path d="${sparkPath(sparks[k.id] || [10, 20, 15, 25, 22, 30])}" fill="none"
                  stroke="${up ? "#34d399" : "#f87171"}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="kpi-card__hint">${k.hint}</span>`;
      grid.appendChild(card);
    });
  }

  /* ═══════════════ Goal card ═══════════════ */
  function renderTrendExtras(data) {
    const pct = (4716200 / data.meta.annualTarget) * 100;
    const big = $(".hero-card__big [data-count]");
    if (big) countUp(big, 4716200, { format: "currency-short", duration: 2000 });
    // animate goal bar when revealed
    const goal = $(".goal-card");
    if (goal) {
      const obs = new IntersectionObserver(es => {
        es.forEach(e => {
          if (e.isIntersecting) {
            $("#goalBarFill").style.width = pct.toFixed(1) + "%";
            obs.disconnect();
          }
        });
      }, { threshold: .4 });
      obs.observe(goal);
    }
  }

  /* ═══════════════ Revenue canvas chart ═══════════════ */
  function initRevenueChart(data) {
    const canvas = $("#revenueChart");
    const tip = $("#chartTooltip");
    const ctx = canvas.getContext("2d");
    const months = data.monthly;
    const PAD = { t: 18, r: 16, b: 34, l: 56 };
    let W = 0, H = 0, dpr = 1, progress = REDUCED ? 1 : 0, hoverIdx = -1, started = false;

    const movingAvg = months.map((_, i) => {
      const slice = months.slice(Math.max(0, i - 2), i + 1);
      return slice.reduce((s, m) => s + m.revenue, 0) / slice.length;
    });
    const maxVal = Math.max(...months.map(m => m.revenue));
    const yMax = Math.ceil(maxVal / 100000) * 100000 + 60000;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    const x = i => PAD.l + (i / (months.length - 1)) * (W - PAD.l - PAD.r);
    const y = v => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

    function draw() {
      const styles = getComputedStyle(document.documentElement);
      const textCol = styles.getPropertyValue("--muted").trim() || "#93a0b8";
      const gridCol = styles.getPropertyValue("--grid-line").trim() || "rgba(255,255,255,.06)";
      ctx.clearRect(0, 0, W, H);
      ctx.font = "11px Inter, system-ui, sans-serif";

      // grid + y labels
      for (let g = 0; g <= 4; g++) {
        const val = (yMax / 4) * g, gy = y(val);
        ctx.strokeStyle = gridCol; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(PAD.l, gy); ctx.lineTo(W - PAD.r, gy); ctx.stroke();
        ctx.fillStyle = textCol; ctx.textAlign = "right";
        ctx.fillText("$" + Math.round(val / 1000) + "k", PAD.l - 10, gy + 4);
      }
      // x labels
      ctx.textAlign = "center";
      months.forEach((m, i) => {
        if (W < 520 && i % 2 === 1) return;
        ctx.fillStyle = textCol;
        ctx.fillText(m.month.split(" ")[0], x(i), H - PAD.b + 20);
      });

      const upTo = Math.max(2, Math.floor(progress * (months.length - 1)) + 1);
      const frac = progress * (months.length - 1) - (upTo - 1);

      // area gradient
      const grad = ctx.createLinearGradient(0, PAD.t, 0, H - PAD.b);
      grad.addColorStop(0, "rgba(124,58,237,.34)");
      grad.addColorStop(1, "rgba(6,182,212,0)");

      // area
      ctx.beginPath();
      ctx.moveTo(x(0), y(months[0].revenue));
      for (let i = 1; i < upTo; i++) ctx.lineTo(x(i), y(months[i].revenue));
      if (upTo <= months.length && frac > 0) {
        const i = upTo - 1;
        ctx.lineTo(x(i) + (x(i + 1) - x(i)) * frac, y(months[i].revenue + (months[i + 1].revenue - months[i].revenue) * frac));
      }
      const lastX = frac > 0 || upTo >= months.length ? x(Math.min(upTo, months.length - 1)) : x(upTo - 1);
      ctx.lineTo(lastX, H - PAD.b); ctx.lineTo(x(0), H - PAD.b); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // moving average (dashed)
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(x(0), y(movingAvg[0]));
      for (let i = 1; i < upTo; i++) ctx.lineTo(x(i), y(movingAvg[i]));
      ctx.strokeStyle = "rgba(34,211,238,.85)"; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // main line
      const lg = ctx.createLinearGradient(PAD.l, 0, W - PAD.r, 0);
      lg.addColorStop(0, "#7c3aed"); lg.addColorStop(1, "#22d3ee");
      ctx.strokeStyle = lg; ctx.lineWidth = 3.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.shadowColor = "rgba(124,58,237,.45)"; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x(0), y(months[0].revenue));
      for (let i = 1; i < upTo; i++) ctx.lineTo(x(i), y(months[i].revenue));
      if (upTo <= months.length && frac > 0) {
        const i = upTo - 1;
        ctx.lineTo(x(i) + (x(i + 1) - x(i)) * frac, y(months[i].revenue + (months[i + 1].revenue - months[i].revenue) * frac));
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // points + hover crosshair
      for (let i = 0; i < upTo; i++) {
        const px = x(i), py = y(months[i].revenue);
        const isHover = i === hoverIdx;
        ctx.beginPath();
        ctx.arc(px, py, isHover ? 6.5 : i === upTo - 1 && progress >= 1 ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? "#22d3ee" : "#0e1526";
        ctx.strokeStyle = isHover ? "#fff" : "#a78bfa";
        ctx.lineWidth = 2;
        ctx.fill(); ctx.stroke();
      }
      if (hoverIdx >= 0 && hoverIdx < upTo) {
        ctx.strokeStyle = "rgba(255,255,255,.22)";
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(x(hoverIdx), PAD.t); ctx.lineTo(x(hoverIdx), H - PAD.b); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function animate() {
      if (progress >= 1) { draw(); return; }
      progress = Math.min(1, progress + 0.012);
      draw();
      requestAnimationFrame(animate);
    }

    // hover
    canvas.addEventListener("mousemove", e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      let best = -1, bestD = 1e9;
      for (let i = 0; i < months.length; i++) {
        const d = Math.abs(x(i) - mx);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best !== hoverIdx) { hoverIdx = best; draw(); }
      const m = months[hoverIdx];
      const prev = months[hoverIdx - 1];
      const mom = prev ? ((m.revenue - prev.revenue) / prev.revenue) * 100 : 0;
      tip.innerHTML = `
        <div class="chart-tooltip__month">${m.month}</div>
        <div class="chart-tooltip__value">${fmt.currency(m.revenue)}</div>
        <div class="chart-tooltip__row">${fmt.number(m.orders)} orders · AOV $${m.aov.toFixed(2)}</div>
        ${prev ? `<div class="chart-tooltip__row" style="color:${mom >= 0 ? "#34d399" : "#f87171"}">${mom >= 0 ? "▲" : "▼"} ${Math.abs(mom).toFixed(1)}% MoM</div>` : ""}`;
      tip.style.left = Math.min(Math.max(x(hoverIdx), 84), W - 84) + "px";
      tip.style.top = y(m.revenue) + "px";
      tip.classList.add("is-visible");
    });
    canvas.addEventListener("mouseleave", () => {
      hoverIdx = -1;
      tip.classList.remove("is-visible");
      draw();
    });

    window.addEventListener("resize", resize);
    window.addEventListener("modo:theme", draw);

    // start drawing when visible
    const obs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting && !started) {
          started = true;
          resize();
          if (!REDUCED) animate(); else draw();
          obs.disconnect();
        }
      });
    }, { threshold: .25 });
    obs.observe(canvas);
    resize();
  }

  /* ═══════════════ Mix: donut, bars, growth ═══════════════ */
  function renderMix(data) {
    // Donut segments
    const g = $("#donutSegments");
    const R = 80, C = 2 * Math.PI * R;
    let offset = 0;
    data.categories.forEach((c, i) => {
      const frac = c.share / 100;
      const seg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      seg.setAttribute("class", "donut__seg");
      seg.setAttribute("cx", 100); seg.setAttribute("cy", 100); seg.setAttribute("r", R);
      seg.setAttribute("stroke", CAT_COLORS[c.name]);
      seg.style.color = CAT_COLORS[c.name];
      seg.dataset.target = (C * frac - 3).toFixed(1);
      seg.dataset.offset = offset.toFixed(1);
      seg.style.strokeDashoffset = -offset;
      g.appendChild(seg);
      offset += C * frac;
    });
    // Legend
    $("#donutLegend").innerHTML = data.categories.map(c => `
      <li data-cat="${c.name}">
        <i style="--c:${CAT_COLORS[c.name]}"></i>
        <span>${c.name}</span>
        <span class="pct">${c.share}%</span>
      </li>`).join("");
    // Animate on reveal
    const donut = $("#categoryDonut");
    const obs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        $$(".donut__seg", g).forEach((s, i) => {
          setTimeout(() => { s.style.strokeDasharray = `${s.dataset.target} ${C}`; }, i * 180);
        });
        const total = $("#donutTotal");
        setTimeout(() => countUp(total, 8552030, { format: "currency-short", duration: 1800 }), 350);
        obs.disconnect();
      });
    }, { threshold: .4 });
    obs.observe(donut);

    // Bars (channels + regions)
    const palettes = [
      ["#7c3aed", "#a78bfa"], ["#06b6d4", "#67e8f9"],
      ["#ec4899", "#f9a8d4"], ["#f59e0b", "#fcd34d"]
    ];
    const buildBars = (hostEl, rows) => {
      hostEl.innerHTML = rows.map((r, i) => `
        <div class="bar-row">
          <div class="bar-row__top"><span>${r.name}</span><span class="share">${fmt.currency(r.revenue)} · ${r.share}%</span></div>
          <div class="bar-track"><span class="bar-fill" style="--c1:${palettes[i % 4][0]};--c2:${palettes[i % 4][1]}" data-w="${r.share * 2}%"></span></div>
        </div>`).join("");
    };
    buildBars($("#channelBars"), data.channels);
    buildBars($("#regionBars"), data.regions);

    const barsObs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        $$(".bar-fill", e.target).forEach((b, i) => {
          setTimeout(() => { b.style.width = b.dataset.w; }, i * 140);
        });
        barsObs.unobserve(e.target);
      });
    }, { threshold: .4 });
    [$("#channelBars"), $("#regionBars")].forEach(el => barsObs.observe(el));

    // Growth grid
    $("#growthGrid").innerHTML = data.categories.map(c => `
      <div class="growth-cell" style="color:${c.growth >= 0 ? "#34d399" : "#f87171"}">
        <div class="growth-cell__name" style="color:var(--muted)">${c.name}</div>
        <div class="growth-cell__val ${c.growth >= 0 ? "is-up" : "is-down"}">${c.growth >= 0 ? "+" : ""}${c.growth}%</div>
        <div class="growth-cell__bar"><span data-w="${Math.min(Math.abs(c.growth) * 2.4, 100)}%"></span></div>
      </div>`).join("");
    const growthObs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        $$(".growth-cell__bar span", e.target).forEach((s, i) => {
          setTimeout(() => { s.style.width = s.dataset.w; }, i * 130);
        });
        growthObs.disconnect();
      });
    }, { threshold: .4 });
    growthObs.observe($("#growthGrid"));
  }

  /* ═══════════════ Products: cards + filter + table ═══════════════ */
  function renderProducts(data) {
    const grid = $("#productGrid");
    const maxStock = Math.max(...data.products.map(p => p.stock));

    const cardHTML = (p, i) => {
      const margin = ((p.price - p.cost) / p.price) * 100;
      const rev = p.price * p.sold;
      return `
        <article class="product-card" data-cat="${p.category}" data-tilt-card style="animation-delay:${Math.min(i * 60, 600)}ms">
          <div class="product-card__top">
            <span class="product-card__cat" style="--cat-c:${CAT_COLORS[p.category]}">${p.category}</span>
            <span class="product-card__emoji">${PRODUCT_EMOJI[p.name] || "📦"}</span>
          </div>
          <h3 class="product-card__name">${p.name}</h3>
          <span class="product-card__sku">${p.sku}</span>
          <div class="product-card__price-row">
            <span class="product-card__price">$${p.price}</span>
            <span class="product-card__rating">★ ${p.rating}</span>
          </div>
          <div class="product-card__stock">
            <div class="product-card__stock-meta"><span>Stock ${fmt.number(p.stock)}</span><span>${fmt.currency(rev)} revenue</span></div>
            <div class="product-card__stock-bar"><span data-w="${((p.stock / maxStock) * 100).toFixed(1)}%" style="background:${CAT_COLORS[p.category]}"></span></div>
          </div>
          <div class="product-card__foot">
            <span class="delta ${p.growth >= 0 ? "delta--up" : "delta--down"}">${p.growth >= 0 ? "▲" : "▼"} ${Math.abs(p.growth)}% YoY</span>
            <span class="cell-muted">${margin.toFixed(0)}% margin</span>
          </div>
        </article>`;
    };
    grid.innerHTML = data.products.map(cardHTML).join("");

    // stock bars animate when visible
    const stockObs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        $$(".product-card__stock-bar span", e.target).forEach((s, i) => {
          setTimeout(() => { s.style.width = s.dataset.w; }, i * 50);
        });
        stockObs.disconnect();
      });
    }, { threshold: .15 });
    stockObs.observe(grid);

    // Filter chips
    $("#productFilter").addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$("#productFilter .chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const f = chip.dataset.filter;
      $$(".product-card", grid).forEach((card, i) => {
        const show = f === "all" || card.dataset.cat === f;
        card.classList.toggle("is-hidden", !show);
        if (show && !REDUCED) {
          card.style.animation = "none";
          void card.offsetWidth; // reflow to restart animation
          card.style.animation = "";
          card.style.animationDelay = `${Math.min(i * 45, 400)}ms`;
        }
      });
    });

    // Table with search + sort
    const tbody = $("#productTableBody");
    let sortKey = "sold", sortDir = -1;
    const marginOf = p => (p.price - p.cost) / p.price * 100;

    const renderTable = (query = "") => {
      const q = query.trim().toLowerCase();
      let rows = data.products.filter(p =>
        !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
      rows.sort((a, b) => {
        let va, vb;
        if (sortKey === "margin") { va = marginOf(a); vb = marginOf(b); }
        else { va = a[sortKey]; vb = b[sortKey]; }
        if (typeof va === "string") return va.localeCompare(vb) * sortDir;
        return (va - vb) * sortDir;
      });
      tbody.innerHTML = rows.map((p, i) => `
        <tr style="animation-delay:${Math.min(i * 35, 450)}ms">
          <td class="cell-muted">${p.sku}</td>
          <td class="cell-strong">${PRODUCT_EMOJI[p.name] || "📦"} ${p.name}</td>
          <td><span class="product-card__cat" style="--cat-c:${CAT_COLORS[p.category]};font-size:10.5px">${p.category}</span></td>
          <td class="cell-strong">$${p.price}</td>
          <td>${marginOf(p).toFixed(0)}%<span class="margin-bar"><span style="width:${marginOf(p).toFixed(0)}%"></span></span></td>
          <td>${fmt.number(p.stock)}</td>
          <td class="cell-strong">${fmt.number(p.sold)}</td>
          <td>★ ${p.rating}</td>
          <td><span class="delta ${p.growth >= 0 ? "delta--up" : "delta--down"}">${p.growth >= 0 ? "▲" : "▼"} ${Math.abs(p.growth)}%</span></td>
        </tr>`).join("") || `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--muted)">No products match “${query}” 🔍</td></tr>`;
      $("#productCount").textContent = `· ${rows.length} of ${data.products.length}`;
      $$("#productTable th").forEach(th => {
        th.classList.toggle("is-sorted", th.dataset.sort === sortKey);
        th.classList.toggle("is-desc", th.dataset.sort === sortKey && sortDir === -1);
        const arrow = th.querySelector(".sort-arrow") || (() => { const s = document.createElement("span"); s.className = "sort-arrow"; s.textContent = "▾"; th.appendChild(s); return s; })();
      });
    };
    renderTable();
    $("#productSearch").addEventListener("input", e => renderTable(e.target.value));
    $$("#productTable th").forEach(th => th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = key === "sku" || key === "name" || key === "category" ? 1 : -1; }
      renderTable($("#productSearch").value);
    }));
  }

  /* ═══════════════ Orders table ═══════════════ */
  function renderOrders(data) {
    const tbody = $("#orderTableBody");
    const statusSel = $("#orderStatus");
    const channelSel = $("#orderChannel");
    data.channels.forEach(c => {
      const o = document.createElement("option");
      o.value = c.name; o.textContent = c.name;
      channelSel.appendChild(o);
    });
    let sortKey = "date", sortDir = -1;

    const render = () => {
      const q = $("#orderSearch").value.trim().toLowerCase();
      const st = statusSel.value, ch = channelSel.value;
      let rows = data.orders.filter(o =>
        (st === "all" || o.status === st) &&
        (ch === "all" || o.channel === ch) &&
        (!q || [o.id, o.customer, o.product, o.region].join(" ").toLowerCase().includes(q)));
      rows.sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        if (typeof va === "string") return va.localeCompare(vb) * sortDir;
        return (va - vb) * sortDir;
      });
      const total = rows.reduce((s, o) => s + o.amount, 0);
      tbody.innerHTML = rows.map((o, i) => `
        <tr style="animation-delay:${Math.min(i * 35, 480)}ms">
          <td class="cell-strong">${o.id}</td>
          <td class="cell-muted">${new Date(o.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
          <td>${o.customer}</td>
          <td class="cell-muted">${o.product}</td>
          <td>${o.qty}</td>
          <td class="cell-muted">${o.channel}</td>
          <td>${o.region}</td>
          <td><span class="status status--${o.status.toLowerCase()}">${o.status}</span></td>
          <td class="ta-r cell-strong">${fmt.currency(o.amount)}</td>
        </tr>`).join("") || `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--muted)">No orders match those filters 🧐</td></tr>`;
      $("#orderSummary").textContent = `${rows.length} order${rows.length === 1 ? "" : "s"} · ${fmt.currency(total)} total value`;
      $$("#orderTable th").forEach(th => {
        th.classList.toggle("is-sorted", th.dataset.sort === sortKey);
        th.classList.toggle("is-desc", th.dataset.sort === sortKey && sortDir === -1);
        if (!th.querySelector(".sort-arrow")) { const s = document.createElement("span"); s.className = "sort-arrow"; s.textContent = "▾"; th.appendChild(s); }
      });
    };
    render();
    $("#orderSearch").addEventListener("input", render);
    statusSel.addEventListener("change", render);
    channelSel.addEventListener("change", render);
    $$("#orderTable th").forEach(th => th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = key === "id" || key === "customer" || key === "product" || key === "channel" ? 1 : -1; }
      render();
    }));
  }

  /* ═══════════════ Reveal-on-scroll ═══════════════ */
  function initReveals() {
    const obs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-revealed");
        // fire count-ups inside revealed sections
        $$("[data-count]", e.target).forEach(el => {
          if (el.dataset.counted) return;
          el.dataset.counted = "1";
          countUp(el, parseFloat(el.dataset.count), {
            format: el.dataset.format || "number",
            decimals: el.dataset.decimals ? +el.dataset.decimals : 0,
            duration: 1700
          });
        });
        obs.unobserve(e.target);
      });
    }, { threshold: .18, rootMargin: "0px 0px -6% 0px" });
    $$("[data-reveal]").forEach(el => obs.observe(el));
    // hero card values count immediately
    $$(".hero-card [data-count], .goal-card [data-count]").forEach(el => {
      if (el.closest(".hero-card")) {
        // hero big value handled in renderTrendExtras; small stats here
        if (!el.dataset.format) {
          countUp(el, parseFloat(el.dataset.count), { decimals: el.dataset.decimals ? +el.dataset.decimals : 0, duration: 1900 });
          el.dataset.counted = "1";
        }
      }
    });
  }

  /* ═══════════════ Micro-interactions ═══════════════ */
  function initMicroInteractions() {
    if (REDUCED) return;

    // 3D tilt
    const tiltCards = $$("[data-tilt-card]");
    tiltCards.forEach(card => {
      const isProduct = card.classList.contains("product-card");
      const maxTilt = isProduct ? 7 : 9;
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * maxTilt}deg) rotateY(${(px - 0.5) * maxTilt}deg) translateY(-4px)`;
        card.style.setProperty("--shine-x", `${px * 100}%`);
        card.style.setProperty("--shine-y", `${py * 100}%`);
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });

    // KPI spotlight follows cursor
    $$(".kpi-card").forEach(card => {
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });

    // Ripple on buttons
    $$(".btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const r = btn.getBoundingClientRect();
        const size = Math.max(r.width, r.height);
        const rip = document.createElement("span");
        rip.className = "ripple";
        rip.style.width = rip.style.height = size + "px";
        rip.style.left = (e.clientX - r.left - size / 2) + "px";
        rip.style.top = (e.clientY - r.top - size / 2) + "px";
        btn.appendChild(rip);
        setTimeout(() => rip.remove(), 700);
      });
    });

    // Magnetic hover on nav brand + primary buttons
    $$("[data-magnetic]").forEach(el => {
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.12}px, ${dy * 0.18}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }
})();
