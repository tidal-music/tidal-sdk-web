import {
  decodeCredentials,
  decryptCredentials,
  encodeCredentials,
  encryptCredentials,
  getEncryptionKey,
  unwrapCryptoKey,
  wrapCryptoKey,
} from './storageUtils';

describe('storageUtils', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      subtle: {
        decrypt: vi.fn(),
        deriveKey: vi.fn(),
        encrypt: vi.fn(),
        generateKey: vi.fn(),
        importKey: vi.fn(),
        unwrapKey: vi.fn(),
        wrapKey: vi.fn(),
      },
    });
  });
  describe('getEncryptionKey', () => {
    it('generates a crypto key', async () => {
      await getEncryptionKey();

      expect(globalThis.crypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          length: 256,
          name: 'AES-CTR',
        },
        true,
        ['encrypt', 'decrypt'],
      );
    });
  });

  describe('encodeCredentials', () => {
    it('encode text', () => {
      const encoded = encodeCredentials('test');

      expect(encoded).toEqual(new TextEncoder().encode('test'));
    });
  });

  describe('decodeCredentials', () => {
    it('generates key', () => {
      const decoded = decodeCredentials(new Uint8Array(16));

      expect(decoded).toEqual(new TextDecoder().decode(new Uint8Array(16)));
    });
  });

  describe('encryptCredentials', () => {
    it('encrypts given credentials', async () => {
      const { content, counter, key } = {
        content: new Uint8Array(16),
        counter: new Uint8Array(16),
        key: 'KEY' as unknown as CryptoKey,
      };
      await encryptCredentials({ content, counter, key });

      expect(globalThis.crypto.subtle.encrypt).toHaveBeenCalledWith(
        {
          counter,
          length: 64,
          name: 'AES-CTR',
        },
        key,
        content,
      );
    });
  });

  describe('decryptCredentials', () => {
    it('decrypts given credentials', async () => {
      const { counter, encryptedCredentials, key } = {
        counter: new Uint8Array(16),
        encryptedCredentials: new Uint8Array(16),
        key: 'KEY' as unknown as CryptoKey,
      };
      await decryptCredentials({ counter, encryptedCredentials, key });

      expect(globalThis.crypto.subtle.decrypt).toHaveBeenCalledWith(
        {
          counter,
          length: 64,
          name: 'AES-CTR',
        },
        key,
        encryptedCredentials,
      );
    });
  });

  describe('wrapCryptoKey', () => {
    it('wraps given cryptoKey', async () => {
      const { key, password, salt } = {
        key: 'KEY' as unknown as CryptoKey,
        password: 'PASSWORD',
        salt: new Uint8Array(16),
      };
      await wrapCryptoKey({ keyToWrap: key, password, salt });

      expect(globalThis.crypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey'],
      );
      expect(globalThis.crypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          hash: 'SHA-256',
          iterations: 100000,
          name: 'PBKDF2',
          salt: salt,
        },
        undefined,
        { length: 256, name: 'AES-KW' },
        true,
        ['wrapKey', 'unwrapKey'],
      );

      expect(globalThis.crypto.subtle.wrapKey).toHaveBeenCalledWith(
        'raw',
        key,
        undefined,
        'AES-KW',
      );
    });
  });

  describe('unwrapCryptoKey', () => {
    it('unwraps given cryptoKey', async () => {
      const { key, password, salt } = {
        key: new Uint8Array(16),
        password: 'PASSWORD',
        salt: new Uint8Array(16),
      };
      await unwrapCryptoKey({ password, salt, wrappedKeyBuffer: key });

      expect(globalThis.crypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey'],
      );
      expect(globalThis.crypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          hash: 'SHA-256',
          iterations: 100000,
          name: 'PBKDF2',
          salt: salt,
        },
        undefined,
        { length: 256, name: 'AES-KW' },
        true,
        ['wrapKey', 'unwrapKey'],
      );

      expect(globalThis.crypto.subtle.unwrapKey).toHaveBeenCalledWith(
        'raw',
        key,
        undefined,
        'AES-KW',
        'AES-CTR',
        true,
        ['encrypt', 'decrypt'],
      );
    });
  });
});
