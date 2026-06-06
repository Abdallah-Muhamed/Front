"use strict";

/* =========================================================
   Farmer Dashboard (Clean Version)
   Depends on:
   - window.SmartFarmApi with:
     - getAuthToken()
     - apiFetch(path, options?)
     - todayIsoDate()
     - mapApiProduct(rawProduct)  (optional but preferred)
   - auth.js provides window.applySessionUI() (optional)
========================================================= */

const api = () => window.SmartFarmApi;

/* ---------------------------
   Helpers
--------------------------- */
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

/* ---------------------------
   Role Guard
--------------------------- */
function requireFarmer() {
  const token = api()?.getAuthToken?.();
  if (!token) {
    alert("يجب تسجيل الدخول أولاً كمزارع.");
    window.location.href = "index.html";
    return false;
  }
  const role = String(localStorage.getItem("userRole") || "").trim().toLowerCase();
  if (role && role !== "farmer") {
    alert("هذه الصفحة للمزارعين فقط. سجّل دخول بحساب مزارع.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

/* =========================================================
   Confirm Modal (Professional)
   Requires HTML:
   #confirmModal, #confirmTitle, #confirmMessage, #confirmOkBtn
========================================================= */
let _confirmResolve = null;

function hasConfirmModal() {
  return !!document.getElementById("confirmModal");
}

function openConfirm({ title = "تأكيد الحذف", message = "هل أنت متأكد؟", okText = "حذف" } = {}) {
  const modal = document.getElementById("confirmModal");
  const t = document.getElementById("confirmTitle");
  const m = document.getElementById("confirmMessage");
  const okBtn = document.getElementById("confirmOkBtn");

  if (!modal || !t || !m || !okBtn) return;

  t.textContent = title;
  m.textContent = message;
  okBtn.textContent = okText;

  modal.style.display = "flex";
}

function closeConfirm() {
  const modal = document.getElementById("confirmModal");
  if (modal) modal.style.display = "none";

  if (_confirmResolve) {
    _confirmResolve(false);
    _confirmResolve = null;
  }
}

async function confirmAction(options) {
  // Fallback لو confirm modal مش موجود في الـ HTML
  if (!hasConfirmModal()) {
    return window.confirm(options?.message || "هل أنت متأكد؟");
  }

  return new Promise((resolve) => {
    _confirmResolve = resolve;
    openConfirm(options);

    // نضمن handler واحد فقط
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

// Close confirm by clicking outside
document.addEventListener("click", (e) => {
  const modal = document.getElementById("confirmModal");
  if (!modal) return;
  if (modal.style.display === "flex" && e.target === modal) closeConfirm();
});

// Close confirm by ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("confirmModal");
    if (modal && modal.style.display === "flex") closeConfirm();
  }
});

/* =========================================================
   Farms + Products
========================================================= */
let myFarmsCache = [];

/* ---------- Modals open/close (Farm / Crop) ---------- */
function openFarmModal() {
  showEl("farmModal", "flex");
}
function closeFarmModal() {
  hideEl("farmModal");
}
function fillFarmSelect() {
  const sel = document.getElementById("cropFarmId");
  if (!sel) return;

  sel.innerHTML = "";

  if (!myFarmsCache.length) {
    sel.innerHTML = `<option value="">لا توجد مزارع — أضف مزرعة أولاً</option>`;
    sel.disabled = true;
    return;
  }

  sel.disabled = false;
  sel.insertAdjacentHTML("beforeend", `<option value="">اختر المزرعة</option>`);

  myFarmsCache.forEach((f) => {
    const id = pick(f, "farmId", "FarmId", "id", "Id");
    const name = pick(f, "name", "Name") || "مزرعة";
    sel.insertAdjacentHTML("beforeend", `<option value="${id}">${name}</option>`);
  });
}

function openCropModal() {
  if (!myFarmsCache.length) {
    alert("لا يمكنك إضافة محصول قبل إضافة مزرعة.");
    openFarmModal();
    return;
  }
  fillFarmSelect();
  showEl("cropModal", "flex");
}
function closeCropModal() {
  hideEl("cropModal");
}

window.openFarmModal = openFarmModal;
window.closeFarmModal = closeFarmModal;
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;

/* ---------- Profile ---------- */
async function loadProfile() {
  try {
    const user = await api().apiFetch("/api/user/me");
    const first = pick(user, "first_name", "First_name") || "";
    const last = pick(user, "last_name", "Last_name") || "";
    const name = `${first} ${last}`.trim() || localStorage.getItem("userName") || "مزارع";

    const nameEl = document.getElementById("profileName");
    const avEl = document.getElementById("profileAvatar");
    if (nameEl) nameEl.innerText = name;
    if (avEl) avEl.innerText = name.charAt(0) || "م";
  } catch (e) {
    console.warn("loadProfile failed:", e);
    const fallback = localStorage.getItem("userName") || "مزارع";
    const nameEl = document.getElementById("profileName");
    const avEl = document.getElementById("profileAvatar");
    if (nameEl) nameEl.innerText = fallback;
    if (avEl) avEl.innerText = fallback.charAt(0) || "م";
  }
}

/* ---------- Render Farms ---------- */
async function renderFarms() {
  const grid = document.getElementById("farmsGrid");
  const countEl = document.getElementById("countFarms");
  if (!grid) return;

  try {
    const farms = await api().apiFetch("/api/farm/me");
    const list = Array.isArray(farms) ? farms : [];

    myFarmsCache = list;
    fillFarmSelect();

    if (countEl) countEl.innerText = list.length;

    if (!list.length) {
      grid.innerHTML = "<p style='color:#888;'>لا توجد مزارع مضافة بعد.</p>";
      return;
    }

    grid.innerHTML = list
      .map((f) => {
        const id = pick(f, "farmId", "FarmId", "id", "Id");
        const name = pick(f, "name", "Name") || "مزرعة";
        const loc = [
          pick(f, "city", "City"),
          pick(f, "governorate", "Governorate"),
          pick(f, "address_line", "Address_line"),
          pick(f, "locationQuery", "LocationQuery"),
        ]
          .filter(Boolean)
          .join(" — ") || "—";

        const crops = pick(f, "cropCount", "CropCount") ?? 0;

        return `
          <div class="card" style="position:relative;">
            <button type="button" class="sf-del-btn" data-del-farm="${id}">حذف</button>

            <h3 style="color:#1a365d; margin-bottom:5px;">${name}</h3>
            <p style="color:#666; font-size:14px;">📍 ${loc}</p>
            <p style="color:#888; font-size:12px;">محاصيل: ${crops}</p>
          </div>
        `;
      })
      .join("");

    grid.querySelectorAll("[data-del-farm]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.delFarm;
        await deleteFarm(id);
      });
    });
  } catch (e) {
    console.error("renderFarms failed:", e);
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المزارع.</p>";
  }
}

