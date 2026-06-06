"use strict";

const api = () => window.SmartFarmApi;

let byId = new Map();

const $ = (sel) => document.querySelector(sel);

function getCart() { return api().getCart(); }
function setCart(cart) { api().setCart(cart); }
function formatMoney(n) { return api().formatMoney(n); }
function cartCount(cart) { return api().cartCount(cart); }
function cartTotal(cart) { return api().cartTotal(cart, byId); }

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
const cardDetails = $("#cardDetails");
const walletDetails = $("#walletDetails");
const codDetails = $("#codDetails");

function togglePaymentPanels(methodId) {
  if (cardDetails) cardDetails.hidden = methodId !== "card";
  if (walletDetails) walletDetails.hidden = methodId !== "wallet";
  if (codDetails) codDetails.hidden = methodId !== "cod";
}

function renderPaymentMethods() {
  if (!paymentMethods) return;

  const paymentOptions = [
    { id: "card", title: "بطاقة بنكية", sub: "محاكاة Stripe — بطاقة 4242 4242 4242 4242" },
    { id: "wallet", title: "محفظة إلكترونية", sub: "محاكاة فودافون كاش — OTP: 123456" },
    { id: "cod", title: "الدفع عند الاستلام", sub: "ادفع نقداً عند استلام الطلب" },
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
    r.addEventListener("change", () => {
      document.querySelectorAll(".payment-card").forEach((el) => el.classList.remove("payment-card--active"));
      r.closest(".payment-card")?.classList.add("payment-card--active");
      togglePaymentPanels(r.value);
    });
  });
  const checked = document.querySelector('input[name="payment"]:checked');
  if (checked) togglePaymentPanels(checked.value);
}

function showOrderSuccess(txId) {
  if (orderSuccessOverlay) {
    orderSuccessOverlay.hidden = false;
    requestAnimationFrame(() => orderSuccessOverlay.classList.add("show"));
    const txEl = document.getElementById("orderTxId");
    if (txEl && txId) txEl.textContent = `رقم العملية: ${txId}`;
  }
  if (checkoutMsg) {
    checkoutMsg.hidden = false;
    checkoutMsg.textContent = "تم تأكيد الطلب والدفع ✅";
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
      <img src="${p.img}" alt="${p.name}" onerror="this.src='images/item2.jpg'">
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

async function processPayment(total, method) {
  if (method === "cod") {
    // Cash on delivery - no payment processing needed
    return { success: true, transactionId: "COD-" + Date.now() };
  }

  if (method === "card") {
    const cardNumber = document.getElementById("cardNumber")?.value || "";
    const cardName = document.getElementById("cardName")?.value || "";
    const cardExp = document.getElementById("cardExp")?.value || "";
    const cardCvv = document.getElementById("cardCvv")?.value || "";
    return api().apiFetch("/api/payment/card", {
      method: "POST",
      body: { cardNumber, cardName, expiry: cardExp, cvv: cardCvv, amount: total, currency: "EGP" },
    });
  }

  const phone = document.getElementById("walletPhone")?.value || "";
  const otp = document.getElementById("walletOtp")?.value || "";
  return api().apiFetch("/api/payment/wallet", {
    method: "POST",
    body: { phone, otp, amount: total, provider: "vodafone_cash" },
  });
}

btnConfirmOrder?.addEventListener("click", async () => {
  if (!requireLogin()) return;

  const cart = getCart();
  if (cartCount(cart) === 0) {
    if (checkoutMsg) { checkoutMsg.hidden = false; checkoutMsg.textContent = "السلة فارغة."; }
    return;
  }

  const checked = document.querySelector('input[name="payment"]:checked');
  const payment = checked ? checked.value : null;
  if (!payment) {
    if (checkoutMsg) { checkoutMsg.hidden = false; checkoutMsg.textContent = "اختر طريقة دفع أولًا."; }
    return;
  }

  const notes = document.getElementById("orderNotes")?.value?.trim() || "";
  const orderDate = api().todayIsoDate();
  const items = [];
  const total = cartTotal(cart);

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
    if (checkoutMsg) { checkoutMsg.hidden = false; checkoutMsg.textContent = "لا توجد منتجات صالحة."; }
    return;
  }

  btnConfirmOrder.disabled = true;
  if (checkoutMsg) { checkoutMsg.hidden = false; checkoutMsg.textContent = "جاري معالجة الدفع..."; }

  try {
    const payResult = await processPayment(total, payment);
    if (!payResult?.success && payResult?.Success !== true) {
      throw new Error(payResult?.message || payResult?.Message || "فشل الدفع.");
    }

    const txId = payResult.transactionId || payResult.TransactionId;

    if (checkoutMsg) checkoutMsg.textContent = "تم الدفع — جاري إنشاء الطلب...";

    await api().apiFetch("/api/order/batch", {
      method: "POST",
      body: {
        items,
        payment_method: payment === "card" ? `card:${txId}` : payment === "wallet" ? `wallet:${txId}` : `cod:${txId}`,
        order_notes: notes || null,
      },
    });

    showOrderSuccess(txId);
    setCart({});
    renderCheckout();

    setTimeout(() => { window.location.href = "index.html"; }, 2500);
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
  await api().loadProducts();
  byId = api().byId;
  renderPaymentMethods();
  attachPaymentChange();
  renderCheckout();
}

document.addEventListener("DOMContentLoaded", () => {
  initCheckout().catch((e) => console.error(e));

  // Auto-format card number with spaces every 4 digits
  const cardNumberInput = document.getElementById("cardNumber");
  if (cardNumberInput) {
    cardNumberInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, ""); // Remove non-digits
      value = value.substring(0, 16); // Max 16 digits
      // Add space every 4 digits
      const formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
      e.target.value = formatted;
    });
  }

  // Auto-format card expiry to MM/YY
  const cardExpInput = document.getElementById("cardExp");
  if (cardExpInput) {
    cardExpInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, ""); // Remove non-digits
      if (value.length >= 2) {
        value = value.substring(0, 2) + "/" + value.substring(2, 4);
      }
      e.target.value = value;
    });
  }
});
