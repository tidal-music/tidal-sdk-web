import { type ErrorOptions, TidalError } from './tidalError';

/**
 * Raised whenever an error occurs as the result of bad network conditions.
 *
 * @extends TidalError
 */
export class NetworkError extends TidalError {
  constructor(errorCode: string, options?: ErrorOptions) {
    super(errorCode, options);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, NetworkError.prototype);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }

    this.name = 'NetworkError';
  }
}
