/**
 * Generates a Web Worker from a function.
 *
 * @param {Function} method
 * @returns {string} Object URL to a web worker
 */
export function workerize(method: Function): string {
  const functionBody = `(${method.toString()})();`;
  const workerBlob = new Blob([functionBody], { type: 'text/javascript' });

  return URL.createObjectURL(workerBlob);
}
