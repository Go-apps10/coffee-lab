(async () => {
  const CL = await clReady;
  const views = ["loading", "msgView", "dashView"];
  const show = (id) => views.forEach((v) => ($("#" + v).hidden = v !== id));
  const message = (title, text, action = "") => {
    $("#msgTitle").textContent = title;
    $("#msgText").textContent = text;
    $("#msgAction").innerHTML = action;
    show("msgView");
  };

  if (!CL.enabled) {
    message("لوحة الأدمن لسه متفعلتش", "لازم تحط إعدادات Firebase في ملف firebase-config.js الأول — الخطوات في README.md.");
    return;
  }

  const state = { orders: [], filter: "الكل", q: "", first: true, sound: true, openId: null };
  let unwatch = null;

  CL.onUser((u) => {
    unwatch?.(); unwatch = null;
    $("#signOutBtn").hidden = !u;
    $("#liveDot").hidden = true;
    if (!u) return message("سجّل دخول الأول", "اللوحة دي للأدمن بس.", `<a class="btn btn-primary" href="account.html?next=admin.html">تسجيل دخول</a>`);
    if (!CL.isAdmin()) {
      return message("الحساب ده مش أدمن",
        `انت داخل بـ ${u.email}. لو ده إيميل الأدمن، اتأكد إنه مكتوب في firebase-config.js و firestore.rules، وإنك داخل بـ Google.`,
        `<button class="btn btn-ghost" onclick="CL.signOut()">دخول بحساب تاني</button>`);
    }
    show("dashView");
    state.first = true;
    unwatch = CL.watchAllOrders(onOrders, (msg) => message("مش قادر أقرا الطلبات", msg));
  });
  $("#signOutBtn").addEventListener("click", () => CL.signOut());

  /* ---------- Live data ---------- */
  function onOrders(orders, changes) {
    $("#liveDot").hidden = false;
    if (!state.first) {
      const added = changes.filter((c) => c.type === "added" && !c.doc.metadata.hasPendingWrites);
      if (added.length) {
        toast(`🔔 ${added.length === 1 ? "طلب جديد" : `${added.length} طلبات جديدة`}!`);
        if (state.sound) beep();
      }
    }
    state.first = false;
    state.orders = orders;
    render();
    if (state.openId) openOrder(state.openId, true);
  }

  function render() {
    renderStats();
    renderTabs();
    renderTable();
    const fresh = state.orders.filter((o) => o.status === "جديد").length;
    document.title = (fresh ? `(${fresh}) ` : "") + "لوحة الطلبات | Coffee Lab";
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const live = state.orders.filter((o) => o.status !== CANCELLED);
    const t = (o) => o.createdAt?.toMillis?.() || 0;
    const today = live.filter((o) => t(o) >= startDay);
    const month = live.filter((o) => t(o) >= startMonth);
    const sum = (l) => l.reduce((s, o) => s + (o.total || 0), 0);
    const cards = [
      ["طلبات جديدة", state.orders.filter((o) => o.status === "جديد").length, "مستنية تأكيد", "hot"],
      ["طلبات النهارده", today.length, money(sum(today))],
      ["مبيعات الشهر", money(sum(month)), `${month.length} طلب`],
      ["العملاء", new Set(state.orders.map((o) => o.uid)).size, `متوسط الطلب ${money(live.length ? sum(live) / live.length : 0)}`],
    ];
    $("#stats").innerHTML = cards.map(([label, val, sub, cls = ""]) =>
      `<div class="stat ${cls}"><span>${label}</span><b>${typeof val === "number" ? val.toLocaleString("ar-EG") : val}</b><small>${sub}</small></div>`).join("");
  }

  /* ---------- Filters ---------- */
  function renderTabs() {
    const all = ["الكل", ...STATUSES, CANCELLED];
    const count = (s) => (s === "الكل" ? state.orders.length : state.orders.filter((o) => o.status === s).length);
    $("#statusTabs").innerHTML = all.map((s) =>
      `<button class="${s === state.filter ? "active" : ""}" data-f="${s}">${s} <i>${count(s)}</i></button>`).join("");
  }
  $("#statusTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (!b) return;
    state.filter = b.dataset.f;
    renderTabs(); renderTable();
  });
  $("#search").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); renderTable(); });

  const visible = () => state.orders.filter((o) =>
    (state.filter === "الكل" || o.status === state.filter) &&
    (!state.q || [o.number, o.customer?.name, o.customer?.phone, o.email].some((v) => String(v || "").toLowerCase().includes(state.q))));

  /* ---------- Table ---------- */
  const statusSelect = (o) => `<select class="status-select ${statusClass(o.status)}" data-status="${o.id}" aria-label="حالة الطلب">
    ${[...STATUSES, CANCELLED].map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select>`;

  function renderTable() {
    const list = visible();
    $("#ordersTable").innerHTML = list.length ? `
      <div class="tr th"><span>الطلب</span><span>العميل</span><span>المنتجات</span><span>الإجمالي</span><span>الحالة</span><span></span></div>
      ${list.map((o) => `
      <div class="tr ${o.status === "جديد" ? "is-new" : ""}" data-row="${o.id}">
        <span><b class="order-no">${esc(o.number)}</b><small>${fmtDate(o.createdAt)}</small></span>
        <span><b>${esc(o.customer?.name)}</b><small dir="ltr">${esc(o.customer?.phone)} · ${esc(o.customer?.city)}</small></span>
        <span class="items-cell">${(o.items || []).map((i) => `${esc(i.name)} ×${i.qty}`).join("، ")}</span>
        <span><b>${money(o.total)}</b><small>${esc(o.payment)}</small></span>
        <span>${statusSelect(o)}</span>
        <span><button class="btn btn-ghost btn-sm" data-open="${o.id}">تفاصيل</button></span>
      </div>`).join("")}`
      : `<div class="empty-state"><b>📭</b><p>${state.orders.length ? "مفيش طلبات بالفلتر ده." : "لسه مفيش طلبات. أول ما عميل يطلب هيظهر هنا على طول."}</p></div>`;
  }

  async function changeStatus(id, status, el) {
    try {
      await busy(el, () => CL.setStatus(id, status));
      toast(`الطلب بقى: ${status}`);
    } catch (err) { toast(err.message); render(); }
  }

  document.addEventListener("change", (e) => {
    const s = e.target.closest("[data-status]");
    if (s) changeStatus(s.dataset.status, s.value, s);
  });
  $("#ordersTable").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (b) openOrder(b.dataset.open);
  });

  /* ---------- Order details ---------- */
  const waNumber = (phone = "") => (phone.startsWith("0") ? "2" + phone : phone).replace(/\D/g, "");

  function openOrder(id, refresh = false) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return;
    state.openId = id;
    const c = o.customer || {};
    const waText = encodeURIComponent(`أهلاً ${c.name || ""} 👋\nمعاك Coffee Lab بخصوص طلبك ${o.number} (${money(o.total)}).\nحالة الطلب: ${o.status}`);
    $("#orderDetail").innerHTML = `
      <div class="od-head"><div><h3 id="omTitle" class="order-no">${esc(o.number)}</h3><small class="muted">${fmtDate(o.createdAt)}</small></div>${badge(o.status)}</div>
      <div class="od-grid">
        <div>
          <h4>العميل</h4>
          <p><b>${esc(c.name)}</b><br><a href="tel:${esc(c.phone)}" dir="ltr">${esc(c.phone)}</a><br><small class="muted">${esc(o.email)}</small></p>
          <h4>العنوان</h4>
          <p>${esc(c.city)} — ${esc(c.area)}<br>${esc(c.address)}</p>
          ${o.notes ? `<h4>ملاحظات</h4><p class="note">${esc(o.notes)}</p>` : ""}
        </div>
        <div>
          <h4>المنتجات</h4>
          ${itemsHtml(o.items)}
          <div class="totals">
            <div><span>المنتجات</span><span>${money(o.subtotal)}</span></div>
            <div><span>الشحن</span><span>${o.shipping ? money(o.shipping) : "مجاني"}</span></div>
            <div class="grand"><span>الإجمالي</span><span>${money(o.total)}</span></div>
            <div><span>الدفع</span><span>${esc(o.payment)}</span></div>
          </div>
        </div>
      </div>
      <h4>غيّر الحالة</h4>
      <div class="status-btns">${[...STATUSES, CANCELLED].map((s) =>
        `<button class="badge ${statusClass(s)} ${s === o.status ? "current" : ""}" data-set="${s}" ${s === o.status ? "disabled" : ""}>${s}</button>`).join("")}</div>
      <div class="od-actions">
        <a class="btn btn-primary" target="_blank" rel="noopener" href="https://wa.me/${waNumber(c.phone)}?text=${waText}">كلّم العميل على واتساب</a>
        <a class="btn btn-ghost" href="tel:${esc(c.phone)}">اتصال</a>
      </div>`;
    if (!refresh) openModal($("#orderModal"));
  }
  $("#orderDetail").addEventListener("click", (e) => {
    const b = e.target.closest("[data-set]");
    if (b && state.openId) changeStatus(state.openId, b.dataset.set, b);
  });

  /* ---------- Modal ---------- */
  function openModal(m) { m.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal(m) { m.hidden = true; document.body.style.overflow = ""; state.openId = null; }
  $("#orderModal").addEventListener("click", (e) => { if (e.target.id === "orderModal" || e.target.closest("[data-close]")) closeModal($("#orderModal")); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#orderModal").hidden) closeModal($("#orderModal")); });

  /* ---------- New-order sound ---------- */
  let audio;
  function beep() {
    try {
      audio ||= new AudioContext();
      [0, 0.18].forEach((t, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = i ? 1046 : 784;
        g.gain.setValueAtTime(0.18, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + 0.25);
        o.connect(g).connect(audio.destination);
        o.start(audio.currentTime + t);
        o.stop(audio.currentTime + t + 0.26);
      });
    } catch {}
  }
  $("#soundBtn").addEventListener("click", (e) => {
    state.sound = !state.sound;
    e.currentTarget.textContent = state.sound ? "🔔 التنبيه شغال" : "🔕 التنبيه مقفول";
    if (state.sound) beep();
  });
})();
