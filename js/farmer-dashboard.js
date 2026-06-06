"use strict";

const api = () => window.SmartFarmApi;

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

function showEl(id, display = "flex") {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
}
function hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

async function fetchMyOrders() {
  try {
    const res = await api().apiFetch("/api/order/me");
    return res;
  } catch (e) {
    console.error("Failed to fetch orders:", e);
    return [];
  }
}

async function renderOrders() {
  const grid = document.getElementById("ordersGrid");
  const empty = document.getElementById("ordersEmpty");
  if (!grid) return;

  try {
    const ordersRaw = await fetchMyOrders();
    const orders = Array.isArray(ordersRaw) ? ordersRaw : [];

    if (!orders.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    // Get current user's uid from localStorage
    const currentUid = api().getCurrentUserId();

    grid.innerHTML = orders.map(o => {
      const id = o.Oid ?? o.id ?? o.Id ?? o.orderId ?? o.oid ?? "—";
      const dateValue = o.Order_date ?? o.order_date ?? o.createdAt ?? o.created_at ?? o.date ?? o.Date ?? "";
      const date = dateValue ? String(dateValue).slice(0, 10) : "—";
      const total = o.Total_price ?? o.total ?? o.totalPrice ?? o.total_price ?? o.price ?? 0;
      const orderUid = o.Uid ?? o.uid ?? o.Uid ?? o.uid ?? 0;

      const statusRaw = String(o.Status || o.status || o.orderStatus || "pending").toLowerCase();
      const statusClass =
        statusRaw.includes("accept") ? "order-status--accepted" :
        statusRaw.includes("reject") ? "order-status--rejected" :
        statusRaw.includes("done") || statusRaw.includes("deliver") ? "order-status--done" :
        "order-status--pending";

      const statusText =
        statusClass === "order-status--accepted" ? "مقبول" :
        statusClass === "order-status--rejected" ? "مرفوض" :
        statusClass === "order-status--done" ? "مكتمل" :
        "قيد المراجعة";

      // Determine if current user is buyer or seller
      // If orderUid matches currentUid, user is buyer -> show seller info
      // Otherwise, user is seller -> show buyer info
      // Inverted logic based on user feedback
      const isBuyer = api().isOrderBuyer(o);
      const relationTitle = isBuyer ? "طلباتي" : "مطلوب مني";
      const normalizedStatus = api().orderStatusInfo(statusRaw);
      const statusClassFinal = normalizedStatus.className;
      const statusTextFinal = normalizedStatus.text;

      const sellerPhone = o.SellerPhone || o.sellerPhone || "";
      const sellerAddress = o.SellerAddress || o.sellerAddress || "";
      const sellerCity = o.SellerCity || o.sellerCity || "";
      const buyerPhone = o.BuyerPhone || o.buyerPhone || "";
      const buyerAddress = o.BuyerAddress || o.buyerAddress || "";
      const buyerCity = o.BuyerCity || o.buyerCity || "";

      let contactInfo = "";
      if (isBuyer) {
        // Show seller info to buyer
        if (sellerPhone || sellerAddress) {
          contactInfo = `
            <div style="margin-top:10px; padding:10px; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
              <p style="margin:0 0 5px; font-size:13px; color:#166534; font-weight:bold;">📞 بيانات البائع:</p>
              ${sellerPhone ? `<p style="margin:0; font-size:12px; color:#166534;">📱 الهاتف: ${sellerPhone}</p>` : ""}
              ${sellerAddress ? `<p style="margin:0; font-size:12px; color:#166534;">📍 العنوان: ${sellerAddress}${sellerCity ? `, ${sellerCity}` : ""}</p>` : ""}
            </div>
          `;
        }
      } else {
        // Show buyer info to seller
        if (buyerPhone || buyerAddress) {
          contactInfo = `
            <div style="margin-top:10px; padding:10px; background:#eff6ff; border-radius:8px; border:1px solid #bfdbfe;">
              <p style="margin:0 0 5px; font-size:13px; color:#1e40af; font-weight:bold;">📞 بيانات المشتري:</p>
              ${buyerPhone ? `<p style="margin:0; font-size:12px; color:#1e40af;">📱 الهاتف: ${buyerPhone}</p>` : ""}
              ${buyerAddress ? `<p style="margin:0; font-size:12px; color:#1e40af;">📍 العنوان: ${buyerAddress}${buyerCity ? `, ${buyerCity}` : ""}</p>` : ""}
            </div>
          `;
        }
      }

      return `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <h3 style="margin:0; color:#1a365d;">طلب #${id}</h3>
            <span class="order-status ${statusClassFinal}">${statusTextFinal}</span>
          </div>
          <p class="order-relation">${relationTitle}</p>

          <p style="margin:8px 0; color:#666; font-size:14px;">📅 التاريخ: ${date}</p>
          <p style="margin:10px 0 0; color:#2e7d32; font-weight:bold;">
            الإجمالي: ${Number(total) || 0} ج.م
          </p>

          ${contactInfo}

          ${!isBuyer && statusClassFinal === "order-status--pending" ? `
            <button class="btn btn--primary" style="margin-top:15px; width:100%;" onclick="confirmOrder('${id}')">تأكيد الطلب</button>
          ` : ""}
          <button class="btn btn--ghost" style="margin-top:15px; width:100%;" onclick="window.location.href='order-details.html?id=${id}'">عرض التفاصيل</button>
        </div>
      `;
    }).join("");

  } catch (e) {
    console.error(e);
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل الطلبات.</p>";
    if (empty) empty.hidden = true;
  }
}

async function confirmOrder(orderId) {
  if (!orderId || orderId === "—" || orderId === "undefined") {
    alert("خطأ: رقم الطلب غير صحيح.");
    return;
  }

  if (!confirm("هل أنت متأكد من تأكيد هذا الطلب؟")) return;

  try {
    await api().apiFetch(`/api/Order/${orderId}`, {
      method: "PUT",
      body: { status: "accepted" }
    });
    alert("تم تأكيد الطلب بنجاح.");
    await renderOrders(); // Reload orders to reflect the status change
  } catch (e) {
    console.error("confirmOrder error:", e);
    alert(e?.message || "تعذّر تأكيد الطلب.");
  }
}

window.confirmOrder = confirmOrder;

function requireFarmer() {
  const token = api()?.getAuthToken?.();
  if (!token) {
    alert("يجب تسجيل الدخول أولاً كمزارع.");
    window.location.href = "index.html";
    return false;
  }
  const role = String(localStorage.getItem("userRole") || "").trim().toLowerCase();
  if (role && role !== "farmer") {
    alert("هذه الصفحة للمزارعين فقط.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

/* Confirm modal */
let _confirmResolve = null;

function openConfirm({ title = "تأكيد الحذف", message = "هل أنت متأكد؟", okText = "حذف" } = {}) {
  const t = document.getElementById("confirmTitle");
  const m = document.getElementById("confirmMessage");
  const okBtn = document.getElementById("confirmOkBtn");
  if (t) t.textContent = title;
  if (m) m.textContent = message;
  if (okBtn) okBtn.textContent = okText;
  showEl("confirmModal", "flex");
}

function closeConfirm() {
  hideEl("confirmModal");
  if (_confirmResolve) {
    _confirmResolve(false);
    _confirmResolve = null;
  }
}

async function confirmAction(options) {
  if (!document.getElementById("confirmModal")) {
    return window.confirm(options?.message || "هل أنت متأكد؟");
  }
  return new Promise((resolve) => {
    _confirmResolve = resolve;
    openConfirm(options);
    const oldOkBtn = document.getElementById("confirmOkBtn");
    if (!oldOkBtn) return resolve(false);
    const newOkBtn = oldOkBtn.cloneNode(true);
    oldOkBtn.replaceWith(newOkBtn);
    newOkBtn.addEventListener("click", () => {
      hideEl("confirmModal");
      const r = _confirmResolve;
      _confirmResolve = null;
      r?.(true);
    });
  });
}

window.closeConfirm = closeConfirm;
window.confirmAction = confirmAction;

document.addEventListener("click", (e) => {
  const modal = document.getElementById("confirmModal");
  if (modal && modal.style.display === "flex" && e.target === modal) closeConfirm();
});

let myFarmsCache = [];
let myFieldCropsCache = [];
let plantsCache = [];
let _marketPhotoFile = null;
let _farmMap = null;
let _farmMarker = null;
let _farmLat = null;
let _farmLng = null;

function openFarmModal() {
  showEl("farmModal", "flex");
  // Init map after modal is visible (needs layout)
  setTimeout(initFarmMap, 80);
}
function closeFarmModal() {
  hideEl("farmModal");
}
function openFieldCropModal() {
  if (!myFarmsCache.length) {
    alert("أضف مزرعة أولاً.");
    openFarmModal();
    return;
  }
  fillFarmSelects();
  showEl("fieldCropModal", "flex");
}
function closeFieldCropModal() {
  hideEl("fieldCropModal");
}
function openMarketModal() {
  if (!myFarmsCache.length) {
    alert("أضف مزرعة أولاً.");
    openFarmModal();
    return;
  }
  fillFarmSelects();
  fillMarketCropSelect();
  showEl("marketModal", "flex");
}
function closeMarketModal() {
  hideEl("marketModal");
}

window.openFarmModal = openFarmModal;
window.closeFarmModal = closeFarmModal;
window.openFieldCropModal = openFieldCropModal;
window.closeFieldCropModal = closeFieldCropModal;
window.openMarketModal = openMarketModal;
window.closeMarketModal = closeMarketModal;

/* ─────────── Farm Map Picker ─────────── */
function initFarmMap() {
  const container = document.getElementById("farmMapPicker");
  if (!container) return;

  // Destroy old instance if exists
  if (_farmMap) {
    _farmMap.remove();
    _farmMap = null;
    _farmMarker = null;
  }

  // Egypt center as default
  const defaultLat = 26.8206;
  const defaultLng = 30.8025;
  const zoom = 6;

  _farmMap = L.map("farmMapPicker", { zoomControl: true }).setView([defaultLat, defaultLng], zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_farmMap);

  // If we already have coords from before, restore marker
  if (_farmLat && _farmLng) {
    _farmMarker = L.marker([_farmLat, _farmLng]).addTo(_farmMap);
    _farmMap.setView([_farmLat, _farmLng], 13);
  }

  _farmMap.on("click", async (e) => {
    _farmLat = e.latlng.lat;
    _farmLng = e.latlng.lng;

    // Update hidden inputs
    const latInput = document.getElementById("farmLat");
    const lngInput = document.getElementById("farmLng");
    if (latInput) latInput.value = _farmLat;
    if (lngInput) lngInput.value = _farmLng;

    // Move/place marker
    if (_farmMarker) {
      _farmMarker.setLatLng(e.latlng);
    } else {
      _farmMarker = L.marker(e.latlng).addTo(_farmMap);
    }

    // Show coords
    const display = document.getElementById("farmCoordsDisplay");
    if (display) {
      display.textContent = `📍 خط العرض: ${_farmLat.toFixed(6)} | خط الطول: ${_farmLng.toFixed(6)}`;
      display.classList.add("visible");
    }

    // Reverse geocode to fill location text
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${_farmLat}&lon=${_farmLng}&accept-language=ar`,
        { headers: { "User-Agent": "SmartFarmApp/1.0" } }
      );
      if (res.ok) {
        const geo = await res.json();
        const addr = geo.address || {};
        const city = addr.city || addr.state || addr.county || addr.town || addr.village || "";
        const road = addr.road || addr.quarter || "";
        const locText = [road, city].filter(Boolean).join("، ") || geo.display_name || "";
        const locInput = document.getElementById("farmLocation");
        if (locInput && !locInput.value) locInput.value = locText;
        if (display) {
          display.textContent = `📍 ${locText || ""} — خط العرض: ${_farmLat.toFixed(5)} | خط الطول: ${_farmLng.toFixed(5)}`;
        }
      }
    } catch {
      // ignore geocode errors
    }
  });

  // Try to get user's GPS to center the map
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!_farmLat) {
          _farmMap.setView([pos.coords.latitude, pos.coords.longitude], 12);
        }
      },
      () => {}, // ignore errors
      { timeout: 5000, maximumAge: 60000 }
    );
  }
}

function fillFarmSelects() {
  ["fieldCropFarm", "marketFarmId"].forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">اختر المزرعة</option>`;
    myFarmsCache.forEach((f) => {
      const fid = pick(f, "farmId", "FarmId");
      const name = pick(f, "name", "Name") || "مزرعة";
      sel.insertAdjacentHTML("beforeend", `<option value="${fid}">${name}</option>`);
    });
  });
}

function fillMarketCropSelect() {
  const sel = document.getElementById("marketCrop");
  if (!sel) return;
  sel.innerHTML = `<option value="">— بدون ربط —</option>`;
  myFieldCropsCache.forEach((c) => {
    const cid = pick(c, "cid", "Cid");
    const name = pick(c, "plantName", "PlantName") || "محصول";
    const farm = pick(c, "farmName", "FarmName") || "";
    sel.insertAdjacentHTML("beforeend", `<option value="${cid}" data-name="${name}" data-farm="${pick(c, "farmId", "FarmId") || ""}">${name} — ${farm}</option>`);
  });
}

async function loadPlants() {
  try {
    const data = await api().apiFetch("/api/plant");
    plantsCache = Array.isArray(data) ? data : [];
    const sel = document.getElementById("fieldCropPlant");
    if (!sel) return;
    sel.innerHTML = `<option value="">— اختر نوع النبات —</option>`;
    plantsCache.forEach((p) => {
      const pid = pick(p, "pid", "Pid");
      const name = pick(p, "name", "Name") || "نبات";
      sel.insertAdjacentHTML("beforeend", `<option value="${pid}">${name}</option>`);
    });
  } catch (e) {
    console.warn("loadPlants:", e);
  }
}

async function loadProfile() {
  try {
    const user = await api().apiFetch("/api/user/me");
    const name = `${pick(user, "first_name", "First_name") || ""} ${pick(user, "last_name", "Last_name") || ""}`.trim()
      || localStorage.getItem("userName") || "مزارع";
    const nameEl = document.getElementById("profileName");
    const avEl = document.getElementById("profileAvatar");
    if (nameEl) nameEl.innerText = name;
    if (avEl) avEl.innerText = name.charAt(0) || "م";
  } catch {
    const fallback = localStorage.getItem("userName") || "مزارع";
    document.getElementById("profileName").innerText = fallback;
    document.getElementById("profileAvatar").innerText = fallback.charAt(0) || "م";
  }
}

async function renderFarms() {
  const grid = document.getElementById("farmsGrid");
  const countEl = document.getElementById("countFarms");
  if (!grid) return;
  try {
    const farms = await api().apiFetch("/api/farm/me");
    myFarmsCache = Array.isArray(farms) ? farms : [];
    fillFarmSelects();
    if (countEl) countEl.innerText = myFarmsCache.length;
    if (!myFarmsCache.length) {
      grid.innerHTML = "<p style='color:#888;'>لا توجد مزارع مضافة بعد.</p>";
      return;
    }
    grid.innerHTML = myFarmsCache.map((f) => {
      const id = pick(f, "farmId", "FarmId");
      const name = pick(f, "name", "Name") || "مزرعة";
      const loc = [pick(f, "city", "City"), pick(f, "governorate", "Governorate"), pick(f, "address_line", "Address_line")].filter(Boolean).join(" — ") || "—";
      const crops = pick(f, "cropCount", "CropCount") ?? 0;
      return `
        <div class="card" style="position:relative;">
          <button type="button" class="sf-del-btn" data-del-farm="${id}">حذف</button>
          <h3 style="color:#1a365d;margin-bottom:5px;">${name}</h3>
          <p style="color:#666;font-size:14px;">📍 ${loc}</p>
          <p style="color:#888;font-size:12px;">محاصيل: ${crops}</p>
        </div>`;
    }).join("");
    grid.querySelectorAll("[data-del-farm]").forEach((btn) => {
      btn.addEventListener("click", async () => deleteFarm(btn.dataset.delFarm));
    });
  } catch (e) {
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المزارع.</p>";
  }
}

async function renderFieldCrops() {
  const grid = document.getElementById("fieldCropsGrid");
  const countEl = document.getElementById("countFieldCrops");
  if (!grid) return;
  try {
    const data = await api().apiFetch("/api/crop");
    myFieldCropsCache = Array.isArray(data) ? data : [];
    if (countEl) countEl.innerText = myFieldCropsCache.length;
    if (!myFieldCropsCache.length) {
      grid.innerHTML = "<p style='color:#888;'>لا توجد محاصيل مزرعية بعد.</p>";
      return;
    }
    grid.innerHTML = myFieldCropsCache.map((c) => {
      const id = pick(c, "cid", "Cid");
      const name = pick(c, "plantName", "PlantName") || "محصول";
      const farm = pick(c, "farmName", "FarmName") || "—";
      const img = pick(c, "photoUrl", "PhotoUrl") || api().pickCategoryImage("خضروات", id);
      const area = pick(c, "area_size", "Area_size");
      return `
        <div class="card" style="position:relative;">
          <button type="button" class="sf-del-btn" data-del-crop="${id}">حذف</button>
          <img src="${img}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'">
          <h4 style="margin:10px 0 4px;">${name}</h4>
          <p style="margin:0;font-size:13px;color:#6b7280;">المزرعة: <strong>${farm}</strong></p>
          ${area ? `<p style="margin:4px 0 0;font-size:12px;color:#888;">المساحة: ${area} فدان</p>` : ""}
        </div>`;
    }).join("");
    grid.querySelectorAll("[data-del-crop]").forEach((btn) => {
      btn.addEventListener("click", async () => deleteFieldCrop(btn.dataset.delCrop));
    });
  } catch (e) {
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المحاصيل.</p>";
  }
}

async function renderMarketProducts() {
  const grid = document.getElementById("marketGrid");
  const countEl = document.getElementById("countMarket");
  if (!grid) return;
  try {
    const rawList = await api().apiFetch("/api/product/me");
    const list = (Array.isArray(rawList) ? rawList : []).map((p) => api().mapApiProduct(p));
    if (countEl) countEl.innerText = list.length;
    if (!list.length) {
      grid.innerHTML = "<p style='color:#888;'>لم تقم بعرض أي منتجات بالسوق بعد.</p>";
      return;
    }
    grid.innerHTML = list.map((c) => `
      <div class="card" style="position:relative;">
        <button type="button" class="sf-del-btn" data-del-product="${c.id}">حذف</button>
        <img src="${c.img}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'">
        <h4 style="margin:10px 0 6px;">${c.name}</h4>
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">${c.sellerLabel || ""}</p>
        <p style="color:#2e7d32;font-weight:bold;margin:0;">${c.price} ج.م</p>
        <span style="font-size:12px;background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;">${c.category || ""}</span>
      </div>`).join("");
    grid.querySelectorAll("[data-del-product]").forEach((btn) => {
      btn.addEventListener("click", async () => deleteProduct(btn.dataset.delProduct));
    });
  } catch (e) {
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المنتجات.</p>";
  }
}

async function saveFarm() {
  const fName = document.getElementById("farmName")?.value?.trim();
  const fLoc = document.getElementById("farmLocation")?.value?.trim();
  const fArea = Number(document.getElementById("farmArea")?.value);
  const fSoil = document.getElementById("farmSoilType")?.value?.trim();
  const fNotes = document.getElementById("farmNotes")?.value?.trim();
  const lat = _farmLat;
  const lng = _farmLng;

  if (!fName) return alert("أدخل اسم المزرعة!");
  if (!lat || !lng) return alert("اختر موقع المزرعة على الخريطة أولاً!");
  if (!Number.isFinite(fArea) || fArea <= 0) return alert("اكتب مساحة صحيحة!");

  try {
    await api().apiFetch("/api/farm", {
      method: "POST",
      body: {
        name: fName,
        latitude: lat,
        longitude: lng,
        locationQuery: fLoc || null,
        area_size: fArea,
        address_line: fLoc || null,
        default_Soil_type: fSoil || null,
        notes: fNotes || null,
      },
    });
    closeFarmModal();
    // Reset form + map state
    document.getElementById("farmName").value = "";
    document.getElementById("farmLocation").value = "";
    document.getElementById("farmArea").value = "";
    document.getElementById("farmSoilType").value = "";
    document.getElementById("farmNotes").value = "";
    document.getElementById("farmLat").value = "";
    document.getElementById("farmLng").value = "";
    _farmLat = null;
    _farmLng = null;
    _farmMarker = null;
    const display = document.getElementById("farmCoordsDisplay");
    if (display) { display.textContent = ""; display.classList.remove("visible"); }
    await renderFarms();
  } catch (e) {
    alert(e?.message || "تعذر حفظ المزرعة.");
  }
}
window.saveFarm = saveFarm;

async function saveFieldCrop() {
  const farmId = Number(document.getElementById("fieldCropFarm")?.value);
  const pid = Number(document.getElementById("fieldCropPlant")?.value);
  const area = document.getElementById("fieldCropArea")?.value;
  const start = document.getElementById("fieldCropStart")?.value;
  const notes = document.getElementById("fieldCropNotes")?.value?.trim();
  if (!farmId) return alert("اختر المزرعة!");
  if (!pid) return alert("اختر نوع النبات!");
  try {
    await api().apiFetch("/api/crop", {
      method: "POST",
      body: {
        farmId,
        pid,
        area_size: area ? Number(area) : null,
        start_date: start || null,
        notes: notes || null,
      },
    });
    closeFieldCropModal();
    await renderFarms();
    await renderFieldCrops();
  } catch (e) {
    alert(e?.message || "تعذر حفظ المحصول.");
  }
}

async function saveMarketProduct() {
  const name = document.getElementById("marketName")?.value?.trim();
  const price = Number(document.getElementById("marketPrice")?.value);
  const qty = Number(document.getElementById("marketQty")?.value);
  const category = document.getElementById("marketCategory")?.value;
  const farmId = Number(document.getElementById("marketFarmId")?.value);
  const cid = document.getElementById("marketCrop")?.value;
  if (!name) return alert("أدخل اسم المنتج!");
  if (!farmId) return alert("اختر المزرعة!");
  if (!Number.isFinite(price) || price <= 0) return alert("اكتب سعراً صحيحاً!");
  if (!Number.isFinite(qty) || qty <= 0) return alert("اكتب كمية صحيحة!");
  try {
    let photoUrl = null;
    if (_marketPhotoFile) {
      photoUrl = await api().uploadProductPhoto(_marketPhotoFile);
    }
    await api().apiFetch("/api/product", {
      method: "POST",
      body: {
        description: name,
        price,
        quantity: qty,
        category,
        farmId,
        cid: cid ? Number(cid) : null,
        photoUrl,
        added_date: api().todayIsoDate(),
      },
    });
    closeMarketModal();
    _marketPhotoFile = null;
    document.getElementById("marketName").value = "";
    document.getElementById("marketPrice").value = "";
    document.getElementById("marketQty").value = "10";
    const preview = document.getElementById("marketPhotoPreview");
    if (preview) { preview.hidden = true; preview.innerHTML = ""; }
    await renderMarketProducts();
  } catch (e) {
    alert(e?.message || "تعذر نشر المنتج.");
  }
}

async function deleteFarm(farmId) {
  const ok = await confirmAction({ title: "حذف المزرعة", message: "هل تريد حذف هذه المزرعة؟ (يجب ألا تحتوي على محاصيل)" });
  if (!ok) return;
  try {
    console.log("Deleting farm:", farmId);
    await api().apiFetch(`/api/farm/${farmId}`, { method: "DELETE" });
    await renderFarms();
    await renderFieldCrops();
  } catch (e) {
    console.error("Delete farm error:", e);
    alert(e?.message || "تعذر حذف المزرعة — قد تحتوي على محاصيل.");
  }
}

async function deleteFieldCrop(cid) {
  const ok = await confirmAction({ title: "حذف المحصول", message: "هل تريد حذف هذا المحصول المزرعي؟" });
  if (!ok) return;
  try {
    console.log("Deleting crop:", cid);
    await api().apiFetch(`/api/crop/${cid}`, { method: "DELETE" });
    await renderFarms();
    await renderFieldCrops();
  } catch (e) {
    console.error("Delete crop error:", e);
    alert(e?.message || "تعذر حذف المحصول.");
  }
}

async function deleteProduct(productId) {
  const ok = await confirmAction({ title: "حذف المنتج", message: "هل تريد حذف هذا المنتج من السوق؟" });
  if (!ok) return;
  try {
    console.log("Deleting product:", productId);
    await api().apiFetch(`/api/product/${productId}`, { method: "DELETE" });
    await renderMarketProducts();
  } catch (e) {
    console.error("Delete product error:", e);
    alert(e?.message || "تعذر حذف المنتج.");
  }
}

function initMarketPhotoPicker() {
  const input = document.getElementById("marketPhotoInput");
  const preview = document.getElementById("marketPhotoPreview");
  if (!input) return;
  input.addEventListener("change", () => {
    const file = input.files?.[0] || null;
    _marketPhotoFile = file;
    if (!file || !preview) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("الصورة كبيرة — الحد 5MB");
      input.value = "";
      _marketPhotoFile = null;
      return;
    }
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" alt="preview" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;">`;
    preview.hidden = false;
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireFarmer()) return;
  if (typeof window.applySessionUI === "function") window.applySessionUI();

  await renderOrders();

  document.getElementById("btnOpenFieldCropModal")?.addEventListener("click", openFieldCropModal);
  document.getElementById("btnOpenMarketModal")?.addEventListener("click", openMarketModal);
  document.getElementById("btnSaveFieldCrop")?.addEventListener("click", saveFieldCrop);
  document.getElementById("btnSaveMarket")?.addEventListener("click", saveMarketProduct);
  document.getElementById("btnLogoutDash")?.addEventListener("click", () => {
    if (typeof handleLogout === "function") handleLogout();
  });

  document.getElementById("marketCrop")?.addEventListener("change", (e) => {
    const opt = e.target.selectedOptions?.[0];
    if (!opt || !opt.value) return;
    const nameInput = document.getElementById("marketName");
    const farmSel = document.getElementById("marketFarmId");
    if (nameInput && opt.dataset.name) nameInput.value = opt.dataset.name;
    if (farmSel && opt.dataset.farm) farmSel.value = opt.dataset.farm;
  });

  initMarketPhotoPicker();
  await loadProfile();
  await loadPlants();
  await renderFarms();
  await renderFieldCrops();
  await renderMarketProducts();
});
