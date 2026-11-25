import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { Role } from "@ccu/shared";
import { config } from "./config.js";
import { DomainError } from "./errors.js";

export interface Principal { userId: string; role: Role; }
declare global { namespace Express { interface Request { principal?: Principal; } } }

export function signToken(p: Principal): string {
  return jwt.sign(p, config.jwtSecret, { expiresIn: "8h" });
}
export function verifyToken(token: string): Principal {
  return jwt.verify(token, config.jwtSecret) as Principal;
}
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return next(new DomainError("UNAUTHENTICATED", 401, "Missing token."));
  try { req.principal = verifyToken(header.slice(7)); next(); }
  catch { next(new DomainError("UNAUTHENTICATED", 401, "Invalid token.")); }
}
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.principal) return next(new DomainError("UNAUTHENTICATED", 401, "Not authenticated."));
    if (!roles.includes(req.principal.role)) return next(new DomainError("FORBIDDEN", 403, "Wrong role."));
    next();
  };
}
