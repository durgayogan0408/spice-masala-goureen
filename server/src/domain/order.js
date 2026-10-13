export const allowedTransitions = Object.freeze({
  placed: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered", "returned"],
  out_for_delivery: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
});

export function canTransitionOrder(from, to) {
  return allowedTransitions[from]?.includes(to) || false;
}

export function effectivePrice(variant) {
  return variant.salePrice != null ? variant.salePrice : variant.price;
}

export function calculateOrderTotals(items, deliveryFee, freeDeliveryThreshold = 999) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const chargedDelivery = subtotal >= freeDeliveryThreshold ? 0 : Math.max(0, deliveryFee);
  return { subtotal, deliveryFee: chargedDelivery, total: subtotal + chargedDelivery };
}
