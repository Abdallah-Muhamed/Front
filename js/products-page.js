
const CART_KEY = "demo_cart";      // { [productId]: qty }

// ---- Products Data (Demo) ----
const PRODUCTS = [
  { id: 1, name: "قمح (كيلو)", price: 25,category: "حبوب", img: "images/item1 (1).jpg" },
  { id: 2, name: "بطاطس (كيلو)", price: 20,category: "خضروات",  img: "images/item5.jpg" },
  { id: 3, name: "طماطم (كيلو)", price: 30,category: "خضروات",  img: "images/item2.jpg" },
  { id: 4, name: "عنّب أسود (كيلو)", price: 55,category: "فاكهة", img: "images/item4.jpg" },
  { id: 5, name: "فراولة (باكيت)", price: 45,category: "فاكهة", img: "images/item6.jpg" },
  { id: 6, name: "ذرة صفراء (كيلو)", price: 35,category: "خضروات", img: "images/item3.jpg" },

  { id: 7, name: "بصل أحمر (كيلو)", price: 28, rating: 4.6, category: "خضروات", img: "images/item9.jpg" },
  { id: 8, name: "ثوم (رأس)", price: 18, rating: 4.4, category: "خضروات", img: "images/item7.jpg" },
  { id: 9, name: "جزر (كيلو)", price: 22, rating: 4.7, category: "خضروات", img: "images/item11.jpg" },
  { id: 10, name: "خيار (قطعة)", price: 12, rating: 4.3, category: "خضروات", img: "images/item12.jpg" },
  { id: 11, name: "موز (قطعة)", price: 15, rating: 4.8, category: "فاكهة", img: "images/item10.jpg" },
  { id: 12, name: "برقوق (كيلو)", price: 60, rating: 4.5, category: "فاكهة", img: "images/item8.jpg" },
];

const byId = new Map(PRODUCTS.map(p => [p.id, p]));

// ---------------------
// Helpers / Storage
// ---------------------
const $ = (sel) => document.querySelector(sel);

function getAuth() {
  const token = localStorage.getItem('authToken');
  const name  = localStorage.getItem('userName');
  return token ? { username: name || 'مستخدم', token } : null;
}
function clearAuth() {
  ['authToken','userName','userFirstName','userRole','userUid','userPhoto']
    .forEach(k => localStorage.removeItem(k));
}
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
  for (const [pidStr, qty] of Object.entries(cart)) {
    const pid = Number(pidStr);
    const p = byId.get(pid);
    if (!p) continue;
    total += p.price * (Number(qty) || 0);
  }
  return total;
}

// =====================
// Auth UI (Separate Modals)
// =====================
const authButtons = $("#authButtons");
const userArea = $("#userArea");
const userDisplayName = $("#userDisplayName");
const btnLogout = $("#btnLogout");

const loginBackdrop = $("#loginBackdrop");
const loginModal = $("#loginModal");
const registerBackdrop = $("#registerBackdrop");
const registerModal = $("#registerModal");

const btnCloseLogin = $("#btnCloseLogin");
const btnCloseRegister = $("#btnCloseRegister");

const btnLoginOpen = $("#btnLoginOpen");
const btnRegisterOpen = $("#btnRegisterOpen");

const loginForm = $("#loginForm");
const registerForm = $("#registerForm");

const loginError = $("#loginError");
const registerError = $("#registerError");

let needLoginAction = null; // اختياري (لو تحب تنفذ بعد تسجيل الدخول)

function syncAuthUI() {
  const user = getAuth();
  if (authButtons) { authButtons.hidden = !!user; authButtons.style.display = user ? 'none' : ''; }
  if (userArea)    { userArea.hidden = !user;    userArea.style.display    = user ? 'flex' : 'none'; }
  if (userDisplayName) userDisplayName.textContent = user ? user.username : '';
}

function openLogin() {
  if (typeof openModal === 'function') openModal('loginModal', 'loginBackdrop');
}
function closeLogin() {
  if (typeof closeModal === 'function') closeModal('loginModal', 'loginBackdrop');
}


if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    clearAuth();
    localStorage.removeItem(CART_KEY);
    syncAuthUI();
    updateCartBadge();
    if (typeof renderCart === 'function') renderCart();
  });
}

// auth.js handles login/register forms — listen for successful login event
window.addEventListener('authLogin', () => {
  syncAuthUI();
  updateCartBadge();
  if (typeof needLoginAction === 'function') {
    const fn = needLoginAction;
    needLoginAction = null;
    fn();
  }
});

// شرط: كل تعديل/إضافة للسلة لازم login
function requireLoginOrOpen(action) {
  const user = getAuth();
  if (!user) {
    needLoginAction = action;
    openLogin();
    return;
  }
  action();
}

