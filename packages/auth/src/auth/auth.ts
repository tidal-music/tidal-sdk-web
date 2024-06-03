// disabled camelcase here to reduce noise since it's so common with all the API params
/* eslint-disable camelcase */
import {
  type Bus,
  type BusEvent,
  type Credentials,
  type GetCredentials,
  IllegalArgumentError,
  NetworkError,
  RetryableError,
  TidalError,
  messageTypes,
} from '@tidal-music/common';
import { trueTime } from '@tidal-music/true-time';

import {
  AuthenticationError,
  TokenResponseError,
  UnexpectedError,
  authErrorCodeMap,
} from '../errors';
import {
  deleteCredentials,
  loadCredentials,
  saveCredentialsToStorage,
} from '../storage/storage';
import type {
  DeviceAuthorizationResponse,
  InitArgs,
  LoginConfig,
  TokenJSONResponse,
  UserCredentials,
} from '../types';
import {
  exponentialBackoff,
  handleErrorResponse,
  handleTokenFetch,
  prepareFetch,
} from '../utils/fetchHandling';
import {
  base64URLEncode,
  generateOAuthCodeChallenge,
  sha256,
} from '../utils/utils';

const state: {
  credentials?: UserCredentials;
  limitedDeviceResponse?: DeviceAuthorizationResponse;
  pending: boolean;
  pendingPromises: Array<(value?: unknown) => void>;
} = {
  pending: false,
  pendingPromises: [],
};

const TIDAL_LOGIN_SERVICE_BASE_URI = 'https://login.tidal.com/';
const TIDAL_AUTH_SERVICE_BASE_URI = 'https://auth.tidal.com/v1/';
const knownSubStatus = ['11003', '6001', '11001', '11002', '11101'];

/**
 * Use this function to e.g. get notified when the credentials have been updated.
 *
 */
export const bus: Bus = callbackFn => {
  return globalThis.addEventListener(
    'authEventBus',
    callbackFn as EventListener,
  );
};

const dispatchEvent = (detail: BusEvent['detail']) => {
  const event = new CustomEvent('authEventBus', {
    detail,
  });
  globalThis.dispatchEvent(event);
};

const dispatchCredentialsUpdated = (credentials: Credentials) => {
  dispatchEvent({
    payload: credentials,
    type: messageTypes.credentialsUpdated,
  });
};

/**
 * Initialize the auth library, this needs to be called before any other auth methods.
 *
 * @param {InitArgs} initArgs - setup auth with clientId, scope, etc.
 */
export const init = async ({
  clientId,
  clientSecret,
  clientUniqueKey,
  credentialsStorageKey,
  scopes,
  tidalAuthServiceBaseUri,
  tidalLoginServiceBaseUri,
}: InitArgs) => {
  const persistedCredentials = await loadCredentials(credentialsStorageKey);

  const credentials = {
    ...persistedCredentials,
    clientId,
    ...(clientSecret && {
      clientSecret,
    }),
    clientUniqueKey,
    credentialsStorageKey,
    // we store the clientSecret separately to determine if a token needs to be upgraded
    previousClientSecret: persistedCredentials?.clientSecret,
    scopes: scopes ?? [],
    tidalAuthServiceBaseUri:
      tidalAuthServiceBaseUri ??
      persistedCredentials?.tidalAuthServiceBaseUri ??
      TIDAL_AUTH_SERVICE_BASE_URI,
    tidalLoginServiceBaseUri:
      tidalLoginServiceBaseUri ??
      persistedCredentials?.tidalLoginServiceBaseUri ??
      TIDAL_LOGIN_SERVICE_BASE_URI,
  };

  await persistCredentials(credentials);
  await trueTime.synchronize();
};

/**
 * To login your user, you need to open the url returned from this method.
 * It will have all necessary parameters to start the login flow.
 *
 * @param {Object} args
 * @param {string} args.redirectUri - the redirectUri you have registered with TIDAL
 * @param {LoginConfig} args.loginConfig - optional parameters to customize the login flow
 *
 * @throws {@link @tidal-music/common!TidalError} - if the auth module has not been initialized
 */
