export function generateGUID(webCrypto = true): string {
  const useWebCrypto =
    webCrypto && 'crypto' in window && 'getRandomValues' in crypto;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (
      c ^
      ((useWebCrypto
        ? crypto.getRandomValues(new Uint8Array(1))[0]
        : Math.floor(256 * Math.random())) &
        (15 >> (c / 4)))
    ).toString(16),
  );
}
