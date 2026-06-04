"use strict";

/** Warn when opening HTML via file:// (breaks some features; use Live Server). */
(function () {
  if (location.protocol !== "file:") return;

  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div");
    bar.setAttribute("role", "alert");
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:99999;background:#c53030;color:#fff;padding:12px 16px;font-size:14px;text-align:center;font-family:Cairo,sans-serif;";
    bar.innerHTML =
      "⚠ افتح المشروع بـ <b>Live Server</b> (زر Go Live في VS Code) وليس بفتح ملف index.html مباشرة — واضغط <b>Ctrl+F5</b> لتحديث ملفات JavaScript.";
    document.body.prepend(bar);
    document.body.style.paddingTop = "48px";
  });
})();
