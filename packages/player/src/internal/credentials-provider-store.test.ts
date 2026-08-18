import type { CredentialsProvider } from '@tidal-music/common';
import { expect } from 'chai';

import { credentialsProviderStore, isAuthorizedWithUser } from './index.js';

/**
 * Shaped like the errors `@tidal-music/auth` rejects with, which carry the code
 * on `errorCode` rather than encoding it in the class.
 */
const authError = (errorCode: string) =>
  Object.assign(new Error(errorCode), { errorCode });

const rejectingProvider = (error: Error): CredentialsProvider => ({
  bus: () => {},
  getCredentials: () => Promise.reject(error),
});

/**
 * What `@tidal-music/auth` looks like when it has no credentials to hand out:
 * it was logged out mid request, or was never initialized.
 */
const noCredentialsProvider = () => rejectingProvider(authError('A0001'));

/** A refresh that failed because the client is offline. */
const networkErrorProvider = () => rejectingProvider(authError('A0002'));

const nextAuthEvent = () =>
  new Promise<string>(resolve => {
    credentialsProviderStore.addEventListener(
      'authorized',
      () => resolve('authorized'),
      { once: true },
    );
    credentialsProviderStore.addEventListener(
      'unauthenticated',
      () => resolve('unauthenticated'),
      { once: true },
    );
  });

describe('credentialsProviderStore', () => {
  it('dispatches unauthenticated when the provider has no credentials', async () => {
    const dispatched = nextAuthEvent();

    credentialsProviderStore.credentialsProvider = noCredentialsProvider();

    expect(await dispatched).to.equal('unauthenticated');
  });
});

describe('isAuthorizedWithUser', () => {
  it('is false when the provider has no credentials', async () => {
    credentialsProviderStore.credentialsProvider = noCredentialsProvider();

    expect(await isAuthorizedWithUser()).to.equal(false);
  });

  it('rejects instead of reporting an unauthorized user on a network error', async () => {
    credentialsProviderStore.credentialsProvider = networkErrorProvider();

    let error: unknown;
    try {
      await isAuthorizedWithUser();
    } catch (e) {
      error = e;
    }

    expect(error).to.have.property('errorCode', 'A0002');
  });
});
