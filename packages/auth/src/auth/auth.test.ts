import {
  IllegalArgumentError,
  RetryableError,
  TidalError,
} from '@tidal-music/common';
import { trueTime } from '@tidal-music/true-time';

import { UnexpectedError, authErrorCodeMap } from '../errors';
import * as fixtures from '../fixtures';
import * as _storage from '../storage/storage';
import * as _fetchHandling from '../utils/fetchHandling';
import * as _utils from '../utils/utils';

import {
  bus,
  finalizeDeviceLogin,
  finalizeLogin,
  getCredentials,
  init,
  initializeDeviceLogin,
  initializeLogin,
  logout,
  setCredentials,
} from './auth';

const storage = vi.mocked(_storage);
const utils = vi.mocked(_utils);
const fetchHandling = vi.mocked(_fetchHandling);

vi.mock('../storage/storage');
vi.mock('../utils/utils');
vi.mock('../utils/fetchHandling');

const initConfig = {
  clientId: 'CLIENT_ID',
  clientUniqueKey: 'CLIENT_UNIQUE_KEY',
  credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
  scopes: ['READ', 'WRITE'],
};

const prepareFetchMock = {
  options: {
    body: 'baz',
    headers: {
      'Content-Type': 'bar',
    },
    method: 'POST',
  },
  url: 'https://foo.baz',
};

