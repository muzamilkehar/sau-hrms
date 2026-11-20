export class AppError extends Error {
  constructor(message: string, public readonly code: string = "APP_ERROR") {
    super(message);
    this.name = "AppError";
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this.") {
    super(message, "FORBIDDEN");
  }
}
export class NotFoundError extends AppError {
  constructor(message = "The record was not found.") {
    super(message, "NOT_FOUND");
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}
export class ValidationError extends AppError {
  constructor(message: string, public readonly fieldErrors: Record<string, string[]> = {}) {
    super(message, "VALIDATION");
  }
}
