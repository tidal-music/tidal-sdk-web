import { type ErrorOptions, TidalError } from './tidalError';

/**
 * Raised whenever an illegal argument was passed to a function.
 *
 * @extends TidalError
 */
export class IllegalArgumentError extends TidalError {
  constructor(errorCode: string, options?: ErrorOptions) {
    super(errorCode, options);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, IllegalArgumentError.prototype);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IllegalArgumentError);
    }

    this.name = 'IllegalArgumentError';
  }
}
