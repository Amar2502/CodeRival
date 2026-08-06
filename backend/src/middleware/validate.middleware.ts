import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

function hasRequestWrapper(schema: any): boolean {
  if (!schema) return false;
  if (schema._def?.shape) {
    const shape = typeof schema._def.shape === "function" ? schema._def.shape() : schema._def.shape;
    return "body" in shape || "params" in shape || "query" in shape;
  }
  if (schema.shape) {
    const shape = typeof schema.shape === "function" ? schema.shape() : schema.shape;
    return "body" in shape || "params" in shape || "query" in shape;
  }
  if (schema._def?.schema) {
    return hasRequestWrapper(schema._def.schema);
  }
  return false;
}

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const isStructured = hasRequestWrapper(schema);
    const targetData = isStructured
      ? {
          body: req.body,
          params: req.params,
          query: req.query,
        }
      : req.body;

    const result = schema.safeParse(targetData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues.map((issue: any) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (isStructured && typeof result.data === "object" && result.data !== null) {
      const data = result.data as Record<string, any>;
      if ("body" in data && data.body !== undefined) req.body = data.body;
      if ("params" in data && data.params !== undefined) {
        try {
          req.params = data.params;
        } catch {
          Object.defineProperty(req, "params", {
            value: data.params,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
      if ("query" in data && data.query !== undefined) {
        try {
          req.query = data.query;
        } catch {
          Object.defineProperty(req, "query", {
            value: data.query,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
    } else {
      req.body = result.data;
    }

    next();
  };