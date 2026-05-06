// =====================
// Storage Keys
// =====================
const AUTH_KEY = "demo_user";
const USERS_KEY = "demo_users";
const CART_KEY = "demo_cart";

// =====================
// Products (Demo)
/// =====================
const PRODUCTS = [
  { id: 1, name: "قمح (كيلو)", price: 25, category: "حبوب", img: "images/item1 (1).jpg" },
  { id: 2, name: "بطاطس (كيلو)", price: 20, category: "خضروات", img: "images/item5.jpg" },
  { id: 3, name: "طماطم (كيلو)", price: 30, category: "خضروات", img: "images/item2.jpg" },
  { id: 4, name: "عنّب أسود (كيلو)", price: 55, category: "فاكهة", img: "images/item4.jpg" },
  { id: 5, name: "فراولة (باكيت)", price: 45, category: "فاكهة", img: "images/item6.jpg" },
  { id: 6, name: "ذرة صفراء (كيلو)", price: 35, category: "خضروات", img: "images/item3.jpg" },

  { id: 7, name: "بصل أحمر (كيلو)", price: 28, rating: 4.6, category: "خضروات", img: "images/item9.jpg" },
  { id: 8, name: "ثوم (رأس)", price: 18, rating: 4.4, category: "خضروات", img: "images/item7.jpg" },
  { id: 9, name: "جزر (كيلو)", price: 22, rating: 4.7, category: "خضروات", img: "images/item11.jpg" },
  { id: 10, name: "خيار (قطعة)", price: 12, rating: 4.3, category: "خضروات", img: "images/item12.jpg" },
  { id: 11, name: "موز (قطعة)", price: 15, rating: 4.8, category: "فاكهة", img: "images/item10.jpg" },
  { id: 12, name: "برقوق (كيلو)", price: 60, rating: 4.5, category: "فاكهة", img: "images/item8.jpg" },
];

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

// =====================
// DOM Helper
// =====================
const $ = (sel) => document.querySelector(sel);

// =====================
// Storage Helpers
// =====================
function getAuth() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}
function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}
function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}
function setUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : {};
}
function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// =====================
// Money / Cart Helpers
// =====================
function formatMoney(n) {
  return (Number(n) || 0) + " ج.م";
}
function cartCount(cart) {
  return Object.values(cart).reduce((s, q) => s + (Number(q) || 0), 0);
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
// Navbar Auth UI (اختياري لو موجود)
/// =====================
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

let openLogin = () => {};
function syncAuthUI() {
  const user = getAuth();
  if (authButtons) authButtons.hidden = !!user;
  if (userArea) userArea.hidden = !user;
  if (userDisplayName) userDisplayName.textContent = user ? user.username : "";
}

function showLogin(msg) {
  if (loginError) {
    loginError.hidden = false;
    loginError.textContent = msg;
  }
}

function openLoginImpl() {
  if (loginError) {
    loginError.hidden = true;
    loginError.textContent = "";
  }
  if (loginBackdrop) loginBackdrop.hidden = false;
  if (loginModal) loginModal.hidden = false;
}
function closeLoginImpl() {
  if (loginBackdrop) loginBackdrop.hidden = true;
  if (loginModal) loginModal.hidden = true;
}
openLogin = openLoginImpl;

function openRegister() {
  if (registerError) {
    registerError.hidden = true;
    registerError.textContent = "";
  }
  if (registerBackdrop) registerBackdrop.hidden = false;
  if (registerModal) registerModal.hidden = false;
}
function closeRegister() {
  if (registerBackdrop) registerBackdrop.hidden = true;
  if (registerModal) registerModal.hidden = true;
}

btnLoginOpen?.addEventListener("click", openLoginImpl);
btnRegisterOpen?.addEventListener("click", openRegister);
btnCloseLogin?.addEventListener("click", closeLoginImpl);
btnCloseRegister?.addEventListener("click", closeRegister);
loginBackdrop?.addEventListener("click", closeLoginImpl);
registerBackdrop?.addEventListener("click", closeRegister);

btnLogout?.addEventListener("click", () => {
  clearAuth();
  localStorage.removeItem(CART_KEY); // مسح السلة عند logout
  syncAuthUI();
  renderCheckout();
});

loginForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!loginError) return;

  const email = (e.target.email.value || "").trim().toLowerCase();
  const password = (e.target.password.value || "").trim();

  const user = getUsers().find(
    (u) => (u.email || "").toLowerCase() === email && u.password === password
  );

  if (!user) {
    loginError.hidden = false;
    loginError.textContent = "بيانات الدخول غير صحيحة (email أو كلمة المرور).";
    return;
  }

  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ username: user.username, email: user.email })
  );

  closeLoginImpl();
  syncAuthUI();
  loginForm.reset();
});

registerForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = (e.target.username.value || "").trim();
  const email = (e.target.email.value || "").trim().toLowerCase();
  const password = (e.target.password.value || "").trim();

  if (!username || !email || !password) return;

  const users = getUsers();
  if (users.some((u) => (u.email || "").toLowerCase() === email)) {
    if (registerError) {
      registerError.hidden = false;
      registerError.textContent = "البريد الإلكتروني مسجل بالفعل.";
    }
    return;
  }

  users.push({ username, email, password });
  setUsers(users);

  closeRegister();
  registerForm.reset();

  // بعد register يفتح login مش دخول تلقائي
  openLoginImpl();
});

// =====================
// Checkout UI
// =====================
const checkoutItems = $("#checkoutItems");
const checkoutEmpty = $("#checkoutEmpty");
const checkoutTotalEl = $("#checkoutTotal");
const btnConfirmOrder = $("#btnConfirmOrder");
const checkoutMsg = $("#checkoutMsg");
const paymentMethods = $("#paymentMethods");

const orderSuccessOverlay = $("#orderSuccessOverlay");

// Bank details elements (لو موجودة)
const bankDetails = $("#bankDetails");
const cardNumberEl = $("#cardNumber");
const cardNameEl = $("#cardName");
const cardExpEl = $("#cardExp");
const cardCvvEl = $("#cardCvv");

function toggleBankDetails(methodId) {
  if (!bankDetails) return;
  bankDetails.hidden = methodId !== "visa";
}

function renderPaymentMethods() {
  if (!paymentMethods) return;

  const paymentOptions = [
    { id: "cash", title: "الدفع عند الاستلام", sub: "كاش عند توصيل الطلب" },
    { id: "visa", title: "بطاقة بنكية", sub: "الدفع إلكترونيًا " },
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

// big success message
function showOrderSuccess() {
  // overlay لو موجود
  if (orderSuccessOverlay) {
    orderSuccessOverlay.hidden = false;
    requestAnimationFrame(() => orderSuccessOverlay.classList.add("show"));
  }

  // checkoutMsg لو عايزها كمان (مش شرط)
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

// =====================
// Confirm Order
// =====================
btnConfirmOrder?.addEventListener("click", () => {
  const user = getAuth();

  if (!user) {
    if (checkoutMsg) {
      checkoutMsg.hidden = false;
      checkoutMsg.textContent = "سجل الدخول قبل تأكيد الطلب.";
    }
    openLoginImpl();
    showLogin("سجل الدخول قبل تأكيد الطلب.");
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

  // If Visa -> validate card data
  if (payment === "visa") {
    const cardNumber = (cardNumberEl?.value || "").trim();
    const cardName = (cardNameEl?.value || "").trim();
    const cardExp = (cardExpEl?.value || "").trim();
    const cardCvv = (cardCvvEl?.value || "").trim();

    if (!cardNumber || !cardName || !cardExp || !cardCvv) {
      if (checkoutMsg) {
        checkoutMsg.hidden = false;
        checkoutMsg.textContent = "أكمل بيانات البطاقة البنكية.";
      }
      return;
    }

    // save to user (DEMO ONLY)
    const users = getUsers();
    const idx = users.findIndex(
      (u) => (u.email || "").toLowerCase() === (user.email || "").toLowerCase()
    );

    if (idx !== -1) {
      users[idx].bankCardDemo = {
        cardNumber,
        cardName,
        cardExp,
        cardCvv,
        updatedAt: new Date().toISOString(),
      };
      setUsers(users);
    }
  }

  // success
  showOrderSuccess();

  // clear cart
  localStorage.removeItem(CART_KEY);

  // redirect after longer time
  setTimeout(() => {
    window.location.href = "index.html";
  }, 2000);
});

// =====================
// Init
// =====================
syncAuthUI();
renderPaymentMethods();
attachPaymentChange();
renderCheckout()