import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { UserDTO } from "@ccu/shared";
import { api, setToken } from "../shared/api.js";

interface AuthState { user: UserDTO | null; login: (userId: string) => Promise<void>; logout: () => void; }
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const value = useMemo<AuthState>(() => ({
    user,
    login: async (userId) => {
      const res = await api<{ token: string; user: UserDTO }>("/auth/login", { method: "POST", body: JSON.stringify({ userId }) });
      setToken(res.token); setUser(res.user);
    },
    logout: () => { setToken(null); setUser(null); },
  }), [user]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error("useAuth outside provider"); return c; };
