export function generateGUID(webCrypto = true): string {
  const useWebCrypto =
    webCrypto && 'crypto' in window && 'getRandomValues' in crypto;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-member-access
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => {
    const randomValue = useWebCrypto
      ? crypto.getRandomValues(new Uint8Array(1))[0]
      : Math.floor(256 * Math.random());

    return (c ^ ((randomValue ?? 0) & (15 >> (c / 4)))).toString(16);
  });
}
