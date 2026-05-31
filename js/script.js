// =====================
// Demo Data
// =====================
// const products = [
//   { id: 1, name: "قمح (كيلو)", price: 25, img: "images/item1 (1).jpg" },
//   { id: 2, name: "بطاطس (كيلو)", price: 20, img: "images/item5.jpg" },
//   { id: 3, name: "طماطم (كيلو)", price: 30, img: "images/item2.jpg" },
//   { id: 4, name: "عنّب أسود (كيلو)", price: 55, img: "images/item4.jpg" },
//   { id: 5, name: "فراولة (باكيت)", price: 45, img: "images/item6.jpg" },
//   { id: 6, name: "ذرة صفراء (كيلو)", price: 35, img: "images/item3.jpg" },
// ];
// ====== إعدادات المنتجات الديناميكية ======
const PRODUCTS_KEY = "demo_all_products";

// المنتجات الافتراضية (عشان الموقع ميكونش فاضي أول مرة)
const defaultProducts = [
  { id: 1, name: "قمح (كيلو)", price: 25, category: "حبوب", img: "images/item1 (1).jpg", sellerEmail: "admin" },
  { id: 2, name: "بطاطس (كيلو)", price: 20, category: "خضروات",  img: "images/item5.jpg", sellerEmail: "admin" },
  { id: 3, name: "طماطم (كيلو)", price: 30, category: "خضروات",  img: "images/item2.jpg", sellerEmail: "admin" },
  { id: 4, name: "موز (قطعة)", price: 15, category: "فاكهة", img: "images/item10.jpg", sellerEmail: "admin" }
];

// دالة لجلب كل المنتجات (الأساسية + التي يضيفها المزارعين)
function getProducts() {
    let prods = JSON.parse(localStorage.getItem(PRODUCTS_KEY));
    if (!prods || prods.length === 0) {
        prods = defaultProducts;
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(prods));
    }
    return prods;
}

// تحديث ثابت PRODUCTS ليعمل مع باقي الكود القديم
let PRODUCTS = getProducts();
let byId = new Map(PRODUCTS.map(p => [p.id, p]));

const byId = new Map(products.map(p => [p.id, p]));

// =====================
// Storage Keys
// =====================
const CART_KEY = "demo_cart"; // { [productId]: qty }

// =====================
// Helpers
// =====================
const $ = (sel) => document.querySelector(sel);

function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : {};
}
function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function formatMoney(n) {
  return (Number(n) || 0) + " ج.م";
}

function cartCount(cart) {
  return Object.values(cart).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
}

function cartTotal(cart) {
  let total = 0;
  for (const [pid, qty] of Object.entries(cart)) {
    const product = byId.get(Number(pid));
    if (!product) continue;
    total += product.price * (Number(qty) || 0);
  }
  return total;
}

// =====================
// Auth check — يعتمد على authToken اللي يحطه auth.js
// =====================
function isLoggedIn() {
  return !!localStorage.getItem('authToken');
}

function requireLoginOrOpen(action) {
  if (!isLoggedIn()) {
    // افتح مودال الـ login عبر auth.js
    const loginBackdrop = document.getElementById('loginBackdrop');
    const loginModal    = document.getElementById('loginModal');
    if (loginBackdrop) loginBackdrop.hidden = false;
    if (loginModal)    loginModal.hidden    = false;

    const loginError = document.getElementById('loginError');
    if (loginError) {
      loginError.hidden = false;
      loginError.textContent = 'سجل الدخول لإضافة منتجات للسلة.';
    }
    return;
  }
  action();
}

// =====================
// Cart UI
// =====================
const cartBadge    = $("#cartBadge");
const btnOpenCart  = $("#btnOpenCart");
const cartBackdrop = $("#cartBackdrop");
const cartModal    = $("#cartModal");
const btnCloseCart = $("#btnCloseCart");
const cartItems    = $("#cartItems");
const cartEmpty    = $("#cartEmpty");
const cartTotalText = $("#cartTotalText");
const btnCheckout  = $("#btnCheckout");

function cartModalHiddenNow() {
  return cartModal ? cartModal.hidden : true;
}

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

