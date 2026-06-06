"use strict";

const api = () => window.SmartFarmApi;

let PRODUCTS = [];
const byId = new Map();

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

function getAuth() {
  const token = api().getAuthToken();
  const name = localStorage.getItem("userName");
  return token ? { username: name || "مستخدم", token } : null;
}

function syncAuthUI() {
  const user = getAuth();
  const authButtons = $("#authButtons");
  const userArea = $("#userArea");
  const userDisplayName = $("#userDisplayName");

  if (authButtons) {
    authButtons.hidden = !!user;
    authButtons.style.display = user ? "none" : "";
  }
  if (userArea) {
    userArea.hidden = !user;
    userArea.style.display = user ? "flex" : "none";
  }
  if (userDisplayName) userDisplayName.textContent = user ? user.username : "";

  if (typeof window.applySessionUI === "function") window.applySessionUI();
}

function openLoginModal() {
  if (typeof window.openLogin === "function") window.openLogin();
  else if (typeof openModal === "function") openModal("loginModal", "loginBackdrop");
}

let needLoginAction = null;

function requireLoginOrOpen(action) {
  if (!getAuth()) {
    needLoginAction = action;
    openLoginModal();
    return;
  }
  action();
}

const cartBadge = $("#cartBadge");
const btnOpenCart = $("#btnOpenCart");
const cartBackdrop = $("#cartBackdrop");
const cartModal = $("#cartModal");
const btnCloseCart = $("#btnCloseCart");
const cartItems = $("#cartItems");
const cartEmpty = $("#cartEmpty");
const cartTotalText = $("#cartTotalText");
const btnCheckout = $("#btnCheckout");

function updateCartBadge() {
  if (cartBadge) cartBadge.textContent = cartCount(getCart());
}

const toastEl = document.getElementById("toastAdded");

function showAddedToast(text) {
  if (!toastEl) return;
  toastEl.textContent = text || "تمت الإضافة للسلة";
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("show"));
  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => (toastEl.hidden = true), 250);
  }, 900);
}

function addToCartCore(productId) {
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + 1;
  setCart(cart);
  updateCartBadge();
  const p = byId.get(Number(productId));
  showAddedToast(p ? "تمت إضافة: " + p.name : "تمت الإضافة للسلة");
}

function changeQtyCore(productId, delta) {
  const cart = getCart();
  const next = (cart[productId] || 0) + delta;
  if (next <= 0) delete cart[productId];
  else cart[productId] = next;
  setCart(cart);
  updateCartBadge();
  renderCart();
}

