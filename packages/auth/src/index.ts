/* c8 ignore start index file */
import type { CredentialsProvider } from '@tidal-music/common';

import { bus, getCredentials } from './auth/auth.js';

export {
  finalizeDeviceLogin,
  finalizeLogin,
  init,
  initializeDeviceLogin,
  initializeLogin,
  logout,
  setCredentials,
} from './auth/auth.js';

export { authErrorCodeMap } from './errors/index.js';

export type {
  AuthErrorCodes,
  AuthErrorNames,
  AuthenticationError,
  TokenResponseError,
  UnexpectedError,
} from './errors/index.js';

export type * from './types.js';

export const credentialsProvider: CredentialsProvider = {
  bus,
  getCredentials,
};
