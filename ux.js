/* Shared by every page: friendlier forms, offline notice, install-as-app */
(() => {
  /* ---------- Forms ---------- */
  const toLatinDigits = (s) => s
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

  // Arabic keyboards type ٠١٠… which the phone pattern would reject
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches?.('input[type="tel"]')) el.value = toLatinDigits(el.value).replace(/\D/g, "");
    el.setCustomValidity?.("");
  });
  document.addEventListener("change", (e) => e.target.setCustomValidity?.(""));

  // browser messages follow the Windows/phone language, not the site's: always show Arabic
  document.addEventListener("invalid", (e) => {
    const el = e.target, v = el.validity;
    el.setCustomValidity(
      el.type === "tel" && !v.valueMissing ? "اكتب رقم موبايل من 11 رقم بيبدأ بـ 01."
      : v.valueMissing ? "الخانة دي مطلوبة."
      : v.typeMismatch ? "الإيميل مش مكتوب صح."
      : v.tooShort ? `لازم ${el.minLength} حروف على الأقل.`
      : ""
    );
  }, true);

  /* ---------- Offline notice ---------- */
  const banner = document.createElement("div");
  banner.className = "offline-banner";
  banner.setAttribute("role", "status");
  banner.textContent = "مفيش إنترنت دلوقتي — تقدر تتفرج، والطلب هيتبعت لما النت يرجع.";
  banner.hidden = navigator.onLine;
  document.body.append(banner);
  addEventListener("offline", () => (banner.hidden = false));
  addEventListener("online", () => (banner.hidden = true));

  /* ---------- Installable app (Android, Windows: Chrome / Edge) ---------- */
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  const installBtn = document.getElementById("installBtn");
  let installEvent = null;
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    if (installBtn) installBtn.hidden = false;
  });
  installBtn?.addEventListener("click", async () => {
    installEvent?.prompt();
    await installEvent?.userChoice;
    installEvent = null;
    installBtn.hidden = true;
  });
  addEventListener("appinstalled", () => { if (installBtn) installBtn.hidden = true; });
})();
