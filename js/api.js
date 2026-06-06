"use strict";

const CART_KEY = "demo_cart";

const CATEGORY_IMAGES = {
  حبوب: ["images/item1 (1).jpg", "images/item6.jpg", "images/item10.jpg"],
  خضروات: ["images/item5.jpg", "images/item3.jpg", "images/item11.jpg", "images/crop-info1.1.jpg"],
  فاكهة: ["images/item4.jpg", "images/item7.jpg", "images/item8.jpg", "images/item12.jpg"],
};

const FALLBACK_IMAGES = [
  "images/item2.jpg",
  "images/item9.jpg",
  "images/crop-cart1.png",
  "images/item1 (1).jpg",
  "images/item5.jpg",
  "images/item4.jpg",
];

const DEFAULT_PRODUCT_IMG = "images/item2.jpg";

function pickCategoryImage(category, id) {
  const pool = CATEGORY_IMAGES[category] || FALLBACK_IMAGES;
  const idx = Math.abs(Number(id) || 0) % pool.length;
  return pool[idx] || DEFAULT_PRODUCT_IMG;
}

function productSellerLabel(raw) {
  const role = String(pick(raw, "sellerRole", "SellerRole") || "").trim().toLowerCase();
  const name = pick(raw, "sellerName", "SellerName") || "";
  const farm = pick(raw, "farmName", "FarmName") || "";
  if (role === "trader" || role === "تاجر") {
    return name ? `التاجر: ${name}` : "";
  }
  const parts = [];
  if (farm) parts.push(`المزرعة: ${farm}`);
  if (name) parts.push(`المزارع: ${name}`);
  return parts.join(" • ");
}

function getApiBase() {
  const raw = window.API_BASE_URL || "https://smartfarm.runasp.net";
  return raw.replace(/\/swagger\/?.*$/i, "").replace(/\/$/, "");
}

function getAuthToken() {
  return localStorage.getItem("authToken") || "";
}

