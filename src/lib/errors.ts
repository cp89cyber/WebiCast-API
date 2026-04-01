export interface SerializableErrorDetails {
  details?: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: string | undefined;

  public constructor(code: string, statusCode: number, message: string, options: SerializableErrorDetails = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details;
  }
}