export const initializeLogin = async ({
  loginConfig,
  redirectUri,
}: {
  loginConfig?: LoginConfig;
  redirectUri: string;
}) => {
  if (!state.credentials) {
    throw new TidalError(authErrorCodeMap.initError);
  }

  const codeChallenge = generateOAuthCodeChallenge();
  const codeChallengeSha256 = await sha256(codeChallenge);

  await persistCredentials({
    ...state.credentials,
    codeChallenge,
    redirectUri,
  });

  const queryData = {
    // don't let custom params overwrite internals
    ...loginConfig,
    client_id: state.credentials.clientId,
    ...(state.credentials.clientUniqueKey && {
      client_unique_key: state.credentials.clientUniqueKey,
    }),
    code_challenge: base64URLEncode(codeChallengeSha256),
    code_challenge_method: 'S256',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: state.credentials.scopes.join(' '),
  };

  const queryParameters = new URLSearchParams(queryData).toString();

  return `${state.credentials.tidalLoginServiceBaseUri}authorize?${queryParameters}`;
};

/**
 * In case you have a limited input device, e.g. a TV, you can use this method to start the login flow.
 * The method will return a response including a code you need to show to the user along with a url.
 *
 * @throws {@link @tidal-music/common!TidalError} - if the auth module has not been initialized
 * @throws {@link UnexpectedError} - if the credentials are not valid (e.g. status 401)
 * @throws {@link @tidal-music/common!RetryableError} - if the server is not reachable (e.g. status 500)
 * @throws {@link @tidal-music/common!NetworkError} - if the client appears to be offline
 */
export const initializeDeviceLogin = async () => {
  if (!state.credentials) {
    throw new TidalError(authErrorCodeMap.initError);
  }

  const body = {
    client_id: state.credentials.clientId,
    ...(state.credentials.clientSecret && {
      client_secret: state.credentials.clientSecret,
    }),
    scope: state.credentials.scopes.join(' '),
  };

  const { options, url } = prepareFetch({
    body,
    credentials: state.credentials,
    path: 'oauth2/device_authorization',
  });

  const response = await exponentialBackoff({
    request: () => globalThis.fetch(url, options),
    // only retry in certain error cases
    retry: (res: Response) => res.status >= 500 && res.status < 600,
  });

  if (!response.ok) {
    throw await handleErrorResponse(response);
  }

  const jsonResponse = (await response.json()) as DeviceAuthorizationResponse;
  state.limitedDeviceResponse = jsonResponse;

  return jsonResponse;
};

/**
 * After the user has been redirected back to your app, you need to call this method to finalize the login flow.
 * It will exchange the code for an access token and store it in the secure storage.
 *
 * @param {string} loginResponseQuery - make sure to pass the whole query string, not just the code
 *
 * @throws {@link @tidal-music/common!TidalError} - if the auth module has not been initialized (`init` and `initializeLogin` are prerequisites)
 * @throws {@link AuthenticationError} - if there is no code in `loginResponseQuery`, normally happens when something with the login went wrong
 * @throws {@link UnexpectedError} - if the credentials are not valid (e.g. status 401)
 * @throws {@link @tidal-music/common!RetryableError} - if the server is not reachable (e.g. status 500)
 * @throws {@link @tidal-music/common!NetworkError} - if the client appears to be offline
 */
export const finalizeLogin = async (loginResponseQuery: string) => {
  if (
    !state.credentials?.credentialsStorageKey ||
    !state.credentials?.codeChallenge ||
    !state.credentials?.redirectUri
  ) {
    throw new TidalError(authErrorCodeMap.initError);
  }

  const {
    clientId,
    clientSecret,
    clientUniqueKey,
    codeChallenge,
    redirectUri,
    scopes,
  } = state.credentials;

  const params = Object.fromEntries(new URLSearchParams(loginResponseQuery));

  if (!params.code) {
    throw new AuthenticationError(authErrorCodeMap.authenticationError);
  }

  const body = {
    client_id: clientId,
    ...(clientUniqueKey && {
      client_unique_key: clientUniqueKey,
    }),
    ...(clientSecret && {
      client_secret: clientSecret,
    }),
    code: params.code,
    code_verifier: codeChallenge,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
  };

  const response = await handleTokenFetch({
    body,
    credentials: state.credentials,
  });

  if (response instanceof Error) {
    throw response;
  }

  const jsonResponse = (await response.json()) as TokenJSONResponse;

  await persistToken(jsonResponse);

  return;
};

