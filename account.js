(async () => {
  const CL = await clReady;
  const next = new URLSearchParams(location.search).get("next");
  const views = ["loading", "disabledView", "authView", "userView"];
  const show = (id) => views.forEach((v) => ($("#" + v).hidden = v !== id));

  if (!CL.enabled) { show("disabledView"); return; }

  $("#profileCity").innerHTML = `<option value="">— اختار —</option>` + CONFIG.cities.map((c) => `<option>${esc(c)}</option>`).join("");

  /* ---------- Auth ---------- */
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => {
    $$(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $("#loginForm").hidden = b.dataset.tab !== "login";
    $("#registerForm").hidden = b.dataset.tab !== "register";
    $("#authTitle").textContent = b.dataset.tab === "login" ? "أهلاً بيك في المعمل" : "انضم للمعمل";
    setMsg($("#authMsg"), "");
  }));

  const run = (btn, fn) => busy(btn, async () => {
    setMsg($("#authMsg"), "");
    try { await fn(); } catch (e) { setMsg($("#authMsg"), e.message); }
  });

  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    run(e.submitter, () => CL.signIn(f.get("email").trim(), f.get("password")));
  });
  $("#registerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    run(e.submitter, () => CL.signUp(f.get("name").trim(), f.get("email").trim(), f.get("password")));
  });
  $("#googleBtn").addEventListener("click", (e) => run(e.currentTarget, () => CL.google()));
  $("#forgotBtn").addEventListener("click", (e) => {
    const email = $("#loginForm [name=email]").value.trim();
    if (!email) return setMsg($("#authMsg"), "اكتب إيميلك الأول وبعدين دوس \"نسيت الباسورد\".");
    run(e.currentTarget, async () => {
      await CL.resetPassword(email);
      setMsg($("#authMsg"), "بعتنالك إيميل فيه لينك لتغيير الباسورد ✓", true);
    });
  });

  /* ---------- Signed in ---------- */
  let unwatch = null;
  CL.onUser((u) => {
    unwatch?.(); unwatch = null;
    if (!u) { show("authView"); return; }
    if (next && /^[\w.-]+\.html(#[\w-]+)?$/.test(next)) { location.replace(next); return; }

    show("userView");
    const p = CL.profile || {};
    const name = p.name || u.displayName || "";
    $("#hello").textContent = name ? `أهلاً يا ${name.split(" ")[0]} 👋` : "أهلاً بيك 👋";
    $("#userEmail").textContent = u.email || "";
    $("#adminLink").hidden = !CL.isAdmin();
    const pf = $("#profileForm").elements;
    pf.name.value = name;
    ["phone", "city", "area", "address"].forEach((k) => (pf[k].value = p[k] || ""));

    unwatch = CL.watchMyOrders(renderOrders, (msg) => ($("#myOrders").innerHTML = `<p class="form-msg">${esc(msg)}</p>`));
  });

  function renderOrders(orders) {
    $("#myOrders").innerHTML = orders.length ? orders.map((o) => {
      const idx = STATUSES.indexOf(o.status);
      const steps = o.status === CANCELLED
        ? `<p class="cancelled-note">الطلب ده اتلغى.</p>`
        : `<ol class="track">${STATUSES.map((s, i) => `<li class="${i <= idx ? "on" : ""}">${s}</li>`).join("")}</ol>`;
      return `<article class="order-card">
        <header><div><b class="order-no">${esc(o.number)}</b><small>${fmtDate(o.createdAt)}</small></div>${badge(o.status)}</header>
        ${steps}
        <details><summary>${o.items?.length || 0} منتج · <b>${money(o.total)}</b></summary>${itemsHtml(o.items)}
          <p class="small muted">التوصيل: ${esc(o.customer?.city)} — ${esc(o.customer?.area)} — ${esc(o.customer?.address)}</p></details>
        ${o.status === "جديد" ? `<button class="link-btn danger" data-cancel="${o.id}">إلغاء الطلب</button>` : ""}
      </article>`;
    }).join("") : `<div class="empty-state"><b>☕</b><p>لسه معملتش أي طلب.</p><a href="index.html#shop" class="btn btn-primary btn-sm">ابدأ تسوّق</a></div>`;
  }

  $("#myOrders").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-cancel]");
    if (!b || !confirm("متأكد إنك عايز تلغي الطلب؟")) return;
    try { await busy(b, () => CL.cancelOrder(b.dataset.cancel)); toast("الطلب اتلغى"); } catch (err) { toast(err.message); }
  });

  $("#profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await busy(e.submitter, () => CL.saveProfile(data));
      setMsg($("#profileMsg"), "اتحفظت ✓", true);
    } catch (err) { setMsg($("#profileMsg"), err.message); }
  });

  $("#signOutBtn").addEventListener("click", () => CL.signOut());
})();
