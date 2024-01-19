import { TidalError } from '@tidal-music/common';

import { authErrorCodeMap } from '../errors';
import type { UserCredentials } from '../types';

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

export const loadCredentials = async (credentialsStorageKey: string) => {
  const { counter, encryptedCredentials, salt, wrappedKey } = getStorageItems(
    credentialsStorageKey,
  );

  if (encryptedCredentials && counter && wrappedKey && salt) {
    try {
      const secretKey = await unwrapCryptoKey({
        password: credentialsStorageKey,
        salt,
        wrappedKeyBuffer: wrappedKey,
      });
      const credentials = await decryptCredentials({
        counter,
        encryptedCredentials,
        key: secretKey,
      });
      return JSON.parse(decodeCredentials(credentials)) as UserCredentials;
    } catch (error) {
      throw new TidalError(authErrorCodeMap.storageError);
    }
  } else {
    return handleNewCryptoKey({
      password: credentialsStorageKey,
      storageKey: credentialsStorageKey,
    });
  }
};

export const saveCredentialsToStorage = async (
  credentials: Partial<UserCredentials> & { credentialsStorageKey: string },
) => {
  const currentCredentials = await loadCredentials(
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
      salt,
      wrappedKeyBuffer: wrappedKey,
    });

    const encryptedCredentials = await encryptCredentials({
      content: encodeCredentials(JSON.stringify(mergedCredentials)),
      counter,
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

export const deleteCredentials = (credentialsStorageKey: string) => {
  database.removeItem(`${credentialsStorageKey}Data`);
  database.removeItem(`${credentialsStorageKey}Counter`);
  database.removeItem(`${credentialsStorageKey}Salt`);
  database.removeItem(`${credentialsStorageKey}Key`);
};
