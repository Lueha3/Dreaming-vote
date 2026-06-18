import { z } from "zod";

/**
 * A generic API input validation wrapper.
 * Validates the input against a Zod schema and throws a structured error if it fails,
 * which can be caught by the error handler to prevent internal leakages.
 */
export async function validateRequest<T>(
  schema: z.Schema<T>,
  data: unknown
): Promise<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map((e: z.ZodIssue) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      // Throw a custom error that our error handler can recognize as a validation error
      // instead of a 500 internal server error.
      throw new ValidationError("Invalid input data", formattedErrors);
    }
    throw error;
  }
}

export class ValidationError extends Error {
  public errors: { path: string; message: string }[];

  constructor(message: string, errors: { path: string; message: string }[]) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Examples of common schemas that can be reused across the application
 * to defend against basic injection and ensure data integrity.
 */
export const commonSchemas = {
  // 이 앱의 PK는 Prisma @default(cuid()) — 'c' + base36 24자(=25자). uuid 아님!
  // (uuid 스키마를 쓰면 정상 ID를 전부 거부하게 됨)
  id: z.string().regex(/^c[a-z0-9]{20,}$/i, "Invalid ID format"),

  // Basic pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
};
