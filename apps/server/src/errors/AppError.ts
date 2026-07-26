export class AppError extends Error {
  statusCode: number;
  code: string;
  isAppError = true;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;

    // Fix for Error subclass prototype issues
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Narrows an `unknown` caught value to AppError.
 * Duck-typed on the `isAppError` flag rather than `instanceof`, so errors that
 * cross bundle/realm boundaries are still recognised.
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { isAppError?: unknown }).isAppError === true
  );
}

