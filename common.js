/* Shared helpers for account.html and admin.html */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (n) => `${Math.round(n || 0).toLocaleString("ar-EG")} ${CONFIG.currency}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clReady = new Promise((r) => (window.CL ? r(window.CL) : document.addEventListener("cl-ready", () => r(window.CL), { once: true })));

const STATUSES = ["جديد", "قيد التحضير", "تم الشحن", "تم التوصيل"];
const CANCELLED = "ملغي";
const statusClass = (s) => ({ "جديد": "st-new", "قيد التحضير": "st-prep", "تم الشحن": "st-ship", "تم التوصيل": "st-done", "ملغي": "st-cancel" }[s] || "");
const badge = (s) => `<span class="badge ${statusClass(s)}">${esc(s)}</span>`;

const fmtDate = (ts) => {
  const d = ts?.toDate?.();
  return d ? d.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
};

const itemsHtml = (items = []) => `<ul class="items">${items.map((i) => `
  <li><div><b>${esc(i.name)}</b> × ${i.qty}<small>${esc(i.details)}</small></div><span>${money(i.unit * i.qty)}</span></li>`).join("")}</ul>`;

let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2400);
}

function setMsg(el, text, ok = false) {
  el.textContent = text || "";
  el.classList.toggle("ok", ok);
}

async function busy(btn, fn) {
  btn.disabled = true;
  try { return await fn(); } finally { btn.disabled = false; }
}
