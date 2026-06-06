"use strict";

let _confirmResolve = null;

function openConfirm({ title = "تأكيد الحذف", message = "هل أنت متأكد؟", okText = "حذف" } = {}) {
  const modal = document.getElementById("confirmModal");
  const t = document.getElementById("confirmTitle");
  const m = document.getElementById("confirmMessage");
  const okBtn = document.getElementById("confirmOkBtn");

  if (t) t.textContent = title;
  if (m) m.textContent = message;
  if (okBtn) okBtn.textContent = okText;

  if (modal) modal.style.display = "flex";
}

function closeConfirm() {
  const modal = document.getElementById("confirmModal");
  if (modal) modal.style.display = "none";

  if (_confirmResolve) {
    _confirmResolve(false);   // لو اتقفل بدون اختيار = Cancel
    _confirmResolve = null;
  }
}

// Promise-based confirm (احترافي)
function confirmAction(options) {
  return new Promise((resolve) => {
    _confirmResolve = resolve;
    openConfirm(options);

    const okBtn = document.getElementById("confirmOkBtn");
    const handler = () => {
      // close modal first
      const modal = document.getElementById("confirmModal");
      if (modal) modal.style.display = "none";

      // cleanup
      okBtn?.removeEventListener("click", handler);
      const r = _confirmResolve;
      _confirmResolve = null;
      r?.(true);
    };

    // مهم: كل مرة نفتح، نضمن event واحد فقط
    okBtn?.replaceWith(okBtn.cloneNode(true));
    const newOkBtn = document.getElementById("confirmOkBtn");
    newOkBtn?.addEventListener("click", handler);
  });
}

window.closeConfirm = closeConfirm;
window.confirmAction = confirmAction;

// إغلاق بالضغط خارج المودال
document.addEventListener("click", (e) => {
  const modal = document.getElementById("confirmModal");
  if (!modal) return;
  if (modal.style.display === "flex" && e.target === modal) closeConfirm();
});

// إغلاق بزر ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("confirmModal");
    if (modal && modal.style.display === "flex") closeConfirm();
  }
});
let myFarmsCache = [];
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

    // Validation بسيط
    if (file.size > 5 * 1024 * 1024) {
      alert("الصورة كبيرة. الحد الأقصى 5MB");
      input.value = "";
      _cropPhotoFile = null;
      previewBox.hidden = true;
      previewBox.innerHTML = "";
      return;
    }

    const url = URL.createObjectURL(file);
    previewBox.innerHTML = `<img src="${url}" alt="preview">`;
    previewBox.hidden = false;
  });
}