/**
 * After displaying the code to the user, you need to call this method to finalize the login flow.
 * This method will poll until the user has logged in on another device.
 * Once the user has logged in, the access token will be stored in the secure storage.
 *
 * @throws {@link @tidal-music/common!TidalError} - if the auth module has not been initialized
 * @throws {@link TokenResponseError} - if no token could be fetched in the time limit
 * @throws {@link UnexpectedError} - if the credentials are not valid (e.g. status 401)
 * @throws {@link @tidal-music/common!RetryableError} - if the server is not reachable (e.g. status 500)
 * @throws {@link @tidal-music/common!NetworkError} - if the client appears to be offline
 */
export const finalizeDeviceLogin = async () => {
  if (!state.credentials || !state.limitedDeviceResponse) {
    throw new TidalError(authErrorCodeMap.initError);
  }

  const { clientId, clientSecret, clientUniqueKey, scopes } = state.credentials;
  const { deviceCode, expiresIn, interval } = state.limitedDeviceResponse;

  const body = {
    client_id: clientId,
    ...(clientSecret && {
      client_secret: clientSecret,
    }),
    ...(clientUniqueKey && {
      client_unique_key: clientUniqueKey,
    }),
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    scope: scopes.join(' '),
  };

  const { options, url } = prepareFetch({
    body,
    credentials: state.credentials,
    path: 'oauth2/token',
  });

  const expiresTimestamp = new Date(
    trueTime.now() + expiresIn * 1000,
  ).getTime();

  const limitReached = () => expiresTimestamp < trueTime.now();

  while (!limitReached()) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));

    const response = await globalThis.fetch(url, options);

    if (response.ok) {
      const jsonResponse = (await response.json()) as TokenJSONResponse;
      await persistToken(jsonResponse);
      return;
    }

    if (response.status >= 500 && response.status < 600) {
      const retriedResponse = await exponentialBackoff({
        request: () => globalThis.fetch(url, options),
        // only retry in certain error cases
        retry: (res: Response) => res.status >= 500 && res.status < 600,
      });

      // in case the exponentialBackoff succeeded, stop the loop as well
      if (retriedResponse.ok) {
        const jsonResponse =
          (await retriedResponse.json()) as TokenJSONResponse;
        await persistToken(jsonResponse);
        return;
      }

      // in case we get a 400, continue the loop
      if (retriedResponse.status >= 500 && retriedResponse.status < 600) {
        throw await handleErrorResponse(retriedResponse);
      }
    }

    if (limitReached()) {
      throw new TokenResponseError(authErrorCodeMap.tokenResponseError, {
        cause: 'Request limit reached',
      });
    }
  }
};

/**
 * Log the user out and clear all local state and the secure storage.
 * Call this method only when the user actively want to log out.
 */
export const logout = () => {
  dispatchEvent({ type: messageTypes.credentialsUpdated });
  if (state.credentials?.credentialsStorageKey) {
    deleteCredentials(state.credentials.credentialsStorageKey);
  }
  // clear in memory data as well
  delete state.credentials;
  delete state.limitedDeviceResponse;
};

const refreshAccessToken = async () => {
  if (state.credentials?.refreshToken) {
    const body = {
      ...(state.credentials.clientSecret && {
        client_secret: state.credentials.clientSecret,
      }),
      client_id: state.credentials.clientId,
      grant_type: 'refresh_token',
      refresh_token: state.credentials.refreshToken,
      scope: state.credentials.scopes.join(' '),
    };

    const response = await handleTokenFetch({
      body,
      credentials: state.credentials,
    });

    if (response instanceof Error) {
      return response;
    }

    const jsonResponse = (await response.json()) as TokenJSONResponse;
    return persistToken(jsonResponse);
  } else {
    return getTokenThroughClientCredentials();
  }
};

