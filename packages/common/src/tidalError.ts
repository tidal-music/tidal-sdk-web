// Inspired by: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types

// Inlined definition of DOM interface to avoid bug in type-extraction package
export type ErrorOptions = {
  cause?: unknown;
};
/**
 * Generic TIDAL error
 *
 * @extends Error
 */
export class TidalError extends Error {
  errorCode: string;

  /**
   * Constructor.
   *
   * @param errorCode Defined by the user of this error, but must match the regexp: [0-9a-z]{1,5}
   */
  constructor(errorCode: string, options?: ErrorOptions) {
    super(errorCode, options);

    // Set the prototype explicitly.
    // As recommended here: https://github.com/microsoft/TypeScript/wiki/FAQ#why-doesnt-extending-built-ins-like-error-array-and-map-work
    Object.setPrototypeOf(this, TidalError.prototype);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TidalError);
    }

    this.name = 'TidalError';
    this.errorCode = errorCode;
  }
}