function renderCart() {
  if (!cartItems) return;

  const cart = getCart();
  const count = cartCount(cart);
  const total = cartTotal(cart);

  if (cartTotalText) cartTotalText.textContent = formatMoney(total);
  cartItems.innerHTML = "";

  if (count === 0) {
    if (cartEmpty) cartEmpty.hidden = false;
    if (btnCheckout) btnCheckout.disabled = true;
    return;
  }

  if (cartEmpty) cartEmpty.hidden = true;
  if (btnCheckout) btnCheckout.disabled = false;

  for (const [pidStr, qty] of Object.entries(cart)) {
    const pid = Number(pidStr);
    const p = byId.get(pid);
    if (!p) continue;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img alt="${p.name}" src="${p.img}" />
      <div>
        <div class="cart-item__name">${p.name}</div>
        <div class="cart-item__price">السعر: ${formatMoney(p.price)}</div>
        <div class="cart-item__price">الإجمالي: ${formatMoney(p.price * qty)}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" data-minus="${pid}">-</button>
        <div class="qty">${qty}</div>
        <button class="qty-btn" data-plus="${pid}">+</button>
      </div>
    `;
    cartItems.appendChild(row);
  }

  cartItems.querySelectorAll("[data-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.minus);
      requireLoginOrOpen(() => changeQtyCore(id, -1));
    });
  });

  cartItems.querySelectorAll("[data-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.plus);
      requireLoginOrOpen(() => changeQtyCore(id, +1));
    });
  });
}

function openCart() {
  if (cartBackdrop) cartBackdrop.hidden = false;
  if (cartModal) cartModal.hidden = false;
  renderCart();
}
function closeCart() {
  if (cartBackdrop) cartBackdrop.hidden = true;
  if (cartModal) cartModal.hidden = true;
}

if (btnOpenCart) btnOpenCart.addEventListener("click", openCart);
if (btnCloseCart) btnCloseCart.addEventListener("click", closeCart);
if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);
if (btnCheckout) {
  btnCheckout.addEventListener("click", () => {
    if (!getAuth()) {
      openLoginModal();
      return;
    }
    window.location.href = "checkout.html";
  });
}

$("#btnLogout")?.addEventListener("click", () => {
  if (typeof handleLogout === "function") handleLogout();
});

window.addEventListener("authLogin", () => {
  syncAuthUI();
  updateCartBadge();
  if (typeof needLoginAction === "function") {
    const fn = needLoginAction;
    needLoginAction = null;
    fn();
  }
});

const productsGrid = $("#productsGrid");
const categoryList = $("#categoryList");
const paginationEl = $("#pagination");
const resultInfo = $("#resultInfo");
const sortSelect = $("#sortSelect");
const searchInput = $("#searchInput");

const pageSize = 6;
const state = { page: 1, category: "الكل", query: "", sort: "popular" };
let categories = ["الكل"];

function sortProducts(list) {
  const copy = [...list];
  if (state.sort === "priceAsc") copy.sort((a, b) => a.price - b.price);
  else if (state.sort === "priceDesc") copy.sort((a, b) => b.price - a.price);
  else if (state.sort === "ratingDesc")
    copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  else copy.sort((a, b) => a.id - b.id);
  return copy;
}

function filteredProducts() {
  const q = state.query.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    const inCat = state.category === "الكل" ? true : p.category === state.category;
    const inQ = q ? p.name.toLowerCase().includes(q) : true;
    return inCat && inQ;
  });
}

function renderCategories() {
  if (!categoryList) return;
  categoryList.innerHTML = "";

  categories.forEach((cat) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "catItemBtn" + (cat === state.category ? " active" : "");
    btn.textContent = cat;

    btn.addEventListener("click", () => {
      if (cat === "الكل") {
        history.replaceState(null, "", "products.html");
      } else {
        history.replaceState(null, "", `products.html?cat=${encodeURIComponent(cat)}`);
      }
      state.category = cat;
      state.page = 1;
      renderCategories();
      renderProducts();
    });

    li.appendChild(btn);
    categoryList.appendChild(li);
  });
}

function renderPagination(totalPages) {
  if (!paginationEl) return;
  paginationEl.innerHTML = "";

  const prev = document.createElement("button");
  prev.className = "pageBtn";
  prev.textContent = "‹";
  prev.disabled = state.page === 1;
  prev.addEventListener("click", () => {
    state.page--;
    renderProducts();
  });
  paginationEl.appendChild(prev);

  const windowSize = 5;
  let start = Math.max(1, state.page - 2);
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  for (let i = start; i <= end; i++) {
    const b = document.createElement("button");
    b.className = "pageBtn" + (i === state.page ? " active" : "");
    b.textContent = i;
    b.addEventListener("click", () => {
      state.page = i;
      renderProducts();
    });
    paginationEl.appendChild(b);
  }

  const next = document.createElement("button");
  next.className = "pageBtn";
  next.textContent = "›";
  next.disabled = state.page === totalPages;
  next.addEventListener("click", () => {
    state.page++;
    renderProducts();
  });
  paginationEl.appendChild(next);
}

function renderProducts() {
  if (!productsGrid) return;

  const list = sortProducts(filteredProducts());
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (state.page > totalPages) state.page = totalPages;

  const startIndex = (state.page - 1) * pageSize;
  const pageItems = list.slice(startIndex, startIndex + pageSize);

  if (resultInfo) {
    resultInfo.textContent =
      "عدد النتائج: " + totalItems + " • صفحة " + state.page + " من " + totalPages;
  }

  productsGrid.innerHTML = "";

  if (!pageItems.length) {
    productsGrid.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:#718096;">لا توجد منتجات في هذا التصنيف.</p>';
    renderPagination(totalPages);
    return;
  }

  pageItems.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";
    const seller = p.sellerLabel
      ? `<p class="product-card__seller" style="font-size:12px;color:#6b7280;margin:4px 0 8px;">${p.sellerLabel}</p>`
      : "";
    card.innerHTML = `
      <div class="product-card__img">
        <img alt="${p.name}" src="${p.img}" onerror="this.src='images/item2.jpg'">
      </div>
      <div class="product-card__body">
        <h3 class="product-card__title">${p.name}</h3>
        ${seller}
        <div class="product-card__meta">
          <span class="price">${formatMoney(p.price)}</span>
          <span>⭐ ${p.rating ?? "غير مقيم"}</span>
        </div>
        <div class="product-card__actions">
          <button class="add-btn" data-add="${p.id}">أضف للسلة</button>
        </div>
      </div>
    `;
    productsGrid.appendChild(card);
  });

  productsGrid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.add);
      requireLoginOrOpen(() => addToCartCore(id));
    });
  });

  renderPagination(totalPages);
  updateCartBadge();
}

if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    state.page = 1;
    renderProducts();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value || "";
    state.page = 1;
    renderProducts();
  });
}

async function initProductsPage() {
  const list = await api().loadProducts();
  PRODUCTS = list;
  byId.clear();
  for (const p of list) byId.set(p.id, p);

  categories = ["الكل", ...Array.from(new Set(list.map((p) => p.category).filter(Boolean)))];

  syncAuthUI();
  updateCartBadge();
  renderCategories();

  const cat = new URLSearchParams(window.location.search).get("cat");
  if (cat && categories.includes(cat)) {
    state.category = cat;
    state.page = 1;
  }

  renderProducts();
}

document.addEventListener("DOMContentLoaded", () => {
  initProductsPage().catch((e) => console.error(e));
});
