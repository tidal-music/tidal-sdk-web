import type { Credentials, CredentialsProvider } from '@tidal-music/common';

const noop = () => {};

export const credentials1: Credentials = {
  clientId: 'fakeClientId',
  requestedScopes: [],
  token: 'fakeToken',
};
export const credentialsProvider1: CredentialsProvider = {
  bus: noop,
  getCredentials: async () => credentials1,
};
