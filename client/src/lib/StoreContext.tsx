import { createContext, useContext, useMemo, useState } from "react";
import type { Product } from "./api";

export interface CartLine {
  product: Product;
  variantId: string;
  quantity: number;
}

interface StoreValue {
  cart: CartLine[];
  addToCart: (product: Product, variantId: string) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  clearCart: () => void;
  count: number;
}

const StoreContext = createContext<StoreValue | null>(null);

function readCart(): CartLine[] {
  try {
    const saved = localStorage.getItem("spice-cart");
    return saved ? JSON.parse(saved) as CartLine[] : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(readCart);
  const persist = (next: CartLine[]) => {
    setCart(next);
    localStorage.setItem("spice-cart", JSON.stringify(next));
  };
  const value = useMemo<StoreValue>(() => ({
    cart,
    addToCart(product, variantId) {
      const existing = cart.find((line) => line.product._id === product._id && line.variantId === variantId);
      persist(existing
        ? cart.map((line) => line === existing ? { ...line, quantity: Math.min(50, line.quantity + 1) } : line)
        : [...cart, { product, variantId, quantity: 1 }]);
    },
    setQuantity(productId, variantId, quantity) {
      if (quantity <= 0) return persist(cart.filter((line) => line.product._id !== productId || line.variantId !== variantId));
      persist(cart.map((line) => line.product._id === productId && line.variantId === variantId
        ? { ...line, quantity: Math.min(50, quantity) }
        : line));
    },
    removeFromCart(productId, variantId) {
      persist(cart.filter((line) => line.product._id !== productId || line.variantId !== variantId));
    },
    clearCart() { persist([]); },
    count: cart.reduce((total, line) => total + line.quantity, 0),
  }), [cart]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider.");
  return context;
}
