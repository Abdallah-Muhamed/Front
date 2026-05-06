/**
 * auth.js — Register & Login connected to API endpoints
 *
 * Endpoints:
 *   POST /api/Authentication/register
 *   POST /api/Authentication/login
 */

const BASE_URL = 'https://smartfarm.runasp.net';

// ─────────────────────────────────────────────
// Password strength
// ─────────────────────────────────────────────

function getStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0–5
}

function updateStrengthUI(password) {
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  if (!fill || !label) return;

  if (!password) {
    fill.style.width = '0%';
    fill.style.background = 'transparent';
    label.textContent = '';
    return;
  }

  const score = getStrength(password);
  const levels = [
    { pct: '20%', color: '#e53e3e', text: 'ضعيفة جداً' },
    { pct: '40%', color: '#dd6b20', text: 'ضعيفة' },
    { pct: '60%', color: '#d69e2e', text: 'متوسطة' },
    { pct: '80%', color: '#38a169', text: 'قوية' },
    { pct: '100%', color: '#276749', text: 'قوية جداً' },
  ];
  const lvl = levels[Math.max(0, score - 1)] || levels[0];
  fill.style.width      = lvl.pct;
  fill.style.background = lvl.color;
  label.textContent     = lvl.text;
  label.style.color     = lvl.color;
}

