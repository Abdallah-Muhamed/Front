"use strict";

// Keys
const CART_KEY = "demo_cart";
const PRODUCTS_KEY = "demo_all_products";

// Default products
const defaultProducts = [
  { id: 1, name: "قمح (كيلو)", price: 25, category: "حبوب", img: "images/item1 (1).jpg" },
  { id: 2, name: "بطاطس (كيلو)", price: 20, category: "خضروات", img: "images/item5.jpg" },
  { id: 3, name: "طماطم (كيلو)", price: 30, category: "خضروات", img: "images/item2.jpg" },
  { id: 4, name: "عنّب أسود (كيلو)", price: 55, category: "فاكهة", img: "images/item4.jpg" },
  { id: 5, name: "فراولة (باكيت)", price: 45, category: "فاكهة", img: "images/item6.jpg" },
  { id: 6, name: "ذرة صفراء (كيلو)", price: 35, category: "خضروات", img: "images/item3.jpg" },
];

function getProducts() {
  let prods = null;
  try { prods = JSON.parse(localStorage.getItem(PRODUCTS_KEY)); } catch (_) {}
  if (!Array.isArray(prods) || prods.length === 0) {
    prods = defaultProducts;
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(prods));
  }
  return prods;
}

const PRODUCTS = getProducts();
const byId = {};
for (const p of PRODUCTS) byId[p.id] = p;

// Cart helpers
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}
function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart || {}));
}
function cartCount(cart) {
  let sum = 0;
  for (const k in cart) sum += Number(cart[k] || 0);
  return sum;
}
function money(n) { return (Number(n) || 0) + " ج.م"; }

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

// Cart modal
function openCart() {
  const bd = document.getElementById("cartBackdrop");
  const md = document.getElementById("cartModal");
  if (bd) { bd.hidden = false; bd.style.display = "block"; }
  if (md) { md.hidden = false; md.style.display = "flex"; }
  renderCart();
}
function closeCart() {
  const bd = document.getElementById("cartBackdrop");
  const md = document.getElementById("cartModal");
  if (bd) { bd.hidden = true; bd.style.display = "none"; }
  if (md) { md.hidden = true; md.style.display = "none"; }
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

// Add to cart (guarded by auth.js)
function addToCartCore(productId) {
  const logged = !!localStorage.getItem("authToken"); // ده اللي auth.js بيحفظه

  if (!logged) {
    // ✅ افتح مودال الـ Login
    if (typeof window.openLogin === "function") window.openLogin();

    // رسالة تنبيه جوه المودال
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

// Render products + search
function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = "";
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

document.addEventListener("DOMContentLoaded", () => {
  // cart buttons
  document.getElementById("btnOpenCart")?.addEventListener("click", openCart);
  document.getElementById("btnCloseCart")?.addEventListener("click", closeCart);

  // init
  updateCartBadge();
  if (document.getElementById("productsGrid")) renderProducts(PRODUCTS);

  // search
  const searchInput = document.getElementById("searchInput");
  searchInput?.addEventListener("input", () => {
    const q = (searchInput.value || "").trim();
    if (!q) return renderProducts(PRODUCTS);
    const filtered = PRODUCTS.filter((p) => (p.name || "").includes(q) || (p.category || "").includes(q));
    renderProducts(filtered);
  });

  // لو auth.js موجود: يحدث الهيدر
  if (typeof window.applySessionUI === "function") window.applySessionUI();
});

// لو حصل login/logout من auth.js نحدث أرقام السلة/الهيدر لو حبيت
window.addEventListener("authLogin", () => {
  if (typeof window.applySessionUI === "function") window.applySessionUI();
});
window.addEventListener("authLogout", () => {
  if (typeof window.applySessionUI === "function") window.applySessionUI();
});




document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".section1-category .category").forEach(el => {
    el.addEventListener("click", () => {
      const cat = el.dataset.cat;
      if (!cat) return;
      window.location.href = `products.html?cat=${encodeURIComponent(cat)}`;
    });
  });
});