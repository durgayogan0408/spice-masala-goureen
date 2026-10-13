import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getToken, request } from "./api";

export interface Account {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "admin";
}

interface AuthValue {
  user: Account | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Account>;
  register: (name: string, email: string, phone: string, password: string) => Promise<Account>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    request<{ user: Account }>("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => localStorage.removeItem("spice-token"))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    async signIn(email, password) {
      const result = await request<{ token: string; user: Account }>("/auth/login", {
        method: "POST", body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("spice-token", result.token);
      setUser(result.user);
      return result.user;
    },
    async register(name, email, phone, password) {
      const result = await request<{ token: string; user: Account }>("/auth/register", {
        method: "POST", body: JSON.stringify({ name, email, phone, password }),
      });
      localStorage.setItem("spice-token", result.token);
      setUser(result.user);
      return result.user;
    },
    signOut() {
      localStorage.removeItem("spice-token");
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