const upgradeToken = async () => {
  if (state.credentials?.refreshToken) {
    const body = {
      ...(state.credentials.clientSecret && {
        client_secret: state.credentials.clientSecret,
      }),
      client_id: state.credentials.clientId,
      grant_type: 'update_client',
      refresh_token: state.credentials.refreshToken,
      scope: state.credentials.scopes.join(' '),
    };

    const { options, url } = prepareFetch({
      body,
      credentials: state.credentials,
      path: 'oauth2/token',
    });

    const response = await exponentialBackoff({
      request: () => globalThis.fetch(url, options),
      // only retry in certain error cases
      retry: (res: Response) => res.status >= 400 && res.status < 600,
    });

    if (!response.ok) {
      if (response.status === 0) {
        throw new NetworkError(authErrorCodeMap.networkError);
      }
      throw new RetryableError(authErrorCodeMap.retryableError);
    }

    const jsonResponse = (await response.json()) as TokenJSONResponse;
    return persistToken(jsonResponse);
  } else {
    return getTokenThroughClientCredentials();
  }
};

const getTokenThroughClientCredentials = async () => {
  if (state.credentials?.clientSecret) {
    const body = {
      client_id: state.credentials.clientId,
      client_secret: state.credentials.clientSecret,
      grant_type: 'client_credentials',
      scope: state.credentials.scopes.join(' '),
    };

    const response = await handleTokenFetch({
      body,
      credentials: state.credentials,
    });

    if (response instanceof Error) {
      return response;
    }

    const jsonResponse = (await response.json()) as TokenJSONResponse;
    return persistToken(jsonResponse);
  }
};

/**
 * This is the heart of the auth module. Make sure to always call this method when in need of a token.
 * It will return a valid access token and also refresh or upgrade the token if necessary.
 * Please note: the method will return an accessToken without a `token` property if no credentials are found.
 *
 * @param {string} apiErrorSubStatus - pass `apiErrorSubStatus` when you get an authentication error from the API.
 * In some cases the auth module needs trigger a hard refresh then. (even if the token is still valid)
 * For example on status `401` with a subStatus of `11003` a refresh will be triggered.
 *
 * @throws {@link @tidal-music/common!TidalError} - if the auth module has not been initialized
 * @throws {@link @tidal-music/common!IllegalArgumentError} - if the scopes have changed or the clientUniqueKey is not the same
 * @throws {@link UnexpectedError} - if the credentials are not valid (e.g. status 401)
 * @throws {@link @tidal-music/common!RetryableError} - if the server is not reachable (e.g. status 500)
 * @throws {@link @tidal-music/common!NetworkError} - if the client appears to be offline
 */
export const getCredentials: GetCredentials = async (
  apiErrorSubStatus?: string,
) => {
  // this prevents several calls to the token endpoint at the same time
  if (state.pending) {
    await new Promise(resolve => {
      state.pendingPromises.push(resolve);
    });
  }

  return getCredentialsInternal(apiErrorSubStatus).finally(() => {
    const resolve = state.pendingPromises.shift();
    if (resolve) {
      resolve();
    }
    state.pending = false;
  });
};

