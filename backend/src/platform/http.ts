import express, { type Express, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "./errors.js";

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  return app;
}

// Express 4 does not forward rejected promises from async handlers to the error
// middleware; wrap async handlers so their rejections reach the error mapper.
export const asyncHandler = (fn: RequestHandler): RequestHandler => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function mountErrorMapper(app: Express): void {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainError) return res.status(err.httpStatus).json({ code: err.code, message: err.message });
    if (err instanceof ZodError) return res.status(400).json({ code: "VALIDATION", message: err.issues.map((i) => i.message).join("; ") });
    console.error(err);
    res.status(500).json({ code: "VALIDATION", message: "Unexpected error." });
  });
}
