import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export type ValidationTarget = "body" | "query" | "params";

export const validate =
  (schema: ZodSchema, target: ValidationTarget = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        issues: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Replace with coerced/stripped data from Zod
    // Express 5 makes req.query a read-only getter, so use defineProperty
    try {
      Object.defineProperty(req, target, { value: result.data, writable: true, configurable: true });
    } catch {
      (req as unknown as Record<string, unknown>)[target] = result.data;
    }
    next();
  };
