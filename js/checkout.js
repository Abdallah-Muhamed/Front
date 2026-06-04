"use strict";

const api = () => window.SmartFarmApi;

let byId = new Map();

const $ = (sel) => document.querySelector(sel);

function getCart() {
  return api().getCart();
}
function setCart(cart) {
  api().setCart(cart);
}
function formatMoney(n) {
  return api().formatMoney(n);
}
function cartCount(cart) {
  return api().cartCount(cart);
}
function cartTotal(cart) {
  return api().cartTotal(cart, byId);
}

function requireLogin() {
  if (api().isLoggedIn()) return true;
  alert("يجب تسجيل الدخول لإتمام الطلب.");
  window.location.href = "index.html";
  return false;
}

const checkoutItems = $("#checkoutItems");
const checkoutEmpty = $("#checkoutEmpty");
const checkoutTotalEl = $("#checkoutTotal");
const btnConfirmOrder = $("#btnConfirmOrder");
const checkoutMsg = $("#checkoutMsg");
const paymentMethods = $("#paymentMethods");
const orderSuccessOverlay = $("#orderSuccessOverlay");
const bankDetails = $("#bankDetails");

function toggleBankDetails(methodId) {
  if (!bankDetails) return;
  bankDetails.hidden = methodId !== "visa";
}

function renderPaymentMethods() {
  if (!paymentMethods) return;

  const paymentOptions = [
    { id: "cash", title: "الدفع عند الاستلام", sub: "كاش عند توصيل الطلب" },
    { id: "visa", title: "بطاقة بنكية", sub: "الدفع إلكترونيًا" },
  ];

  paymentMethods.innerHTML = "";

  paymentOptions.forEach((m, idx) => {
    const label = document.createElement("label");
    label.className = "payment-card" + (idx === 0 ? " payment-card--active" : "");
    label.innerHTML = `
      <input type="radio" name="payment" value="${m.id}" ${idx === 0 ? "checked" : ""} />
      <div class="payment-card__text">
        <div class="payment-card__title">${m.title}</div>
        <div class="payment-card__sub">${m.sub}</div>
      </div>
    `;
    paymentMethods.appendChild(label);
  });
}

function attachPaymentChange() {
  const radios = document.querySelectorAll('input[name="payment"]');
  radios.forEach((r) => {
    r.addEventListener("change", () => toggleBankDetails(r.value));
  });
  const checked = document.querySelector('input[name="payment"]:checked');
  if (checked) toggleBankDetails(checked.value);
}

function showOrderSuccess() {
  if (orderSuccessOverlay) {
    orderSuccessOverlay.hidden = false;
    requestAnimationFrame(() => orderSuccessOverlay.classList.add("show"));
  }
  if (checkoutMsg) {
    checkoutMsg.hidden = false;
    checkoutMsg.textContent = "تم تأكيد الطلب ✅";
  }
}

function renderCheckout() {
  if (!checkoutItems || !checkoutEmpty || !btnConfirmOrder) return;

  const cart = getCart();
  const totalQty = cartCount(cart);
  const total = cartTotal(cart);

  if (checkoutTotalEl) checkoutTotalEl.textContent = formatMoney(total);

  if (totalQty === 0) {
    checkoutEmpty.hidden = false;
    checkoutItems.innerHTML = "";
    btnConfirmOrder.disabled = true;
    return;
  }

  checkoutEmpty.hidden = true;
  btnConfirmOrder.disabled = false;
  checkoutItems.innerHTML = "";

  for (const [pidStr, qty] of Object.entries(cart)) {
    const pid = Number(pidStr);
    const p = byId.get(pid);
    if (!p) continue;

    const row = document.createElement("div");
    row.className = "checkout-item";
    row.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <div>
        <div class="checkout-item__name">${p.name}</div>
        <div class="checkout-item__meta">السعر: ${formatMoney(p.price)}</div>
        <div class="checkout-item__meta">الإجمالي: ${formatMoney(p.price * qty)}</div>
      </div>
      <div class="checkout-qty">
        <button class="qty-btn" data-minus="${pid}">-</button>
        <div class="qty">${qty}</div>
        <button class="qty-btn" data-plus="${pid}">+</button>
      </div>
    `;
    checkoutItems.appendChild(row);
  }

  checkoutItems.querySelectorAll("[data-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.minus);
      const cart2 = getCart();
      const next = (cart2[id] || 0) - 1;
      if (next <= 0) delete cart2[id];
      else cart2[id] = next;
      setCart(cart2);
      renderCheckout();
    });
  });

  checkoutItems.querySelectorAll("[data-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.plus);
      const cart2 = getCart();
      cart2[id] = (cart2[id] || 0) + 1;
      setCart(cart2);
      renderCheckout();
    });
  });
}

btnConfirmOrder?.addEventListener("click", async () => {
  if (!requireLogin()) return;

  const cart = getCart();
  if (cartCount(cart) === 0) {
    if (checkoutMsg) {
      checkoutMsg.hidden = false;
      checkoutMsg.textContent = "السلة فارغة.";
    }
    return;
  }

  const checked = document.querySelector('input[name="payment"]:checked');
  const payment = checked ? checked.value : null;

  if (!payment) {
    if (checkoutMsg) {
      checkoutMsg.hidden = false;
      checkoutMsg.textContent = "اختر طريقة دفع أولًا.";
    }
    return;
  }

  const notes = document.getElementById("orderNotes")?.value?.trim() || "";
  const orderDate = api().todayIsoDate();
  const items = [];

  for (const [pidStr, qty] of Object.entries(cart)) {
    const pid = Number(pidStr);
    const p = byId.get(pid);
    if (!p || !qty) continue;
    items.push({
      status: "pending",
      order_date: orderDate,
      quantity: Number(qty),
      total_price: p.price * Number(qty),
      pid,
    });
  }

  if (!items.length) {
    if (checkoutMsg) {
      checkoutMsg.hidden = false;
      checkoutMsg.textContent = "لا توجد منتجات صالحة في السلة.";
    }
    return;
  }

  btnConfirmOrder.disabled = true;
  if (checkoutMsg) {
    checkoutMsg.hidden = false;
    checkoutMsg.textContent = "جاري إرسال الطلب...";
  }

  try {
    await api().apiFetch("/api/order/batch", {
      method: "POST",
      body: {
        items,
        payment_method: payment === "visa" ? "card" : "cash",
        order_notes: notes || null,
      },
    });

    showOrderSuccess();
    setCart({});
    renderCheckout();

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (e) {
    console.error(e);
    btnConfirmOrder.disabled = false;
    if (checkoutMsg) {
      checkoutMsg.hidden = false;
      checkoutMsg.textContent = e.message || "تعذّر إتمام الطلب.";
    }
  }
});

async function initCheckout() {
  if (!requireLogin()) return;

  const list = await api().loadProducts();
  byId = api().byId;

  renderPaymentMethods();
  attachPaymentChange();
  renderCheckout();
}

document.addEventListener("DOMContentLoaded", () => {
  initCheckout().catch((e) => console.error(e));
});
