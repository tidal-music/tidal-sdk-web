export { AuthenticationError } from './authenticationError';
export { TokenResponseError } from './tokenResponseError';
export { UnexpectedError } from './unexpectedError';

export const authErrorCodeMap = {
  authenticationError: 'A0000',
  illegalArgumentError: 'A0007',
  initError: 'A0001',
  networkError: 'A0002',
  retryableError: 'A0003',
  storageError: 'A0004',
  tokenResponseError: 'A0005',
  unexpectedError: 'A0006',
} as const;

export type AuthErrorNames = keyof typeof authErrorCodeMap;
export type AuthErrorCodes = (typeof authErrorCodeMap)[AuthErrorNames];
