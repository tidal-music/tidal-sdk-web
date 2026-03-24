import { TidalError } from '@tidal-music/common';

import { authErrorCodeMap } from '../errors';
import type { StorageAdapter, UserCredentials } from '../types';

import { database } from './database';
import {
  decodeCredentials,
  decryptCredentials,
  encodeCredentials,
  encryptCredentials,
  getEncryptionKey,
  unwrapCryptoKey,
  wrapCryptoKey,
} from './storageUtils';

let customStorage: StorageAdapter | undefined;

export const setStorageAdapter = (adapter: StorageAdapter) => {
  customStorage = adapter;
};

// ── Encrypted-localStorage path (default, web) ──

const handleNewCryptoKey = async ({
  password,
  storageKey,
}: {
  password: string;
  storageKey: string;
}) => {
  const key = await getEncryptionKey();
  const counter = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const wrappedKey = await wrapCryptoKey({ keyToWrap: key, password, salt });

  try {
    database.setItem(`${storageKey}Counter`, counter);
    database.setItem(`${storageKey}Salt`, salt);
    database.setItem(`${storageKey}Key`, wrappedKey);
  } catch (error) {
    throw new TidalError(authErrorCodeMap.storageError, {
      cause: error,
    });
  }
};

const getStorageItems = (credentialsStorageKey: string) => {
  return {
    counter: database.getItem<Uint8Array>(`${credentialsStorageKey}Counter`),
    encryptedCredentials: database.getItem<Uint8Array>(
      `${credentialsStorageKey}Data`,
    ),
    salt: database.getItem<Uint8Array>(`${credentialsStorageKey}Salt`),
    wrappedKey: database.getItem<Uint8Array>(`${credentialsStorageKey}Key`),
  };
};

const loadCredentialsEncrypted = async (credentialsStorageKey: string) => {
  const { counter, encryptedCredentials, salt, wrappedKey } = getStorageItems(
    credentialsStorageKey,
  );

  if (encryptedCredentials && counter && wrappedKey && salt) {
    try {
      const secretKey = await unwrapCryptoKey({
        password: credentialsStorageKey,
        salt: salt as BufferSource,
        wrappedKeyBuffer: wrappedKey as BufferSource,
      });
      const credentials = await decryptCredentials({
        counter: counter as BufferSource,
        encryptedCredentials: encryptedCredentials as BufferSource,
        key: secretKey,
      });
      return JSON.parse(decodeCredentials(credentials)) as UserCredentials;
    } catch {
      throw new TidalError(authErrorCodeMap.storageError);
    }
  } else {
    return handleNewCryptoKey({
      password: credentialsStorageKey,
      storageKey: credentialsStorageKey,
    });
  }
};

const saveCredentialsEncrypted = async (
  credentials: Partial<UserCredentials> & { credentialsStorageKey: string },
) => {
  const currentCredentials = await loadCredentialsEncrypted(
    credentials.credentialsStorageKey,
  );
  const mergedCredentials = { ...currentCredentials, ...credentials };

  const { counter, salt, wrappedKey } = getStorageItems(
    credentials.credentialsStorageKey,
  );

  if (!wrappedKey || !counter || !salt) {
    throw new TidalError(authErrorCodeMap.storageError);
  }
  try {
    const secretKey = await unwrapCryptoKey({
      password: mergedCredentials.credentialsStorageKey,
      salt: salt as BufferSource,
      wrappedKeyBuffer: wrappedKey as BufferSource,
    });

    const encryptedCredentials = await encryptCredentials({
      content: encodeCredentials(JSON.stringify(mergedCredentials)),
      counter: counter as BufferSource,
      key: secretKey,
    });

    database.setItem(
      `${mergedCredentials.credentialsStorageKey}Data`,
      encryptedCredentials,
    );
  } catch (error) {
    throw new TidalError(authErrorCodeMap.storageError, {
      cause: error,
    });
  }
};

const deleteCredentialsEncrypted = (credentialsStorageKey: string) => {
  database.removeItem(`${credentialsStorageKey}Data`);
  database.removeItem(`${credentialsStorageKey}Counter`);
  database.removeItem(`${credentialsStorageKey}Salt`);
  database.removeItem(`${credentialsStorageKey}Key`);
};

// ── Public API (delegates to custom adapter or encrypted-localStorage) ──

export const loadCredentials = async (
  credentialsStorageKey: string,
): Promise<UserCredentials | undefined> => {
  if (customStorage) {
    const json = await customStorage.load(credentialsStorageKey);
    return json ? (JSON.parse(json) as UserCredentials) : undefined;
  }
  return (await loadCredentialsEncrypted(credentialsStorageKey)) ?? undefined;
};

export const saveCredentialsToStorage = async (
  credentials: Partial<UserCredentials> & { credentialsStorageKey: string },
) => {
  if (customStorage) {
    const current = await loadCredentials(credentials.credentialsStorageKey);
    const merged = { ...current, ...credentials };
    await customStorage.save(
      credentials.credentialsStorageKey,
      JSON.stringify(merged),
    );
    return;
  }
  return saveCredentialsEncrypted(credentials);
};

export const deleteCredentials = (credentialsStorageKey: string) => {
  if (customStorage) {
    void customStorage.remove(credentialsStorageKey);
    return;
  }
  deleteCredentialsEncrypted(credentialsStorageKey);
};
