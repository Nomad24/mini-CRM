import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiError(status: number, message: string) {
  return new ApiError(status, message);
}

export function badRequest(message: string) {
  return apiError(400, message);
}

export function unauthorized(message = "Unauthorized") {
  return apiError(401, message);
}

export function notFound(message = "Not found") {
  return apiError(404, message);
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonValidationError(error: unknown, fallback = "Invalid request data") {
  return jsonError(400, error instanceof Error ? error.message : fallback);
}

export function jsonServerError(error: unknown, fallback = "Internal server error") {
  return jsonError(500, error instanceof Error ? error.message : fallback);
}

export async function withApiHandler(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.status, error.message);
    }

    return jsonServerError(error);
  }
}
