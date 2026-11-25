import { Router } from "express";
import { z } from "zod";
import { signToken, requireAuth } from "../../platform/auth.js";
import { NotFound } from "../../platform/errors.js";
import type { UserRepo } from "./ports.js";
import { toDTO } from "./ports.js";

export function identityRoutes(repo: UserRepo): Router {
  const r = Router();
  r.get("/users", (_req, res) => res.json(repo.all().map(toDTO)));
  r.post("/auth/login", (req, res) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const user = repo.byId(userId);
    if (!user) throw new NotFound("User");
    res.json({ token: signToken({ userId: user.id, role: user.role }), user: toDTO(user) });
  });
  r.get("/me", requireAuth, (req, res) => {
    const user = repo.byId(req.principal!.userId);
    if (!user) throw new NotFound("User");
    res.json(toDTO(user));
  });
  return r;
}
