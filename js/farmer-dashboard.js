"use strict";
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

let myFarmsCache = []; // هنخزن فيها مزارع المستخدم عشان نستخدمها في select

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
    const products = await api().apiFetch("/api/product/me");
    const list = (Array.isArray(products) ? products : []).map(api().mapApiProduct);
    document.getElementById("countCrops").innerText = list.length;

    if (!list.length) {
      grid.innerHTML = "<p style='color:#888;'>لم تقم بعرض أي منتجات بالسوق بعد.</p>";
      return;
    }

    grid.innerHTML = list
  .map((c) => {
    const id = c.id ?? c.Id;
    const img = c.img || c.photoUrl || "images/item2.jpg";
    return `<div class="card">
  <button type="button" class="sf-del-btn" data-del-product="${id}">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3h6m-8 4h10m-9 0 1 15h6l1-15M10 7v12m4-12v12"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    حذف
  </button>

  <img src="${img}" alt="" onerror="this.style.display='none'">
  <h4>${c.name}</h4>
  <p style="color:#2e7d32; font-weight:bold;">${c.price} ج.م</p>
  <span style="font-size:12px; background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:10px;">${c.category || ""}</span>
</div>`;
  })
  .join("");



  grid.querySelectorAll("[data-del-product]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = Number(btn.dataset.delProduct);
    deleteProduct(id);
  });
});
  } catch (e) {
    console.error(e);
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المنتجات.</p>";
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