// =====================
// Cart UI
// =====================
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
  if (btnCheckout) {
  btnCheckout.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });
}
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

  // منع تعديل الكمية لو مش مسجل
  cartItems.querySelectorAll("[data-minus]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.minus);
      requireLoginOrOpen(() => changeQtyCore(id, -1));
    });
  });

  cartItems.querySelectorAll("[data-plus]").forEach(btn => {
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

// =====================
// Products UI (Pagination + Categories + Sort + Search)
// =====================
const productsGrid = $("#productsGrid");
const categoryList = $("#categoryList");
const paginationEl = $("#pagination");
const resultInfo = $("#resultInfo");
const sortSelect = $("#sortSelect");
const searchInput = $("#searchInput");

const pageSize = 6;

const state = {
  page: 1,
  category: "الكل",
  query: "",
  sort: "popular",
};

const categories = ["الكل", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

function sortProducts(list) {
  const copy = [...list];
  if (state.sort === "priceAsc") copy.sort((a, b) => a.price - b.price);
  else if (state.sort === "priceDesc") copy.sort((a, b) => b.price - a.price);
  else if (state.sort === "ratingDesc") copy.sort((a, b) => b.rating - a.rating);
  else copy.sort((a, b) => a.id - b.id); // popular
  return copy;
}

function filteredProducts() {
  const q = state.query.trim().toLowerCase();
  return PRODUCTS.filter(p => {
    const inCat = state.category === "الكل" ? true : p.category === state.category;
    const inQ = q ? p.name.toLowerCase().includes(q) : true;
    return inCat && inQ;
  });
}

function renderCategories() {
  if (!categoryList) return;
  categoryList.innerHTML = "";

  categories.forEach(cat => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "catItemBtn" + (cat === state.category ? " active" : "");
    btn.textContent = cat;

    btn.addEventListener("click", () => {
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
    b.disabled = false;
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

  pageItems.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card__img">
        <img alt="${p.name}" src="${p.img}">
      </div>
      <div class="product-card__body">
        <h3 class="product-card__title">${p.name}</h3>
        <div class="product-card__meta">
          <span class="price">${formatMoney(p.price)}</span>
          <span>⭐ ${p.rating ?? 'غير مقيم'}</span>
        </div>
        <div class="product-card__actions">
          <button class="add-btn" data-add="${p.id}">أضف للسلة</button>
        </div>
      </div>
    `;
    productsGrid.appendChild(card);
  });

  // زر إضافة للسلة لازم login
  productsGrid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.add);
      requireLoginOrOpen(() => addToCartCore(id));
    });
  });

  renderPagination(totalPages);
  updateCartBadge();
}

// UI Events
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


// 1. دالة لقراءة الكلمة المرسلة في الرابط (مثلاً ?cat=خضروات)
function getCategoryFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('cat'); // ستعيد كلمة "خضروات" أو "فاكهة" إلخ..
}

// 2. تعديل دالة التشغيل عند فتح الصفحة
window.onload = function() {
    var categoryFromLink = getCategoryFromURL();

    if (categoryFromLink) {
        // لو وجدنا تصنيف في الرابط، نقوم بفلترة المنتجات فوراً
        console.log("عرض منتجات قسم: " + categoryFromLink);
        filterByCategory(categoryFromLink); 
    } else {
        // لو مفيش تصنيف (يعني فتح الصفحة عادي)، يعرض الكل
        renderProducts(); 
    }
};

// 3. دالة الفلترة (تأكد أنها تستخدم المصفوفة الصحيحة للمنتجات عندك)
// function filterByCategory(catName) {
//     var grid = document.getElementById("productsGrid");
//     var html = "";
    
//     for (var i = 0; i < PRODUCTS.length; i++) {
//         var p = PRODUCTS[i];
//     //      card.innerHTML = `
//     //   <div class="product-card__img">
//     //     <img alt="${p.name}" src="${p.img}">
//     //   </div>
//     //   <div class="product-card__body">
//     //     <h3 class="product-card__title">${p.name}</h3>
//     //     <div class="product-card__meta">
//     //       <span class="price">${formatMoney(p.price)}</span>
//     //       <span>⭐ ${p.rating ?? 'غير مقيم'}</span>
//     //     </div>
//     //     <div class="product-card__actions">
//     //       <button class="add-btn" data-add="${p.id}">أضف للسلة</button>
//     //     </div>
//     //   </div>
//     // `;
//         if (p.category === catName) {
//             html += '<div class="product-card">' +
//                         '<img src="' + p.img + '">' +
//                         '<h3>' + p.name + '</h3>' +
//                         '<p>' + p.price + ' ج.م</p>' +
//                         '<button class="add-btn" data-add="${p.id}">أضف للسلة</button>' +
//                     '</div>';
//         }
//     }
//     grid.innerHTML = html;
// }



function filterByCategory(catName) {
    var grid = document.getElementById("productsGrid");
    if (!grid) return;

    var html = "";
    var count = 0;

    for (var i = 0; i < PRODUCTS.length; i++) {
        var p = PRODUCTS[i];
        
        // شرط الفلترة
        if (p.category === catName) {
            // هنا بنكتب الـ HTML بنفس تقسيم صفحة المنتجات الأصلية عشان الديزاين ميبوظش
            html += '<div class="product-card">' +
                        
                        '<img src="' + p.img + '" class="product-img">' +
                        '<div class="product-details">' +
                            '<h3 class="product-title">' + p.name + '</h3>' +
                            '<div class="rating-badge"><i class="fas fa-star"></i> ' + (p.rating || "4.5") + '</div>' +
                            '<div class="product-price">' + p.price + ' ج.م</div>' +
                            '<div class="product-seller"><i class="fas fa-store"></i>  </div>' +
                        '</div>' +
                        '<button class="add-btn" data-add="${p.id}">أضف للسلة</button>' +
                            // '<i class="fas fa-cart-plus"></i> أضف إلى السلة' +
                        // '</button>' +
                    '</div>';
            count++;
        }
    }

    grid.innerHTML = html;
}

// Init
syncAuthUI();
updateCartBadge();
renderCategories();
renderProducts()