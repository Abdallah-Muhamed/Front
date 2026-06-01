// ==========================================
// 1. المفاتيح والبيانات الأساسية
// ==========================================
const AUTH_KEY = "demo_user";
const USERS_KEY = "demo_users";
const CART_KEY = "demo_cart";
const PRODUCTS_KEY = "demo_all_products";

const defaultProducts = [
  { id: 1, name: "قمح (كيلو)", price: 25, category: "حبوب", img: "images/item1 (1).jpg" },
  { id: 2, name: "بطاطس (كيلو)", price: 20, category: "خضروات",  img: "images/item5.jpg" },
  { id: 3, name: "طماطم (كيلو)", price: 30, category: "خضروات",  img: "images/item2.jpg" },
  { id: 4, name: "عنّب أسود (كيلو)", price: 55, category: "فاكهة", img: "images/item4.jpg" },
  { id: 5, name: "فراولة (باكيت)", price: 45, category: "فاكهة", img: "images/item6.jpg" },
  { id: 6, name: "ذرة صفراء (كيلو)", price: 35, category: "خضروات", img: "images/item3.jpg" }
];

function getProducts() {
    let prods = JSON.parse(localStorage.getItem(PRODUCTS_KEY));
    if (!prods || prods.length === 0) {
        prods = defaultProducts;
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(prods));
    }
    return prods;
}

const PRODUCTS = getProducts();
const byId = {};
for (let i = 0; i < PRODUCTS.length; i++) {
    byId[PRODUCTS[i].id] = PRODUCTS[i];
}

