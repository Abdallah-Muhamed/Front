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
const ok = await confirmAction({
  title: "تأكيد حذف المحصول",
  message: "هل أنت متأكد أنك تريد حذف هذا المحصول من السوق؟.",
  okText: "حذف"
});
if (!ok) return;

  try {
    await api().apiFetch(`/api/Product/${productId}`, { method: "DELETE" });
    await renderMarketProducts();
  } catch (e) {
    // fallback لو السيرفر حساس لحروف الـ URL
    try {
      await api().apiFetch(`/api/product/${productId}`, { method: "DELETE" });
      await renderMarketProducts();
    } catch (e2) {
      console.error(e2);
      alert(e2?.message || "تعذّر حذف المحصول.");
    }
  }
}
window.deleteProduct = deleteProduct;

async function renderMarketProducts() {
  const grid = document.getElementById("cropsGrid");
  if (!grid) return;

  try {
    const res = await api().apiFetch("/api/Product/me");

    const arr =
      Array.isArray(res) ? res :
      Array.isArray(res?.items) ? res.items :
      Array.isArray(res?.data) ? res.data :
      Array.isArray(res?.result) ? res.result :
      [];

    const list = arr.map(api().mapApiProduct);

    document.getElementById("countCrops").innerText = list.length;

    const totalQty = list.reduce((s, p) => s + Number(p.quantity || 0), 0);
    document.getElementById("sumStock").innerText = totalQty;

    if (!list.length) {
      grid.innerHTML = "<p style='color:#888;'>لا توجد منتجات لك حتى الآن.</p>";
      return;
    }

    const traderName = localStorage.getItem("userName") || "تاجر";

    grid.innerHTML = list.map((c) => {
      const id = c.id ?? c.Id;
      const img = c.img || c.photoUrl || "images/item2.jpg";

      return `
        <div class="card" style="position:relative;">
          <button type="button" class="sf-del-btn" data-del="${id}">حذف</button>

          <img src="${img}" alt="" onerror="this.style.display='none'">
          <h4 style="margin:10px 0 6px;">${c.name}</h4>

          <!-- ✅ اسم التاجر -->
          <p class="sf-seller-line">التاجر: <strong>${traderName}</strong></p>

          <p style="color:#2e7d32; font-weight:bold; margin:0;">${c.price} ج.م</p>
          <p style="margin:6px 0 0; color:#666; font-size:13px;">الكمية: ${c.quantity ?? 0}</p>

          <span style="font-size:12px; background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:10px;">
            ${c.category || ""}
          </span>
        </div>
      `;
    }).join("");

    // ✅ ربط زر الحذف
    grid.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.del);
        deleteProduct(id);
      });
    });

  } catch (e) {
    console.error(e);
    grid.innerHTML = "<p style='color:#e53e3e;'>تعذّر تحميل المنتجات.</p>";
  }
}


async function fetchMyOrders() {

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
  // await renderFarms();
  await renderMarketProducts();
  await renderOrders();
});