function isLoggedIn() {
  return !!getAuthToken();
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj != null && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

function getCurrentUserId() {
  const raw =
    localStorage.getItem("userUid") ||
    localStorage.getItem("uid") ||
    localStorage.getItem("Uid") ||
    "";
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function availableUnits(product) {
  return Math.max(0, normalizeNumber(pick(product, "quantity", "Quantity"), 0));
}

function isOwnProduct(product) {
  const currentUid = getCurrentUserId();
  const sellerUid = normalizeNumber(pick(product, "uid", "Uid"), 0);
  return !!currentUid && !!sellerUid && currentUid === sellerUid;
}

function canAddProductToCart(product, currentQty = 0) {
  if (!product) return { ok: false, reason: "هذا المنتج غير متوفر." };
  if (isOwnProduct(product)) return { ok: false, reason: "لا يمكنك شراء منتجك الخاص." };
  const stock = availableUnits(product);
  if (stock <= 0) return { ok: false, reason: "هذا المنتج غير متوفر حاليا." };
  if (normalizeNumber(currentQty, 0) + 1 > stock) {
    return { ok: false, reason: `الكمية المتاحة ${stock} فقط.` };
  }
  return { ok: true, stock };
}

function normalizePaymentMethodForApi(method) {
  const raw = String(method || "").trim().toLowerCase();
  if (raw.startsWith("card")) return "card";
  if (raw.startsWith("wallet")) return "wallet";
  if (raw.startsWith("cod") || raw.includes("cash")) return "cod";
  return raw || "cod";
}

function paymentMethodLabel(method) {
  const normalized = normalizePaymentMethodForApi(method);
  if (normalized === "card") return "بطاقة بنكية";
  if (normalized === "wallet") return "محفظة إلكترونية";
  if (normalized === "cod") return "الدفع عند الاستلام";
  return method || "غير متوفر";
}

function orderStatusInfo(rawStatus) {
  const statusRaw = String(rawStatus || "pending").toLowerCase();
  const isAccepted = statusRaw.includes("accept") || statusRaw.includes("approve");
  const isRejected = statusRaw.includes("reject");
  const isDone = statusRaw.includes("done") || statusRaw.includes("deliver") || statusRaw.includes("complete");
  const statusClass = isAccepted
    ? "order-status--accepted"
    : isRejected
      ? "order-status--rejected"
      : isDone
        ? "order-status--done"
        : "order-status--pending";
  const text = isAccepted
    ? "تمت الموافقة"
    : isRejected
      ? "مرفوض"
      : isDone
        ? "مكتمل"
        : "قيد المراجعة";
  return { className: statusClass, text, raw: statusRaw };
}

function isOrderBuyer(order) {
  const currentUid = getCurrentUserId();
  const orderUid = normalizeNumber(pick(order, "Uid", "uid", "buyerUid", "BuyerUid", "userId", "UserId"), 0);
  return !!currentUid && !!orderUid && currentUid === orderUid;
}

function mapApiProduct(p) {
  const pid = pick(p, "pid", "Pid") ?? 0;
  const category = pick(p, "category", "Category") || "خضروات";
  const photoUrl = pick(p, "photoUrl", "PhotoUrl", "img");
  const img = photoUrl || pickCategoryImage(category, pid);
  const price = Number(pick(p, "price", "Price") ?? 0);
  const rating = pick(p, "rating", "Rating");

  return {
    id: pid,
    pid,
    name: pick(p, "description", "Description") || "منتج",
    price,
    category,
    rating: rating != null ? Number(rating) : null,
    img,
    quantity: pick(p, "quantity", "Quantity"),
    uid: pick(p, "uid", "Uid"),
    farmId: pick(p, "farmId", "FarmId"),
    farmName: pick(p, "farmName", "FarmName"),
    sellerName: pick(p, "sellerName", "SellerName"),
    sellerRole: pick(p, "sellerRole", "SellerRole"),
    sellerLabel: productSellerLabel(p),
  };
}

async function uploadProductPhoto(file) {
  const form = new FormData();
  form.append("image", file);
  const res = await apiFetch("/api/product/photo", { method: "POST", body: form, headers: {} });
  return pick(res, "photoUrl", "PhotoUrl") || null;
}

/**
 * Extract the real error text from any API response shape.
 * Never returns a generic placeholder if the server sent something useful.
 */
function extractApiErrorText(data) {
  if (data == null) return "";

  if (typeof data === "string") return data.trim();

  if (Array.isArray(data)) {
    return data
      .map((item) => extractApiErrorText(item))
      .filter(Boolean)
      .join(" ");
  }

  if (typeof data === "object") {
    const direct = pick(data, "message", "Message", "error", "Error", "detail", "Detail", "title", "Title");
    if (direct && typeof direct === "string") {
      const t = direct.trim();
      if (t && !/^one or more validation errors occurred\.?$/i.test(t)) return t;
    }

    if (data.errors && typeof data.errors === "object") {
      const flat = Object.values(data.errors)
        .flat()
        .map((v) => (typeof v === "string" ? v : extractApiErrorText(v)))
        .filter(Boolean);
      if (flat.length) return flat.join(" ");
    }
  }

  return "";
}

/** Show server message as-is; only use fallback when body is truly empty. */
function formatApiError(data, status, fallback) {
  const raw = extractApiErrorText(data);
  if (raw) return raw;

  if (status === 409) return "Email is already registered.";
  if (status === 401) return "Unauthorized — please log in again.";
  if (status === 403) return "Forbidden — you do not have access to this resource.";
  if (status === 400) return fallback || `Bad request (HTTP ${status})`;
  if (status) return fallback || `Request failed (HTTP ${status})`;
  return fallback || "Request failed.";
}

function parseErrorMessage(data, fallback, status) {
  return formatApiError(data, status, fallback);
}

async function readResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

async function apiFetch(path, options = {}) {
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { ...(options.headers || {}) };
  const needsAuth = options.auth !== false;

  // Serialize body FIRST — then set headers based on what we actually have
  let serializedBody = options.body;
  if (
    options.body != null &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof ArrayBuffer) &&
    typeof options.body !== "string"
  ) {
    serializedBody = JSON.stringify(options.body);
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const token = getAuthToken();
  if (needsAuth && !token) {
    const err = new Error("Not logged in — please sign in first.");
    err.status = 401;
    err.data = { message: "Not logged in — please sign in first." };
    throw err;
  }

  if (token && needsAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers, body: serializedBody });

  const { ok, status, data } = await readResponse(res);

  if (!ok) {
    const err = new Error(parseErrorMessage(data, res.statusText || "Request failed", status));
    err.status = status;
    err.data = data;
    throw err;
  }

  return data;
}

let _products = [];
const _byId = new Map();

function syncCatalog(list) {
  _products = list;
  _byId.clear();
  for (const p of list) _byId.set(p.id, p);
}

async function loadProducts(options = {}) {
  const category = options.category || null;
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";

  async function fetchCatalog(withAuth) {
    return apiFetch(`/api/product${qs}`, {
      method: "GET",
      auth: withAuth ? true : false,
    });
  }

  try {
    let data;
    try {
      data = await fetchCatalog(false);
    } catch (e) {
      if (e.status === 401 && isLoggedIn()) {
        data = await fetchCatalog(true);
      } else {
        throw e;
      }
    }
    const list = (Array.isArray(data) ? data : []).map(mapApiProduct);
    syncCatalog(list);
    return list;
  } catch (e) {
    if (e.status !== 401) console.warn("loadProducts:", e.message || e);
    syncCatalog([]);
    return [];
  }
}

function getProducts() {
  return _products;
}

function getProductById(id) {
  return _byId.get(Number(id));
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart || {}));
}

function cartCount(cart) {
  return Object.values(cart || {}).reduce((s, q) => s + (Number(q) || 0), 0);
}

function cartTotal(cart, lookup = _byId) {
  let total = 0;
  for (const [pidStr, qty] of Object.entries(cart || {})) {
    const p = lookup.get(Number(pidStr));
    if (!p) continue;
    total += p.price * (Number(qty) || 0);
  }
  return total;
}

function formatMoney(n) {
  return (Number(n) || 0) + " ج.م";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

window.SmartFarmApi = {
  CART_KEY,
  getApiBase,
  getAuthToken,
  isLoggedIn,
  apiFetch,
  mapApiProduct,
  productSellerLabel,
  pickCategoryImage,
  pick,
  getCurrentUserId,
  availableUnits,
  isOwnProduct,
  canAddProductToCart,
  normalizePaymentMethodForApi,
  paymentMethodLabel,
  orderStatusInfo,
  isOrderBuyer,
  uploadProductPhoto,
  loadProducts,
  getProducts,
  getProductById,
  get byId() {
    return _byId;
  },
  getCart,
  setCart,
  cartCount,
  cartTotal,
  formatMoney,
  todayIsoDate,
  parseErrorMessage,
  extractApiErrorText,
  formatApiError,
  readResponse,
};
