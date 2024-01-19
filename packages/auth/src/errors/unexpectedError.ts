import { type ErrorOptions, TidalError } from '@tidal-music/common';

/**
 * Used to indicate that an access token could not be retrieved.
 *
 * @extends TidalError
 */
export class UnexpectedError extends TidalError {
  constructor(errorCode: string, options?: ErrorOptions) {
    super(errorCode, options);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, UnexpectedError.prototype);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnexpectedError);
    }

    this.name = 'UnexpectedError';
  }
}
