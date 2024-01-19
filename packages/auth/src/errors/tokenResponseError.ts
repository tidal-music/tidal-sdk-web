import { type ErrorOptions, TidalError } from '@tidal-music/common';

/**
 * Used to indicate that an access token could not be retrieved.
 *
 * @extends TidalError
 */
export class TokenResponseError extends TidalError {
  constructor(errorCode: string, options?: ErrorOptions) {
    super(errorCode, options);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TokenResponseError.prototype);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TokenResponseError);
    }

    this.name = 'TokenResponseError';
  }
}
