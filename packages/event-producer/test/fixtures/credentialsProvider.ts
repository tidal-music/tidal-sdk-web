import type { Credentials, CredentialsProvider } from '@tidal-music/common';

export const credentials1: Credentials = {
  clientId: 'fakeClientId',
  requestedScopes: [],
  token: 'fakeToken',
};
export const credentialsProvider1: CredentialsProvider = {
  bus: vi.fn(),
  getCredentials: async () => credentials1,
};
