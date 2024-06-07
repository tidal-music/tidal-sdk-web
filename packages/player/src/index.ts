import * as Config from './config';
import { trueTime } from './internal/true-time';
import {
  activateVideoElements,
  mountVideoElements,
} from './player/audio-context-store';
import type BrowserPlayer from './player/browserPlayer';
import type { PlayerConfig } from './player/index';
import { setPlayerConfig } from './player/index';
import type ShakaPlayer from './player/shakaPlayer';
import { playerState } from './player/state';

trueTime.synchronize().then().catch(console.error);

type Options = {
  outputDevices: boolean;
  players: Array<PlayerConfig>;
};

/**
 * Get the media element with playback currently.
 *
 * @returns {HTMLMediaElement | null}
 */
export function getMediaElement(): HTMLMediaElement | null {
  const { activePlayer: player } = playerState;

  if (!player) {
    return null;
  }

  switch (player.name) {
    case 'shakaPlayer':
      return (player as ShakaPlayer).mediaElement;
    case 'browserPlayer':
      return (player as BrowserPlayer).mediaElement;
    default:
      return null;
  }
}

/**
 * Configure the module.
 *
 * @param {Options} options
 */
export function bootstrap(options: Options) {
  playerState.activePlayer = undefined;

  if (options.outputDevices === true) {
    Config.update({ outputDevicesEnabled: true });
  }

  setPlayerConfig(options.players);
}

/**
 * Remove the old IDB database which was used for storing events.
 */
function removeOldIDB() {
  const ssuid = localStorage.getItem('ssuid');

  try {
    if (ssuid) {
      indexedDB.deleteDatabase('streaming-sessions-' + ssuid);
    }
  } catch (e) {
    console.warn(`DB streaming-sessions-${ssuid} could not be deleted`);
    console.error(e);
  }
}

mountVideoElements().then().catch(console.error);
activateVideoElements().then().catch(console.error);
removeOldIDB();

export * from './api/index';
export type * from './api/index';
export type * from './api/interfaces';

export { events } from './event-bus';
export type {
  ErrorCodes,
  PlayerErrorInterface as Error,
} from './internal/index';

export type { OutputDevice } from './internal/output-devices';

export type {
  AssetPresentation,
  AudioMode,
  AudioQuality,
  Codec,
  StreamType,
  VideoQuality,
} from './internal/types';
export type { NativePlayerDeviceMode as DeviceMode } from './player/nativeInterface';
