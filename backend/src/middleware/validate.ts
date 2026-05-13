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
    (req as Record<string, unknown>)[target] = result.data;
    next();
  };