/* ---------- Render My Market Products ---------- */
async function renderMarketProducts() {
  const grid = document.getElementById("cropsGrid");
  const countEl = document.getElementById("countCrops");
  if (!grid) return;

  try {
    const productsRaw = await api().apiFetch("/api/product/me");
    const rawList = Array.isArray(productsRaw) ? productsRaw : [];

    // Map farms id -> name
    const farmsById = new Map(
      (myFarmsCache || []).map((f) => [
        Number(pick(f, "farmId", "FarmId", "id", "Id")),
        pick(f, "name", "Name") || "مزرعة",
      ])
    );

    // mapApiProduct لو موجودة
    const list = rawList.map((p) => (typeof api().mapApiProduct === "function" ? api().mapApiProduct(p) : p));

    if (countEl) countEl.innerText = list.length;

    if (!list.length) {
      grid.innerHTML = "<p style='color:#888;'>لم تقم بعرض أي منتجات بالسوق بعد.</p>";
      return;
    }

    const sellerName = localStorage.getItem("userName") || "مزارع";

    grid.innerHTML = rawList
      .map((raw, idx) => {
        const c = list[idx];

        const id = pick(c, "id", "Id") ?? pick(raw, "id", "Id");
        const name = pick(c, "name", "Name", "description", "Description") || "منتج";
        const price = pick(c, "price", "Price") ?? 0;
        const category = pick(c, "category", "Category") || "";
        const img = pick(c, "img", "photoUrl", "imageUrl") || "images/item2.jpg";

        // farmId من raw مباشرة (عشان لو mapApiProduct بيشيله)
        const farmId =
          pick(raw, "farmId", "FarmId", "farm_id") ??
          pick(raw?.farm || {}, "id", "Id") ??
          pick(c, "farmId", "FarmId", "farm_id") ??
          null;

        const fName = farmId ? farmsById.get(Number(farmId)) || "—" : "—";

        return `
          <div class="card" style="position:relative;">
            <button type="button" class="sf-del-btn" data-del-product="${id}">حذف</button>

            <img src="${img}" alt="" onerror="this.style.display='none'">
            <h4 style="margin:10px 0 6px;">${name}</h4>

            <p style="margin:0 0 6px; font-size:13px; color:#6b7280;">
              المزرعة: <strong style="color:#14532d;">${fName}</strong>
            </p>

            <p style="margin:0 0 10px; font-size:13px; color:#6b7280;">
              المزارع: <strong>${sellerName}</strong>
            </p>

            <p style="color:#2e7d32; font-weight:bold; margin:0;">${price} ج.م</p>
            ${
              category
                ? `<span style="font-size:12px; background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:10px;">${category}</span>`
                : ""
            }
          </div>
        `;
      })
      .join("");

    grid.querySelectorAll("[data-del-product]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.delProduct;
        await deleteProduct(id);
      });
    });
  } catch (e) {
    console.error("renderMarketProducts failed:", e);
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المنتجات.</p>";
  }
}

