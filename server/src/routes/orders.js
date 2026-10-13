import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Order, Product } from "../models/index.js";
import { authenticate } from "../middleware/auth.js";
import { calculateOrderTotals, effectivePrice } from "../domain/order.js";

const router = Router();
const orderInput = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().min(1),
    quantity: z.number().int().min(1).max(50),
  })).min(1).max(30),
  address: z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(30),
    street: z.string().trim().min(3).max(250),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().min(4).max(12),
    instructions: z.string().trim().max(500).optional().default(""),
  }),
  notes: z.string().trim().max(500).optional().default(""),
});

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

router.post("/", authenticate, async (req, res, next) => {
  const session = await mongoose.startSession();
  let checkoutKey;
  try {
    const input = orderInput.parse(req.body);
    checkoutKey = z.string().uuid().parse(req.get("Idempotency-Key"));
    const existingOrder = await Order.findOne({ user: req.user._id, checkoutKey });
    if (existingOrder) return res.status(200).json({ order: existingOrder });
    const deliveryFee = Math.max(0, Number(process.env.DELIVERY_FEE) || 0);
    let createdOrder;
    await session.withTransaction(async () => {
      const orderItems = [];
      for (const item of input.items) {
        const product = await Product.findOne({ _id: item.productId, active: true }).session(session);
        if (!product) throw httpError(400, "One of the selected products is no longer available.");
        const variant = product.variants.id(item.variantId);
        if (!variant) throw httpError(400, `${product.name} no longer has that pack size.`);
        const unitPrice = effectivePrice(variant);
        const stockUpdate = await Product.updateOne(
          { _id: product._id, active: true, variants: { $elemMatch: { _id: variant._id, stock: { $gte: item.quantity } } } },
          { $inc: { "variants.$.stock": -item.quantity } },
          { session },
        );
        if (stockUpdate.modifiedCount !== 1) throw httpError(409, `${product.name} (${variant.label}) does not have enough stock.`);
        const lineTotal = unitPrice * item.quantity;
        orderItems.push({
          product: product._id,
          variantId: variant._id,
          name: product.name,
          image: product.images[0] || "",
          variant: variant.label,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });
      }
      const totals = calculateOrderTotals(orderItems, deliveryFee);
      const [order] = await Order.create([{
        orderNumber: `SM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        checkoutKey,
        user: req.user._id,
        customer: { fullName: input.address.fullName, email: req.user.email, phone: input.address.phone },
        address: { ...input.address, label: "Delivery", isDefault: false },
        items: orderItems,
        ...totals,
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "placed",
        statusHistory: [{ status: "placed", note: "Order placed by customer." }],
        notes: input.notes,
      }], { session });
      createdOrder = order;
    });
    return res.status(201).json({ order: createdOrder });
  } catch (error) {
    if (error.code === 11000 && checkoutKey) {
      try {
        const priorOrder = await Order.findOne({ user: req.user._id, checkoutKey });
        if (priorOrder) return res.status(200).json({ order: priorOrder });
      } catch (lookupError) { return next(lookupError); }
    }
    return next(error);
  }
  finally { await session.endSession(); }
});

router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).lean();
    return res.json({ orders, page });
  } catch (error) { return next(error); }
});

router.post("/:id/cancel", authenticate, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { reason = "" } = z.object({ reason: z.string().trim().max(500).optional() }).parse(req.body || {});
    let order;
    let missing = false;
    let conflict = "";
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: req.params.id, user: req.user._id }).session(session);
      if (!order) {
        missing = true;
        return;
      }
      if (!["placed", "confirmed"].includes(order.status)) {
        conflict = "This order can no longer be cancelled from your account.";
        return;
      }
      for (const item of order.items) {
        const restored = await Product.updateOne(
          { _id: item.product, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": item.quantity } },
          { session },
        );
        if (restored.matchedCount !== 1) throw new Error(`Could not restore stock for product ${item.product}.`);
      }
      order.status = "cancelled";
      order.statusHistory.push({ status: "cancelled", note: reason || "Cancelled by customer." });
      await order.save({ session });
    });
    if (missing) return res.status(404).json({ message: "Order not found." });
    if (conflict) return res.status(409).json({ message: conflict });
    return res.json({ order });
  } catch (error) { return next(error); }
  finally { await session.endSession(); }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order id." });
    const filter = { _id: req.params.id };
    if (req.user.role !== "admin") filter.user = req.user._id;
    const order = await Order.findOne(filter).lean();
    if (!order) return res.status(404).json({ message: "Order not found." });
    return res.json({ order });
  } catch (error) { return next(error); }
});

export default router;
