"use strict";

const api = () => window.SmartFarmApi;

let userLat = null;
let userLng = null;
let originalData = null;

const $ = (sel) => document.querySelector(sel);

function requireLogin() {
  if (api().isLoggedIn()) return true;
  alert("يجب تسجيل الدخول للوصول إلى الملف الشخصي.");
  window.location.href = "index.html";
  return false;
}

async function loadUserProfile() {
  try {
    const data = await api().apiFetch("/api/user/me");
    originalData = JSON.parse(JSON.stringify(data));
    return data;
  } catch (e) {
    console.error(e);
    alert("تعذّر تحميل بيانات الملف الشخصي.");
    return null;
  }
}

function renderProfile(data) {
  if (!data) return;

  // Profile photo (edit mode)
  const avatarPreview = $("#avatarPreview");
  if (avatarPreview) {
    if (data.PhotoUrl) {
      avatarPreview.innerHTML = `<img src="${data.PhotoUrl}" alt="صورة البروفايل" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      $("#deletePhotoBtn").hidden = false;
    } else {
      avatarPreview.innerHTML = '<span class="avatar-placeholder">📷</span>';
      $("#deletePhotoBtn").hidden = true;
    }
  }

  // Profile photo (view mode)
  const viewAvatar = $("#viewAvatar");
  if (viewAvatar) {
    if (data.PhotoUrl) {
      viewAvatar.innerHTML = `<img src="${data.PhotoUrl}" alt="صورة البروفايل" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      viewAvatar.innerHTML = "👤";
    }
  }

  // View mode data
  const fullName = `${data.First_name || ""} ${data.Last_name || ""}`.trim();
  if ($("#viewName")) $("#viewName").textContent = fullName || "مستخدم";
  if ($("#viewEmail")) $("#viewEmail").textContent = data.Email || "";
  if ($("#viewPhones")) $("#viewPhones").textContent = (data.Phones || []).join(", ") || "غير متوفر";
  if ($("#viewPhones")) $("#viewPhones").classList.toggle("empty", !(data.Phones && data.Phones.length > 0));
  if ($("#viewCity")) $("#viewCity").textContent = data.City_name || "غير متوفر";
  if ($("#viewCity")) $("#viewCity").classList.toggle("empty", !data.City_name);
  if ($("#viewAddress")) $("#viewAddress").textContent = data.Address_line || "غير متوفر";
  if ($("#viewAddress")) $("#viewAddress").classList.toggle("empty", !data.Address_line);

  // Edit mode data
  if ($("#firstName")) $("#firstName").value = data.First_name || "";
  if ($("#lastName")) $("#lastName").value = data.Last_name || "";
  if ($("#email")) $("#email").value = data.Email || "";

  // Location
  userLat = data.Latitude;
  userLng = data.Longitude;
  
  if ($("#cityName")) $("#cityName").value = data.City_name || "";
  if ($("#addressLine")) $("#addressLine").value = data.Address_line || "";

  // Phone numbers
  renderPhones(data.Phones || []);

  // Show view mode by default
  $("#profileLoading").hidden = true;
  $("#viewMode").classList.add("active");
}

function renderPhones(phones) {
  const container = $("#phonesContainer");
  if (!container) return;

  container.innerHTML = "";

  phones.forEach((phone, index) => {
    const div = document.createElement("div");
    div.style.cssText = "display: flex; gap: 10px; margin-bottom: 10px;";
    div.innerHTML = `
      <input type="tel" class="phone-input" value="${phone}" 
             placeholder="رقم الهاتف" style="flex: 1;" 
             pattern="[0-9]{11}" maxlength="11">
      <button type="button" class="btn btn--danger remove-phone-btn" 
              style="padding: 8px 15px;">حذف</button>
    `;
    container.appendChild(div);
  });

  // Attach event listeners to remove buttons
  container.querySelectorAll(".remove-phone-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest("div").remove();
    });
  });
}

async function detectLocation() {
  if (!navigator.geolocation) {
    alert("المتصفح لا يدعم تحديد الموقع.");
    return;
  }

  const statusEl = $("#locationStatus");
  if (statusEl) {
    statusEl.textContent = "جاري تحديد الموقع...";
    statusEl.style.color = "#2f7d32";
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

    const { latitude, longitude } = position.coords;
    userLat = latitude;
    userLng = longitude;

    // Reverse geocode to get city and address
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await response.json();
      
      if (data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
        const address = data.display_name || "";
        
        if ($("#cityName") && city) $("#cityName").value = city;
        if ($("#addressLine") && address) $("#addressLine").value = address.split(",")[0] || address;
      }
    } catch (e) {
      console.error("Reverse geocoding failed:", e);
    }

    if (statusEl) {
      statusEl.textContent = "تم تحديد الموقع بنجاح ✓";
      statusEl.style.color = "#2f7d32";
    }
  } catch (e) {
    console.error(e);
    if (statusEl) {
      statusEl.textContent = "تعذّر تحديد الموقع. يرجى إدخاله يدوياً.";
      statusEl.style.color = "#e53e3e";
    }
  }
}

