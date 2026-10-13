import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/index.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const credentials = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});
const registerInput = credentials.extend({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().default(""),
});

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, addresses: user.addresses };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
}

router.post("/register", async (req, res, next) => {
  try {
    const input = registerInput.parse(req.body);
    const user = new User({ name: input.name, email: input.email.toLowerCase(), phone: input.phone });
    await user.setPassword(input.password);
    await user.save();
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = credentials.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
    if (!user || !user.active || !(await user.checkPassword(input.password))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

router.get("/me", authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;
