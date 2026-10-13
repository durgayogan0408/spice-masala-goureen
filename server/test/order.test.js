import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrderTotals, canTransitionOrder, effectivePrice } from "../src/domain/order.js";

test("uses a sale price when present and the regular price otherwise", () => {
  assert.equal(effectivePrice({ price: 200, salePrice: 150 }), 150);
  assert.equal(effectivePrice({ price: 200, salePrice: null }), 200);
  assert.equal(effectivePrice({ price: 200 }), 200);
});

test("charges delivery below the free-shipping threshold", () => {
  assert.deepEqual(calculateOrderTotals([{ unitPrice: 200, quantity: 2 }], 60), {
    subtotal: 400,
    deliveryFee: 60,
    total: 460,
  });
});

test("waives delivery at the threshold and clamps invalid fees to zero", () => {
  assert.deepEqual(calculateOrderTotals([{ unitPrice: 999, quantity: 1 }], 60), {
    subtotal: 999,
    deliveryFee: 0,
    total: 999,
  });
  assert.deepEqual(calculateOrderTotals([{ unitPrice: 100, quantity: 1 }], -20), {
    subtotal: 100,
    deliveryFee: 0,
    total: 100,
  });
});

test("only permits forward order transitions and explicit cancellation", () => {
  assert.equal(canTransitionOrder("placed", "confirmed"), true);
  assert.equal(canTransitionOrder("packed", "shipped"), true);
  assert.equal(canTransitionOrder("placed", "shipped"), false);
  assert.equal(canTransitionOrder("delivered", "preparing"), false);
  assert.equal(canTransitionOrder("placed", "cancelled"), true);
  assert.equal(canTransitionOrder("cancelled", "confirmed"), false);
});
