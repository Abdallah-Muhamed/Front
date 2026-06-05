"use strict";

const api = () => window.SmartFarmApi;

const state = {
  farms: [],
  plants: [],
  fieldCrops: [],
  categories: ["حبوب", "خضروات", "فاكهة"],
};

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj != null && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

function plantName(pid) {
  const p = state.plants.find((x) => (pick(x, "pid", "Pid") ?? 0) === Number(pid));
  return pick(p, "name", "Name") || `نبات #${pid}`;
}

function plantPhoto(pid) {
  const p = state.plants.find((x) => (pick(x, "pid", "Pid") ?? 0) === Number(pid));
  return pick(p, "photoUrl", "PhotoUrl") || "";
}

function farmName(farmId) {
  const f = state.farms.find((x) => (pick(x, "farmId", "FarmId") ?? 0) === Number(farmId));
  return pick(f, "name", "Name") || `مزرعة #${farmId}`;
}

function requireFarmer() {
  if (!api()?.getAuthToken()) {
    alert("يجب تسجيل الدخول أولاً كمزارع.");
    window.location.href = "index.html";
    return false;
  }
  const role = (localStorage.getItem("userRole") || "").toLowerCase();
  if (role && role !== "farmer") {
    alert("هذه الصفحة للمزارعين فقط. سجّل دخول بحساب مزارع.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function showFarmError(msg) {
  const el = document.getElementById("farmError");
  if (!el) {
    alert(msg);
    return;
  }
  el.textContent = msg;
  el.hidden = false;
  el.style.color = "#e53e3e";
}

function hideFarmError() {
  const el = document.getElementById("farmError");
  if (el) {
    el.hidden = true;
    el.textContent = "";
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "flex";
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

function fillSelect(sel, items, valueKey, labelFn, placeholder) {
  if (!sel) return;
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  for (const item of items) {
    const val = pick(item, valueKey, valueKey.charAt(0).toUpperCase() + valueKey.slice(1));
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = labelFn(item);
    sel.appendChild(opt);
  }
}

async function loadProfile() {
  try {
    const user = await api().apiFetch("/api/user/me");
    const first = pick(user, "first_name", "First_name") || "";
    const last = pick(user, "last_name", "Last_name") || "";
    const name = `${first} ${last}`.trim() || localStorage.getItem("userName") || "مزارع";
    document.getElementById("profileName").innerText = name;
    document.getElementById("profileAvatar").innerText = name.charAt(0) || "م";
  } catch (e) {
    console.warn(e);
  }
}

async function loadFarms() {
  const farms = await api().apiFetch("/api/farm/me");
  state.farms = Array.isArray(farms) ? farms : [];
  document.getElementById("countFarms").innerText = state.farms.length;

  const grid = document.getElementById("farmsGrid");
  if (!state.farms.length) {
    grid.innerHTML = "<p style='color:#888;'>لا توجد مزارع — أضف مزرعة أولاً.</p>";
    return;
  }

  grid.innerHTML = state.farms
    .map((f) => {
      const id = pick(f, "farmId", "FarmId");
      const loc = [pick(f, "city", "City"), pick(f, "governorate", "Governorate"), pick(f, "address_line", "Address_line")]
        .filter(Boolean)
        .join(" — ") || "—";
      const crops = pick(f, "cropCount", "CropCount") ?? 0;
      return `<div class="card">
        <h3 style="color:#1a365d;">${pick(f, "name", "Name")}</h3>
        <p style="color:#666;font-size:14px;">📍 ${loc}</p>
        <p style="color:#888;font-size:12px;">محاصيل: ${crops}</p>
      </div>`;
    })
    .join("");

  fillSelect(
    document.getElementById("fieldCropFarm"),
    state.farms,
    "farmId",
    (f) => pick(f, "name", "Name"),
    "— اختر مزرعة —"
  );
}

async function loadPlants() {
  const plants = await api().apiFetch("/api/plant");
  state.plants = Array.isArray(plants) ? plants : [];

  fillSelect(
    document.getElementById("fieldCropPlant"),
    state.plants,
    "pid",
    (p) => {
      const season = pick(p, "season", "Season");
      return season ? `${pick(p, "name", "Name")} (${season})` : pick(p, "name", "Name");
    },
    "— اختر نوع النبات —"
  );

  const catSel = document.getElementById("marketCategory");
  if (catSel) {
    const fromPlants = [...new Set(state.plants.map((p) => pick(p, "season", "Season")).filter(Boolean))];
    const cats = [...new Set([...state.categories, ...fromPlants])];
    catSel.innerHTML = '<option value="">— اختر —</option>';
    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      catSel.appendChild(opt);
    }
  }
}

async function loadFieldCrops() {
  const crops = await api().apiFetch("/api/crop");
  state.fieldCrops = Array.isArray(crops) ? crops : [];
  document.getElementById("countFieldCrops").innerText = state.fieldCrops.length;

  const grid = document.getElementById("fieldCropsGrid");
  if (!state.fieldCrops.length) {
    grid.innerHTML = "<p style='color:#888;'>لا محاصيل — أضف محصولاً واربطه بمزرعة ونوع نبات.</p>";
  } else {
    grid.innerHTML = state.fieldCrops
      .map((c) => {
        const pid = pick(c, "pid", "Pid");
        const farmId = pick(c, "farmId", "FarmId");
        const photo = plantPhoto(pid);
        const img = photo || "images/item2.jpg";
        return `<div class="card">
          <img src="${img}" alt="" style="max-height:120px;object-fit:cover;width:100%;" onerror="this.style.display='none'">
          <h4>${plantName(pid)}</h4>
          <p style="font-size:13px;color:#666;">🏠 ${farmName(farmId)}</p>
          <p style="font-size:12px;color:#888;">${pick(c, "current_Stage", "Current_Stage") || pick(c, "currentStage", "CurrentStage") || "—"}</p>
        </div>`;
      })
      .join("");
  }

  fillSelect(
    document.getElementById("marketCrop"),
    state.fieldCrops,
    "cid",
    (c) => `${plantName(pick(c, "pid", "Pid"))} — ${farmName(pick(c, "farmId", "FarmId"))}`,
    "— بدون ربط / اسم يدوي —"
  );
}

async function loadMarketProducts() {
  const products = await api().apiFetch("/api/product/me");
  const list = (Array.isArray(products) ? products : []).map(api().mapApiProduct);
  document.getElementById("countMarket").innerText = list.length;

  const grid = document.getElementById("marketGrid");
  if (!list.length) {
    grid.innerHTML = "<p style='color:#888;'>لا منتجات بالسوق بعد.</p>";
    return;
  }

  grid.innerHTML = list
    .map(
      (p) => `<div class="card">
        <img src="${p.img}" alt="" style="max-height:120px;object-fit:cover;width:100%;" onerror="this.style.display='none'">
        <h4>${p.name}</h4>
        <p style="color:#2e7d32;font-weight:bold;">${p.price} ج.م</p>
        <p style="font-size:12px;">الكمية: ${p.quantity ?? "—"}</p>
        <span style="font-size:12px;background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;">${p.category || ""}</span>
      </div>`
    )
    .join("");
}

async function saveFarm() {
  hideFarmError();

  if (!api()?.getAuthToken()) {
    showFarmError("يجب تسجيل الدخول كمزارع أولاً.");
    setTimeout(() => { window.location.href = "index.html"; }, 2000);
    return;
  }

  const name = document.getElementById("farmName")?.value?.trim();
  const locationQuery = document.getElementById("farmLocation")?.value?.trim();
  if (!name || !locationQuery) {
    showFarmError("أكمل اسم المزرعة والموقع.");
    return;
  }

  const btn = document.getElementById("btnSaveFarm");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "جاري الحفظ...";
  }

  try {
    await api().apiFetch("/api/farm", {
      method: "POST",
      body: {
        name,
        locationQuery,
        city: locationQuery,
        address_line: locationQuery,
      },
    });

    closeModal("farmModal");
    document.getElementById("farmName").value = "";
    document.getElementById("farmLocation").value = "";
    await loadFarms();
    await loadFieldCrops();
    alert("تم حفظ المزرعة بنجاح!");
  } catch (e) {
    console.error("saveFarm:", e.status, e.data, e);
    const msg = api().formatApiError(e.data, e.status, e.message);
    showFarmError(msg);
    if (e.status === 401) {
      setTimeout(() => { window.location.href = "index.html"; }, 2500);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "حفظ المزرعة";
    }
  }
}

async function saveFieldCrop() {
  const farmId = Number(document.getElementById("fieldCropFarm")?.value);
  const pid = Number(document.getElementById("fieldCropPlant")?.value);
  const areaRaw = document.getElementById("fieldCropArea")?.value;
  const start_date = document.getElementById("fieldCropStart")?.value || api().todayIsoDate();
  const notes = document.getElementById("fieldCropNotes")?.value?.trim() || null;

  if (!farmId || !pid) {
    alert("اختر المزرعة ونوع النبات من القائمة.");
    return;
  }

  try {
    await api().apiFetch("/api/crop", {
      method: "POST",
      body: {
        farmId,
        pid,
        start_date,
        notes,
        ...(areaRaw ? { area_size: Number(areaRaw) } : {}),
      },
    });
    closeModal("fieldCropModal");
    await loadFarms();
    await loadFieldCrops();
  } catch (e) {
    alert(api().formatApiError(e.data, e.status, e.message));
  }
}

async function saveMarketProduct() {
  const cropCid = document.getElementById("marketCrop")?.value;
  const nameInput = document.getElementById("marketName")?.value?.trim();
  const price = Number(document.getElementById("marketPrice")?.value);
  const quantity = Number(document.getElementById("marketQty")?.value);
  const category = document.getElementById("marketCategory")?.value;

  let description = nameInput;
  if (cropCid) {
    const crop = state.fieldCrops.find((c) => String(pick(c, "cid", "Cid")) === String(cropCid));
    if (crop && !description) description = plantName(pick(crop, "pid", "Pid"));
  }

  if (!description || !price || !quantity || !category) {
    alert("أكمل اسم المنتج، السعر، الكمية، والتصنيف.");
    return;
  }

  try {
    await api().apiFetch("/api/product", {
      method: "POST",
      body: {
        description,
        price,
        quantity,
        category,
        added_date: api().todayIsoDate(),
      },
    });
    closeModal("marketModal");
    document.getElementById("marketName").value = "";
    document.getElementById("marketPrice").value = "";
    document.getElementById("marketQty").value = "10";
    await loadMarketProducts();
  } catch (e) {
    alert(api().formatApiError(e.data, e.status, e.message));
  }
}

function onMarketCropChange() {
  const cid = document.getElementById("marketCrop")?.value;
  const nameEl = document.getElementById("marketName");
  const catEl = document.getElementById("marketCategory");
  if (!cid || !nameEl) return;

  const crop = state.fieldCrops.find((c) => String(pick(c, "cid", "Cid")) === String(cid));
  if (!crop) return;

  const pid = pick(crop, "pid", "Pid");
  nameEl.value = plantName(pid);
  const plant = state.plants.find((p) => (pick(p, "pid", "Pid") ?? 0) === Number(pid));
  const season = pick(plant, "season", "Season");
  if (season && catEl) catEl.value = season;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireFarmer()) return;

  if (typeof window.applySessionUI === "function") window.applySessionUI();

  document.getElementById("fieldCropStart").value = api().todayIsoDate();

  document.getElementById("btnOpenFarmModal")?.addEventListener("click", () => openModal("farmModal"));
  document.getElementById("btnOpenFieldCropModal")?.addEventListener("click", () => {
    if (!state.farms.length) {
      alert("أضف مزرعة أولاً.");
      return;
    }
    if (!state.plants.length) {
      alert("لا أنواع نباتات في قاعدة البيانات.");
      return;
    }
    openModal("fieldCropModal");
  });
  document.getElementById("btnOpenMarketModal")?.addEventListener("click", () => openModal("marketModal"));

  document.getElementById("btnSaveFarm")?.addEventListener("click", saveFarm);
  document.getElementById("btnSaveFieldCrop")?.addEventListener("click", saveFieldCrop);
  document.getElementById("btnSaveMarket")?.addEventListener("click", saveMarketProduct);
  document.getElementById("marketCrop")?.addEventListener("change", onMarketCropChange);

  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });

  document.getElementById("btnLogoutDash")?.addEventListener("click", () => {
    if (typeof window.handleLogout === "function") window.handleLogout();
    window.location.href = "index.html";
  });

  try {
    await loadProfile();
    await loadPlants();
    await loadFarms();
    await loadFieldCrops();
    await loadMarketProducts();
  } catch (e) {
    console.error(e);
    alert("تعذّر تحميل بيانات اللوحة: " + (e.message || e));
  }
});