describe.sequential('auth', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'CustomEvent',
      vi.fn((type: string, options: { detail: { type: string } }) => {
        return { detail: options.detail, type };
      }),
    );

    vi.stubGlobal(
      'dispatchEvent',
      vi.fn(() => {}),
    );

    vi.stubGlobal(
      'addEventListener',
      vi.fn((_name, callback: () => void) => {
        callback();
      }),
    );
  });

  describe('init', () => {
    it('inits the auth module (no previous calls)', async () => {
      const trueTimeSpy = vi.spyOn(trueTime, 'synchronize').mockResolvedValue();
      vi.mocked(storage.loadCredentials).mockResolvedValue(undefined);

      await init(initConfig);

      expect(storage.loadCredentials).toHaveBeenCalledWith(
        'CREDENTIALS_STORAGE_KEY',
      );
      expect(storage.saveCredentialsToStorage).toHaveBeenCalledWith({
        ...initConfig,
        tidalAuthServiceBaseUri: 'https://auth.tidal.com/v1/',
        tidalLoginServiceBaseUri: 'https://login.tidal.com/',
      });
      expect(trueTimeSpy).toHaveBeenCalled();
    });

    it('inits the auth module with previous data', async () => {
      const persistedUser = {
        clientId: 'foo',
        codeChallenge: '12345',
        credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
        scopes: ['READ', 'WRITE'],
        tidalAuthServiceBaseUri: 'https://foo.com/v1',
        tidalLoginServiceBaseUri: 'https://baz.com',
      };
      vi.mocked(storage.loadCredentials).mockResolvedValue(persistedUser);

      await init(initConfig);

      expect(storage.saveCredentialsToStorage).toHaveBeenCalledWith({
        ...persistedUser,
        clientId: initConfig.clientId,
        clientUniqueKey: initConfig.clientUniqueKey,
        credentialsStorageKey: initConfig.credentialsStorageKey,
        scopes: initConfig.scopes,
        tidalAuthServiceBaseUri: 'https://foo.com/v1',
        tidalLoginServiceBaseUri: 'https://baz.com',
      });
    });

    it('inits the auth module with overwritten previous data', async () => {
      const persistedUser = {
        clientId: 'foo',
        codeChallenge: '12345',
        credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
        scopes: ['write'],
        tidalAuthServiceBaseUri: 'https://foo.com/v1',
        tidalLoginServiceBaseUri: 'https://baz.com',
      };
      vi.mocked(storage.loadCredentials).mockResolvedValue(persistedUser);

      await init({
        ...initConfig,
        tidalAuthServiceBaseUri: 'https://foo.baz',
        tidalLoginServiceBaseUri: 'https://baz.bar',
      });

      expect(storage.saveCredentialsToStorage).toHaveBeenCalledWith({
        ...persistedUser,
        clientId: initConfig.clientId,
        clientUniqueKey: initConfig.clientUniqueKey,
        credentialsStorageKey: initConfig.credentialsStorageKey,
        // note that previously saved scope and urls are overwritten
        scopes: initConfig.scopes,
        tidalAuthServiceBaseUri: 'https://foo.baz',
        tidalLoginServiceBaseUri: 'https://baz.bar',
      });
    });

    it('inits the auth module with empty scopes', async () => {
      const trueTimeSpy = vi.spyOn(trueTime, 'synchronize').mockResolvedValue();
      vi.mocked(storage.loadCredentials).mockResolvedValue(undefined);

      const config = {
        clientId: 'CLIENT_ID',
        clientUniqueKey: 'CLIENT_UNIQUE_KEY',
        credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
      };

      await init(config);

      expect(storage.loadCredentials).toHaveBeenCalledWith(
        'CREDENTIALS_STORAGE_KEY',
      );
      expect(storage.saveCredentialsToStorage).toHaveBeenCalledWith({
        ...config,
        scopes: [],
        tidalAuthServiceBaseUri: 'https://auth.tidal.com/v1/',
        tidalLoginServiceBaseUri: 'https://login.tidal.com/',
      });
      expect(trueTimeSpy).toHaveBeenCalled();
    });
  });

  describe('initializeLogin', () => {
    it("exits early when `init` hasn't been called before", async () => {
      // clear local state
      logout();

      await expect(
        async () =>
          await initializeLogin({ redirectUri: 'https://foo.com/auth' }),
      ).rejects.toThrow(authErrorCodeMap.initError);
    });

    it('starts the login process by returning a valid login url', async () => {
      await init({
        clientId: 'foo',
        clientUniqueKey: 'baz',
        credentialsStorageKey: 'bar',
        scopes: ['read'],
        tidalLoginServiceBaseUri: 'https://baz.com/',
      });

      const redirectUri = 'https://foo.com/auth';
      const codeChallenge = 'CODE_CHALLENGE';

      vi.mocked(utils.base64URLEncode).mockReturnValue('BASE64_CODE_CHALLENGE');
      vi.mocked(utils.generateOAuthCodeChallenge).mockReturnValue(
        codeChallenge,
      );
      vi.mocked(utils.sha256).mockResolvedValue('SHA256_CODE_CHALLENGE');

      const url = await initializeLogin({ redirectUri });

      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();

      expect(utils.generateOAuthCodeChallenge).toHaveBeenCalled();
      expect(utils.sha256).toHaveBeenCalledWith(codeChallenge);

      expect(url).toContain('https://baz.com/authorize');
      expect(url).toContain('BASE64_CODE_CHALLENGE');
      expect(url).toContain(
        new URLSearchParams({ redirect_uri: redirectUri }).toString(),
      );
    });
  });

  describe('initializeDeviceLogin', () => {
    it('starts the device login process', async () => {
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);

      vi.mocked(fetchHandling.exponentialBackoff).mockResolvedValue(
        new Response(JSON.stringify(fixtures.deviceAuthorizationResponse)),
      );

      await init(initConfig);
      const response = await initializeDeviceLogin();

      expect(response).toEqual(fixtures.deviceAuthorizationResponse);
      expect(fetchHandling.exponentialBackoff).toHaveBeenCalled();
    });

    it('throws an error fetch returns one', async () => {
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);

      vi.mocked(fetchHandling.exponentialBackoff).mockResolvedValue(
        new Response('', { status: 400 }),
      );

      vi.mocked(fetchHandling.handleErrorResponse).mockResolvedValue(
        new UnexpectedError(authErrorCodeMap.unexpectedError),
      );

      await init(initConfig);

      await expect(async () => await initializeDeviceLogin()).rejects.toThrow(
        authErrorCodeMap.unexpectedError,
      );
      expect(fetchHandling.exponentialBackoff).toHaveBeenCalled();
    });

    it('exits early when credentials are not present', async () => {
      // clear local state
      logout();

      await expect(async () => await initializeDeviceLogin()).rejects.toThrow(
        authErrorCodeMap.initError,
      );
    });
  });

  describe('finalizeLogin', () => {
    it("exits early when `init` hasn't been called before", async () => {
      // clear local state
      logout();

      await expect(
        async () => await finalizeLogin('loginQueryResponse'),
      ).rejects.toThrow(authErrorCodeMap.initError);
    });

    it('exits early when no `code` is found in the responseQuery', async () => {
      // make sure `init` gets the correct values from storage
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);

      await init({
        clientId: 'CLIENT_ID',
        clientUniqueKey: 'CLIENT_UNIQUE_KEY',
        credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
        scopes: ['READ', 'WRITE'],
      });

      await expect(
        async () => await finalizeLogin('loginQueryResponse'),
      ).rejects.toThrow(authErrorCodeMap.authenticationError);
    });

    it('requests an auth token and persists it', async () => {
      // make sure `init` gets the correct values from storage
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new Response(JSON.stringify(fixtures.userJsonResponse)), // oauth/token
      );

      await init(initConfig);

      const result = await finalizeLogin('code=foobar');
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('does not send a clientUniqueKey when omitted', async () => {
      // make sure `init` gets the correct values from storage
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new Response(JSON.stringify(fixtures.userJsonResponse)), // oauth/token
      );

      await init({ ...initConfig, clientUniqueKey: undefined });

      const result = await finalizeLogin('code=foobar');
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalledWith({
        body: {
          client_id: 'CLIENT_ID',
          client_secret: 'CLIENT_SECRET',
          code: 'foobar',
          code_verifier: 'CODE_CHALLENGE',
          grant_type: 'authorization_code',
          redirect_uri: 'https://redirect.uri',
          scope: 'READ WRITE',
        },
        credentials: { ...fixtures.storage, clientUniqueKey: undefined },
      });
      expect(result).toBeUndefined();
    });

    it('requests an auth token and handles retryableError', async () => {
      // make sure `init` gets the correct values from storage
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new RetryableError(authErrorCodeMap.retryableError),
      );

      await init(initConfig);

      await expect(
        async () => await finalizeLogin('code=foobar'),
      ).rejects.toThrow(authErrorCodeMap.retryableError);
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
    });

    it('requests an auth token and handles unexpectedError', async () => {
      // make sure `init` gets the correct values from storage
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new UnexpectedError(authErrorCodeMap.unexpectedError),
      );

      await init(initConfig);

      await expect(
        async () => await finalizeLogin('code=foobar'),
      ).rejects.toThrow(authErrorCodeMap.unexpectedError);
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
    });
  });

  describe('finalizeDeviceLogin', () => {
    it('polls and persists access token when successful', async () => {
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);
      vi.spyOn(trueTime, 'synchronize').mockResolvedValue();
      vi.spyOn(trueTime, 'now').mockReturnValue(0);
      vi.mocked(fetchHandling.exponentialBackoff).mockResolvedValue(
        new Response(JSON.stringify(fixtures.deviceAuthorizationResponse)),
      );

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('', { status: 400 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.userJsonResponse)),
        );

      await init(initConfig);
      await initializeDeviceLogin();
      await finalizeDeviceLogin();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
    });

    it('polls until 500 and resumes', async () => {
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);
      vi.spyOn(trueTime, 'synchronize').mockResolvedValue();
      vi.spyOn(trueTime, 'now').mockReturnValue(0);

      vi.mocked(fetchHandling.exponentialBackoff)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.deviceAuthorizationResponse)),
        )
        .mockResolvedValueOnce(
          new Response('', { status: 400 }), // status !== 500 indicates that polling can continue
        );

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('', { status: 400 }))
        .mockResolvedValueOnce(new Response('', { status: 500 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.userJsonResponse)),
        );

      await init(initConfig);
      await initializeDeviceLogin();
      await finalizeDeviceLogin();

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(fetchHandling.exponentialBackoff).toHaveBeenCalled();
    });

    it('polls until 500, get 200 in exponentialBackoff "inner loop"', async () => {
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);
      vi.spyOn(trueTime, 'synchronize').mockResolvedValue();
      vi.spyOn(trueTime, 'now').mockReturnValue(0);
      vi.mocked(fetchHandling.exponentialBackoff)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.deviceAuthorizationResponse)),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.userJsonResponse)),
        );

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('', { status: 400 }))
        .mockResolvedValueOnce(new Response('', { status: 500 }));

      await init(initConfig);
      await initializeDeviceLogin();
      await finalizeDeviceLogin();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(fetchHandling.exponentialBackoff).toHaveBeenCalled();
    });

    it('stops polling when status code 500 is found', async () => {
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);
      vi.mocked(fetchHandling.handleErrorResponse).mockResolvedValue(
        new RetryableError(authErrorCodeMap.retryableError),
      );
      vi.spyOn(trueTime, 'synchronize').mockResolvedValue();
      vi.spyOn(trueTime, 'now').mockReturnValue(0);
      vi.mocked(fetchHandling.exponentialBackoff)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.deviceAuthorizationResponse)),
        )
        .mockResolvedValueOnce(new Response('', { status: 500 }));
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('', { status: 400 }))
        .mockResolvedValueOnce(new Response('', { status: 500 }));

      await init({
        ...initConfig,
        clientSecret: 'CLIENT_SECRET',
      });
      await initializeDeviceLogin();

      await expect(async () => await finalizeDeviceLogin()).rejects.toThrow(
        authErrorCodeMap.retryableError,
      );
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchHandling.prepareFetch).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          credentials: expect.objectContaining({
            clientSecret: 'CLIENT_SECRET',
          }),
        }),
      );
      expect(fetchHandling.exponentialBackoff).toHaveBeenCalled();
    });

    it('stops polling when time limit is reached', async () => {
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);
      vi.mocked(fetchHandling.handleErrorResponse).mockResolvedValue(
        new RetryableError(authErrorCodeMap.retryableError),
      );
      vi.spyOn(trueTime, 'synchronize').mockResolvedValue();
      vi.spyOn(trueTime, 'now')
        .mockReturnValueOnce(0) // setup timer
        .mockReturnValueOnce(0) // make sure `limitReached` is false first time
        .mockReturnValue(500000); // `limitReached` is true the second time
      vi.mocked(fetchHandling.exponentialBackoff).mockResolvedValue(
        new Response(JSON.stringify(fixtures.deviceAuthorizationResponse)),
      );
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('', { status: 400 }));

      await init(initConfig);
      await initializeDeviceLogin();

      await expect(async () => await finalizeDeviceLogin()).rejects.toThrow(
        authErrorCodeMap.tokenResponseError,
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('exits early when credentials are not present', async () => {
      logout();

      await init(initConfig);

      await expect(async () => await finalizeDeviceLogin()).rejects.toThrow(
        authErrorCodeMap.initError,
      );
    });
  });

  describe('logout', () => {
    it('logs the user out by deleting credentials', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(undefined);

      await init(initConfig);

      logout();

      expect(storage.deleteCredentials).toHaveBeenCalledWith(
        'CREDENTIALS_STORAGE_KEY',
      );
      await expect(
        async () => await initializeLogin({ redirectUri: 'test' }),
      ).rejects.toThrow(authErrorCodeMap.initError);
    });
  });

  describe('getAccessToken/refreshAccessToken/upgradeToken', () => {
    it('should exit early if logout was called', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(undefined);
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);

      await init(initConfig);

      logout();

      expect(storage.deleteCredentials).toHaveBeenCalledWith(
        'CREDENTIALS_STORAGE_KEY',
      );
      await expect(async () => await getCredentials()).rejects.toThrow(
        authErrorCodeMap.initError,
      );
    });

    it('return accessToken only with basic credentials (no token)', async () => {
      await init(initConfig);

      const accessToken = await getCredentials();

      expect(accessToken).toEqual({
        clientId: initConfig.clientId,
        requestedScopes: initConfig.scopes,
      });
    });

    it('get the right token from storage and return it', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.spyOn(trueTime, 'now').mockReturnValue(0); // make sure token isn't expired
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);
      const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');

      await init(initConfig);

      const accessToken = await getCredentials();

      expect(accessToken).toEqual(fixtures.storage.accessToken);
      expect(fetchHandling.handleTokenFetch).not.toHaveBeenCalled();

      // make sure bus contains the token
      expect(dispatchSpy).toHaveBeenCalledWith({
        detail: {
          payload: fixtures.storage.accessToken,
          type: 'CredentialsUpdatedMessage',
        },
        type: 'authEventBus',
      });
    });

    it('refresh an expired token and return it', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue({
        ...fixtures.storage,
        accessToken: {
          ...fixtures.storage.accessToken,
          expires: 0,
        },
      });
      vi.spyOn(trueTime, 'now').mockReturnValue(fixtures.expiresTimerMock);
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new Response(JSON.stringify(fixtures.userJsonResponse)),
      );

      await init(initConfig);

      const accessToken = await getCredentials();

      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(accessToken).toEqual(fixtures.storage.accessToken);
    });

    it('refresh token based on api subStatus', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.spyOn(trueTime, 'now').mockReturnValue(0); // make sure token isn't expired
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new Response(JSON.stringify(fixtures.userJsonResponse)),
      );

      await init(initConfig);

      // call with subStatus that requires refreshing the token
      const accessToken = await getCredentials('6001');

      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(accessToken).toEqual({
        ...fixtures.storage.accessToken,
        expires: fixtures.userJsonResponse.expires_in * 1000,
      });
    });

    it('refresh an expired token (through client credentials) and return it', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue({
        ...fixtures.storageClientCredentials,
        accessToken: {
          ...fixtures.storageClientCredentials.accessToken,
          expires: 0,
        },
      });
      vi.spyOn(trueTime, 'now').mockReturnValue(fixtures.expiresTimerMock);
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new Response(JSON.stringify(fixtures.clientCredentialsJsonResponse)),
      );

      await init({
        clientId: 'CLIENT_ID',
        clientSecret: 'CLIENT_SECRET',
        credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
      });

      const accessToken = await getCredentials();

      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(accessToken).toEqual(
        fixtures.storageClientCredentials.accessToken,
      );
    });

    it('handle non retryable errors in case token cannot be refreshed', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue({
        ...fixtures.storage,
        accessToken: {
          ...fixtures.storage.accessToken,
          expires: 0,
        },
      });
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new UnexpectedError(authErrorCodeMap.unexpectedError),
      );

      await init(initConfig);

      await expect(async () => await getCredentials()).rejects.toThrow(
        authErrorCodeMap.unexpectedError,
      );
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(storage.deleteCredentials).toHaveBeenCalled();
    });

    it('handle retryable errors in case token cannot be refreshed', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue({
        ...fixtures.storage,
        accessToken: {
          ...fixtures.storage.accessToken,
          expires: 0,
        },
      });
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new RetryableError(authErrorCodeMap.retryableError),
      );

      await init(initConfig);

      await expect(async () => await getCredentials()).rejects.toThrow(
        authErrorCodeMap.retryableError,
      );
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(storage.deleteCredentials).not.toHaveBeenCalled();
    });

    it('upgrade a token and return it', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.spyOn(trueTime, 'now').mockReturnValue(fixtures.expiresTimerMock);
      vi.mocked(fetchHandling.exponentialBackoff).mockResolvedValue(
        new Response(JSON.stringify(fixtures.userJsonResponse)),
      );
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);

      await init({
        ...initConfig,
        clientId: 'NEW_CLIENT_ID',
      });

      const accessToken = await getCredentials();

      expect(fetchHandling.exponentialBackoff).toHaveBeenCalled();
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(accessToken).toEqual({
        ...fixtures.storage.accessToken,
        clientId: 'NEW_CLIENT_ID',
      });
    });

    it('upgrade a token and return it (client credentials)', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(
        fixtures.storageClientCredentials,
      );
      vi.spyOn(trueTime, 'now').mockReturnValue(fixtures.expiresTimerMock);
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new Response(JSON.stringify(fixtures.clientCredentialsJsonResponse)),
      );
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);

      await init({
        clientId: 'NEW_CLIENT_ID',
        clientSecret: 'CLIENT_SECRET',
        credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
      });

      const accessToken = await getCredentials();

      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(accessToken).toEqual({
        ...fixtures.storageClientCredentials.accessToken,
        clientId: 'NEW_CLIENT_ID',
      });
    });

    it('token failed to upgrade, throw error', async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.mocked(fetchHandling.exponentialBackoff).mockResolvedValueOnce(
        new Response('', { status: 400 }),
      );
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);

      await init({
        ...initConfig,
        clientId: 'NON_UPGRADABLE_CLIENT_ID',
      });

      await expect(async () => await getCredentials()).rejects.toEqual(
        new RetryableError(authErrorCodeMap.retryableError),
      );
      expect(fetchHandling.exponentialBackoff).toHaveBeenCalled();
      expect(storage.deleteCredentials).not.toHaveBeenCalled();
    });

    it("token can't be upgraded (scopes changed), throw error", async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(fixtures.storage);
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);

      await init({
        ...initConfig,
        scopes: ['READ', 'WRITE', 'DELETE'],
      });

      await expect(async () => await getCredentials()).rejects.toEqual(
        new IllegalArgumentError(authErrorCodeMap.illegalArgumentError),
      );
      expect(storage.deleteCredentials).toHaveBeenCalled();
    });

    it("token can't be upgraded (client credentials)", async () => {
      vi.mocked(storage.loadCredentials).mockResolvedValue(
        fixtures.storageClientCredentials,
      );
      vi.spyOn(trueTime, 'now').mockReturnValue(fixtures.expiresTimerMock);
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new RetryableError(authErrorCodeMap.retryableError),
      );
      vi.mocked(fetchHandling.prepareFetch).mockReturnValue(prepareFetchMock);

      await init({
        clientId: 'CLIENT_ID',
        clientSecret: 'foo',
        credentialsStorageKey: 'CREDENTIALS_STORAGE_KEY',
      });

      await expect(async () => await getCredentials()).rejects.toEqual(
        new RetryableError(authErrorCodeMap.retryableError),
      );
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
    });

    it('request the token when client secret is present', async () => {
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new Response(JSON.stringify(fixtures.userJsonResponse)),
      );
      vi.spyOn(trueTime, 'now').mockReturnValue(fixtures.expiresTimerMock);

      await init({
        ...initConfig,
        clientSecret: 'SECRET',
      });

      const accessToken = await getCredentials();

      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(accessToken).toEqual(fixtures.storage.accessToken);
    });

    it('make sure parallel requests are halted', async () => {
      // make sure init is called with no previous stored data
      vi.mocked(storage.loadCredentials).mockResolvedValueOnce(undefined);
      vi.mocked(fetchHandling.handleTokenFetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.userJsonResponse)),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.userJsonResponse)),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(fixtures.userJsonResponse)),
        );
      vi.spyOn(trueTime, 'now').mockReturnValue(fixtures.expiresTimerMock);

      await init({
        ...initConfig,
        clientSecret: 'CLIENT_SECRET',
      });

      const accessToken = await Promise.all([
        getCredentials(),
        getCredentials(),
        getCredentials('6001'),
        getCredentials(),
      ]);

      // one for the initial token and a second one for refresh when calling with `apiErrorSubStatus`
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalledTimes(2);
      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
      expect(accessToken).toEqual([
        fixtures.storage.accessToken,
        fixtures.storage.accessToken,
        fixtures.storage.accessToken,
        fixtures.storage.accessToken,
      ]);
    });

    it('handle retryable errors for client credential request', async () => {
      vi.mocked(fetchHandling.handleTokenFetch).mockResolvedValue(
        new RetryableError(authErrorCodeMap.retryableError),
      );

      await init({
        ...initConfig,
        clientSecret: 'SECRET',
      });

      await expect(async () => await getCredentials()).rejects.toEqual(
        new RetryableError(authErrorCodeMap.retryableError),
      );
      expect(fetchHandling.handleTokenFetch).toHaveBeenCalled();
      expect(storage.deleteCredentials).not.toHaveBeenCalled();
    });
  });
  describe('event bus', () => {
    it('calls the event bus on logout', async () => {
      const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
      const listenerSpy = vi.spyOn(globalThis, 'addEventListener');
      const consoleSpy = vi.spyOn(console, 'log');

      // eslint-disable-next-line no-console
      const logger = (e: Event) => console.log(e);
      bus(logger);

      logout();

      expect(dispatchSpy).toHaveBeenCalledWith({
        detail: { type: 'CredentialsUpdatedMessage' },
        type: 'authEventBus',
      });
      expect(listenerSpy).toHaveBeenCalledWith('authEventBus', logger);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('setCredentials', () => {
    it('sets credentials and updates state + store', async () => {
      await init(initConfig);

      await setCredentials({
        accessToken: fixtures.storage.accessToken,
        refreshToken: 'REFRESH_TOKEN',
      });

      expect(storage.saveCredentialsToStorage).toHaveBeenCalled();
    });

    it("throws because scopes don't match", async () => {
      await init({
        ...initConfig,
        scopes: ['READ', 'WRITE', 'DELETE'],
      });

      await expect(
        async () =>
          await setCredentials({ accessToken: fixtures.storage.accessToken }),
      ).rejects.toEqual(
        new IllegalArgumentError(authErrorCodeMap.illegalArgumentError),
      );
    });

    it('throws because no token available', async () => {
      await init({
        ...initConfig,
      });

      await expect(
        async () =>
          await setCredentials({
            accessToken: {
              ...fixtures.storage.accessToken,
              token: undefined,
            },
          }),
      ).rejects.toEqual(
        new IllegalArgumentError(authErrorCodeMap.illegalArgumentError),
      );
    });

    it("throws because module wasn't init", async () => {
      // clean up state
      logout();

      await expect(
        async () =>
          await setCredentials({ accessToken: fixtures.storage.accessToken }),
      ).rejects.toEqual(new TidalError(authErrorCodeMap.initError));
    });
  });
});
