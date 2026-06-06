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

    grid.innerHTML = list.map((c) => {
      const id = c.id ?? c.Id;
      const img = c.img || c.photoUrl || "images/item2.jpg";
      const seller = c.sellerLabel || `التاجر: ${c.sellerName || localStorage.getItem("userName") || "تاجر"}`;

      return `
        <div class="card" style="position:relative;">
          <button type="button" class="sf-del-btn" data-del="${id}">حذف</button>

          <img src="${img}" alt="" onerror="this.src='images/item2.jpg'">
          <h4 style="margin:10px 0 6px;">${c.name}</h4>

          <p class="sf-seller-line">${seller}</p>

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

    // Get current user's uid from localStorage
    const currentUid = api().getCurrentUserId();

    grid.innerHTML = orders.map(o => {
      const id = o.Oid ?? o.id ?? o.Id ?? o.orderId ?? o.oid ?? "—";
      const dateValue = o.Order_date ?? o.order_date ?? o.createdAt ?? o.created_at ?? o.date ?? o.Date ?? "";
      const date = dateValue ? String(dateValue).slice(0, 10) : "—";
      const total = o.Total_price ?? o.total ?? o.totalPrice ?? o.total_price ?? o.price ?? 0;
      const orderUid = o.Uid ?? o.uid ?? o.Uid ?? o.uid ?? 0;

      // Debug logging
      console.log("Order data:", o);
      console.log("Current UID:", currentUid);
      console.log("Order UID:", orderUid);
      console.log("Is buyer:", orderUid === currentUid);

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

      // عدد العناصر (لو API بيرجع items)
      const itemsCount = Array.isArray(o.items) ? o.items.length : (o.itemsCount ?? o.items_count ?? null);

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

      console.log("Seller info:", { sellerPhone, sellerAddress, sellerCity });
      console.log("Buyer info:", { buyerPhone, buyerAddress, buyerCity });

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
          ${itemsCount !== null ? `<p style="margin:0; color:#666; font-size:14px;">🧺 عدد الأصناف: ${itemsCount}</p>` : ""}

          <p style="margin:10px 0 0; color:#2e7d32; font-weight:bold;">
            الإجمالي: ${Number(total) || 0} ج.م
          </p>

          ${contactInfo}

          ${!isBuyer && statusClassFinal === "order-status--pending" ? `
            <button class="btn btn--primary" style="margin-top:15px; width:100%;" onclick="confirmOrder(${id})">تأكيد الطلب</button>
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
  if (!confirm("هل أنت متأكد من تأكيد هذا الطلب؟")) return;

  try {
    await api().apiFetch(`/api/Order/${orderId}`, {
      method: "PUT",
      body: { status: "accepted" },
    });
    alert("تم تأكيد الطلب بنجاح.");
    await renderOrders();
  } catch (e) {
    console.error(e);
    alert(e?.message || "تعذر تأكيد الطلب.");
  }
}
window.confirmOrder = confirmOrder;

let _traderPhotoFile = null;

function initTraderPhotoPicker() {
  const input = document.getElementById("cropPhotoInput");
  const preview = document.getElementById("cropPhotoPreview");
  if (!input) return;
  input.addEventListener("change", () => {
    const file = input.files?.[0] || null;
    _traderPhotoFile = file;
    if (!file || !preview) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("الصورة كبيرة — الحد 5MB");
      input.value = "";
      _traderPhotoFile = null;
      return;
    }
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" alt="preview" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;">`;
    preview.hidden = false;
  });
}

async function saveCrop() {
  const cName = document.getElementById("cropName")?.value?.trim();
  const cPrice = Number(document.getElementById("cropPrice")?.value);
  const cCat = document.getElementById("cropCategory")?.value;
  const qty = Number(document.getElementById("cropQuantity")?.value);

  if (!cName) return alert("اكتب اسم المحصول!");
  if (!Number.isFinite(cPrice) || cPrice <= 0) return alert("اكتب سعر صحيح!");
  if (!Number.isFinite(qty) || qty <= 0) return alert("اكتب كمية صحيحة!");

  try {
    let photoUrl = null;
    if (_traderPhotoFile) {
      photoUrl = await api().uploadProductPhoto(_traderPhotoFile);
    }

    await api().apiFetch("/api/product", {
      method: "POST",
      body: {
        description: cName,
        price: cPrice,
        category: cCat,
        quantity: qty,
        photoUrl,
        added_date: api().todayIsoDate(),
      },
    });

    closeCropModal();
    _traderPhotoFile = null;
    document.getElementById("cropName").value = "";
    document.getElementById("cropPrice").value = "";
    document.getElementById("cropQuantity").value = "";
    const preview = document.getElementById("cropPhotoPreview");
    if (preview) { preview.hidden = true; preview.innerHTML = ""; }

    await renderMarketProducts();
  } catch (e) {
    alert(e.message || "تعذّر نشر المنتج.");
  }
}
window.saveCrop = saveCrop;

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireTrader()) return;

  if (typeof window.applySessionUI === "function") window.applySessionUI();

  initTraderPhotoPicker();
  await loadProfile();
  await renderMarketProducts();
  await renderOrders();
});
