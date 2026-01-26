/**
 * V8-specific Error.captureStackTrace global augmentation
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface ErrorConstructor {
    /**
     * V8-specific method to capture stack trace.
     * Available in Node.js and Chromium-based browsers.
     * IMPORTANT: This property may not exist in all JavaScript engines.
     * Always check for existence before using.
     */
    captureStackTrace(
      targetObject: object,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructorOpt?: new (...args: Array<any>) => any,
    ): void;
  }
}

/**
 * Safely captures stack trace using V8's Error.captureStackTrace if available.
 *
 * This utility provides a type-safe way to use Error.captureStackTrace
 * without needing to check for its existence at every call site.
 *
 * @param targetObject - Object to attach stack trace to (typically 'this' in an Error constructor)
 * @param constructorOpt - Constructor function to hide from stack trace
 *
 * @example
 * ```typescript
 * class MyError extends Error {
 *   constructor() {
 *     super();
 *     captureStackTrace(this, MyError);
 *   }
 * }
 * ```
 */
export function captureStackTrace(
  targetObject: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructorOpt?: new (...args: Array<any>) => any,
): void {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(targetObject, constructorOpt);
  }
}
