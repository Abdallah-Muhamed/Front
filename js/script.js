"use strict";

const api = () => window.SmartFarmApi;

let PRODUCTS = [];
const byId = {};

function rebuildIndex(list) {
  PRODUCTS = list;
  for (const k of Object.keys(byId)) delete byId[k];
  for (const p of list) byId[p.id] = p;
}

function getCart() {
  return api()?.getCart() || {};
}
function setCart(cart) {
  api()?.setCart(cart);
}
function cartCount(cart) {
  return api()?.cartCount(cart) ?? 0;
}
function money(n) {
  return api()?.formatMoney(n) ?? `${Number(n) || 0} ج.م`;
}

function updateCartBadge() {
  const cartBadge = document.getElementById("cartBadge");
  if (!cartBadge) return;
  cartBadge.textContent = cartCount(getCart());
}

function showToast(text) {
  const toast = document.getElementById("toastAdded");
  if (!toast) return;
  toast.textContent = text || "تمت الإضافة للسلة!";
  toast.hidden = false;
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => (toast.hidden = true), 250);
  }, 1600);
}

function openCart() {
  const bd = document.getElementById("cartBackdrop");
  const md = document.getElementById("cartModal");
  if (bd) {
    bd.hidden = false;
    bd.style.display = "block";
  }
  if (md) {
    md.hidden = false;
    md.style.display = "flex";
  }
  renderCart();
}
function closeCart() {
  const bd = document.getElementById("cartBackdrop");
  const md = document.getElementById("cartModal");
  if (bd) {
    bd.hidden = true;
    bd.style.display = "none";
  }
  if (md) {
    md.hidden = true;
    md.style.display = "none";
  }
}
window.openCart = openCart;
window.closeCart = closeCart;

function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const cartEmpty = document.getElementById("cartEmpty");
  const cartTotalText = document.getElementById("cartTotalText");
  const btnCheckout = document.getElementById("btnCheckout");
  if (!cartItems) return;

  const cart = getCart();
  const count = cartCount(cart);

  if (count === 0) {
    if (cartEmpty) cartEmpty.hidden = false;
    cartItems.innerHTML = "";
    if (cartTotalText) cartTotalText.textContent = money(0);
    if (btnCheckout) btnCheckout.disabled = true;
    return;
  }

  if (cartEmpty) cartEmpty.hidden = true;
  if (btnCheckout) btnCheckout.disabled = false;

  let total = 0;
  let html = "";

  for (const id in cart) {
    const qty = Number(cart[id] || 0);
    const p = byId[Number(id)];
    if (!p || qty <= 0) continue;

    total += p.price * qty;

    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${p.img}" style="width:50px; height:50px; border-radius:5px; object-fit:cover;" onerror="this.style.display='none'">
          <div>
            <h4 style="margin:0; font-size:14px;">${p.name}</h4>
            <p style="margin:0; color:#2e7d32; font-weight:bold;">${money(p.price)}</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <button onclick="changeQty(${p.id}, 1)" style="width:25px; height:25px; border:1px solid #ccc; cursor:pointer;">+</button>
          <span>${qty}</span>
          <button onclick="changeQty(${p.id}, -1)" style="width:25px; height:25px; border:1px solid #ccc; cursor:pointer;">-</button>
        </div>
      </div>`;
  }

  cartItems.innerHTML = html;
  if (cartTotalText) cartTotalText.textContent = money(total);
}

function changeQty(productId, delta) {
  const cart = getCart();
  const next = (cart[productId] || 0) + delta;
  if (next <= 0) delete cart[productId];
  else cart[productId] = next;
  setCart(cart);
  updateCartBadge();
  renderCart();
}
window.changeQty = changeQty;

function addToCartCore(productId) {
  const logged = api()?.isLoggedIn();

  if (!logged) {
    if (typeof window.openLogin === "function") window.openLogin();
    const loginError = document.getElementById("loginError");
    if (loginError) {
      loginError.hidden = false;
      loginError.textContent = "يجب تسجيل الدخول لإضافة منتجات للسلة.";
    }
    return;
  }

  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + 1;
  setCart(cart);
  updateCartBadge();

  const p = byId[Number(productId)];
  showToast(p ? `تم إضافة ${p.name} للسلة!` : "تمت الإضافة للسلة!");
}
window.addToCartCore = addToCartCore;

function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  if (!list.length) {
    grid.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:#718096;padding:24px;">لا توجد منتجات. سجّل دخولك لعرض السوق أو أضف منتجات من لوحة المزارع.</p>';
    return;
  }

  for (const p of list) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card__img"><img src="${p.img}" alt="${p.name}" onerror="this.style.display='none'"></div>
      <div class="product-card__body">
        <h3 class="product-card__title">${p.name}</h3>
        <div class="product-card__meta"><span class="price">${money(p.price)}</span></div>
        <div class="product-card__actions">
          <button class="add-btn" onclick="addToCartCore(${p.id})">أضف للسلة 🛒</button>
        </div>
      </div>`;
    grid.appendChild(card);
  }
}
window.renderProducts = renderProducts;

async function initHomePage() {
  const list = await api().loadProducts();
  rebuildIndex(list);
  updateCartBadge();
  if (document.getElementById("productsGrid")) renderProducts(PRODUCTS);

  const searchInput = document.getElementById("searchInput");
  searchInput?.addEventListener("input", () => {
    const q = (searchInput.value || "").trim();
    if (!q) return renderProducts(PRODUCTS);
    const filtered = PRODUCTS.filter(
      (p) => (p.name || "").includes(q) || (p.category || "").includes(q)
    );
    renderProducts(filtered);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnOpenCart")?.addEventListener("click", openCart);
  document.getElementById("btnCloseCart")?.addEventListener("click", closeCart);

  const btnCheckout = document.getElementById("btnCheckout");
  btnCheckout?.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });

  initHomePage().catch((e) => console.error(e));

  document.getElementById("btnShopNow")?.addEventListener("click", () => {
    window.location.href = "products.html";
  });

  if (typeof window.applySessionUI === "function") window.applySessionUI();

  document.querySelectorAll(".section1-category .category").forEach((el) => {
    el.addEventListener("click", () => {
      const cat = el.dataset.cat;
      if (!cat) return;
      window.location.href = `products.html?cat=${encodeURIComponent(cat)}`;
    });
  });
});

window.addEventListener("authLogin", () => {
  if (typeof window.applySessionUI === "function") window.applySessionUI();
});
window.addEventListener("authLogout", () => {
  if (typeof window.applySessionUI === "function") window.applySessionUI();
  updateCartBadge();
});
