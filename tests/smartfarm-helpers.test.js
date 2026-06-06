const assert = require("assert");

global.window = {};
global.localStorage = {
  store: {},
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
};

require("../js/api.js");

const api = global.window.SmartFarmApi;

function resetSession(uid = "42") {
  localStorage.store = {};
  localStorage.setItem("userUid", uid);
}

resetSession();

assert.strictEqual(api.getCurrentUserId(), 42, "reads userUid from session");
assert.strictEqual(api.isOwnProduct({ uid: 42 }), true, "detects own product");
assert.strictEqual(api.isOwnProduct({ Uid: 7 }), false, "does not block other sellers");

assert.strictEqual(api.availableUnits({ quantity: 0 }), 0, "reads zero stock");
assert.strictEqual(api.canAddProductToCart({ quantity: 0 }).ok, false, "blocks out of stock");
assert.strictEqual(api.canAddProductToCart({ uid: 42, quantity: 5 }).ok, false, "blocks own product");
assert.strictEqual(api.canAddProductToCart({ uid: 7, quantity: 5 }, 4).ok, true, "allows within stock");
assert.strictEqual(api.canAddProductToCart({ uid: 7, quantity: 5 }, 5).ok, false, "blocks exceeding stock");

assert.strictEqual(api.normalizePaymentMethodForApi("card"), "card");
assert.strictEqual(api.normalizePaymentMethodForApi("wallet"), "wallet");
assert.strictEqual(api.normalizePaymentMethodForApi("cod"), "cod");
assert.strictEqual(api.paymentMethodLabel("wallet:sim_wallet_e33c185d2f344"), "محفظة إلكترونية");
assert.strictEqual(api.paymentMethodLabel("card:sim_card_123"), "بطاقة بنكية");
assert.strictEqual(api.paymentMethodLabel("cod:123"), "الدفع عند الاستلام");

assert.strictEqual(api.orderStatusInfo("pending").text, "قيد المراجعة");
assert.strictEqual(api.orderStatusInfo("accepted").text, "تمت الموافقة");

assert.strictEqual(api.isOrderBuyer({ uid: 42 }), true, "current user owns order as buyer");
assert.strictEqual(api.isOrderBuyer({ Uid: 7 }), false, "current user is not buyer");

console.log("smartfarm helper tests passed");