function checkPasswordMatch() {
  const pw      = document.getElementById('regPassword')?.value || '';
  const confirm = document.getElementById('regPasswordConfirm')?.value || '';
  const msg     = document.getElementById('confirmMsg');
  if (!msg) return true;

  if (!confirm) { msg.hidden = true; return false; }

  if (pw === confirm) {
    msg.hidden    = false;
    msg.textContent = '✔ كلمتا المرور متطابقتان';
    msg.style.color = '#38a169';
    return true;
  } else {
    msg.hidden    = false;
    msg.textContent = '✖ كلمتا المرور غير متطابقتين';
    msg.style.color = '#e53e3e';
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
      { headers: { 'User-Agent': 'SmartFarmApp/1.0' } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function applyLocationFields(data) {
  if (!data) return;
  const addr = data.address || {};

  const city = addr.city || addr.state || addr.county || addr.town || addr.village || addr.suburb || '';
  const addressLine = [
    addr.road, addr.quarter, addr.suburb, addr.city || addr.town || addr.village
  ].filter(Boolean).join('، ');

  const cityField   = document.getElementById('regCity');
  const addressField = document.getElementById('regAddress');
  if (cityField)    cityField.value   = city;
  if (addressField) addressField.value = addressLine || data.display_name || '';
}

function setLocationStatus(msg, color) {
  const el = document.getElementById('locationStatus');
  if (el) { el.textContent = msg; el.style.color = color || '#718096'; }
}

async function _doGetPosition() {
  setLocationStatus('⏳ جاري تحديد موقعك...', '#d69e2e');
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

    setLocationStatus('🔄 جاري جلب العنوان...', '#d69e2e');
    const geoData = await reverseGeocode(_detectedLat, _detectedLng);

    if (geoData) {
      applyLocationFields(geoData);
      setLocationStatus('✔ تم تحديد موقعك — يمكنك التعديل', '#38a169');
    } else {
      setLocationStatus('⚠ تعذّر جلب العنوان — أدخله يدوياً', '#e53e3e');
    }
  } catch (err) {
    const msgs = {
      1: 'رفضت الإذن — أدخل عنوانك يدوياً',
      2: 'تعذّر تحديد الموقع — أدخله يدوياً',
      3: 'انتهت مهلة تحديد الموقع — أدخله يدوياً',
    };
    setLocationStatus('⚠ ' + (msgs[err.code] || 'خطأ في الموقع'), '#e53e3e');
  }
}

async function detectLocation() {
  if (!navigator.geolocation) {
    setLocationStatus('المتصفح لا يدعم تحديد الموقع — أدخله يدوياً', '#e53e3e');
    return;
  }
  await _fetchAndFill();
}

async function autoDetectIfPermitted() {
  if (!navigator.geolocation) return;
  try {
    const perm = await navigator.permissions.query({ name: 'geolocation' });
    if (perm.state === 'granted') {
      await _fetchAndFill();
    } else if (perm.state === 'denied') {
      setLocationStatus('⚠ الإذن مرفوض — أدخل عنوانك يدوياً', '#e53e3e');
    } else {
      // 'prompt' — انتظر المستخدم يضغط الزرار
      setLocationStatus('اضغط "📍 تحديد موقعي" لتحديد موقعك تلقائياً', '#718096');
    }
  } catch {
    // المتصفح لا يدعم permissions API — جرب مباشرة
    await _fetchAndFill();
  }
}

// ─────────────────────────────────────────────
// Photo preview
// ─────────────────────────────────────────────

function initPhotoPreview() {
  const input   = document.getElementById('profilePhotoInput');
  const preview = document.getElementById('avatarPreview');
  if (!input || !preview) return;

  // اضغط على الدايرة → يفتح file picker
  preview.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files[0];
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

async function uploadProfilePhoto(token) {
  const input = document.getElementById('profilePhotoInput');
  if (!input || !input.files[0]) return; // مفيش صورة مختارة

  const formData = new FormData();
  formData.append('file', input.files[0]);

  try {
    const res = await fetch(`${BASE_URL}/api/user/me/Profile_Photo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const photoUrl = data.photo_url || data.photoUrl || data.url || '';
      if (photoUrl) localStorage.setItem('userPhoto', photoUrl);
      console.log('Photo uploaded OK');
    } else {
      console.warn('Photo upload failed:', res.status);
    }
  } catch (err) {
    console.warn('Photo upload error:', err);
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

function hideError(el) {
  el.hidden = true;
  el.textContent = '';
}

function saveSession(data) {
  // الـ API بترجع: token, uid, first_name, last_name, email, role, photoUrl
  const token = data.token || '';
  if (token) localStorage.setItem('authToken', token);

  const firstName = data.first_name || '';
  const lastName  = data.last_name  || '';
  const fullName  = (firstName + ' ' + lastName).trim() || data.email || 'مستخدم';
  localStorage.setItem('userName', fullName);
  localStorage.setItem('userFirstName', firstName);
  localStorage.setItem('userRole', data.role || '');
  localStorage.setItem('userUid', String(data.uid || ''));
  if (data.photoUrl) localStorage.setItem('userPhoto', data.photoUrl);
}

async function fetchUserProfile(token) {
  try {
    const res = await fetch(`${BASE_URL}/api/user/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const user = await res.json();
    if (user.photoUrl) localStorage.setItem('userPhoto', user.photoUrl);
    if (user.first_name && user.last_name) {
      localStorage.setItem('userName', `${user.first_name} ${user.last_name}`.trim());
    }
  } catch { /* ignore */ }
}

function applySessionUI() {
  const name  = localStorage.getItem('userName');
  const token = localStorage.getItem('authToken');
  const photo = localStorage.getItem('userPhoto');

  const authButtons = document.getElementById('authButtons');
  const userArea    = document.getElementById('userArea');
  const userDisplay = document.getElementById('userDisplayName');
  const userAvatar  = document.getElementById('userAvatar');

  if (!authButtons) return;

  if (token && name) {
    authButtons.hidden = false;
    authButtons.style.display = 'none'; // إخفاء فعلي
    userArea.hidden = false;
    userArea.style.display = 'flex';
    if (userDisplay) userDisplay.textContent = name;
    if (userAvatar) {
      if (photo) {
        userAvatar.src = photo;
        userAvatar.hidden = false;
      } else {
        // أول حرف من الاسم كـ placeholder
        userAvatar.hidden = true;
      }
      // أول حرف دايماً في الـ initials
      const initialsEl = document.getElementById('userInitials');
      if (initialsEl) initialsEl.textContent = name.charAt(0).toUpperCase();
    }
  } else {
    authButtons.hidden = false;
    authButtons.style.display = '';
    userArea.hidden = true;
    userArea.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────

async function handleRegister(e) {
  e.preventDefault();
  const form  = e.target;
  const errEl = document.getElementById('registerError');
  hideError(errEl);

  // تحقق من تطابق كلمتي المرور
  if (!checkPasswordMatch()) {
    showError(errEl, 'كلمتا المرور غير متطابقتين.');
    return;
  }

  const fd = new FormData(form);

  const payload = {
    first_name:   fd.get('first_name')?.trim()   || '',
    last_name:    fd.get('last_name')?.trim()    || '',
    email:        fd.get('email')?.trim()        || '',
    phone:        fd.get('phone')?.trim()        || '',
    address_line: fd.get('address_line')?.trim() || '',
    city_name:    fd.get('city_name')?.trim()    || '',
    role:         document.querySelector('input[name="role"]:checked')?.value || '',
    password:     fd.get('password')             || '',
    ..._detectedLat !== null && { latitude: _detectedLat, longitude: _detectedLng },
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري إنشاء الحساب...';

  try {
    const res = await fetch(`${BASE_URL}/api/Authentication/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let msg = data?.message || data?.title || data?.error || data?.detail || '';
      if (!msg && data?.errors) {
        msg = Object.values(data.errors).flat().join(' | ');
      }
      if (!msg) msg = JSON.stringify(data);
      console.error('Register API error:', data);
      showError(errEl, msg || 'حدث خطأ أثناء التسجيل. حاول مرة أخرى.');
      return;
    }

    // نجاح التسجيل — auto login
    // 1. Login تلقائي
    const loginRes = await fetch(`${BASE_URL}/api/Authentication/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: payload.email, password: payload.password }),
    });
    const loginData = await loginRes.json().catch(() => ({}));

    let token = '';
    if (loginRes.ok) {
      saveSession({ ...loginData, first_name: payload.first_name, last_name: payload.last_name, email: payload.email });
      token = loginData.token || '';
    } else {
      saveSession({ ...data, first_name: payload.first_name, last_name: payload.last_name, email: payload.email });
      token = data.token || '';
    }

    // 2. رفع الصورة لو المستخدم اختارها
    if (token) await uploadProfilePhoto(token);

    // 3. تحديث الـ UI وإغلاق المودال
    applySessionUI();
    window.dispatchEvent(new CustomEvent('authLogin'));
    closeModal('registerModal', 'registerBackdrop');
    form.reset();

  } catch (err) {
    showError(errEl, 'تعذّر الاتصال بالسيرفر. تحقق من الاتصال بالإنترنت.');
    console.error('Register error:', err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'إنشاء حساب';
  }
}

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const form  = e.target;
  const errEl = document.getElementById('loginError');
  hideError(errEl);

  const fd = new FormData(form);
  const payload = {
    email:    fd.get('email')?.trim() || '',
    password: fd.get('password')      || '',
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري تسجيل الدخول...';

  try {
    const res = await fetch(`${BASE_URL}/api/Authentication/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || data?.title || 'بيانات الدخول غلط. حاول مرة أخرى.';
      showError(errEl, msg);
      return;
    }

    // نجاح — نحفظ الجلسة
    saveSession({ ...data, email: payload.email });

    // جلب بيانات الـ user (فيها الصورة)
    const token = data.token || '';
    if (token) await fetchUserProfile(token);

    applySessionUI();
    window.dispatchEvent(new CustomEvent('authLogin'));

    closeModal('loginModal', 'loginBackdrop');
    form.reset();

  } catch (err) {
    showError(errEl, 'تعذّر الاتصال بالسيرفر. تحقق من الاتصال بالإنترنت.');
    console.error('Login error:', err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'دخول';
  }
}

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────

function handleLogout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userName');
  applySessionUI();
}

// ─────────────────────────────────────────────
// Modal helpers
// ─────────────────────────────────────────────

function openModal(modalId, backdropId) {
  const modal   = document.getElementById(modalId);
  const backdrop = document.getElementById(backdropId);
  if (modal)   modal.hidden   = false;
  if (backdrop) backdrop.hidden = false;
}

function closeModal(modalId, backdropId) {
  const modal   = document.getElementById(modalId);
  const backdrop = document.getElementById(backdropId);
  if (modal)   modal.hidden   = true;
  if (backdrop) backdrop.hidden = true;
}

// ─────────────────────────────────────────────
// Wire up events on DOMContentLoaded
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Apply session state on page load
  applySessionUI();

  // Open modals
  document.getElementById('btnLoginOpen')
    ?.addEventListener('click', () => openModal('loginModal', 'loginBackdrop'));

  document.getElementById('btnRegisterOpen')
    ?.addEventListener('click', () => {
      openModal('registerModal', 'registerBackdrop');
      autoDetectIfPermitted(); // auto-detect only if permission already granted
    });

  document.getElementById('btnDetectLocation')
    ?.addEventListener('click', () => detectLocation());

  // Close modals
  document.getElementById('btnCloseLogin')
    ?.addEventListener('click', () => closeModal('loginModal', 'loginBackdrop'));

  document.getElementById('btnCloseRegister')
    ?.addEventListener('click', () => closeModal('registerModal', 'registerBackdrop'));

  // Close on backdrop click
  document.getElementById('loginBackdrop')
    ?.addEventListener('click', () => closeModal('loginModal', 'loginBackdrop'));

  document.getElementById('registerBackdrop')
    ?.addEventListener('click', () => closeModal('registerModal', 'registerBackdrop'));

  // Photo preview
  initPhotoPreview();

  // Password strength indicator
  document.getElementById('regPassword')
    ?.addEventListener('input', e => updateStrengthUI(e.target.value));

  // Confirm match check
  document.getElementById('regPasswordConfirm')
    ?.addEventListener('input', checkPasswordMatch);
  document.getElementById('regPassword')
    ?.addEventListener('input', () => {
      if (document.getElementById('regPasswordConfirm')?.value) checkPasswordMatch();
    });

  // Form submissions
  document.getElementById('loginForm')
    ?.addEventListener('submit', handleLogin);

  document.getElementById('registerForm')
    ?.addEventListener('submit', handleRegister);

  // Logout
  document.getElementById('btnLogout')
    ?.addEventListener('click', handleLogout);
});
