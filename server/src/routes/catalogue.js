import { Router } from "express";
import { Category, Product } from "../models/index.js";

const router = Router();

router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();
    return res.json({ categories });
  } catch (error) { return next(error); }
});

router.get("/products", async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const filter = { active: true };
    if (req.query.category) {
      const category = await Category.findOne({ slug: req.query.category, active: true }).select("_id");
      if (!category) return res.json({ products: [], page, pages: 0, total: 0 });
      filter.category = category._id;
    }
    if (req.query.featured === "true") filter.featured = true;
    if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 100) };
    const sortBy = req.query.sort === "price-low" ? { "variants.price": 1 } : req.query.sort === "price-high" ? { "variants.price": -1 } : { featured: -1, createdAt: -1 };
    const [products, total] = await Promise.all([
      Product.find(filter).populate("category", "name slug").sort(sortBy).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    return res.json({ products, page, pages: Math.ceil(total / limit), total });
  } catch (error) { return next(error); }
});

router.get("/products/:slug", async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, active: true }).populate("category", "name slug").lean();
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json({ product });
  } catch (error) { return next(error); }
});

export default router;
