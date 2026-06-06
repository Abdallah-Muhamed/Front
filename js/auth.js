/**
 * auth.js — Register & Login connected to API endpoints
 *
 * Endpoints:
 *   POST /api/Authentication/register
 *   POST /api/Authentication/login
 */

"use strict";

function apiBase() {
  const raw = window.API_BASE_URL || "https://smartfarm.runasp.net";
  return raw.replace(/\/swagger\/?.*$/i, "").replace(/\/$/, "");
}

async function readResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data, rawText: text };
}

/** Full parser in auth.js so register/login always show the real API message. */
function extractApiErrorText(data) {
  if (data == null) return "";
  if (typeof data === "string") return data.trim();
  if (Array.isArray(data)) {
    return data.map((item) => extractApiErrorText(item)).filter(Boolean).join(" ");
  }
  if (typeof data === "object") {
    for (const key of ["message", "Message", "error", "Error", "detail", "Detail", "title", "Title"]) {
      const v = data[key];
      if (typeof v === "string" && v.trim() && !/^one or more validation errors occurred\.?$/i.test(v)) {
        return v.trim();
      }
    }
    if (data.errors && typeof data.errors === "object") {
      const parts = [];
      for (const val of Object.values(data.errors)) {
        const bit = extractApiErrorText(val);
        if (bit) parts.push(bit);
      }
      if (parts.length) return parts.join(" ");
    }
  }
  return "";
}

function formatApiError(data, status, fallback) {
  const raw = extractApiErrorText(data);
  if (raw) return raw;
  if (status === 409) return "Email is already registered.";
  if (status === 401) return "Invalid Email or Password.";
  return fallback || `Request failed (HTTP ${status || "?"})`;
}

// ─────────────────────────────────────────────
// Password strength
// ─────────────────────────────────────────────
function getStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0–5
}

function updateStrengthUI(password) {
  const fill = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");
  if (!fill || !label) return;

  if (!password) {
    fill.style.width = "0%";
    fill.style.background = "transparent";
    label.textContent = "";
    return;
  }

  const score = getStrength(password);
  const levels = [
    { pct: "20%", color: "#e53e3e", text: "ضعيفة جداً" },
    { pct: "40%", color: "#dd6b20", text: "ضعيفة" },
    { pct: "60%", color: "#d69e2e", text: "متوسطة" },
    { pct: "80%", color: "#38a169", text: "قوية" },
    { pct: "100%", color: "#276749", text: "قوية جداً" },
  ];
  const lvl = levels[Math.max(0, score - 1)] || levels[0];
  fill.style.width = lvl.pct;
  fill.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

function checkPasswordMatch() {
  const pw = document.getElementById("regPassword")?.value || "";
  const confirm = document.getElementById("regPasswordConfirm")?.value || "";
  const msg = document.getElementById("confirmMsg");
  if (!msg) return true;

  if (!confirm) {
    msg.hidden = true;
    return false;
  }

  if (pw === confirm) {
    msg.hidden = false;
    msg.textContent = "✔ كلمتا المرور متطابقتان";
    msg.style.color = "#38a169";
    return true;
  } else {
    msg.hidden = false;
    msg.textContent = "✖ كلمتا المرور غير متطابقتين";
    msg.style.color = "#e53e3e";
    return false;
  }
}

// ─────────────────────────────────────────────
// Geolocation + reverse geocoding
// ─────────────────────────────────────────────
let _detectedLat = null;
let _detectedLng = null;

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
      { headers: { "User-Agent": "SmartFarmApp/1.0" } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function applyLocationFields(data) {
  if (!data) return;
  const addr = data.address || {};

  const city =
    addr.city || addr.state || addr.county || addr.town || addr.village || addr.suburb || "";
  const addressLine = [addr.road, addr.quarter, addr.suburb, addr.city || addr.town || addr.village]
    .filter(Boolean)
    .join("، ");

  const cityField = document.getElementById("regCity");
  const addressField = document.getElementById("regAddress");
  if (cityField) cityField.value = city;
  if (addressField) addressField.value = addressLine || data.display_name || "";
}

function setLocationStatus(msg, color) {
  const el = document.getElementById("locationStatus");
  if (el) {
    el.textContent = msg;
    el.style.color = color || "#718096";
  }
}

async function _doGetPosition() {
  setLocationStatus("⏳ جاري تحديد موقعك...", "#d69e2e");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 30000,
      maximumAge: 60000,
      enableHighAccuracy: false,
    });
  });
}

