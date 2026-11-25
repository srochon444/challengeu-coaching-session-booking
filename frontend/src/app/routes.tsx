import type { ReactNode } from "react";
import { useMe } from "../features/auth/useMe.js";
import type { Role } from "@ccu/shared";
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const me = useMe();
  if (!me || me.role !== role) return null;
  return <>{children}</>;
}
