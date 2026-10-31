/* ============ Coffee Lab — interactive blend experiment ============ */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const C = CONFIG;
  const { addToCart, money, esc, options } = window.CoffeeLab;

  const AXES = ["حموضة", "قوام", "حلاوة", "مرارة", "عطرية"];
  const GRIND_SIZES = [0, 2, 3, 5, 8];         // particle size (px) for each entry in CONFIG.grinds; 0 = whole beans
  const GRIND_NOTES = [
    "حبوب كاملة — اطحنها بنفسك قبل التحضير على طول عشان تاخد أطزج طعم.",
    "ناعمة زي البودرة — مظبوطة للكنكة والقهوة التركي.",
    "ناعمة — لماكينة الإسبريسو والموكا بوت.",
    "متوسطة زي الرملة — للـ V60 والكيمكس وماكينة الفلتر.",
    "خشنة — للفرنش برس والكولد برو.",
  ];
  const SCOOP = 10; // percent per scoop
  const MAX_ORIGINS = 3;

  const app = $(".lab");
  const state = { step: 0, scoops: {}, order: [], roast: 50, grind: null, expNo: 0, roastVisited: false };

  const origin = (id) => C.origins.find((o) => o.id === id);
  const total = () => state.order.reduce((s, id) => s + state.scoops[id] * SCOOP, 0);
  const roastLabel = (r = state.roast) => (r < 34 ? "فاتح" : r < 67 ? "وسط" : "غامق");
  const temp = (r = state.roast) => Math.round(196 + r * 0.34);
  const beanColor = (r = state.roast) => {
    const a = [176, 118, 64], b = [36, 21, 13], t = r / 100;
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
  };
  const mixText = () => state.order.map((id) => `${origin(id).name} ${state.scoops[id] * SCOOP}%`).join(" + ");

  /* ---------- Stage 1: samples ---------- */
  function renderShelf() {
    const full = total() >= 100;
    $("#shelf").innerHTML = C.origins.map((o) => {
      const n = state.scoops[o.id] || 0;
      const can = !full && (n > 0 || state.order.length < MAX_ORIGINS);
      return `<button class="jar ${n ? "active" : ""}" data-o="${o.id}" style="--c:${o.color}" ${can ? "" : "disabled"} aria-label="صب ${esc(o.name)}">
        ${n ? `<span class="jar-count">${n * SCOOP}%</span>` : ""}
        <div class="jar-lid"></div><div class="jar-glass"></div>
        <b>${esc(o.name)}</b><small>${esc(o.note)}</small></button>`;
    }).join("");
  }

  function renderBeaker() {
    const t = total();
    $("#beakerFill").innerHTML = state.order.map((id) =>
      `<div style="--c:${origin(id).color};height:${state.scoops[id] * SCOOP}%"></div>`).join("");
    $("#beakerPct").textContent = `${t}%`;
    $("#beakerPct").classList.toggle("full", t === 100);
    $("#mixList").innerHTML = state.order.length
      ? state.order.map((id) => `<div class="mix-row" style="--c:${origin(id).color}">
          <i class="dot"></i><span>${esc(origin(id).name)}</span><b>${state.scoops[id] * SCOOP}%</b>
          <button data-minus="${id}" aria-label="شيل مغرفة">−</button>
          <button data-plus="${id}" aria-label="زوّد مغرفة" ${t >= 100 ? "disabled" : ""}>+</button></div>`).join("") +
        (t < 100 ? `<p class="mix-empty">فاضل ${100 - t}% وتكمل الدورق.</p>` : `<p class="mix-empty">✓ الدورق مليان — يلا على التحميص.</p>`)
      : `<p class="mix-empty">الدورق فاضي… ابدأ صب من البرطمانات اللي فوق.</p>`;
  }

  function scoop(id, d) {
    if (d > 0) {
      if (total() >= 100) return;
      if (!state.scoops[id] && state.order.length >= MAX_ORIGINS) return;
      state.scoops[id] = (state.scoops[id] || 0) + 1;
      if (!state.order.includes(id)) state.order.push(id);
      const p = $("#pour");
      p.style.setProperty("--c", origin(id).color);
      p.classList.remove("on"); void p.offsetWidth; p.classList.add("on");
    } else {
      if (!state.scoops[id]) return;
      if (--state.scoops[id] === 0) { delete state.scoops[id]; state.order = state.order.filter((x) => x !== id); }
    }
    renderShelf(); renderBeaker(); renderNotebook(); renderNav();
  }

  $("#shelf").addEventListener("click", (e) => { const b = e.target.closest("[data-o]"); if (b && !b.disabled) scoop(b.dataset.o, 1); });
  $("#mixList").addEventListener("click", (e) => {
    const m = e.target.closest("[data-minus]"), p = e.target.closest("[data-plus]");
    if (m) scoop(m.dataset.minus, -1);
    if (p && !p.disabled) scoop(p.dataset.plus, 1);
  });

  /* ---------- Stage 2: roasting ---------- */
  $("#drumBeans").innerHTML = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2, r = 22 + (i % 3) * 12;
    return `<span style="left:calc(50% + ${Math.cos(a) * r}% - 8px);top:calc(50% + ${Math.sin(a) * r}% - 11px);transform:rotate(${i * 37}deg)"></span>`;
  }).join("");

  function renderRoast() {
    const r = state.roast;
    app.style.setProperty("--bean", beanColor());
    app.style.setProperty("--heat", r / 100);
    $("#temp").textContent = `${temp()}°C`;
    $("#roastLabel").textContent = `تحميص ${roastLabel()}`;
    $("#thermoFill").style.height = `${25 + r * 0.7}%`;
    $("#roastNote").textContent = r < 34
      ? "🍋 تحميص فاتح: وقفنا بعد الـ First crack على طول — حموضة مشرقة ونكهات فواكه وزهور. أحسن للفلتر."
      : r < 67
        ? "🍯 تحميص وسط: توازن بين الحلاوة والحموضة، كراميل وشوكولاتة خفيفة. ينفع لكل حاجة تقريباً."
        : "🍫 تحميص غامق: وصلنا للـ Second crack — قوام تقيل، مرارة شوكولاتة داكنة، حموضة قليلة. ممتاز للتركي والإسبريسو.";
  }
  $("#roastSlider").addEventListener("input", (e) => { state.roast = +e.target.value; renderRoast(); renderNotebook(); });

  /* ---------- Stage 3: grinding ---------- */
  $("#grindOpts").innerHTML = C.grinds.map((g, i) => `<button data-g="${i}">${esc(g)}</button>`).join("");

  function renderGrind(animate) {
    const g = state.grind;
    $$("#grindOpts button").forEach((b) => b.classList.toggle("active", +b.dataset.g === g));
    $("#grindNote").textContent = g === null ? "اختار طحنة من تحت عشان تشغّل المطحنة." : GRIND_NOTES[g] || "";
    if (g === null) { $("#grounds").innerHTML = `<span class="tray-empty">الطبق فاضي</span>`; return; }
    $("#grindDial").style.transform = `rotate(${-80 + g * 40}deg)`;
    const size = GRIND_SIZES[g] ?? 4;
    const count = size ? Math.min(360, Math.round(9000 / (size * size + 6))) : 22;
    $("#grounds").innerHTML = Array.from({ length: count }, () => {
      const s = size ? size * (0.7 + Math.random() * 0.6) : 0;
      const delay = animate ? (Math.random() * 0.6).toFixed(2) : 0;
      return size
        ? `<i style="--g:${beanColor()};width:${s}px;height:${s}px;animation-delay:${delay}s"></i>`
        : `<i class="whole" style="--g:${beanColor()};animation-delay:${delay}s;transform:rotate(${Math.random() * 180}deg)"></i>`;
    }).join("");
    if (animate) {
      const gr = $("#grinder");
      gr.classList.remove("grinding"); void gr.offsetWidth; gr.classList.add("grinding");
    }
  }
  $("#grindOpts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-g]");
    if (!b) return;
    state.grind = +b.dataset.g;
    renderGrind(true); renderNotebook(); renderNav();
  });

  /* ---------- Stage 4: analysis ---------- */
  function flavorProfile() {
    const r = (state.roast - 50) / 50;
    const base = AXES.map((_, k) => state.order.reduce((s, id) => s + origin(id).profile[k] * state.scoops[id] * SCOOP / 100, 0));
    const adj = [-2 * r, 1.5 * r, 0.7 - Math.abs(r), 2.5 * r, -r];
    return base.map((v, k) => Math.max(1, Math.min(10, Math.round((v + adj[k]) * 10) / 10)));
  }

  function drawRadar(vals) {
    const R = 100, n = AXES.length;
    const pt = (i, v) => {
      const a = (-90 + (360 / n) * i) * Math.PI / 180;
      return [Math.cos(a) * R * v / 10, Math.sin(a) * R * v / 10];
    };
    const poly = (v) => AXES.map((_, i) => pt(i, typeof v === "number" ? v : v[i]).map((x) => x.toFixed(1)).join(",")).join(" ");
    let svg = [2, 4, 6, 8, 10].map((l) => `<polygon class="grid" points="${poly(l)}"/>`).join("");
    svg += AXES.map((_, i) => { const [x, y] = pt(i, 10); return `<line class="axis" x1="0" y1="0" x2="${x}" y2="${y}"/>`; }).join("");
    svg += `<polygon class="shape" points="${poly(vals)}"/>`;
    svg += vals.map((v, i) => { const [x, y] = pt(i, v); return `<circle cx="${x}" cy="${y}" r="3.5"/>`; }).join("");
    svg += AXES.map((label, i) => {
      const [x, y] = pt(i, 12.6);
      return `<text x="${x}" y="${y - 7}">${label}</text><text class="val" x="${x}" y="${y + 9}">${vals[i]}</text>`;
    }).join("");
    $("#radar").innerHTML = svg;
  }

  const unitPrice = () => {
    const base = state.order.reduce((s, id) => s + origin(id).price * state.scoops[id] * SCOOP / 100, 0);
    return Math.round((base + C.labFee) * C.weights[$("#labWeight").value].factor / 5) * 5;
  };

  let analyzeTimers = [];
  function runAnalysis() {
    analyzeTimers.forEach(clearTimeout);
    $("#analyzing").hidden = false;
    $("#report").hidden = true;
    const msgs = ["جاري تحليل العينة…", "بنقيس الحموضة والقوام…", "بنرسم بصمة النكهة…"];
    msgs.forEach((m, i) => analyzeTimers.push(setTimeout(() => ($("#analyzeText").textContent = m), i * 550)));
    analyzeTimers.push(setTimeout(showReport, msgs.length * 550));
  }

  function showReport() {
    const vals = flavorProfile();
    drawRadar(vals);
    const top = vals.map((v, i) => [v, AXES[i]]).sort((a, b) => b[0] - a[0]).slice(0, 2).map((x) => x[1]);
    $("#radarSum").innerHTML = `بصمة توليفتك: <b>عالية في ال${top[0]} وال${top[1]}</b>`;
    const notes = [...new Set(state.order.flatMap((id) => origin(id).note.split(" · ")))].join(" · ");
    $("#reportNo").textContent = `#${state.expNo}`;
    $("#reportList").innerHTML = [
      ["المعادلة", esc(mixText())],
      ["التحميص", `${roastLabel()} · ${temp()}°C`],
      ["الطحنة", esc(C.grinds[state.grind])],
      ["نكهات متوقعة", esc(notes)],
    ].map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join("");
    updatePrice();
    $("#analyzing").hidden = true;
    $("#report").hidden = false;
  }

  $("#labWeight").innerHTML = options(C.weights);
  const updatePrice = () => ($("#labPrice").textContent = money(unitPrice()));
  $("#labWeight").addEventListener("change", updatePrice);

  $("#labAdd").addEventListener("click", () => {
    const name = $("#labName").value.trim() || `تجربة #${state.expNo}`;
    const w = C.weights[$("#labWeight").value];
    addToCart({
      key: `lab|${state.expNo}|${mixText()}|${state.roast}|${state.grind}|${$("#labWeight").value}|${name}`,
      name: `🧪 ${name}`,
      details: `${mixText()} · تحميص ${roastLabel()} (${temp()}°C) · ${C.grinds[state.grind]} · ${w.label} · تجربة #${state.expNo}`,
      unit: unitPrice(),
      qty: 1,
      color: beanColor(),
      latin: `LAB\nNo.${state.expNo}`,
    });
    const b = $("#labAdd"), txt = b.textContent;
    b.textContent = "✓ اتضافت للسلة";
    setTimeout(() => (b.textContent = txt), 1600);
  });
  $("#labReset").addEventListener("click", () => { reset(); $(".lab-app").scrollIntoView({ behavior: "smooth", block: "start" }); });

  /* ---------- Notebook ---------- */
  function renderNotebook() {
    const lines = [];
    if (!state.order.length) lines.push(`<li class="muted">لسه مفيش عينات…</li>`);
    state.order.forEach((id) => lines.push(`<li>• ${esc(origin(id).name)} — <b>${state.scoops[id] * SCOOP}%</b></li>`));
    if (state.order.length && total() < 100) lines.push(`<li class="muted">(فاضل ${100 - total()}%)</li>`);
    if (state.roastVisited) lines.push(`<li>🔥 ${roastLabel()} على <b>${temp()}°C</b></li>`);
    if (state.grind !== null) lines.push(`<li>⚙️ ${esc(C.grinds[state.grind])}</li>`);
    if (state.step === 3) lines.push(`<li>🔬 التحليل تم ✓</li>`);
    $("#nbList").innerHTML = lines.join("");
    $("#expNo").textContent = `No.${state.expNo}`;
  }

  /* ---------- Navigation ---------- */
  const reachable = () => (total() < 100 ? 0 : state.grind === null ? 2 : 3);

  function renderNav() {
    const reach = reachable();
    $$("#labSteps li").forEach((li, i) => {
      li.classList.toggle("active", i === state.step);
      li.classList.toggle("done", i < state.step || (i < reach && i !== state.step));
      li.querySelector("button").disabled = i > reach;
    });
    $("#labBack").hidden = state.step === 0;
    $("#labNext").hidden = state.step === 3;
    $("#labNext").disabled = state.step >= reach;
    $("#labNext").textContent = state.step === 2 ? "حلّل التجربة 🔬" : "الخطوة الجاية ←";
  }

  function go(n) {
    if (n > reachable() || n < 0) return;
    state.step = n;
    if (n >= 1) state.roastVisited = true;
    $$(".stage").forEach((s) => (s.hidden = +s.dataset.stage !== n));
    if (n === 3) runAnalysis();
    renderNav(); renderNotebook();
    const top = $(".lab-app").getBoundingClientRect().top;
    if (top < 0) $(".lab-app").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("#labSteps").addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (b && !b.disabled) go(+b.dataset.step); });
  $("#labNext").addEventListener("click", () => go(state.step + 1));
  $("#labBack").addEventListener("click", () => go(state.step - 1));

  function reset() {
    Object.assign(state, { step: 0, scoops: {}, order: [], roast: 50, grind: null, roastVisited: false, expNo: 1000 + Math.floor(Math.random() * 9000) });
    $("#roastSlider").value = 50;
    $("#labName").value = "";
    $("#labWeight").value = 0;
    renderShelf(); renderBeaker(); renderRoast(); renderGrind(false);
    go(0);
  }
  reset();
})();
