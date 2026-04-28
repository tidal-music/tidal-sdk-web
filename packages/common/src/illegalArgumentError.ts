import { captureStackTrace } from './captureStackTrace';
import { type ErrorOptions, TidalError } from './tidalError';

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
