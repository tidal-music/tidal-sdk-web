/* c8 ignore start types file */
import type { Credentials } from '@tidal-music/common';

export type InitArgs = {
  clientId: string;
  clientSecret?: string;
  clientUniqueKey?: string;
  credentialsStorageKey: string;
  scopes?: Array<string>;
  tidalAuthServiceBaseUri?: string;
  tidalLoginServiceBaseUri?: string;
};

export type UserCredentials = {
  accessToken?: Credentials;
  codeChallenge?: string;
  expiresIn?: number;
  previousClientSecret?: string;
  redirectUri?: string;
  refreshToken?: string;
  scopes: Array<string>;
  tidalAuthServiceBaseUri: string;
  tidalLoginServiceBaseUri: string;
} & Omit<
  InitArgs,
  'scopes' | 'tidalAuthServiceBaseUri' | 'tidalLoginServiceBaseUri'
>;

export type SocialNetwork = 'APPLE' | 'FACEBOOK' | 'TWITTER';

export type LoginConfig = {
  email?: string;
  language?: string;
} & Record<string, string>;

export type TokenJSONResponse = {
  access_token: string;
  clientName?: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: 'Bearer';
  user_id?: number;
};

export type TokenJSONError = {
  error: string;
  error_description: string;
  status: number;
  sub_status: number;
};

export type DeviceAuthorizationResponse = {
  deviceCode: string;
  expiresIn: number;
  interval: number;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
};