async function uploadPhoto(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const result = await api().apiFetch("/api/user/me/Profile_Photo", {
      method: "POST",
      body: formData,
      isFormData: true
    });

    if (result.photoUrl) {
      const avatarPreview = $("#avatarPreview");
      if (avatarPreview) {
        avatarPreview.innerHTML = `<img src="${result.photoUrl}" alt="صورة البروفايل" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      }
      $("#deletePhotoBtn").hidden = false;
    }
  } catch (e) {
    console.error(e);
    alert(e.message || "تعذّر رفع الصورة.");
  }
}

async function deletePhoto() {
  if (!confirm("هل أنت متأكد من حذف صورة البروفايل؟")) return;

  try {
    await api().apiFetch("/api/user/me/Profile_Photo", { method: "DELETE" });
    const avatarPreview = $("#avatarPreview");
    if (avatarPreview) {
      avatarPreview.innerHTML = '<span class="avatar-placeholder">📷</span>';
    }
    $("#deletePhotoBtn").hidden = true;
  } catch (e) {
    console.error(e);
    alert("تعذّر حذف الصورة.");
  }
}

function getPhones() {
  const inputs = document.querySelectorAll(".phone-input");
  const phones = [];
  inputs.forEach(input => {
    const value = input.value.trim();
    if (value) phones.push(value);
  });
  return phones;
}

async function saveProfile(e) {
  e.preventDefault();

  const firstName = $("#firstName")?.value?.trim();
  const lastName = $("#lastName")?.value?.trim();
  const email = $("#email")?.value?.trim();
  const cityName = $("#cityName")?.value?.trim();
  const addressLine = $("#addressLine")?.value?.trim();
  const phones = getPhones();

  if (!firstName || !lastName || !email) {
    alert("يرجى ملء جميع الحقول المطلوبة.");
    return;
  }

  const saveBtn = document.querySelector('button[type="submit"]');
  if (saveBtn) saveBtn.disabled = true;

  const messageEl = $("#saveMessage");
  if (messageEl) {
    messageEl.style.display = "block";
    messageEl.style.background = "#e0f2fe";
    messageEl.style.color = "#0369a1";
    messageEl.textContent = "جاري حفظ التغييرات...";
  }

  try {
    await api().apiFetch("/api/user/me", {
      method: "PUT",
      body: {
        First_name: firstName,
        Last_name: lastName,
        Email: email,
        City_name: cityName,
        Address_line: addressLine,
        Latitude: userLat,
        Longitude: userLng,
        Phones: phones
      }
    });

    if (messageEl) {
      messageEl.style.background = "#dcfce7";
      messageEl.style.color = "#166534";
      messageEl.textContent = "تم حفظ التغييرات بنجاح!";
    }

    // Reload profile data and return to view mode
    const updatedData = await loadUserProfile();
    if (updatedData) {
      originalData = JSON.parse(JSON.stringify(updatedData));
      renderProfile(updatedData);
      toggleEditMode(false);
    }
  } catch (e) {
    console.error(e);
    if (messageEl) {
      messageEl.style.background = "#fee2e2";
      messageEl.style.color = "#dc2626";
      messageEl.textContent = e.message || "تعذّر حفظ التغييرات.";
    }
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function toggleEditMode(showEdit) {
  const viewMode = $("#viewMode");
  const editMode = $("#editMode");
  
  if (showEdit) {
    viewMode?.classList.remove("active");
    editMode?.classList.add("active");
  } else {
    editMode?.classList.remove("active");
    viewMode?.classList.add("active");
  }
}

function cancelChanges() {
  if (!originalData) return;
  renderProfile(originalData);
  toggleEditMode(false);
  if ($("#saveMessage")) $("#saveMessage").style.display = "none";
}

async function initProfile() {
  if (!requireLogin()) return;

  const data = await loadUserProfile();
  if (data) renderProfile(data);

  // Event listeners
  $("#profilePhotoInput")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) uploadPhoto(file);
  });

  $("#deletePhotoBtn")?.addEventListener("click", deletePhoto);
  $("#btnDetectLocation")?.addEventListener("click", detectLocation);
  $("#editBtn")?.addEventListener("click", () => toggleEditMode(true));
  $("#addPhoneBtn")?.addEventListener("click", () => {
    const container = $("#phonesContainer");
    if (container) {
      const div = document.createElement("div");
      div.style.cssText = "display: flex; gap: 10px; margin-bottom: 10px;";
      div.innerHTML = `
        <input type="tel" class="phone-input" placeholder="رقم الهاتف" 
               style="flex: 1;" pattern="[0-9]{11}" maxlength="11">
        <button type="button" class="btn btn--danger remove-phone-btn" 
                style="padding: 8px 15px;">حذف</button>
      `;
      container.appendChild(div);
      div.querySelector(".remove-phone-btn").addEventListener("click", () => {
        div.remove();
      });
    }
  });

  $("#editProfileForm")?.addEventListener("submit", saveProfile);
  $("#cancelBtn")?.addEventListener("click", cancelChanges);
}

document.addEventListener("DOMContentLoaded", initProfile);