function openFarmModal() {
  const m = document.getElementById("farmModal");
  if (m) m.style.display = "flex";
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

  myFarmsCache.forEach(f => {
    const id = f.id ?? f.Id;
    const name = f.name ?? f.Name ?? "مزرعة";
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
  const m = document.getElementById("cropModal");
  if (m) m.style.display = "flex";
}

window.openFarmModal = openFarmModal;
window.openCropModal = openCropModal;

const api = () => window.SmartFarmApi;

function requireFarmer() {
  const token = api().getAuthToken();
  const role = (localStorage.getItem("userRole") || "").toLowerCase();
  if (!token) {
    alert("يجب تسجيل الدخول أولاً.");
    window.location.href = "index.html";
    return false;
  }
  if (role && role !== "farmer") {
    alert("هذه الصفحة للمزارعين فقط.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

async function loadProfile() {
  try {
    const user = await api().apiFetch("/api/user/me");
    const first = user.first_name || user.First_name || "";
    const last = user.last_name || user.Last_name || "";
    const name = `${first} ${last}`.trim() || localStorage.getItem("userName") || "مزارع";

    document.getElementById("profileName").innerText = name;
    document.getElementById("profileAvatar").innerText = name.charAt(0) || "م";
  } catch (e) {
    console.error(e);
    const name = localStorage.getItem("userName") || "مزارع";
    document.getElementById("profileName").innerText = name;
    document.getElementById("profileAvatar").innerText = name.charAt(0) || "م";
  }
}

async function renderFarms() {
  const grid = document.getElementById("farmsGrid");
  if (!grid) return;

  try {
 const farms = await api().apiFetch("/api/farm/me");
const list = Array.isArray(farms) ? farms : [];


myFarmsCache = list;
fillFarmSelect();

document.getElementById("countFarms").innerText = list.length;

    if (!list.length) {
      grid.innerHTML = "<p style='color:#888;'>لا يوجد مزارع مضافة بعد.</p>";
      return;
    }

   grid.innerHTML = list
  .map((f) => {
    const id = f.id ?? f.Id;
    const loc = [f.city, f.governorate, f.address_line].filter(Boolean).join(" — ") || "—";
   return `<div class="card">
  <button type="button" class="sf-del-btn" data-del-farm="${id}">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3h6m-8 4h10m-9 0 1 15h6l1-15M10 7v12m4-12v12"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    حذف
  </button>

  <h3 style="color:#1a365d; margin-bottom:5px;">${f.name || f.Name}</h3>
  <p style="color:#666; font-size:14px;">📍 ${loc}</p>
  <p style="color:#888; font-size:12px;">محاصيل: ${f.cropCount ?? f.CropCount ?? 0}</p>
</div>`;
  })
  .join("");


  grid.querySelectorAll("[data-del-farm]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = Number(btn.dataset.delFarm);
    deleteFarm(id);
  });
});
  } catch (e) {
    console.error(e);
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المزارع.</p>";
  }
}

async function renderMarketProducts() {
  const grid = document.getElementById("cropsGrid");
  if (!grid) return;

  try {
    // 1) هات منتجاتي
    const productsRaw = await api().apiFetch("/api/product/me");
    console.log("raw product sample:", (Array.isArray(productsRaw) ? productsRaw[0] : productsRaw));
console.log("farms sample:", myFarmsCache[0]);
    const rawList = Array.isArray(productsRaw) ? productsRaw : [];

    // 2) اعمل mapping زي ما كنت بتعمل
    const list = rawList.map(api().mapApiProduct);

    document.getElementById("countCrops").innerText = list.length;

    if (!list.length) {
      grid.innerHTML = "<p style='color:#888;'>لم تقم بعرض أي منتجات بالسوق بعد.</p>";
      return;
    }

    // 3) Map للمزارع (id -> name) من اللي اتحملوا في renderFarms
    const farmsById = new Map(
      (myFarmsCache || []).map(f => [
        Number(f.id ?? f.Id),
        (f.name ?? f.Name ?? "مزرعة")
      ])
    );

    const sellerName = localStorage.getItem("userName") || "مزارع";

    // 4) Render
    grid.innerHTML = rawList.map((raw, idx) => {
      const c = list[idx]; // المنتج بعد الماب

      const img = c.img || "images/item2.jpg";

      // أهم جزء: طلّع farmId من الـ raw مباشرة (عشان لو mapApiProduct بيشيله)
      const farmId =
        raw.farmId ?? raw.FarmId ?? raw.farm_id ??
        raw.farm?.id ?? raw.farm?.Id ??
        c.farmId ?? null;

      const farmName = farmId ? (farmsById.get(Number(farmId)) || "—") : "—";

      return `
        <div class="card" style="position:relative;">
          <img src="${img}" alt="" onerror="this.style.display='none'">
          <h4 style="margin:10px 0 6px;">${c.name}</h4>

          <p style="margin:0 0 6px; font-size:13px; color:#6b7280;">
            المزرعة: <strong style="color:#14532d;">${farmName}</strong>
          </p>

          <p style="margin:0 0 10px; font-size:13px; color:#6b7280;">
            المزارع: <strong>${sellerName}</strong>
          </p>

          <p style="color:#2e7d32; font-weight:bold; margin:0;">${c.price} ج.م</p>
          <span style="font-size:12px; background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:10px;">
            ${c.category || ""}
          </span>
        </div>
      `;
    }).join("");

  } catch (e) {
    console.error(e);
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المنتجات.</p>";
  }
}

async function fetchMyOrders() {
  // ✅ عدّل المسار ده حسب الـ API عندك
  // أمثلة شائعة:
  // /api/Order/me                (لو للمشتري)
  // /api/Order/seller/me         (لو للبائع)
  // /api/Order/received          (طلبات واردة للبائع)
  return await api().apiFetch("/api/Order/me");
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

    grid.innerHTML = orders.map(o => {
      const id = o.id ?? o.Id ?? o.orderId ?? "—";
      const date = (o.createdAt || o.created_at || o.date || "").toString().slice(0, 10) || "—";
      const total = o.total ?? o.totalPrice ?? o.total_price ?? 0;

      const statusRaw = String(o.status || o.orderStatus || "pending").toLowerCase();
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

      // عدد العناصر (لو API بيرجع items)
      const itemsCount = Array.isArray(o.items) ? o.items.length : (o.itemsCount ?? o.items_count ?? null);

      return `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <h3 style="margin:0; color:#1a365d;">طلب #${id}</h3>
            <span class="order-status ${statusClass}">${statusText}</span>
          </div>

          <p style="margin:8px 0; color:#666; font-size:14px;">📅 التاريخ: ${date}</p>
          ${itemsCount !== null ? `<p style="margin:0; color:#666; font-size:14px;">🧺 عدد الأصناف: ${itemsCount}</p>` : ""}

          <p style="margin:10px 0 0; color:#2e7d32; font-weight:bold;">
            الإجمالي: ${Number(total) || 0} ج.م
          </p>
        </div>
      `;
    }).join("");

  } catch (e) {
    console.error(e);
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل الطلبات.</p>";
    if (empty) empty.hidden = true;
  }
}

async function saveFarm() {
  const fName = document.getElementById("farmName")?.value?.trim();
  const fLoc  = document.getElementById("farmLocation")?.value?.trim();
  const fArea = Number(document.getElementById("farmArea")?.value);

  if (!fName || !fLoc) {
    alert("أكمل البيانات!");
    return;
  }
  if (!Number.isFinite(fArea) || fArea <= 0) {
    alert("اكتب مساحة صحيحة للمزرعة!");
    return;
  }

  try {
    await api().apiFetch("/api/farm", {
      method: "POST",
      body: {
        name: fName,
        locationQuery: fLoc,



        area: fArea,
      },
    });

    document.getElementById("farmModal").style.display = "none";
    document.getElementById("farmName").value = "";
    document.getElementById("farmLocation").value = "";
    document.getElementById("farmArea").value = "";

    await renderFarms();
  } catch (e) {
    alert(e.message || "تعذّر حفظ المزرعة.");
  }
}

async function saveCrop() {
  const cName = document.getElementById("cropName")?.value?.trim();
  const cPrice = Number(document.getElementById("cropPrice")?.value);
  const cCat = document.getElementById("cropCategory")?.value;

  const farmId = document.getElementById("cropFarmId")?.value;
  const qty = Number(document.getElementById("cropQuantity")?.value);

  if (!cName) {
    alert("يجب إدخال اسم المنتج!");
    return;
  }
  if (!Number.isFinite(cPrice) || cPrice <= 0) {
    alert("يجب إدخال سعر صحيح!");
    return;
  }
  if (!farmId) {
    alert("اختار اسم المزرعة!");
    return;
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    alert("اكتب كمية صحيحة!");
    return;
  }

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

    document.getElementById("cropModal").style.display = "none";
    alert("تم نشر المنتج في السوق بنجاح!");

    document.getElementById("cropName").value = "";
    document.getElementById("cropPrice").value = "";
    document.getElementById("cropQuantity").value = "";

    await renderMarketProducts();
  } catch (e) {
    alert(e.message || "تعذّر نشر المنتج.");
  }
}