// ==========================================
// 2. دوال مساعدة (Helpers)
// ==========================================
function getAuth() { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; }
function isLoggedIn() { return getAuth() !== null; }
function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
function setUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function getCart() { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
function setCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function formatMoney(n) { return (Number(n) || 0) + " ج.م"; }
function cartCount(cart) { 
    let sum = 0;
    for (let key in cart) sum += Number(cart[key]);
    return sum; 
}

// ==========================================
// 3. النوافذ المنبثقة بالقوة الجبرية (Force Open)
// ==========================================
window.openLogin = function() {
    const err = document.getElementById("loginError");
    if(err) err.hidden = true;
    
    const bd = document.getElementById("loginBackdrop");
    const md = document.getElementById("loginModal");
    if(bd) { bd.hidden = false; bd.style.display = "block"; }
    if(md) { md.hidden = false; md.style.display = "block"; }
};

window.closeLogin = function() {
    const bd = document.getElementById("loginBackdrop");
    const md = document.getElementById("loginModal");
    if(bd) { bd.hidden = true; bd.style.display = "none"; }
    if(md) { md.hidden = true; md.style.display = "none"; }
};

window.openRegister = function() {
    const err = document.getElementById("registerError");
    if(err) err.hidden = true;

    const bd = document.getElementById("registerBackdrop");
    const md = document.getElementById("registerModal");
    if(bd) { bd.hidden = false; bd.style.display = "block"; }
    if(md) { md.hidden = false; md.style.display = "block"; }
};

window.closeRegister = function() {
    const bd = document.getElementById("registerBackdrop");
    const md = document.getElementById("registerModal");
    if(bd) { bd.hidden = true; bd.style.display = "none"; }
    if(md) { md.hidden = true; md.style.display = "none"; }
};

window.openCart = function() {
    const bd = document.getElementById("cartBackdrop");
    const md = document.getElementById("cartModal");
    if(bd) { bd.hidden = false; bd.style.display = "block"; }
    if(md) { md.hidden = false; md.style.display = "flex"; }
    renderCart();
};

window.closeCart = function() {
    const bd = document.getElementById("cartBackdrop");
    const md = document.getElementById("cartModal");
    if(bd) { bd.hidden = true; bd.style.display = "none"; }
    if(md) { md.hidden = true; md.style.display = "none"; }
};

// ==========================================
// 4. تحديث واجهة المستخدم (تغيير الأزرار والأسماء)
// ==========================================
window.syncAuthUI = function() {
    const user = getAuth(); 
    const authButtons = document.getElementById("authButtons");
    const userArea = document.getElementById("userArea"); 
    const userDisplayName = document.getElementById("userDisplayName");
    const dashLink = document.getElementById("dashboardLink");

    if (user) {
        if (authButtons) { authButtons.hidden = true; authButtons.style.display = 'none'; }
        if (userArea) { userArea.hidden = false; userArea.style.display = 'flex'; }
        
                let fName = user.firstName || user.username || "مستخدم";
        let lName = user.lastName || "";
        let fullName = (fName + " " + lName).trim();
        let role = user.role || "farmer"; 
        let roleAr = (role === "trader") ? "تاجر" : "مزارع";

        if (userDisplayName) userDisplayName.textContent = fullName + " (" + roleAr + ")";

        // 🚀 الحل النهائي للزرار عشان يفتح الصفحة 🚀
        if (dashLink) {
            dashLink.textContent = (role === "trader") ? "صفحة التاجر" : "صفحة المزارع";
            // بنستخدم onclick عشان نجبر المتصفح ينقلك للصفحة فوراً
            dashLink.onclick = function(e) {
                e.preventDefault(); // نمنع أي حركة غلط
                window.location.href = (role === "trader") ? "trader-dashboard.html" : "farmer-dashboard.html";
            };
        }
    }


};

// ==========================================
// 5. نظام السلة
// ==========================================
function updateCartBadge() {
    const cartBadge = document.getElementById("cartBadge");
    if (cartBadge) {
        cartBadge.textContent = cartCount(getCart());
        cartBadge.style.transform = "scale(1.4)";
        setTimeout(() => cartBadge.style.transform = "scale(1)", 200);
    }
}

window.renderCart = function() {
    const cartItems = document.getElementById("cartItems");
    const cartEmpty = document.getElementById("cartEmpty");
    const cartTotalText = document.getElementById("cartTotalText");
    const btnCheckout = document.getElementById("btnCheckout");
    if (!cartItems) return;

    const cart = getCart();
    let total = 0;
    let count = cartCount(cart);
    let html = "";

    if (count === 0) {
        if(cartEmpty) cartEmpty.hidden = false;
        cartItems.innerHTML = "";
        if(cartTotalText) cartTotalText.textContent = "0 ج.م";
        if(btnCheckout) { btnCheckout.disabled = true; btnCheckout.style.opacity = "0.5"; }
        return;
    }

    if(cartEmpty) cartEmpty.hidden = true;
    if(btnCheckout) { btnCheckout.disabled = false; btnCheckout.style.opacity = "1"; }

    for (let id in cart) {
        let qty = cart[id];
        let p = byId[id];
        if (!p) continue;

        let itemTotal = p.price * qty;
        total += itemTotal;

        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${p.img}" style="width:50px; height:50px; border-radius:5px; object-fit:cover;">
                <div>
                    <h4 style="margin:0; font-size:14px;">${p.name}</h4>
                    <p style="margin:0; color:#2e7d32; font-weight:bold;">${p.price} ج.م</p>
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
    if(cartTotalText) cartTotalText.textContent = total + " ج.م";
    if(btnCheckout) btnCheckout.onclick = function() { window.location.href = "checkout.html"; };
};

window.changeQty = function(productId, delta) {
    let cart = getCart();
    let next = (cart[productId] || 0) + delta;
    if (next <= 0) delete cart[productId];
    else cart[productId] = next;
    setCart(cart);
    updateCartBadge();
    renderCart();
};

window.addToCartCore = function(productId) {
    if (!isLoggedIn()) {
        openLogin();
        const loginError = document.getElementById('loginError');
        if (loginError) { loginError.hidden = false; loginError.textContent = 'يجب تسجيل الدخول لإضافة منتجات للسلة.'; }
        return;
    }
    const cart = getCart();
    cart[productId] = (cart[productId] || 0) + 1;
    setCart(cart);
    updateCartBadge();

    const toast = document.getElementById("toastAdded");
    const p = byId[productId];
    if (toast) {
        toast.textContent = p ? ("✅ تم إضافة " + p.name + " للسلة!") : "✅ تمت الإضافة";
        toast.hidden = false; toast.style.opacity = "1";
        setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.hidden = true, 300); }, 2000);
    }
};