async function _fetchAndFill() {
  try {
    const pos = await _doGetPosition();
    _detectedLat = pos.coords.latitude;
    _detectedLng = pos.coords.longitude;

    setLocationStatus("🔄 جاري جلب العنوان...", "#d69e2e");
    const geoData = await reverseGeocode(_detectedLat, _detectedLng);

    if (geoData) {
      applyLocationFields(geoData);
      setLocationStatus("✔ تم تحديد موقعك — يمكنك التعديل", "#38a169");
    } else {
      setLocationStatus("⚠ تعذّر جلب العنوان — أدخله يدوياً", "#e53e3e");
    }
  } catch (err) {
    const msgs = {
      1: "رفضت الإذن — أدخل عنوانك يدوياً",
      2: "تعذّر تحديد الموقع — أدخله يدوياً",
      3: "انتهت مهلة تحديد الموقع — أدخله يدوياً",
    };
    setLocationStatus("⚠ " + (msgs[err.code] || "خطأ في الموقع"), "#e53e3e");
  }
}

async function detectLocation() {
  if (!navigator.geolocation) {
    setLocationStatus("المتصفح لا يدعم تحديد الموقع — أدخله يدوياً", "#e53e3e");
    return;
  }
  await _fetchAndFill();
}

async function autoDetectIfPermitted() {
  if (!navigator.geolocation) return;
  try {
    const perm = await navigator.permissions.query({ name: "geolocation" });
    if (perm.state === "granted") {
      await _fetchAndFill();
    } else if (perm.state === "denied") {
      setLocationStatus("⚠ الإذن مرفوض — أدخل عنوانك يدوياً", "#e53e3e");
    } else {
      setLocationStatus('اضغط "📍 تحديد موقعي" لتحديد موقعك تلقائياً', "#718096");
    }
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────
// Photo preview
// ─────────────────────────────────────────────
function initPhotoPreview() {
  const input = document.getElementById("profilePhotoInput");
  const preview = document.getElementById("avatarPreview");
  if (!input || !preview) return;

  preview.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="preview" />`;
    };
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────
// Upload profile photo
// ─────────────────────────────────────────────
async function uploadProfilePhoto(token, fileOverride) {
  const file =
    fileOverride ||
    document.getElementById("profilePhotoInput")?.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${apiBase()}/api/user/me/Profile_Photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const photoUrl = data.photo_url || data.photoUrl || data.url || "";
      if (photoUrl) localStorage.setItem("userPhoto", photoUrl);
    }
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}
function hideError(el) {
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

// ─────────────────────────────────────────────
// Session (بنخزن زي ما انت كنت عامل: authToken + userName ...)
// ─────────────────────────────────────────────
function saveSession(data) {
  const token = data.token || data.Token || "";
  if (token) localStorage.setItem("authToken", token);

  const firstName = data.first_name || data.First_name || "";
  const lastName = data.last_name || data.Last_name || "";
  const fullName = (firstName + " " + lastName).trim() || data.email || data.Email || "مستخدم";

  localStorage.setItem("userName", fullName);
  localStorage.setItem("userFirstName", firstName);
  localStorage.setItem("userRole", (data.role || data.Role || "").toLowerCase());
  localStorage.setItem("userUid", String(data.uid ?? data.Uid ?? ""));
  const photo = data.photoUrl || data.photo_url;
  if (photo) localStorage.setItem("userPhoto", photo);
}

async function fetchUserProfile(token) {
  try {
    const res = await fetch(`${apiBase()}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const user = await res.json().catch(() => ({}));
    if (user.photoUrl) localStorage.setItem("userPhoto", user.photoUrl);
    if (user.first_name && user.last_name) {
      localStorage.setItem("userName", `${user.first_name} ${user.last_name}`.trim());
      localStorage.setItem("userFirstName", user.first_name);
    }
    if (user.role) localStorage.setItem("userRole", user.role);
  } catch {
    // ignore
  }
}

function applySessionUI() {
  const name  = localStorage.getItem('userName');
  const token = localStorage.getItem('authToken');

  // ✅ normalize role
  const roleRaw = localStorage.getItem('userRole') || '';
  const role = String(roleRaw).trim().toLowerCase();

  const authButtons = document.getElementById('authButtons');
  const userArea    = document.getElementById('userArea');
  const userDisplay = document.getElementById('userDisplayName');
  const initialsEl  = document.getElementById('userInitials');
  const dashLink    = document.getElementById('dashboardLink');

  if (!authButtons || !userArea) return;

  if (token && name) {
    authButtons.hidden = true;
    authButtons.style.display = 'none';

    userArea.hidden = false;
    userArea.style.display = 'flex';

    const isTrader = (role === 'trader' || role === 'تاجر');
    const roleAr = isTrader ? 'تاجر' : 'مزارع';

    if (userDisplay) userDisplay.textContent = `${name} (${roleAr})`;
    if (initialsEl) initialsEl.textContent = (name.trim().charAt(0) || "م").toUpperCase();

    if (dashLink) {
      dashLink.textContent = isTrader ? 'صفحة التاجر' : 'صفحة المزارع';

      const target = isTrader ? 'trader-dashboard.html' : 'farmer-dashboard.html';
      dashLink.href = target;

      // نجبر التحويل حتى لو href أو CSS عاملين مشاكل
      dashLink.onclick = (e) => {
        e.preventDefault();
        window.location.href = target;
      };
    }

  } else {
    authButtons.hidden = false;
    authButtons.style.display = 'flex';
    userArea.hidden = true;
    userArea.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
// Modal helpers (مهم: بنظبط display كمان)
// ─────────────────────────────────────────────
function openModal(modalId, backdropId, modalDisplay = "block") {
  const modal = document.getElementById(modalId);
  const backdrop = document.getElementById(backdropId);

  if (backdrop) {
    backdrop.hidden = false;
    backdrop.style.display = "block";
  }
  if (modal) {
    modal.hidden = false;
    modal.style.display = modalDisplay;
  }
}

function closeModal(modalId, backdropId) {
  const modal = document.getElementById(modalId);
  const backdrop = document.getElementById(backdropId);

  if (modal) {
    modal.hidden = true;
    modal.style.display = "none";
  }
  if (backdrop) {
    backdrop.hidden = true;
    backdrop.style.display = "none";
  }
}

// ─────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById("registerError");
  hideError(errEl);

  if (!checkPasswordMatch()) {
    showError(errEl, "كلمتا المرور غير متطابقتين.");
    return;
  }

  const fd = new FormData(form);
  const payload = {
    first_name: fd.get("first_name")?.trim() || "",
    last_name: fd.get("last_name")?.trim() || "",
    email: fd.get("email")?.trim() || "",
    phone: fd.get("phone")?.trim() || "",
    address_line: fd.get("address_line")?.trim() || "",
    city_name: fd.get("city_name")?.trim() || "",
    role: document.querySelector('input[name="role"]:checked')?.value || "",
    password: fd.get("password") || "",
    ...(_detectedLat !== null ? { latitude: _detectedLat, longitude: _detectedLng } : {}),
  };

  if (!payload.role) {
    showError(errEl, "اختر نوع الحساب: مزارع أو تاجر.");
    return;
  }
  if (payload.password.length < 8) {
    showError(errEl, "Passwords must be at least 8 characters.");
    return;
  }
  if (!/\d/.test(payload.password)) {
    showError(errEl, "Passwords must have at least one digit ('0'-'9').");
    return;
  }
  if (!payload.email || !payload.phone) {
    showError(errEl, "أكمل البريد الإلكتروني ورقم الهاتف.");
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "جاري إنشاء الحساب...";
  }

  try {
    const res = await fetch(`${apiBase()}/api/Authentication/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const { ok, status, data } = await readResponse(res);

    if (!ok) {
      const msg = formatApiError(data, status, "Registration failed.");
      console.warn("Register failed:", status, data, msg);
      showError(errEl, msg);
      return;
    }

    // بعد التسجيل: لا دخول تلقائي — يفتح نموذج تسجيل الدخول فقط
    closeModal("registerModal", "registerBackdrop");
    openModal("loginModal", "loginBackdrop", "block");

    const loginEmail = document.querySelector('#loginForm input[name="email"]');
    if (loginEmail) loginEmail.value = payload.email;

    const loginErr = document.getElementById("loginError");
    if (loginErr) {
      loginErr.hidden = false;
      loginErr.style.color = "#38a169";
      loginErr.textContent = "تم إنشاء الحساب بنجاح. سجّل دخولك الآن.";
    }

    const photoInput = document.getElementById("profilePhotoInput");
    if (photoInput?.files?.[0]) {
      window._pendingProfilePhoto = photoInput.files[0];
    }

    form.reset();
    if (photoInput) photoInput.value = "";
    const preview = document.getElementById("avatarPreview");
    if (preview) preview.innerHTML = '<span class="avatar-placeholder">📷</span>';

  } catch (err) {
    console.error("Register error:", err);
    const base = apiBase();
    const isLocal = /localhost|127\.0\.0\.1/.test(base);
    const hint = isLocal
      ? "شغّل مشروع Smart_Farm من Visual Studio (البورت 5043)، أو احذف localStorage.apiBaseUrl وحدّث الصفحة لاستخدام السيرفر على الإنترنت."
      : "تأكد من اتصال الإنترنت أو جرّب لاحقاً.";
    showError(
      errEl,
      `تعذّر الاتصال بالسيرفر (${base}). ${hint}`
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "إنشاء حساب";
    }
  }
}

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById("loginError");
  hideError(errEl);

  const fd = new FormData(form);
  const payload = {
    email: fd.get("email")?.trim() || "",
    password: fd.get("password") || "",
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "جاري تسجيل الدخول...";
  }

  try {
    const res = await fetch(`${apiBase()}/api/Authentication/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const { ok, status, data } = await readResponse(res);

    if (!ok) {
      console.warn("Login failed:", status, data);
      showError(
        errEl,
        formatApiError(data, status, "Invalid Email or Password.")
      );
      return;
    }

    saveSession({ ...data, email: payload.email });

    const token = data.token || "";
    if (token) {
      await fetchUserProfile(token);
      if (window._pendingProfilePhoto) {
        await uploadProfilePhoto(token, window._pendingProfilePhoto);
        delete window._pendingProfilePhoto;
      }
    }

    applySessionUI();
    closeModal("loginModal", "loginBackdrop");
    form.reset();
    window.dispatchEvent(new CustomEvent("authLogin"));
  } catch (err) {
    console.error("Login error:", err);
    showError(
      errEl,
      `تعذّر الاتصال بالسيرفر (${apiBase()}). تحقق من الإنترنت أو شغّل الباك‌اند محلياً.`
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "دخول";
    }
  }
}

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────
function handleLogout() {
  // امسح بيانات الدخول
  localStorage.removeItem("authToken");
  localStorage.removeItem("userName");
  localStorage.removeItem("userFirstName");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userUid");
  localStorage.removeItem("userPhoto");

  // ✅ امسح السلة عند الخروج
  localStorage.removeItem("demo_cart");

  applySessionUI();

  // لو script.js موجود يحدث العداد ويرندر السلة
  if (typeof window.updateCartBadge === "function") window.updateCartBadge();
  if (typeof window.renderCart === "function") window.renderCart();
  if (typeof window.closeCart === "function") window.closeCart();

  // Event اختياري لو انت بتسمع له
  window.dispatchEvent(new CustomEvent("authLogout"));
}

// ─────────────────────────────────────────────
// Wire up events
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Apply session state on page load
  applySessionUI();

  // Open modals
  document.getElementById("btnLoginOpen")?.addEventListener("click", () =>
    openModal("loginModal", "loginBackdrop", "block")
  );

  document.getElementById("btnRegisterOpen")?.addEventListener("click", () => {
    openModal("registerModal", "registerBackdrop", "block");
    autoDetectIfPermitted();
  });

  document.getElementById("btnDetectLocation")?.addEventListener("click", detectLocation);

  // Close modals
  document.getElementById("btnCloseLogin")?.addEventListener("click", () =>
    closeModal("loginModal", "loginBackdrop")
  );
  document.getElementById("btnCloseRegister")?.addEventListener("click", () =>
    closeModal("registerModal", "registerBackdrop")
  );

  // Close on backdrop click
  document.getElementById("loginBackdrop")?.addEventListener("click", () =>
    closeModal("loginModal", "loginBackdrop")
  );
  document.getElementById("registerBackdrop")?.addEventListener("click", () =>
    closeModal("registerModal", "registerBackdrop")
  );

  // Photo preview
  initPhotoPreview();

  // Password strength + confirm
  document.getElementById("regPassword")?.addEventListener("input", (e) =>
    updateStrengthUI(e.target.value)
  );
  document.getElementById("regPasswordConfirm")?.addEventListener("input", checkPasswordMatch);
  document.getElementById("regPassword")?.addEventListener("input", () => {
    if (document.getElementById("regPasswordConfirm")?.value) checkPasswordMatch();
  });

  // Forms
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("registerForm")?.addEventListener("submit", handleRegister);

  // Logout
  document.getElementById("btnLogout")?.addEventListener("click", handleLogout);
});







// عشان أي ملف تاني (زي script.js) يقدر يفتح مودال اللوجين
window.openLogin = function () {
  openModal("loginModal", "loginBackdrop", "block");
};

window.openRegister = function () {
  openModal("registerModal", "registerBackdrop", "block");
};

window.applySessionUI = applySessionUI;
window.handleLogout = handleLogout;