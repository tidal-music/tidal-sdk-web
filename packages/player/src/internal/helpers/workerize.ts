/**
 * Generates a Web Worker from a function.
 *
 * @param {Function} method
 * @returns {string} Object URL to a web worker
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function workerize(method: Function): string {
  const functionBody = `(${method.toString()})();`;
  const workerBlob = new Blob([functionBody], { type: 'text/javascript' });

  return URL.createObjectURL(workerBlob);
}
