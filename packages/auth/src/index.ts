/* c8 ignore start index file */
import type { CredentialsProvider } from '@tidal-music/common';

import { bus, getCredentials } from './auth/auth';

export {
  finalizeDeviceLogin,
  finalizeLogin,
  init,
  initializeDeviceLogin,
  initializeLogin,
  logout,
  setCredentials,
} from './auth/auth';

export { authErrorCodeMap } from './errors';

export type {
  AuthErrorCodes,
  AuthErrorNames,
  AuthenticationError,
  TokenResponseError,
  UnexpectedError,
} from './errors';

export type * from './types';

export const credentialsProvider: CredentialsProvider = {
  bus,
  getCredentials,
};
