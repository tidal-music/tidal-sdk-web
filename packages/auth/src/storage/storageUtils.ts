// Heavily inspired by examples from MDN
// https://github.com/mdn/dom-examples/tree/main/web-crypto

const getKeyMaterial = (password: string) => {
  const enc = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );
};

const getWrappingKey = (keyMaterial: CryptoKey, salt: BufferSource) => {
  return globalThis.crypto.subtle.deriveKey(
    {
      hash: 'SHA-256',
      iterations: 100000,
      name: 'PBKDF2',
      salt: salt,
    },
    keyMaterial,
    { length: 256, name: 'AES-KW' },
    true,
    ['wrapKey', 'unwrapKey'],
  );
};

const getUnwrappingKey = async (salt: ArrayBuffer, password: string) => {
  const keyMaterial = await getKeyMaterial(password);
  return getWrappingKey(keyMaterial, salt);
};

export const encodeCredentials = (credentials: string) => {
  const textEnc = new TextEncoder();
  return textEnc.encode(credentials);
};

export const decodeCredentials = (credentials: ArrayBuffer) => {
  const textEnc = new TextDecoder();
  return textEnc.decode(credentials);
};

export const wrapCryptoKey = async ({
  keyToWrap,
  password,
  salt,
}: {
  keyToWrap: CryptoKey;
  password: string;
  salt: BufferSource;
}) => {
  const keyMaterial = await getKeyMaterial(password);
  const wrappingKey = await getWrappingKey(keyMaterial, salt);

  return globalThis.crypto.subtle.wrapKey(
    'raw',
    keyToWrap,
    wrappingKey,
    'AES-KW',
  );
};

export const unwrapCryptoKey = async ({
  password,
  salt,
  wrappedKeyBuffer,
}: {
  password: string;
  salt: ArrayBuffer;
  wrappedKeyBuffer: ArrayBuffer;
}) => {
  const unwrappingKey = await getUnwrappingKey(salt, password);
  return globalThis.crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBuffer,
    unwrappingKey,
    'AES-KW',
    'AES-CTR',
    true,
    ['encrypt', 'decrypt'],
  );
};

export const encryptCredentials = ({
  content,
  counter,
  key,
}: {
  content: ArrayBuffer;
  counter: BufferSource;
  key: CryptoKey;
}) => {
  return globalThis.crypto.subtle.encrypt(
    { counter, length: 64, name: 'AES-CTR' },
    key,
    content,
  );
};

export const decryptCredentials = ({
  counter,
  encryptedCredentials,
  key,
}: {
  counter: BufferSource;
  encryptedCredentials: ArrayBuffer;
  key: CryptoKey;
}) => {
  return globalThis.crypto.subtle.decrypt(
    { counter, length: 64, name: 'AES-CTR' },
    key,
    encryptedCredentials,
  );
};

export const getEncryptionKey = () => {
  return globalThis.crypto.subtle.generateKey(
    {
      length: 256,
      name: 'AES-CTR',
    },
    true,
    ['encrypt', 'decrypt'],
  );
};
