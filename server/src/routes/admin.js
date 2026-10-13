import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Category, Order, Product } from "../models/index.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { allowedTransitions, canTransitionOrder } from "../domain/order.js";

const router = Router();
router.use(authenticate, requireAdmin);

const productInput = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(5).max(3000),
  category: z.string().min(1),
  image: z.string().url().optional().or(z.literal("")),
  ingredients: z.array(z.string().trim().max(80)).max(40).default([]),
  allergens: z.array(z.string().trim().max(80)).max(20).default([]),
  shelfLife: z.string().max(100).default(""),
  storage: z.string().max(250).default(""),
  featured: z.boolean().default(false),
  variants: z.array(z.object({
    label: z.string().trim().min(1).max(40),
    price: z.number().min(0),
    salePrice: z.number().min(0).nullable().optional(),
    stock: z.number().int().min(0),
  }).refine((variant) => variant.salePrice == null || variant.salePrice < variant.price, {
    message: "A sale price must be lower than the regular price.",
  })).min(1).max(20),
});
const categoryInput = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).optional().default(""),
  image: z.string().url().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(10000).optional().default(0),
  active: z.boolean().optional().default(true),
});
router.get("/dashboard", async (_req, res, next) => {
  try {
    const [totalOrders, pendingOrders, revenue, recentOrders, products] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ["placed", "confirmed", "preparing"] } }),
      Order.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, amount: { $sum: "$total" } } }]),
      Order.find().sort({ createdAt: -1 }).limit(8).select("orderNumber customer total status paymentStatus createdAt").lean(),
      Product.find({ active: true }).populate("category", "name").lean(),
    ]);
    const lowStock = products.flatMap((product) => product.variants
      .filter((variant) => variant.stock <= variant.lowStockAt)
      .map((variant) => ({ product: product.name, variant: variant.label, stock: variant.stock })));
    return res.json({
      metrics: {
        totalOrders,
        pendingOrders,
        revenue: revenue[0]?.amount || 0,
        deliveredOrders: await Order.countDocuments({ status: "delivered" }),
        shippedOrders: await Order.countDocuments({ status: { $in: ["shipped", "out_for_delivery"] } }),
      },
      recentOrders,
      lowStock,
    });
  } catch (error) { return next(error); }
});

router.get("/products", async (req, res, next) => {
  try {
    const products = await Product.find(req.query.includeInactive === "true" ? {} : { active: true })
      .populate("category", "name").sort({ updatedAt: -1 }).lean();
    return res.json({ products });
  } catch (error) { return next(error); }
});

router.post("/products", async (req, res, next) => {
  try {
    const input = productInput.parse(req.body);
    if (!mongoose.isValidObjectId(input.category) || !(await Category.exists({ _id: input.category }))) {
      return res.status(400).json({ message: "Select a valid product category." });
    }
    const product = await Product.create({
      ...input,
      images: input.image ? [input.image] : [],
      variants: input.variants.map((variant) => ({ ...variant, sku: `${input.slug}-${variant.label.toLowerCase().replace(/\W+/g, "-")}` })),
    });
    return res.status(201).json({ product });
  } catch (error) { return next(error); }
});

router.patch("/products/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const input = productInput.partial().parse(req.body);
    if (input.category && (!mongoose.isValidObjectId(input.category) || !(await Category.exists({ _id: input.category })))) {
      return res.status(400).json({ message: "Select a valid product category." });
    }
    const update = { ...input };
    if (input.image !== undefined) {
      update.images = input.image ? [input.image] : [];
      delete update.image;
    }
    if (input.variants) update.variants = input.variants.map((variant) => ({
      ...variant,
      sku: `${input.slug || "product"}-${variant.label.toLowerCase().replace(/\W+/g, "-")}`,
    }));
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate("category", "name");
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json({ product });
  } catch (error) { return next(error); }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json({ message: "Product deactivated." });
  } catch (error) { return next(error); }
});

router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    return res.json({ categories });
  } catch (error) { return next(error); }
});

router.post("/categories", async (req, res, next) => {
  try {
    const category = await Category.create(categoryInput.parse(req.body));
    return res.status(201).json({ category });
  } catch (error) { return next(error); }
});

router.patch("/categories/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid category id." });
    const category = await Category.findByIdAndUpdate(req.params.id, categoryInput.partial().parse(req.body), { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json({ category });
  } catch (error) { return next(error); }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid category id." });
    const category = await Category.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!category) return res.status(404).json({ message: "Category not found." });
    return res.json({ message: "Category deactivated." });
  } catch (error) { return next(error); }
});

router.get("/orders", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 30).limit(30).lean(),
      Order.countDocuments(filter),
    ]);
    return res.json({ orders, page, total, pages: Math.ceil(total / 30) });
  } catch (error) { return next(error); }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { status, note = "" } = z.object({
      status: z.enum(Object.keys(allowedTransitions)),
      note: z.string().max(500).optional(),
    }).parse(req.body);
    let updatedOrder;
    let missing = false;
    let conflict = "";
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);
      if (!order) {
        missing = true;
        return;
      }
      if (!canTransitionOrder(order.status, status)) {
        conflict = `Cannot move an order from ${order.status} to ${status}.`;
        return;
      }
      if (status === "shipped" && (!order.shipment.courier || !order.shipment.trackingNumber)) {
        conflict = "Enter confirmed courier and tracking details before marking this order as shipped.";
        return;
      }
      if (status === "cancelled") {
        for (const item of order.items) {
          const restored = await Product.updateOne(
            { _id: item.product, "variants._id": item.variantId },
            { $inc: { "variants.$.stock": item.quantity } },
            { session },
          );
          if (restored.matchedCount !== 1) throw new Error(`Could not restore stock for product ${item.product}.`);
        }
      }
      order.status = status;
      if (status === "shipped") order.shipment.confirmedAt = new Date();
      if (status === "delivered" && order.paymentMethod === "cod") order.paymentStatus = "paid";
      order.statusHistory.push({ status, note: note || `Order ${status.replaceAll("_", " ")} by admin.` });
      await order.save({ session });
      updatedOrder = order;
    });
    if (missing) return res.status(404).json({ message: "Order not found." });
    if (conflict) return res.status(409).json({ message: conflict });
    return res.json({ order: updatedOrder });
  } catch (error) { return next(error); }
  finally { await session.endSession(); }
});

router.patch("/orders/:id/shipment", async (req, res, next) => {
  try {
    const shipmentInput = z.object({
      courier: z.string().trim().min(2).max(100),
      trackingNumber: z.string().trim().min(3).max(100),
      trackingUrl: z.string().url().optional().or(z.literal("")),
      estimatedDelivery: z.string().datetime().optional(),
    }).parse(req.body);
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (!["packed", "shipped"].includes(order.status)) {
      return res.status(409).json({ message: "Shipment details can only be added after an order is packed." });
    }
    order.shipment = {
      mode: "manual",
      courier: shipmentInput.courier,
      trackingNumber: shipmentInput.trackingNumber,
      trackingUrl: shipmentInput.trackingUrl || "",
      estimatedDelivery: shipmentInput.estimatedDelivery ? new Date(shipmentInput.estimatedDelivery) : null,
      confirmedAt: null,
    };
    await order.save();
    return res.json({ order });
  } catch (error) { return next(error); }
});

export default router;