/* =========================================================
   Create Farm / Create Product
========================================================= */
async function saveFarm() {
  const fName = document.getElementById("farmName")?.value?.trim();
  const fLoc = document.getElementById("farmLocation")?.value?.trim();
  const fArea = Number(document.getElementById("farmArea")?.value);

  if (!fName || !fLoc) return alert("أكمل اسم المزرعة والموقع!");
  if (!Number.isFinite(fArea) || fArea <= 0) return alert("اكتب مساحة صحيحة للمزرعة!");

  try {
    await api().apiFetch("/api/farm", {
      method: "POST",
      body: {
        name: fName,
        locationQuery: fLoc,
        area: fArea,

        // حقول احتياطية لو الـ backend محتاج city/address_line
        city: fLoc,
        address_line: fLoc,
      },
    });

    closeFarmModal();
    document.getElementById("farmName").value = "";
    document.getElementById("farmLocation").value = "";
    const areaEl = document.getElementById("farmArea");
    if (areaEl) areaEl.value = "";

    await renderFarms();
  } catch (e) {
    console.error("saveFarm failed:", e);
    alert(e?.message || "تعذر حفظ المزرعة.");
  }
}

async function saveCrop() {
  const cName = document.getElementById("cropName")?.value?.trim();
  const cPrice = Number(document.getElementById("cropPrice")?.value);
  const cCat = document.getElementById("cropCategory")?.value;
  const farmId = document.getElementById("cropFarmId")?.value;
  const qty = Number(document.getElementById("cropQuantity")?.value);

  if (!cName) return alert("يجب إدخال اسم المحصول!");
  if (!Number.isFinite(cPrice) || cPrice <= 0) return alert("اكتب سعر صحيح!");
  if (!farmId) return alert("اختار المزرعة!");
  if (!Number.isFinite(qty) || qty <= 0) return alert("اكتب كمية صحيحة!");

  try {
    await api().apiFetch("/api/product", {
      method: "POST",
      body: {
        description: cName,
        price: cPrice,
        category: cCat,
        quantity: qty,
        added_date: api().todayIsoDate(),
        farmId: Number(farmId),
      },
    });

    closeCropModal();
    document.getElementById("cropName").value = "";
    document.getElementById("cropPrice").value = "";
    document.getElementById("cropQuantity").value = "";

    await renderMarketProducts();
  } catch (e) {
    console.error("saveCrop failed:", e);
    alert(e?.message || "تعذر نشر المنتج.");
  }
}

