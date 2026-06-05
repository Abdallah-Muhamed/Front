"use strict";

const CART_KEY = "demo_cart";

const CATEGORY_IMAGES = {
  حبوب: "images/item1 (1).jpg",
  خضروات: "images/item5.jpg",
  فاكهة: "images/item4.jpg",
};

const DEFAULT_PRODUCT_IMG = "images/item2.jpg";

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

function mapApiProduct(p) {
  const pid = pick(p, "pid", "Pid") ?? 0;
  const category = pick(p, "category", "Category") || "خضروات";
  const photoUrl = pick(p, "photoUrl", "PhotoUrl");
  const img = photoUrl || CATEGORY_IMAGES[category] || DEFAULT_PRODUCT_IMG;
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
  };
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

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json; charset=utf-8";
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

  const res = await fetch(url, {
    ...options,
    headers,
    body:
      options.body && headers["Content-Type"] === "application/json" && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body,
  });

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
