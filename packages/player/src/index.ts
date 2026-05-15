import * as Config from './config.js';
import { trueTime } from './internal/true-time.js';
import {
  activateVideoElements,
  mountVideoElements,
} from './player/audio-context-store.js';
import type BrowserPlayer from './player/browserPlayer.js';
import type { PlayerConfig } from './player/index.js';
import { setPlayerConfig } from './player/index.js';
import type ShakaPlayer from './player/shakaPlayer.js';
import { playerState } from './player/state.js';

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
    case 'browserPlayer':
      return (player as BrowserPlayer).mediaElement;
    case 'shakaPlayer':
      return (player as ShakaPlayer).mediaElement;
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

export * from './api/index.js';
export type * from './api/index.js';
export type * from './api/interfaces.js';

export { events } from './event-bus.js';
export type {
  PlayerErrorInterface as Error,
  ErrorCodes,
} from './internal/index.js';

export type { OutputDevice } from './internal/output-devices.js';

export type {
  AssetPresentation,
  AudioMode,
  AudioQuality,
  Codec,
  StreamType,
  VideoQuality,
} from './internal/types.js';
export type { NativePlayerDeviceMode as DeviceMode } from './player/nativeInterface.js';