// eslint-disable-next-line complexity
const getCredentialsInternal = async (apiErrorSubStatus?: string) => {
  if (state.credentials) {
    state.pending = true;

    const { accessToken } = state.credentials;
    const oneMinute = 60 * 1000;

    if (accessToken) {
      const newScopeIsSameOrSubset = state.credentials.scopes.every(
        scope => accessToken.grantedScopes?.includes(scope),
      );

      if (
        state.credentials.clientUniqueKey !== accessToken.clientUniqueKey ||
        newScopeIsSameOrSubset === false
      ) {
        logout();
        throw new IllegalArgumentError(authErrorCodeMap.illegalArgumentError);
      }

      const shouldUpgradeToken =
        state.credentials.clientId !== accessToken?.clientId ||
        Boolean(
          state.credentials.previousClientSecret &&
            state.credentials.previousClientSecret !==
              state.credentials.clientSecret,
        );

      if (shouldUpgradeToken) {
        const upgradeTokenResponse = await upgradeToken();
        if (upgradeTokenResponse && 'token' in upgradeTokenResponse) {
          return upgradeTokenResponse;
        } else {
          throw new RetryableError(authErrorCodeMap.retryableError);
        }
      }

      const shouldRefresh = Boolean(
        apiErrorSubStatus && knownSubStatus.includes(apiErrorSubStatus),
      );

      if (
        !shouldRefresh &&
        accessToken.expires &&
        accessToken.expires > trueTime.now() + oneMinute
      ) {
        return accessToken;
      }

      const accessTokenResponse = await refreshAccessToken();
      if (accessTokenResponse && 'token' in accessTokenResponse) {
        return accessTokenResponse;
      }
      if (accessTokenResponse instanceof UnexpectedError) {
        logout();
        throw accessTokenResponse;
      }
      if (accessTokenResponse instanceof RetryableError) {
        throw accessTokenResponse;
      }
    } else if (state.credentials.clientSecret) {
      const accessTokenResponse = await getTokenThroughClientCredentials();
      if (accessTokenResponse && 'token' in accessTokenResponse) {
        return accessTokenResponse;
      } else if (accessTokenResponse instanceof Error) {
        throw accessTokenResponse;
      }
    } else {
      return {
        clientId: state.credentials.clientId,
        requestedScopes: state.credentials.scopes,
      };
    }
  }

  throw new TidalError(authErrorCodeMap.initError);
};

/**
 * This method should only be used to migrate old credentials to the auth module.
 * In case you don't wan't to log all users out, but have access and refresh tokens stored somewhere else, you can use this method.
 * Please be aware there is no server checks here, we trust the input and store the credentials in the secure storage.
 *
 * @param {Object} args
 * @param {Credentials} args.accessToken - the access token to set
 * @param {string} args.refreshToken - the refresh token to set
 *
 * @throws {@link @tidal-music/common!TidalError} - if the auth module has not been initialized
 * @throws {@link @tidal-music/common!IllegalArgumentError} - if the scopes have changed, the clientUniqueKey is not the same or the accessToken is invalid
 */
export const setCredentials = async ({
  accessToken,
  refreshToken,
}: {
  accessToken: Credentials;
  refreshToken?: string;
}) => {
  if (!state.credentials) {
    throw new TidalError(authErrorCodeMap.initError);
  }

  const newScopeIsSubset = state.credentials.scopes.every(
    scope => accessToken.grantedScopes?.includes(scope),
  );

  if (
    state.credentials.clientUniqueKey !== accessToken.clientUniqueKey ||
    state.credentials.clientId !== accessToken.clientId ||
    newScopeIsSubset === false ||
    !accessToken.expires ||
    !accessToken.token
  ) {
    throw new IllegalArgumentError(authErrorCodeMap.illegalArgumentError);
  }

  await persistCredentials({
    ...state.credentials,
    accessToken,
    ...(refreshToken && {
      refreshToken,
    }),
  });
};

const persistCredentials = (updatedCredentials: UserCredentials) => {
  state.credentials = updatedCredentials;

  const credentials: Credentials = {
    ...state.credentials.accessToken,
    clientId: state.credentials.clientId,
    requestedScopes: state.credentials.scopes,
  };
  dispatchCredentialsUpdated(credentials);

  return saveCredentialsToStorage(state.credentials);
};

const persistToken = async (jsonResponse: TokenJSONResponse) => {
  if (!state.credentials) {
    throw new TidalError(authErrorCodeMap.initError);
  }

  const { clientId, clientUniqueKey, scopes } = state.credentials;

  const grantedScopes = jsonResponse.scope?.length
    ? jsonResponse.scope?.split(' ')
    : [];

  const accessToken: Credentials = {
    clientId,
    clientUniqueKey,
    // `expires_in` is sent in seconds, needs transformation to milliseconds
    expires: trueTime.now() + jsonResponse.expires_in * 1000,
    grantedScopes,
    requestedScopes: scopes,
    token: jsonResponse.access_token,
    ...(jsonResponse.user_id && {
      userId: jsonResponse.user_id.toString(),
    }),
  };

  await persistCredentials({
    ...state.credentials,
    accessToken,
    // there is no refreshToken when renewing the accessToken
    ...(jsonResponse.refresh_token && {
      refreshToken: jsonResponse.refresh_token,
    }),
  });

  return accessToken;
};
