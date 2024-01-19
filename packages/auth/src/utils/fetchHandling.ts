import { NetworkError, RetryableError } from '@tidal-music/common';

import {
  TokenResponseError,
  UnexpectedError,
  authErrorCodeMap,
} from '../errors';
import type { TokenJSONError, UserCredentials } from '../types';

export const handleErrorResponse = async (response: Response) => {
  if (response.status === 0) {
    return new NetworkError(authErrorCodeMap.networkError);
  }
  if (response.status >= 400 && response.status < 500) {
    return new UnexpectedError(authErrorCodeMap.unexpectedError);
  }
  if (response.status >= 500 && response.status < 600) {
    return new RetryableError(authErrorCodeMap.retryableError);
  }
  const { error } = (await response.json()) as TokenJSONError;
  return new TokenResponseError(authErrorCodeMap.tokenResponseError, {
    cause: error,
  });
};

export const handleTokenFetch = async ({
  body,
  credentials,
}: {
  body: Record<string, string>;
  credentials: UserCredentials;
}) => {
  const { options, url } = prepareFetch({
    body,
    credentials,
    path: 'oauth2/token',
  });

  const response = await exponentialBackoff({
    request: () => globalThis.fetch(url, options),
    // only retry in certain error cases
    retry: (res: Response) => res.status >= 500 && res.status < 600,
  });

  if (!response.ok) {
    return await handleErrorResponse(response);
  }

  return response;
};

export const prepareFetch = ({
  body,
  credentials,
  path,
}: {
  body: Record<string, string>;
  credentials: UserCredentials;
  path: string;
}) => {
  const url = `${credentials.tidalAuthServiceBaseUri}${path}`;
  const options = {
    body: new URLSearchParams(body).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    method: 'POST',
  };

  return { options, url };
};

// inspired by: https://github.com/coveooss/exponential-backoff
export const exponentialBackoff = async <T>({
  delayInMs = 500,
  request,
  retry,
}: {
  delayInMs?: number;
  request: () => Promise<T>;
  retry: (response: T) => boolean;
}) => {
  // have to start at one, because 0*2=0
  // but that means even the first load is delayed :/
  let base = 1;
  const limitReached = () => base > 32; // 5 times

  while (!limitReached()) {
    await new Promise(resolve => setTimeout(resolve, base * delayInMs));
    const result = await request();
    base *= 2;
    const shouldRetry = retry(result);

    if (!shouldRetry || limitReached()) {
      return result;
    }
  }

  throw new UnexpectedError(authErrorCodeMap.unexpectedError);
};
