"use strict";

const api = () => window.SmartFarmApi;

function pick(obj, ...keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function display(value, fallback = "غير متوفر") {
  const text = value === undefined || value === null || value === "" ? fallback : value;
  return escapeHtml(text);
}

async function fetchOrderById(orderId) {
  try {
    return await api().apiFetch(`/api/order/${orderId}`);
  } catch (e) {
    console.error("Failed to fetch order details:", e);
    return null;
  }
}

function statusInfo(rawStatus) {
  if (api()?.orderStatusInfo) {
    const info = api().orderStatusInfo(rawStatus);
    return { statusClass: info.className, statusText: info.text };
  }
  const statusRaw = String(rawStatus || "pending").toLowerCase();
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

  return { statusClass, statusText };
}

function detailCard(label, value, accent = false) {
  return `
    <div style="padding:15px; background:#f9fafb; border-radius:8px;">
      <p style="margin:0 0 5px; font-size:12px; color:#6b7280;">${label}</p>
      <p style="margin:0; font-size:16px; font-weight:bold; color:${accent ? "#2e7d32" : "#111827"};">${display(value)}</p>
    </div>
  `;
}

async function renderOrderDetails() {
  const detailsContainer = document.getElementById("orderDetails");
  const errorContainer = document.getElementById("orderError");
  if (!detailsContainer) return;

  const orderId = new URLSearchParams(window.location.search).get("id");
  if (!orderId) {
    if (errorContainer) {
      errorContainer.style.display = "block";
      errorContainer.innerHTML = "<p style='text-align:center;color:#e53e3e;'>معرف الطلب غير موجود.</p>";
    }
    detailsContainer.style.display = "none";
    return;
  }

  const order = await fetchOrderById(orderId);
  if (!order) {
    if (errorContainer) {
      errorContainer.style.display = "block";
      errorContainer.innerHTML = "<p style='text-align:center;color:#e53e3e;'>تعذر تحميل تفاصيل الطلب.</p>";
    }
    detailsContainer.style.display = "none";
    return;
  }

  if (errorContainer) errorContainer.style.display = "none";
  detailsContainer.style.display = "block";

  const id = pick(order, "Oid", "id", "Id", "orderId", "oid") ?? "—";
  const dateValue = pick(order, "Order_date", "order_date", "createdAt", "created_at", "date", "Date");
  const date = dateValue ? String(dateValue).slice(0, 10) : "—";
  const total = pick(order, "Total_price", "total", "totalPrice", "total_price", "price") ?? 0;
  const quantity = pick(order, "Quantity", "quantity", "qty") ?? 0;
  const productName = pick(order, "ProductName", "productName", "product_name") ?? "منتج";
  const buyerName = pick(order, "BuyerName", "buyerName", "UserName", "userName", "user_name");
  const sellerName = pick(order, "SellerName", "sellerName", "seller_name");
  const sellerPhone = pick(order, "SellerPhone", "sellerPhone", "seller_phone");
  const sellerAddress = pick(order, "SellerAddress", "sellerAddress", "seller_address");
  const sellerCity = pick(order, "SellerCity", "sellerCity", "seller_city");
  const buyerPhone = pick(order, "BuyerPhone", "buyerPhone", "buyer_phone");
  const buyerAddress = pick(order, "BuyerAddress", "buyerAddress", "buyer_address");
  const buyerCity = pick(order, "BuyerCity", "buyerCity", "buyer_city");
  const paymentMethod = api().paymentMethodLabel(pick(order, "Payment_method", "payment_method", "paymentMethod"));
  const promoCode = pick(order, "Promo_code", "promo_code", "promoCode");
  const discount = pick(order, "Discount_amount", "discount_amount", "discountAmount");
  const notes = pick(order, "Order_notes", "order_notes", "orderNotes");
  const { statusClass, statusText } = statusInfo(pick(order, "Status", "status", "orderStatus"));

  const sellerFullAddress = [sellerAddress, sellerCity].filter(Boolean).join(", ");
  const buyerFullAddress = [buyerAddress, buyerCity].filter(Boolean).join(", ");

  detailsContainer.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:20px;">
      <h2 style="margin:0; color:#1a365d;">طلب #${display(id)}</h2>
      <span class="order-status ${statusClass}" style="font-size:14px; padding:6px 12px; border-radius:20px;">${statusText}</span>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:15px; margin-bottom:20px;">
      ${detailCard("التاريخ", date)}
      ${detailCard("الكمية", quantity)}
      ${detailCard("الإجمالي", `${Number(total) || 0} ج.م`, true)}
      ${detailCard("المنتج", productName)}
    </div>

    <div style="padding:15px; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0; margin-bottom:20px;">
      <h3 style="margin:0 0 12px; font-size:16px; color:#166534;">بيانات البائع</h3>
      <p style="margin:6px 0; font-size:14px; color:#166534;"><strong>اسم البائع:</strong> ${display(sellerName)}</p>
      <p style="margin:6px 0; font-size:14px; color:#166534;"><strong>رقم الهاتف:</strong> ${display(sellerPhone)}</p>
      <p style="margin:6px 0; font-size:14px; color:#166534;"><strong>العنوان:</strong> ${display(sellerFullAddress)}</p>
    </div>

    <div style="padding:15px; background:#eff6ff; border-radius:8px; border:1px solid #bfdbfe; margin-bottom:20px;">
      <h3 style="margin:0 0 12px; font-size:16px; color:#1e40af;">بيانات المشتري</h3>
      <p style="margin:6px 0; font-size:14px; color:#1e40af;"><strong>اسم المشتري:</strong> ${display(buyerName)}</p>
      <p style="margin:6px 0; font-size:14px; color:#1e40af;"><strong>رقم الهاتف:</strong> ${display(buyerPhone)}</p>
      <p style="margin:6px 0; font-size:14px; color:#1e40af;"><strong>العنوان:</strong> ${display(buyerFullAddress)}</p>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:15px; margin-bottom:20px;">
      ${detailCard("طريقة الدفع", paymentMethod)}
    </div>

    <div style="padding:15px; background:#f9fafb; border-radius:8px;">
      <p style="margin:0 0 5px; font-size:12px; color:#6b7280;">ملاحظات الطلب</p>
      <p style="margin:0; font-size:15px; color:#111827; line-height:1.7;">${display(notes)}</p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", renderOrderDetails);
