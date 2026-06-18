import { NextResponse } from "next/server";
import { ValidationError } from "./validation";

/**
 * Standardized API error handler to prevent internal stack traces from leaking
 * to the client. It catches generic errors and formats them into a safe JSON response.
 */
export function handleApiError(error: unknown) {
  console.error("[API Error]:", error); // Log full error internally for audit/debugging

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.errors,
      },
      { status: 400 }
    );
  }

  // Handle specific known error types here (e.g. Prisma known errors)
  // if (error instanceof Prisma.PrismaClientKnownRequestError) { ... }

  // Fallback for unexpected internal errors (masks stack trace)
  return NextResponse.json(
    {
      error: "Internal Server Error",
      message: "An unexpected error occurred. Please try again later.",
      // In a real application, you might include a request ID here for trace matching
    },
    { status: 500 }
  );
}

/**
 * Higher-order function to wrap Next.js API route handlers with error catching.
 */
export function withErrorHandler(
  handler: (req: Request, ...args: any[]) => Promise<Response> | Response
) {
  return async (req: Request, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
