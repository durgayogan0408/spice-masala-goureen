import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home" },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  instructions: { type: String, trim: true, default: "" },
  isDefault: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: "" },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  addresses: { type: [addressSchema], default: [] },
  active: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};
userSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

const variantSchema = new mongoose.Schema({
  sku: { type: String, trim: true, default: "" },
  label: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0, default: null },
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockAt: { type: Number, min: 0, default: 5 },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, default: "" },
  image: { type: String, default: "" },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  images: { type: [String], default: [] },
  ingredients: { type: [String], default: [] },
  allergens: { type: [String], default: [] },
  shelfLife: { type: String, default: "" },
  storage: { type: String, default: "" },
  variants: { type: [variantSchema], validate: [(value) => value.length > 0, "At least one variant is required"] },
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ name: "text", description: "text" });
productSchema.index({ active: 1, featured: -1, createdAt: -1 });

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  image: { type: String, default: "" },
  variant: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: "" },
  at: { type: Date, default: Date.now },
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  mode: { type: String, enum: ["manual", "shiprocket"], default: "manual" },
  courier: { type: String, default: "" },
  trackingNumber: { type: String, default: "" },
  trackingUrl: { type: String, default: "" },
  estimatedDelivery: { type: Date, default: null },
  confirmedAt: { type: Date, default: null },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  checkoutKey: { type: String, index: { unique: true, sparse: true } },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  customer: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  address: { type: addressSchema, required: true },
  items: { type: [orderItemSchema], required: true },
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cod"], default: "cod" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
  status: {
    type: String,
    enum: ["placed", "confirmed", "preparing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"],
    default: "placed",
    index: true,
  },
  shipment: { type: shipmentSchema, default: () => ({}) },
  statusHistory: { type: [statusHistorySchema], default: [] },
  notes: { type: String, default: "" },
}, { timestamps: true });
orderSchema.index({ createdAt: -1, status: 1 });

export const User = mongoose.model("User", userSchema);
export const Category = mongoose.model("Category", categorySchema);
export const Product = mongoose.model("Product", productSchema);
export const Order = mongoose.model("Order", orderSchema);