window.saveFarm = saveFarm;
window.saveCrop = saveCrop;

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireFarmer()) return;

  if (typeof window.applySessionUI === "function") window.applySessionUI();

  await loadProfile();
  await renderFarms();
  await renderMarketProducts();
  initCropPhotoPicker();
  await renderOrders();
});


function openFarmModal(){ document.getElementById("farmModal").style.display = "flex"; }
function closeFarmModal(){ document.getElementById("farmModal").style.display = "none"; }

function openCropModal(){ document.getElementById("cropModal").style.display = "flex"; }
function closeCropModal(){ document.getElementById("cropModal").style.display = "none"; }

window.openFarmModal = openFarmModal;
window.closeFarmModal = closeFarmModal;
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;


async function deleteFarm(farmId) {
  if (!farmId) return;
  if (!confirm("هل أنت متأكد من حذف هذه المزرعة؟")) return;

  try {

    await api().apiFetch(`/api/farm/${farmId}`, { method: "DELETE" });
    await renderFarms();
  } catch (e) {
    alert(e?.message || "تعذر حذف المزرعة. تأكد أن API حذف المزارع موجود.");
  }
}

async function deleteProduct(productId) {
  if (!productId) return;
  if (!confirm("هل أنت متأكد من حذف هذا المحصول من السوق؟")) return;

  try {

    await api().apiFetch(`/api/Product/${productId}`, { method: "DELETE" });
    await renderMarketProducts();
  } catch (e) {

    try {
      await api().apiFetch(`/api/product/${productId}`, { method: "DELETE" });
      await renderMarketProducts();
    } catch (err2) {
      alert(err2?.message || "تعذر حذف المحصول.");
    }
  }
}

window.deleteFarm = deleteFarm;
window.deleteProduct = deleteProduct;