const cartBadgeEl = document.getElementById("cartBadge");
function bumpCartBadge() {
  if (!cartBadgeEl) return;
  cartBadgeEl.classList.remove("bump");
  requestAnimationFrame(() => cartBadgeEl.classList.add("bump"));
}

function addToCartCore(productId) {
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + 1;
  setCart(cart);
  updateCartBadge();

  const p = byId.get(Number(productId));
  showAddedToast(p ? ("تمت إضافة: " + p.name) : "تمت الإضافة للسلة");
  bumpCartBadge();
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
  if (!cartItems || !cartEmpty) return;

  const cart  = getCart();
  const count = cartCount(cart);
  const total = cartTotal(cart);

  if (cartTotalText) cartTotalText.textContent = formatMoney(total);

  cartItems.innerHTML = "";

  if (count === 0) {
    cartEmpty.hidden = false;
    if (btnCheckout) btnCheckout.disabled = true;
    return;
  }

  cartEmpty.hidden = true;
  if (btnCheckout) {
    btnCheckout.disabled = false;
    // إزالة الـ listener القديم قبل إضافة جديد
    const newBtn = btnCheckout.cloneNode(true);
    btnCheckout.parentNode.replaceChild(newBtn, btnCheckout);
    newBtn.addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
  }

  for (const [pidStr, qty] of Object.entries(cart)) {
    const pid = Number(pidStr);
    const p   = byId.get(pid);
    if (!p) continue;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML =
      '<img alt="' + p.name + '" src="' + p.img + '" />' +
      '<div>' +
        '<div class="cart-item__name">' + p.name + "</div>" +
        '<div class="cart-item__price">السعر: ' + formatMoney(p.price) + "</div>" +
        '<div class="cart-item__price">الإجمالي: ' + formatMoney(p.price * qty) + "</div>" +
      '</div>' +
      '<div class="qty-controls">' +
        '<button class="qty-btn" data-minus="' + pid + '">-</button>' +
        '<div class="qty">' + qty + "</div>" +
        '<button class="qty-btn" data-plus="' + pid + '">+</button>' +
      "</div>";

    cartItems.appendChild(row);
  }

  cartItems.querySelectorAll("[data-minus]").forEach(btn => {
    btn.addEventListener("click", () => {
      requireLoginOrOpen(() => changeQtyCore(Number(btn.dataset.minus), -1));
    });
  });

  cartItems.querySelectorAll("[data-plus]").forEach(btn => {
    btn.addEventListener("click", () => {
      requireLoginOrOpen(() => changeQtyCore(Number(btn.dataset.plus), +1));
    });
  });
}

function openCart() {
  if (cartBackdrop) cartBackdrop.hidden = false;
  if (cartModal)    cartModal.hidden    = false;
  renderCart();
}
function closeCart() {
  if (cartBackdrop) cartBackdrop.hidden = true;
  if (cartModal)    cartModal.hidden    = true;
}

if (btnOpenCart)  btnOpenCart.addEventListener("click", openCart);
if (btnCloseCart) btnCloseCart.addEventListener("click", closeCart);
if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

// =====================
// Products UI (Home Page)
// =====================
const productsGrid = $("#productsGrid");
const searchInput  = $("#searchInput");

// زر "تسوق المحاصيل" — مرة واحدة بس
const btnShopNow = document.getElementById("btnShopNow");
if (btnShopNow) {
  btnShopNow.addEventListener("click", () => {
    window.scrollTo({ top: document.body.scrollHeight * 0.30, behavior: "smooth" });
  });
}

