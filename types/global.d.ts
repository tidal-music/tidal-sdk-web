/**
 * Global type augmentations for V8-specific APIs
 */

interface ErrorConstructor {
  /**
   * V8-specific method to capture stack trace.
   * Available in Node.js and Chromium-based browsers.
   *
   * IMPORTANT: This is optional and only available in V8-based engines.
   * Always check for existence before using: if (Error.captureStackTrace) { ... }
   *
   * @param targetObject - Object to attach stack trace to
   * @param constructorOpt - Optional constructor function to hide from stack trace
   */
  captureStackTrace?(
    targetObject: object,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructorOpt?: new (...args: Array<any>) => any,
  ): void;
}