window.saveFarm = saveFarm;
window.saveCrop = saveCrop;

/* =========================================================
   Delete Farm / Delete Product (with confirm modal)
========================================================= */
async function deleteFarm(farmId) {
  if (!farmId) return;

  const ok = await confirmAction({
    title: "تأكيد حذف المزرعة",
    message: "هل أنت متأكد أنك تريد حذف هذه المزرعة؟",
    okText: "حذف",
  });
  if (!ok) return;

  const candidates = [
    `/api/farm/${farmId}`,
    `/api/Farm/${farmId}`,
    `/api/farm?id=${farmId}`,
    `/api/Farm?id=${farmId}`,
  ];

  let lastErr = null;
  for (const url of candidates) {
    try {
      await api().apiFetch(url, { method: "DELETE" });
      await renderFarms();
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  console.error("deleteFarm failed:", lastErr);
  alert(lastErr?.message || "تعذر حذف المزرعة (قد لا يوجد Endpoint للحذف أو يوجد محاصيل مرتبطة).");
}

async function deleteProduct(productId) {
  if (!productId) return;

  const ok = await confirmAction({
    title: "تأكيد حذف المحصول",
    message: "هل أنت متأكد أنك تريد حذف هذا المحصول من السوق؟",
    okText: "حذف",
  });
  if (!ok) return;

  try {
    await api().apiFetch(`/api/Product/${productId}`, { method: "DELETE" });
    await renderMarketProducts();
  } catch (e) {
    // fallback lower case
    try {
      await api().apiFetch(`/api/product/${productId}`, { method: "DELETE" });
      await renderMarketProducts();
    } catch (e2) {
      console.error("deleteProduct failed:", e2);
      alert(e2?.message || "تعذر حذف المحصول.");
    }
  }
}

window.deleteFarm = deleteFarm;
window.deleteProduct = deleteProduct;

/* =========================================================
   Crop photo picker (Preview only)
   (Uploading needs backend endpoint)
========================================================= */
let _cropPhotoFile = null;

function initCropPhotoPicker() {
  const input = document.getElementById("cropPhotoInput");
  const previewBox = document.getElementById("cropPhotoPreview");
  if (!input || !previewBox) return;

  input.addEventListener("change", () => {
    const file = input.files && input.files[0] ? input.files[0] : null;
    _cropPhotoFile = file;

    if (!file) {
      previewBox.hidden = true;
      previewBox.innerHTML = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("الصورة كبيرة. الحد الأقصى 5MB");
      input.value = "";
      _cropPhotoFile = null;
      previewBox.hidden = true;
      previewBox.innerHTML = "";
      return;
    }

    const url = URL.createObjectURL(file);
    previewBox.innerHTML = `<img src="${url}" alt="preview" style="width:100%; max-height:220px; object-fit:cover; border-radius:10px;">`;
    previewBox.hidden = false;
  });
}

/* =========================================================
   Init
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  if (!requireFarmer()) return;

  if (typeof window.applySessionUI === "function") window.applySessionUI();

  initCropPhotoPicker();

  await loadProfile();
  await renderFarms();
  await renderMarketProducts();
});