// زر "عرض التفاصيل" — مرة واحدة بس
const btnDetails    = document.getElementById("btnDetails");
const detailsSection = document.getElementById("detailsSection");
if (btnDetails && detailsSection) {
  btnDetails.addEventListener("click", () => {
    detailsSection.hidden = false;
    detailsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderProducts(list) {
  if (!productsGrid) return;

  productsGrid.innerHTML = "";

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML =
      '<div class="product-card__img">' +
        '<img alt="' + p.name + '" src="' + p.img + '">' +
      "</div>" +
      '<div class="product-card__body">' +
        '<h3 class="product-card__title">' + p.name + "</h3>" +
        '<div class="product-card__meta">' +
          '<span class="price">' + formatMoney(p.price) + "</span>" +
          "<span>متوفر</span>" +
        "</div>" +
        '<div class="product-card__actions">' +
          '<button class="add-btn" data-add="' + p.id + '">أضف للسلة</button>' +
        "</div>" +
      "</div>";

    productsGrid.appendChild(card);
  });

  productsGrid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      requireLoginOrOpen(() => addToCartCore(Number(btn.dataset.add)));
    });
  });
}

function initProducts() {
  if (!productsGrid) return;

  renderProducts(products);

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = (searchInput.value || "").trim().toLowerCase();
      const filtered = products.filter(p => p.name.toLowerCase().includes(q));
      renderProducts(filtered);
    });
  }
}

// =====================

// =====================
const btnLogoutScript = document.getElementById("btnLogout");
if (btnLogoutScript) {
  btnLogoutScript.addEventListener("click", () => {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
  });
}
// ///////////////////////////////////////////////////////////
function syncAuthUI() {
    var user = getAuth(); // أو localStorage.getItem("demo_user")
    
    var authBtns = document.getElementById("authButtons");
    var userProf = document.getElementById("userProfile");
    var userName = document.getElementById("userNameDisplay");

    if (authBtns && userProf && userName) {
        if (user) {
            // ✅ لو مسجل دخول: اخفي زراير الدخول، واظهر بروفايل المستخدم (ومنه زرار المزارع)
            authBtns.style.display = "none";
            userProf.style.display = "flex";
            userName.innerText = "مرحباً " + user.username;
        } else {
            // ❌ لو مش مسجل: اظهر زراير الدخول، واخفي البروفايل
            authBtns.style.display = "flex";
            userProf.style.display = "none";
        }
    }
}

function syncAuthUI() {
  const user = getAuth(); // بتجيب اليوزر من الذاكرة
  
  const authButtons = document.getElementById("authButtons");
  const userArea = document.getElementById("userArea"); // ده الـ ID الصح بتاعك
  const userDisplayName = document.getElementById("userDisplayName");

  if (user) {
    // لو مسجل دخول: نخفي زراير اللوجين ونظهر منطقة اليوزر (اللي جواها زرار المزارع)
    if (authButtons) authButtons.hidden = true;
    if (userArea) userArea.hidden = false;
    if (userDisplayName) userDisplayName.textContent = user.username;
  } else {
    // لو مش مسجل دخول: نظهر زراير اللوجين ونخفي منطقة اليوزر
    if (authButtons) authButtons.hidden = false;
    if (userArea) userArea.hidden = true;
  }
}

// مثال لدالة تسجيل الدخول
// function doLogin() {
//     // ... كود التحقق ...
//     if (user) {
//         localStorage.setItem(AUTH_KEY, JSON.stringify({ username: user.username, email: user.email }));
//         closeLogin();
//         syncAuthUI(); // 👈 مهم جداً عشان الزرار يظهر فوراً
//     }
// }
// function checkAuth() {
//     var currentUser = localStorage.getItem("currentUser");
    
//     var buttonsDiv = document.getElementById('authButtons'); // زراير Login/Register
//     var profileDiv = document.getElementById('userProfile'); // div البروفايل اللي جواه زرار المزارع
//     var nameDisplay = document.getElementById('userNameDisplay');

//     if (currentUser != null) {
//         // لو مسجل دخول: اظهر البروفايل (وبالتالي هيظهر زرار المزارع اللي جواه)
//         buttonsDiv.style.display = "none";
//         profileDiv.style.display = "flex";
//         nameDisplay.innerText = "مرحباً " + currentUser;
//     } else {
//         // لو مش مسجل: اخفي البروفايل والزرار واظهر زراير الدخول
//         buttonsDiv.style.display = "flex";
//         profileDiv.style.display = "none";
//     }
// }

// =====================
// Init
// =====================
updateCartBadge();
initProducts();
