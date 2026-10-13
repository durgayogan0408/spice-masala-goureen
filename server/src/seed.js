import "dotenv/config";
import mongoose from "mongoose";
import { Category, Product, User } from "./models/index.js";

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  throw new Error("Set MONGODB_URI and JWT_SECRET in .env before seeding.");
}

const categoryData = [
  ["Kulambu Milagai Thool", "kulambu-milagai-thool", "A bold, slow-roasted blend for deeply flavourful kuzhambu."],
  ["Curry Masala", "curry-masala", "Everyday spice blends, roasted and ground in small batches."],
  ["Sambar Powder", "sambar-powder", "A homestyle South Indian staple with a fragrant lentil-and-spice base."],
  ["Rasam Powder", "rasam-powder", "Bright pepper, cumin and coriander for comforting rasam."],
  ["Chicken Masala", "chicken-masala", "A warming aromatic blend for family-favourite chicken dishes."],
  ["Mutton Masala", "mutton-masala", "Deep, robust spices for rich slow-cooked recipes."],
  ["Biryani Masala", "biryani-masala", "A fragrant whole-spice blend for celebratory biryani."],
  ["Traditional Homemade Laddoos", "homemade-laddoos", "Hand-rolled sweets made in small batches."],
  ["Other Homemade Sweets", "homemade-sweets", "Traditional treats for sharing and gifting."],
  ["Special Combos and Gift Packs", "gift-packs", "Thoughtful collections from our kitchen."],
];
const sampleProducts = [
  {
    name: "Amma's Sambar Powder", slug: "ammas-sambar-powder", categorySlug: "sambar-powder",
    description: "A family-style blend of roasted coriander, red chilli and lentils. Fragrant, balanced and made in small batches.",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85",
    ingredients: ["Coriander", "Red chilli", "Toor dal", "Cumin", "Fenugreek"], allergens: [],
    shelfLife: "6 months", storage: "Store airtight in a cool, dry place.", featured: true,
    variants: [{ label: "100 g", price: 110, stock: 30 }, { label: "250 g", price: 240, stock: 24 }, { label: "500 g", price: 440, stock: 15 }],
  },
  {
    name: "Roasted Rasam Powder", slug: "roasted-rasam-powder", categorySlug: "rasam-powder",
    description: "Peppery, bright rasam powder with freshly roasted coriander, cumin and black pepper.",
    image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=1000&q=85",
    ingredients: ["Coriander", "Black pepper", "Cumin", "Red chilli", "Turmeric"], allergens: [],
    shelfLife: "6 months", storage: "Keep sealed away from moisture.", featured: true,
    variants: [{ label: "100 g", price: 120, stock: 22 }, { label: "250 g", price: 265, stock: 18 }],
  },
  {
    name: "Sunday Chicken Masala", slug: "sunday-chicken-masala", categorySlug: "chicken-masala",
    description: "A warming, aromatic blend for slow-cooked curries and special Sunday lunches.",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85",
    ingredients: ["Coriander", "Fennel", "Black pepper", "Cinnamon", "Cloves"], allergens: [],
    shelfLife: "6 months", storage: "Store in an airtight container.", featured: true,
    variants: [{ label: "100 g", price: 130, stock: 17 }, { label: "250 g", price: 290, stock: 12 }],
  },
  {
    name: "Festival Coconut Laddoos", slug: "festival-coconut-laddoos", categorySlug: "homemade-laddoos",
    description: "Soft, hand-rolled coconut laddoos prepared in small batches for sharing.",
    image: "https://images.unsplash.com/photo-1605197161470-5d6e5b77f6a7?auto=format&fit=crop&w=1000&q=85",
    ingredients: ["Coconut", "Jaggery", "Cardamom"], allergens: [],
    shelfLife: "7 days", storage: "Refrigerate and enjoy fresh.", featured: true,
    variants: [{ label: "6 pieces", price: 240, stock: 10 }, { label: "12 pieces", price: 450, stock: 8 }],
  },
  {
    name: "Homestyle Biryani Masala", slug: "homestyle-biryani-masala", categorySlug: "biryani-masala",
    description: "A fragrant whole-spice blend that brings warmth and depth to your favourite biryani.",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85",
    ingredients: ["Coriander", "Cumin", "Cardamom", "Cinnamon", "Cloves"], allergens: [],
    shelfLife: "6 months", storage: "Store airtight in a cool, dry place.", featured: false,
    variants: [{ label: "100 g", price: 145, stock: 16 }, { label: "250 g", price: 325, stock: 11 }],
  },
  {
    name: "Kitchen Essentials Gift Box", slug: "kitchen-essentials-gift-box", categorySlug: "gift-packs",
    description: "A thoughtful trio of small-batch masalas packed for the home cook you love.",
    image: "https://images.unsplash.com/photo-1603905179139-df8473c7e9a5?auto=format&fit=crop&w=1000&q=85",
    ingredients: ["Assorted spices"], allergens: [],
    shelfLife: "6 months", storage: "Store in a cool, dry place.", featured: false,
    variants: [{ label: "3 × 100 g", price: 399, stock: 9 }],
  },
];

await mongoose.connect(process.env.MONGODB_URI);
for (const [name, slug, description] of categoryData) {
  await Category.updateOne({ slug }, { $setOnInsert: { name, slug, description, active: true } }, { upsert: true });
}
const categories = await Category.find();
const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
for (const sample of sampleProducts) {
  const { categorySlug, ...product } = sample;
  await Product.updateOne(
    { slug: product.slug },
    { $setOnInsert: { ...product, category: categoryBySlug.get(categorySlug)._id, images: [product.image] } },
    { upsert: true },
  );
}
const adminEmail = process.env.ADMIN_EMAIL || "admin@spiceandmasala.in";
const admin = await User.findOne({ email: adminEmail }).select("+passwordHash");
if (!admin) {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error("Set ADMIN_PASSWORD to at least 12 characters before creating the admin account.");
  }
  const newAdmin = new User({ name: "Store Administrator", email: adminEmail, role: "admin" });
  await newAdmin.setPassword(process.env.ADMIN_PASSWORD);
  await newAdmin.save();
}
console.log(`Seeded ${categoryData.length} categories and ${sampleProducts.length} products. Admin: ${adminEmail}`);
await mongoose.disconnect();
