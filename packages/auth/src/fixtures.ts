export const storage = {
  accessToken: {
    clientId: 'CLIENT_ID',
    clientUniqueKey: 'CLIENT_UNIQUE_KEY',
    expires: 1694864347517,
    grantedScopes: ['READ', 'WRITE'],
    requestedScopes: ['READ', 'WRITE'],
    token: 'ACCESS_TOKEN',
    userId: '123456789',
  },
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  clientUniqueKey: 'CLIENT_UNIQUE_KEY',
  codeChallenge: 'CODE_CHALLENGE',
  credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
  previousClientSecret: 'CLIENT_SECRET',
  redirectUri: 'https://redirect.uri',
  refreshToken: 'REFRESH_TOKEN',
  scopes: ['READ', 'WRITE'],
  tidalAuthServiceBaseUri: 'https://auth.tidal.com/v1/',
  tidalLoginServiceBaseUri: 'https://login.tidal.com/',
};

export const storageClientCredentials = {
  accessToken: {
    clientId: 'CLIENT_ID',
    clientUniqueKey: undefined,
    expires: 1694864347517,
    grantedScopes: [],
    requestedScopes: [],
    token: 'ACCESS_TOKEN',
  },
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
  previousClientSecret: 'CLIENT_SECRET',
  scopes: ['READ', 'WRITE'],
  tidalAuthServiceBaseUri: 'https://auth.tidal.com/v1/',
  tidalLoginServiceBaseUri: 'https://login.tidal.com/',
};

export const userJsonResponse = {
  access_token: 'ACCESS_TOKEN',
  clientName: 'test',
  expires_in: 12356,
  refresh_token: 'REFRESH_TOKEN',
  scope: 'READ WRITE',
  token_type: 'Bearer' as const,
  user_id: 123456789,
};

export const clientCredentialsJsonResponse = {
  access_token: 'ACCESS_TOKEN',
  expires_in: 12356,
  scope: '',
  token_type: 'Bearer' as const,
};

export const expiresTimerMock =
  storage.accessToken.expires - userJsonResponse.expires_in * 1000;

export const deviceAuthorizationResponse = {
  deviceCode: 'DEVICE_CODE',
  expiresIn: 300,
  interval: 0.1,
  userCode: 'USER_CODE',
  verificationUri: 'link.tidal.com',
  verificationUriComplete: 'link.tidal.com/USER_CODE',
};
