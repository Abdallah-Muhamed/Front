"use strict";


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
  // لازم يكون عنده مزارع قبل ما ينشر محصول
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
        const loc = [f.city, f.governorate, f.address_line].filter(Boolean).join(" — ") || "—";
        return `<div class="card">
          <h3 style="color:#1a365d; margin-bottom:5px;">${f.name || f.Name}</h3>
          <p style="color:#666; font-size:14px;">📍 ${loc}</p>
          <p style="color:#888; font-size:12px;">محاصيل: ${f.cropCount ?? f.CropCount ?? 0}</p>
        </div>`;
      })
      .join("");
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
        const img = c.img || "images/item2.jpg";
        return `<div class="card">
          <img src="${img}" alt="" onerror="this.style.display='none'">
          <h4>${c.name}</h4>
          <p style="color:#2e7d32; font-weight:bold;">${c.price} ج.م</p>
          <span style="font-size:12px; background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:10px;">${c.category || ""}</span>
        </div>`;
      })
      .join("");
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

        // ملاحظة: اسم الحقل ده لازم يطابق الباك إند
        // لو الباك إند عندك اسمه غير كده (area / size / farm_area) قلّي واظبطه
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

        // ملاحظة: لازم اسم الحقل ده يطابق API بتاعك:
        // بعض الباك إند بيكون farmId أو farm_id
        farmId: Number(farmId),
        // farm_id: Number(farmId),  // لو ده الصحيح عندك فعّل ده بدل farmId
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
});


function openFarmModal(){ document.getElementById("farmModal").style.display = "flex"; }
function closeFarmModal(){ document.getElementById("farmModal").style.display = "none"; }

function openCropModal(){ document.getElementById("cropModal").style.display = "flex"; }
function closeCropModal(){ document.getElementById("cropModal").style.display = "none"; }

window.openFarmModal = openFarmModal;
window.closeFarmModal = closeFarmModal;
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;
