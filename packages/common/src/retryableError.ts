import { type ErrorOptions, TidalError } from './tidalError';

/**
 * This is a pretty "rough" and "unprecise" error that indicates to the user of the module that the operation failed,
 * but it might succeed if the user retries it. It is intended to be raised in situations where the user of the
 * module cannot do that much even if they got more precise information, for example server errors. However,
 * the error code should supply relevant information for debugging.
 *
 * @extends TidalError
 */
export class RetryableError extends TidalError {
  constructor(errorCode: string, options?: ErrorOptions) {
    super(errorCode, options);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, RetryableError.prototype);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RetryableError);
    }

    this.name = 'RetryableError';
  }
}
