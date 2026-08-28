import { Request, Response, NextFunction } from "express";

// Defense-in-depth against NoSQL operator injection: strip any object key that
// starts with "$" or contains "." from request payloads before they can reach a
// Mongo query. Mutates in place (no reassignment of req.query, which is a
// read-only getter on newer Express) and is bounded in depth to avoid abuse.
const MAX_DEPTH = 8;

function scrub(value: unknown, depth: number): void {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) scrub(item, depth + 1);
    return;
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    scrub((value as Record<string, unknown>)[key], depth + 1);
  }
}

export default function sanitizeMongo(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  scrub(req.body, 0);
  scrub(req.query, 0);
  scrub(req.params, 0);
  next();
}
