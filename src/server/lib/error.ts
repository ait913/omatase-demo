import type { Context } from "hono";
import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN_NOT_HOST"
  | "FORBIDDEN_NOT_MEMBER"
  | "EVENT_NOT_FOUND"
  | "SCHEDULE_NOT_FOUND"
  | "FEATURE_NOT_FOUND"
  | "ALREADY_MEMBER"
  | "INVALID_SCHEDULE_TIME"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 500,
    public code: ErrorCode,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
  }
}

export function errorResponse(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message, details: err.details }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ code: "BAD_REQUEST", message: "bad request", details: err.issues }, 400);
  }
  console.error("[unhandled]", err);
  return c.json({ code: "INTERNAL", message: "internal error" }, 500);
}
