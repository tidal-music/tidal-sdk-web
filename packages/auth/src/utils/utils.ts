/**
 * Generates a SHA256 hash of the content.
 */
export const sha256 = async (message: string) => {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgUint8); // hash the message
  const bytes = new Uint8Array(hashBuffer);
  const len = bytes.byteLength;
  let binary = '';
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return globalThis.btoa(binary);
};

/**
 * Converts a Base64 value to "Base64 URL compatible" value.
 *
 * @see https://tools.ietf.org/html/draft-ietf-oauth-spop-15#appendix-A
 */
export const base64URLEncode = (value: string) =>
  value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

/**
 * Generates a code challenge value which is used to verify the authorization request.
 *
 * @see https://tools.ietf.org/html/draft-ietf-oauth-spop-15#section-4.1
 */
export const generateOAuthCodeChallenge = () => {
  const array = new Uint8Array(100);
  const string = base64URLEncode(
    btoa(globalThis.crypto.getRandomValues(array).toString()),
  );

  return string.slice(0, 128);
};
