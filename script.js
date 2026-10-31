(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const C = CONFIG;
  const money = (n) => `${Math.round(n).toLocaleString("ar-EG")} ${C.currency}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const options = (list) => list.map((v, i) => `<option value="${i}">${esc(typeof v === "string" ? v : v.label)}</option>`).join("");

  /* ---------- Storage ---------- */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem("cl_cart")) || []; } catch { return []; } },
    set(v) { try { localStorage.setItem("cl_cart", JSON.stringify(v)); } catch {} },
  };
  let cart = store.get();

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- Static bits ---------- */
  $("#year").textContent = new Date().getFullYear();
  $$("[data-shipping]").forEach((e) => (e.textContent = money(C.shipping)));
  $$("[data-free]").forEach((e) => (e.textContent = money(C.freeShippingOver)));
  $("#waLink").href = `https://wa.me/${C.whatsapp}`;
  $("#igLink").href = C.instagram;
  $("#mailLink").href = `mailto:${C.email}`;
  $("#citySelect").innerHTML = C.cities.map((c) => `<option>${esc(c)}</option>`).join("");

  /* ---------- Mobile menu ---------- */
  $("#menuBtn").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => $("#navLinks").classList.remove("open")));

  /* ---------- Products ---------- */
  const meter = (n) => `<div class="meter">القوة <i>${[1, 2, 3, 4, 5].map((i) => `<b class="${i <= n ? "on" : ""}"></b>`).join("")}</i></div>`;
  const bag = (p, cls = "") => `<div class="bag ${cls}" style="--c:${p.color}" data-label="${esc(p.latin.replace("\n", " "))}"></div>`;

  function renderProducts(filter = "all") {
    const list = C.products.filter((p) => filter === "all" || p.roast === filter);
    $("#productGrid").innerHTML = list.map((p) => `
      <article class="card">
        <div class="card-media">${p.tag ? `<span class="card-tag">${esc(p.tag)}</span>` : ""}${bag(p)}</div>
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          <span class="card-origin">${esc(p.origin)} · تحميص ${esc(p.roast)}</span>
          <div class="notes">${p.notes.map((n) => `<span>${esc(n)}</span>`).join("")}</div>
          ${meter(p.intensity)}
          <div class="card-foot">
            <span class="price">${money(p.price)} <small>/ 250 جم</small></span>
            <button class="btn btn-primary" data-open="${p.id}">اطلب</button>
          </div>
        </div>
      </article>`).join("");
  }
  renderProducts();

  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    $$(".chip").forEach((c) => c.classList.toggle("active", c === b));
    renderProducts(b.dataset.filter);
  });

  /* ---------- Modals ---------- */
  function openModal(m) { m.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal(m) { m.hidden = true; document.body.style.overflow = ""; }
  $$(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) closeModal(m); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    $$(".modal").forEach((m) => !m.hidden && closeModal(m));
    closeCart();
  });

  /* ---------- Product options modal ---------- */
  const pm = { product: null, qty: 1 };
  $("#pmGrind").innerHTML = options(C.grinds);
  $("#pmWeight").innerHTML = options(C.weights);

  function pmPrice() { return pm.product.price * C.weights[$("#pmWeight").value].factor * pm.qty; }
  function pmUpdate() { $("#pmQty").textContent = pm.qty; $("#pmPrice").textContent = money(pmPrice()); }

  $("#productGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (!b) return;
    pm.product = C.products.find((p) => p.id === b.dataset.open);
    pm.qty = 1;
    $("#pmTitle").textContent = pm.product.name;
    $("#pmNotes").textContent = pm.product.notes.join(" · ");
    $("#pmBag").outerHTML = bag(pm.product, "small").replace('class="bag', 'id="pmBag" class="bag');
    $("#pmGrind").value = 0;
    $("#pmWeight").value = 0;
    pmUpdate();
    openModal($("#productModal"));
  });
  $("#pmWeight").addEventListener("change", pmUpdate);
  $$("[data-q]", $("#productModal")).forEach((b) =>
    b.addEventListener("click", () => { pm.qty = Math.max(1, Math.min(20, pm.qty + +b.dataset.q)); pmUpdate(); }));
  $("#pmAdd").addEventListener("click", () => {
    const w = C.weights[$("#pmWeight").value];
    addToCart({
      key: `${pm.product.id}|${$("#pmGrind").value}|${$("#pmWeight").value}`,
      name: pm.product.name,
      details: `${C.grinds[$("#pmGrind").value]} · ${w.label}`,
      unit: pm.product.price * w.factor,
      qty: pm.qty,
      color: pm.product.color,
      latin: pm.product.latin,
    });
    closeModal($("#productModal"));
  });


  window.CoffeeLab = { addToCart: (i) => addToCart(i), money, esc, options };

  /* ---------- Cart ---------- */
  const subtotal = () => cart.reduce((s, i) => s + i.unit * i.qty, 0);
  const shippingFor = (sub) => (sub >= C.freeShippingOver || sub === 0 ? 0 : C.shipping);

  function addToCart(item) {
    const found = cart.find((i) => i.key === item.key);
    if (found) found.qty = Math.min(20, found.qty + item.qty);
    else cart.push(item);
    saveCart();
    toast("اتضافت للسلة ☕");
    const c = $("#cartCount");
    c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
  }

  function saveCart() { store.set(cart); renderCart(); }

  function renderCart() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    $("#cartCount").textContent = count;
    $("#cartItems").innerHTML = cart.length
      ? cart.map((i, idx) => `
        <div class="cart-item">
          <div class="bag small" style="--c:${i.color}" data-label="${esc(i.latin.replace("\n", " "))}"></div>
          <div class="info">
            <h4>${esc(i.name)}</h4>
            <p>${esc(i.details)}</p>
            <div class="row">
              <div class="qty"><button data-ci="${idx}" data-d="-1">−</button><b>${i.qty}</b><button data-ci="${idx}" data-d="1">+</button></div>
              <b>${money(i.unit * i.qty)}</b>
            </div>
            <button class="remove" data-rm="${idx}">شيل</button>
          </div>
        </div>`).join("")
      : `<div class="empty"><b>☕</b>سلتك فاضية.<br>اختار توليفة من المنيو أو اعمل توليفتك.</div>`;

    const sub = subtotal();
    $("#cartSubtotal").textContent = money(sub);
    $("#checkoutBtn").disabled = !cart.length;
    const left = C.freeShippingOver - sub;
    $("#shipFill").style.width = `${Math.min(100, (sub / C.freeShippingOver) * 100)}%`;
    $("#shipMsg").textContent = !cart.length ? "" : left > 0 ? `فاضلك ${money(left)} وتاخد شحن مجاني 🚚` : "مبروك! الشحن مجاني 🎉";
  }

  $("#cartItems").addEventListener("click", (e) => {
    const d = e.target.closest("[data-d]");
    const rm = e.target.closest("[data-rm]");
    if (d) {
      const it = cart[d.dataset.ci];
      it.qty += +d.dataset.d;
      if (it.qty < 1) cart.splice(d.dataset.ci, 1);
      else it.qty = Math.min(20, it.qty);
      saveCart();
    } else if (rm) { cart.splice(rm.dataset.rm, 1); saveCart(); }
  });

  function openCart() { $("#cartDrawer").classList.add("open"); $("#drawerBackdrop").hidden = false; }
  function closeCart() { $("#cartDrawer").classList.remove("open"); $("#drawerBackdrop").hidden = true; }
  $("#cartBtn").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#drawerBackdrop").addEventListener("click", closeCart);
  renderCart();

  /* ---------- Checkout via WhatsApp ---------- */
  $("#checkoutBtn").addEventListener("click", () => {
    const sub = subtotal(), ship = shippingFor(sub);
    $("#coTotals").innerHTML = `
      <div><span>المنتجات</span><span>${money(sub)}</span></div>
      <div><span>الشحن</span><span>${ship ? money(ship) : "مجاني"}</span></div>
      <div class="grand"><span>الإجمالي</span><span>${money(sub + ship)}</span></div>`;
    closeCart();
    openModal($("#checkoutModal"));
  });

  $("#checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const sub = subtotal(), ship = shippingFor(sub);
    const orderNo = "CL-" + Date.now().toString().slice(-6);
    const lines = [
      `*طلب جديد من Coffee Lab* — ${orderNo}`,
      "",
      ...cart.map((i, n) => `${n + 1}. ${i.name} × ${i.qty}\n   ${i.details}\n   ${money(i.unit * i.qty)}`),
      "",
      `المنتجات: ${money(sub)}`,
      `الشحن: ${ship ? money(ship) : "مجاني"}`,
      `*الإجمالي: ${money(sub + ship)}*`,
      "",
      `الاسم: ${f.name}`,
      `الموبايل: ${f.phone}`,
      `العنوان: ${f.city} — ${f.area} — ${f.address}`,
      `الدفع: ${f.payment}`,
      f.notes ? `ملاحظات: ${f.notes}` : "",
    ].filter((l, i, a) => !(l === "" && a[i - 1] === ""));
    window.open(`https://wa.me/${C.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
    cart = [];
    saveCart();
    e.target.reset();
    closeModal($("#checkoutModal"));
    toast("تم تجهيز طلبك — ابعته من واتساب ✓");
  });
})();