// ==========================================
// 6. رسم المنتجات
// ==========================================
window.renderProducts = function(list) {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    list.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
          <div class="product-card__img"><img src="${p.img}"></div>
          <div class="product-card__body">
            <h3 class="product-card__title">${p.name}</h3>
            <div class="product-card__meta"><span class="price">${p.price} ج.م</span></div>
            <div class="product-card__actions">
              <button class="add-btn" onclick="addToCartCore(${p.id})">أضف للسلة 🛒</button>
            </div>
          </div>`;
        grid.appendChild(card);
    });
};

// ==========================================
// 7. تشغيل الموقع وربط الأحداث
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // ربط زراير الـ HTML بفتح النوافذ
    const btnLoginOpen = document.getElementById("btnLoginOpen");
    const btnRegisterOpen = document.getElementById("btnRegisterOpen");
    const btnCloseLogin = document.getElementById("btnCloseLogin");
    const btnCloseRegister = document.getElementById("btnCloseRegister");
    const btnCloseCart = document.getElementById("btnCloseCart");
    const btnOpenCart = document.getElementById("btnOpenCart"); // أيقونة السلة

    if(btnLoginOpen) btnLoginOpen.addEventListener("click", window.openLogin);
    if(btnRegisterOpen) btnRegisterOpen.addEventListener("click", window.openRegister);
    if(btnCloseLogin) btnCloseLogin.addEventListener("click", window.closeLogin);
    if(btnCloseRegister) btnCloseRegister.addEventListener("click", window.closeRegister);
    if(btnCloseCart) btnCloseCart.addEventListener("click", window.closeCart);
    if(btnOpenCart) btnOpenCart.addEventListener("click", window.openCart);

    // تسجيل الدخول
    const loginForm = document.getElementById("loginForm");
    if(loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = e.target.email.value.trim().toLowerCase();
            const password = e.target.password.value.trim();
            const user = getUsers().find(u => u.email === email && u.password === password);
            
            if (!user) {
                const err = document.getElementById("loginError");
                if(err) { err.hidden = false; err.textContent = "البيانات غير صحيحة!"; }
                return;
            }

            localStorage.setItem(AUTH_KEY, JSON.stringify({ 
                username: user.username, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role 
            }));
            window.closeLogin();
            window.syncAuthUI();
            loginForm.reset();
        });
    }

    // إنشاء حساب
    const registerForm = document.getElementById("registerForm");
    if(registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const fName = e.target.first_name ? e.target.first_name.value.trim() : "";
            const lName = e.target.last_name ? e.target.last_name.value.trim() : "";
            const email = e.target.email.value.trim().toLowerCase();
            const pass = e.target.password ? e.target.password.value.trim() : "123456";
            
            const roleRadio = document.querySelector('input[name="role"]:checked');
            const role = roleRadio ? roleRadio.value : "farmer";

            const users = getUsers();
            if (users.some(u => u.email === email)) {
                const err = document.getElementById("registerError");
                if(err){ err.hidden=false; err.textContent="الإيميل مسجل مسبقاً!"; }
                return;
            }

            users.push({ username: fName + " " + lName, firstName: fName, lastName: lName, email: email, password: pass, role: role });
            setUsers(users);
            
            window.closeRegister();
            registerForm.reset();
            alert("تم إنشاء الحساب! سجل دخولك الآن.");
            window.openLogin();
        });
    }

    // تسجيل الخروج
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem(CART_KEY);
            window.syncAuthUI();
            updateCartBadge();
        });
    }

    // تشغيل الصفحة
    window.syncAuthUI();
    updateCartBadge();
    if(document.getElementById("productsGrid")) {
        window.renderProducts(PRODUCTS);
    }
});