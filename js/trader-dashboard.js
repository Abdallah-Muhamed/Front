"use strict";

const api = () => window.SmartFarmApi;

function requireTrader() {
  const token = api().getAuthToken();
  const role = String(localStorage.getItem("userRole") || "").trim().toLowerCase();

  if (!token) {
    alert("يجب تسجيل الدخول أولاً.");
    window.location.href = "index.html";
    return false;
  }


  if (role && role !== "trader") {
    alert("هذه الصفحة للتجار فقط.");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

function openCropModal() {
  const m = document.getElementById("cropModal");
  if (m) m.style.display = "flex";
}
function closeCropModal() {
  const m = document.getElementById("cropModal");
  if (m) m.style.display = "none";
}
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;

async function loadProfile() {
  try {
    const user = await api().apiFetch("/api/user/me");
    const first = user.first_name || user.First_name || "";
    const last  = user.last_name  || user.Last_name  || "";
    const name  = `${first} ${last}`.trim() || localStorage.getItem("userName") || "تاجر";

    document.getElementById("profileName").innerText = name;
    document.getElementById("profileAvatar").innerText = name.charAt(0) || "ت";
  } catch (e) {
    console.error(e);
    const name = localStorage.getItem("userName") || "تاجر";
    document.getElementById("profileName").innerText = name;
    document.getElementById("profileAvatar").innerText = name.charAt(0) || "ت";
  }
}

async function deleteProduct(productId) {
  if (!productId) return;
  if (!confirm("هل أنت متأكد من حذف هذا المحصول؟")) return;

  try {
    await api().apiFetch(`/api/Product/${productId}`, { method: "DELETE" });
    await renderMarketProducts();
  } catch (e) {
    console.error(e);


    try {
      await api().apiFetch(`/api/product/${productId}`, { method: "DELETE" });
      await renderMarketProducts();
    } catch (e2) {
      alert(e2.message || "تعذّر حذف المحصول.");
    }
  }
}
window.deleteProduct = deleteProduct;

async function renderMarketProducts() {
  const grid = document.getElementById("cropsGrid");
  if (!grid) return;

  try {
    const products = await api().apiFetch("/api/Product/me");
    const list = (Array.isArray(products) ? products : []).map(api().mapApiProduct);

    document.getElementById("countCrops").innerText = list.length;

    const totalQty = list.reduce((s, p) => s + Number(p.quantity || 0), 0);
    document.getElementById("sumStock").innerText = totalQty;

    if (!list.length) {
      grid.innerHTML = "<p style='color:#888;'>لم تقم بعرض أي منتجات بالسوق بعد.</p>";
      return;
    }

    grid.innerHTML = list.map((c) => {
      const id = c.id ?? c.Id;
      const img = c.img || c.photoUrl || "images/item2.jpg";

      return `
        <div class="card" style="position:relative;">
          <button type="button"
            onclick="deleteProduct(${id})"
            style="position:absolute; top:12px; left:12px; padding:7px 10px; border-radius:12px; border:1px solid #fecaca; background:rgba(254,226,226,.8); color:#b91c1c; font-weight:800; cursor:pointer;">
            حذف
          </button>

          <img src="${img}" alt="" onerror="this.style.display='none'">
          <h4>${c.name}</h4>
          <p style="color:#2e7d32; font-weight:bold;">${c.price} ج.م</p>
          <p style="margin:0; color:#666; font-size:13px;">الكمية: ${c.quantity ?? 0}</p>
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

async function saveCrop() {
  const cName = document.getElementById("cropName")?.value?.trim();
  const cPrice = Number(document.getElementById("cropPrice")?.value);
  const cCat = document.getElementById("cropCategory")?.value;
  const qty = Number(document.getElementById("cropQuantity")?.value);

  const imgUrl = document.getElementById("cropImg")?.value?.trim() || "";

  if (!cName) return alert("اكتب اسم المحصول!");
  if (!Number.isFinite(cPrice) || cPrice <= 0) return alert("اكتب سعر صحيح!");
  if (!Number.isFinite(qty) || qty <= 0) return alert("اكتب كمية صحيحة!");

  try {

    await api().apiFetch("/api/Product", {
      method: "POST",
      body: {
        description: cName,
        price: cPrice,
        category: cCat,
        quantity: qty,
        added_date: api().todayIsoDate(),
        ...(imgUrl ? { img: imgUrl } : {}) 
      },
    });

    closeCropModal();
    document.getElementById("cropName").value = "";
    document.getElementById("cropPrice").value = "";
    document.getElementById("cropQuantity").value = "";
    document.getElementById("cropImg").value = "";

    alert("تم نشر المنتج في السوق بنجاح!");
    await renderMarketProducts();
  } catch (e) {
    alert(e.message || "تعذّر نشر المنتج.");
  }
}
window.saveCrop = saveCrop;

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireTrader()) return;

  if (typeof window.applySessionUI === "function") window.applySessionUI();

  await loadProfile();
  await renderMarketProducts();
});