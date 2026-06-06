"use strict";

/**
 * Smart Farm API — production server:
 *   Base:    https://smartfarm.runasp.net
 *   Swagger: https://smartfarm.runasp.net/swagger/index.html
 *
 * Local dev (optional): ?api=local  or  localStorage.setItem('apiBaseUrl', 'http://localhost:5043')
 * Reset to production:  ?api=prod   or  localStorage.removeItem('apiBaseUrl'); location.reload();
 */
(function () {
  /** Bump when JS changes — forces browsers to reload scripts (not HTML cache). */
  window.APP_SCRIPT_VERSION = "20250603e";

  const PRODUCTION = "https://smartfarm.runasp.net";
  const PRODUCTION_SWAGGER = "https://smartfarm.runasp.net/swagger/index.html";
  const LOCAL = "http://localhost:5043";

  function normalizeApiBase(url) {
    if (!url) return PRODUCTION;
    return url
      .replace(/\/swagger\/?.*$/i, "")
      .replace(/\/$/, "");
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("api") === "local") {
    localStorage.setItem("apiBaseUrl", LOCAL);
  }
  if (params.get("api") === "prod") {
    localStorage.removeItem("apiBaseUrl");
  }

  const override = localStorage.getItem("apiBaseUrl");
  window.API_BASE_URL = normalizeApiBase(override || PRODUCTION);
  window.API_SWAGGER_URL = PRODUCTION_SWAGGER;
})();
