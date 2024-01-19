import type { CredentialsProvider } from '@tidal-music/common';

import * as Config from '../config';

import { waitForEvent } from './helpers/wait-for';

class CredentialsProviderStore extends EventTarget {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Setter
  #credentialsProvider: CredentialsProvider;

  async dispatchAuthorized() {
    const credentials = await this.#credentialsProvider.getCredentials();

    if (credentials?.token) {
      this.dispatchEvent(
        new CustomEvent('authorized', {
          detail: {
            credentials,
          },
        }),
      );
    }
  }

  set credentialsProvider(newCredentialsProvider: CredentialsProvider) {
    this.#credentialsProvider = newCredentialsProvider;
    this.dispatchAuthorized().catch(console.error);

    this.#credentialsProvider.bus(event => {
      switch (event.detail.type) {
        case 'credentialsUpdated':
          this.dispatchAuthorized().catch(console.error);
          break;
        default:
          console.warn('Unhandled event from credentials provider: ', event);
          break;
      }
    });
  }

  get credentialsProvider() {
    return this.#credentialsProvider;
  }
}

type CommonErrorIds = 'EUnexpected';
type PlaybackEngineErrorIds =
  | 'PEContentNotAvailableForSubscription'
  | 'PEContentNotAvailableInLocation'
  | 'PEMonthlyStreamQuotaExceeded'
  | 'PENetwork'
  | 'PENotAllowed'
  | 'PERetryable';
type OfflineErrorIds =
  | 'OEContentNotAvailableForSubscription'
  | 'OEContentNotAvailableInLocation'
  | 'OENetwork'
  | 'OENotAllowed'
  | 'OEOffliningNotAllowedOnDevice'
  | 'OERetryable';
export type ErrorIds =
  | CommonErrorIds
  | OfflineErrorIds
  | PlaybackEngineErrorIds;
type PlayerErrorCodes =
  | 'B9999' // Playback info not valid
  | 'NPBI0'; // No network, fetching PBI failed.
type NativePlayerDeviceErrorCodes =
  | 'NPD00'
  | 'NPD01'
  | 'NPD02'
  | 'NPD03'
  | 'NPD04'
  | 'NPD05';
type NativePlayerOfflineErrorCodes = 'NPO01' | 'NPO02' | 'NPO03';
type NativePlayerNetworkErrorCodes = 'NPN01';
type ShakaNetworkErrorCodes =
  | 'S1000'
  | 'S1001'
  | 'S1002'
  | 'S1003'
  | 'S1004'
  | 'S1005'
  | 'S1006'
  | 'S1007'
  | 'S1008'
  | 'S1009'
  | 'S1010'
  | 'S1011';
type ShakaMediaErrorCodes =
  | 'S3000'
  | 'S3001'
  | 'S3002'
  | 'S3003'
  | 'S3004'
  | 'S3005'
  | 'S3006'
  | 'S3007'
  | 'S3008'
  | 'S3009'
  | 'S3010'
  | 'S3011'
  | 'S3012'
  | 'S3013'
  | 'S3014'
  | 'S3015'
  | 'S3016'
  | 'S3017'
  | 'S3018'
  | 'S3019';
type ShakaManifestErrorCodes =
  | 'S4000'
  | 'S4001'
  | 'S4002'
  | 'S4003'
  | 'S4004'
  | 'S4005'
  | 'S4006'
  | 'S4007'
  | 'S4008'
  | 'S4009'
  | 'S4010'
  | 'S4011'
  | 'S4012'
  | 'S4013'
  | 'S4014'
  | 'S4015'
  | 'S4016'
  | 'S4017'
  | 'S4018'
  | 'S4019'
  | 'S4020'
  | 'S4021'
  | 'S4022'
  | 'S4023'
  | 'S4024'
  | 'S4025'
  | 'S4026'
  | 'S4027'
  | 'S4028'
  | 'S4029'
  | 'S4030'
  | 'S4031'
  | 'S4032'
  | 'S4033'
  | 'S4034'
  | 'S4035'
  | 'S4036'
  | 'S4037'
  | 'S4038'
  | 'S4039'
  | 'S4040'
  | 'S4041'
  | 'S4042'
  | 'S4043'
  | 'S4044';
type ShakaDrmErrorCodes =
  | 'S6000'
  | 'S6001'
  | 'S6002'
  | 'S6003'
  | 'S6004'
  | 'S6005'
  | 'S6006'
  | 'S6007'
  | 'S6008'
  | 'S6009'
  | 'S6010'
  | 'S6011'
  | 'S6012'
  | 'S6013'
  | 'S6014'
  | 'S6015'
  | 'S6016'
  | 'S6017';
type ShakaPlayerErrorCodes = 'S7000' | 'S7001' | 'S7002' | 'S7003' | 'S7004';
export type ErrorCodes =
  | NativePlayerDeviceErrorCodes
  | NativePlayerNetworkErrorCodes
  | NativePlayerOfflineErrorCodes
  | PlayerErrorCodes
  | ShakaDrmErrorCodes
  | ShakaManifestErrorCodes
  | ShakaMediaErrorCodes
  | ShakaNetworkErrorCodes
  | ShakaPlayerErrorCodes;

export type PlayerErrorInterface = {
  errorCode: ErrorCodes;
  errorId: ErrorIds;
  referenceId?: string;
};

export class PlayerError extends Error {
  errorCode: ErrorCodes | null = null;

  errorId: ErrorIds | null = null;

  referenceId: string | undefined;

  constructor(errorId: ErrorIds, errorCode: ErrorCodes, referenceId?: string) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    super(`${errorId}: ${errorCode} (${referenceId})`);

    this.errorId = errorId;
    this.errorCode = errorCode;
    this.referenceId = referenceId;
  }

  toJSON() {
    return {
      errorCode: this.errorCode,
      errorId: this.errorId,
      referenceId: this.referenceId,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}

/**
 * Check if the credentials from auth module has token and user.
 * Requirement for streaming privileges.
 *
 * @returns {Promise<boolean>}
 */
export async function isAuthorizedWithUser() {
  if (credentialsProviderStore.credentialsProvider) {
    const credentials =
      await credentialsProviderStore.credentialsProvider.getCredentials();

    return Boolean(credentials.token && credentials.userId);
  }

  await waitForEvent(credentialsProviderStore, 'authorized');

  return isAuthorizedWithUser();
}

export const credentialsProviderStore = new CredentialsProviderStore();

/**
 * Starts streaming privileges and event code if the credentials allow it.
 */
async function handleAuthorized() {
  const authorizedWithUser = await isAuthorizedWithUser();

  const startPushkin = async () => {
    const { Pushkin } = await import('./services/pushkin');

    return Pushkin.refresh();
  };

  const startBeacon = async () => {
    const Beacon = await import('./beacon/index');

    return Beacon.start();
  };

  if (authorizedWithUser) {
    Config.update({
      gatherEvents: true,
    });

    try {
      await Promise.all([startPushkin(), startBeacon()]);
    } catch (e) {
      console.error(e);
    }
  } else {
    Config.update({
      gatherEvents: false,
    });
  }
}

credentialsProviderStore.addEventListener('authorized', () => {
  handleAuthorized().then().catch(console.error);
});

/**
 * Get the current accessToken from credentials provider.
 * Returns null if credentials provider is not set up or
 * if the token is undefined.
 */
export async function getAccessToken() {
  if (credentialsProviderStore.credentialsProvider) {
    const credentials =
      await credentialsProviderStore.credentialsProvider.getCredentials();

    return credentials.token ?? null;
  }

  return null;
}
