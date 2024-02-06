import { authErrorCodeMap } from '../errors';
import * as fixtures from '../fixtures';

import { database as _database } from './database';
import {
  deleteCredentials,
  loadCredentials,
  saveCredentialsToStorage,
} from './storage';
import * as _storageUtils from './storageUtils';

const database = vi.mocked(_database);
const storageUtils = vi.mocked(_storageUtils);
vi.mock('./storageUtils');

vi.mock('./database', () => ({
  database: {
    getItem: vi.fn(),
    ready: vi.fn().mockResolvedValue(true),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe.sequential('storage', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn(),
    });
  });
  describe('loadCredentials', () => {
    it('loads credentials from local storage', async () => {
      database.getItem.mockReturnValue(new Uint8Array(16));
      storageUtils.decodeCredentials.mockReturnValueOnce(
        JSON.stringify(fixtures.storage),
      );

      const result = await loadCredentials('key');
      expect(result?.clientId).toEqual('CLIENT_ID');
      expect(result?.accessToken?.token).toEqual('ACCESS_TOKEN');
    });

    it('loads broken credentials', async () => {
      database.getItem.mockReturnValue(new Uint8Array(16));
      storageUtils.decodeCredentials.mockReturnValueOnce('{{{');

      await expect(async () => await loadCredentials('key')).rejects.toThrow(
        authErrorCodeMap.storageError,
      );
    });

    it('setup new encrypted storage', async () => {
      database.getItem.mockReturnValue(undefined);

      await loadCredentials('key');
      expect(storageUtils.getEncryptionKey).toHaveBeenCalled();
      expect(storageUtils.wrapCryptoKey).toHaveBeenCalled();
    });

    it('fails setting up new encrypted storage', async () => {
      database.getItem.mockReturnValue(undefined);
      database.setItem.mockImplementation(() => {
        throw new Error('Storage is not available');
      });

      await expect(async () => await loadCredentials('key')).rejects.toThrow(
        authErrorCodeMap.storageError,
      );
    });
  });

  describe('persistCredentials', () => {
    it('persists given credentials', async () => {
      database.getItem.mockReturnValue(new Uint8Array(16));
      storageUtils.decodeCredentials.mockReturnValueOnce('{}');

      await saveCredentialsToStorage({
        clientId: 'foobar',
        credentialsStorageKey: 'key',
      });

      expect(storageUtils.encodeCredentials).toBeCalledWith(
        JSON.stringify({
          clientId: 'foobar',
          credentialsStorageKey: 'key',
        }),
      );
      expect(storageUtils.encryptCredentials).toHaveBeenCalled();
      expect(storageUtils.unwrapCryptoKey).toHaveBeenCalled();
      expect(database.setItem).toHaveBeenCalledWith('keyData', undefined);
    });

    it('updates persisted credentials', async () => {
      database.getItem.mockReturnValue(new Uint8Array(16));
      storageUtils.decodeCredentials.mockReturnValueOnce(
        JSON.stringify(fixtures.storage),
      );
      const storageSpy = vi.spyOn(storageUtils, 'encodeCredentials');

      await saveCredentialsToStorage({
        clientId: 'foobar',
        credentialsStorageKey: 'key',
      });

      expect(storageSpy).toBeCalledWith(
        JSON.stringify({
          ...fixtures.storage,
          clientId: 'foobar',
          credentialsStorageKey: 'key',
        }),
      );

      expect(storageUtils.encryptCredentials).toHaveBeenCalled();
      expect(storageUtils.unwrapCryptoKey).toHaveBeenCalled();
      expect(database.setItem).toHaveBeenCalledWith('keyData', undefined);
    });

    it('throws an error when storage is e.g. full', async () => {
      database.getItem.mockReturnValue(new Uint8Array(16));
      storageUtils.decodeCredentials.mockReturnValueOnce(
        JSON.stringify(fixtures.storage),
      );
      database.setItem.mockImplementation(() => {
        throw new Error('Storage is full');
      });

      await expect(
        async () =>
          await saveCredentialsToStorage({
            clientId: 'foobar',
            credentialsStorageKey: 'key',
          }),
      ).rejects.toThrowError(authErrorCodeMap.storageError);
    });

    it('throws an error when no crypto keys, etc are stored', async () => {
      database.getItem.mockReturnValue(undefined);

      await expect(
        async () =>
          await saveCredentialsToStorage({
            clientId: 'foobar',
            credentialsStorageKey: 'key',
          }),
      ).rejects.toThrowError(authErrorCodeMap.storageError);
    });
  });

  describe('deleteCredentials', () => {
    it('deletes all credentials with given identifier', async () => {
      deleteCredentials('myKey');

      expect(database.removeItem).toHaveBeenCalledTimes(4);
      expect(database.removeItem).toBeCalledWith('myKeySalt');
      expect(database.removeItem).toBeCalledWith('myKeyData');
      expect(database.removeItem).toBeCalledWith('myKeyKey');
      expect(database.removeItem).toBeCalledWith('myKeyCounter');
    });
  });
});
