import { captureStackTrace } from './captureStackTrace.js';
import { type ErrorOptions, TidalError } from './tidalError.js';

/**
 * Raised whenever an illegal argument was passed to a function.
 *
 * @extends TidalError
 */
export class IllegalArgumentError extends TidalError {
  override name = 'IllegalArgumentError';

  constructor(errorCode: string, options?: ErrorOptions) {
    super(errorCode, options);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, IllegalArgumentError.prototype);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    captureStackTrace(this, IllegalArgumentError);
  }
}
