import { events } from '../event-bus';
import type { AudioQuality } from '../internal/types';

import type { default as BrowserPlayerType } from './browserPlayer';
import type { default as NativePlayerType } from './nativePlayer';
import type { default as ShakaPlayerType } from './shakaPlayer';
import { playerState } from './state';

let endedHandler: EventListenerOrEventListenerObject;

type Player = BrowserPlayerType | NativePlayerType | ShakaPlayerType;

export type PlayerConfig = {
  itemTypes: Array<'track' | 'video'>;
  player: 'browser' | 'native' | 'shaka';
  qualities?: Array<AudioQuality>;
};

const defaultPlayerConfig: Array<PlayerConfig> = [
  {
    itemTypes: ['track', 'video'],
    player: 'shaka',
    qualities: ['HIGH', 'LOSSLESS', 'LOW', 'HI_RES_LOSSLESS'],
  },
];
let playerConfig: Array<PlayerConfig> = defaultPlayerConfig;
const players = {
  browser: undefined as BrowserPlayerType | undefined,
  native: undefined as NativePlayerType | undefined,
  shaka: undefined as ShakaPlayerType | undefined,
};

export function setPlayerConfig(allowedPlayers: Array<PlayerConfig>) {
  playerConfig = allowedPlayers;
}

export async function resetAllPlayers() {
  await Promise.all(
    playerConfig.map(pc => {
      const player = players[pc.player];

      if (player) {
        return player.reset();
      }

      return Promise.resolve();
    }),
  );

  playerState.activePlayer = undefined;
  playerState.preloadPlayer = undefined;
}

export function setActivePlayer(player: Player) {
  if (player.name !== 'nativePlayer' && players.native) {
    players.native.abandon();
  }

  playerState.activePlayer = player;
}

async function switchPlayerOnPlaybackEnd(_preloadPlayer: Player) {
  setActivePlayer(_preloadPlayer);

  await Promise.all(
    playerConfig
      .filter(pc => players[pc.player] !== playerState.activePlayer)
      .map(async pc => {
        const otherPlayer = players[pc.player];

        if (otherPlayer) {
          await otherPlayer.reset();
        }

        return Promise.resolve();
      }),
  );

  await playerState.activePlayer?.skipToPreloadedMediaProduct();
  /*
    Force a play even though Player is IDLE.
    I.e. emulate player switch -> implicit transition as explicit internally;
    makes sure not to send NOT_PLAYING event out of Player.
  */
  await playerState.activePlayer?.play();
}

/**
 * Cancels a queued player switch or a queued repeat of same player.
 *
 * @see maybeSwitchPlayerOnEnd
 */
export function cancelQueuedOnendedHandler() {
  events.removeEventListener('ended', endedHandler);
}

export function maybeSwitchPlayerOnEnd(preloadPlayer: Player) {
  if (preloadPlayer === playerState.activePlayer) {
    return;
  }

  endedHandler = () => {
    switchPlayerOnPlaybackEnd(preloadPlayer).then().catch(console.error);
  };
  events.addEventListener('ended', endedHandler, { once: true });
}

export async function getNativePlayer() {
  const { default: NativePlayer } = await import('./nativePlayer');

  if (!players.native) {
    players.native = new NativePlayer();
  }

  return players.native;
}

async function getBrowserPlayer() {
  const { default: BrowserPlayer } = await import('./browserPlayer');

  if (!players.browser) {
    players.browser = new BrowserPlayer();
  }

  return players.browser;
}

async function getShakaPlayer() {
  const { default: ShakaPlayer } = await import('./shakaPlayer');

  if (!players.shaka) {
    players.shaka = new ShakaPlayer();
  }

  return players.shaka;
}

export async function getAppropriatePlayer(
  productType: 'track' | 'video',
  audioQuality: AudioQuality | undefined,
) {
  const appropriatePlayers = playerConfig
    .filter(pc => pc.itemTypes.includes(productType))
    .filter(pc =>
      productType === 'track' && pc.qualities && audioQuality
        ? pc.qualities.includes(audioQuality)
        : true,
    );

  if (appropriatePlayers.length === 0) {
    console.error(
      `No player found to handle audio quality "${String(
        audioQuality,
      )}" for product type "${productType}" in player config: `,
      playerConfig,
    );
  }

  const { player } = appropriatePlayers[0]!;

  switch (player) {
    case 'shaka':
      return getShakaPlayer();
    case 'browser':
      return getBrowserPlayer();
    case 'native':
      return getNativePlayer();
    default:
      throw new Error('No player found.');
  }
}

/**
 * Unload preloads in all booted players.
 */
export async function unloadPreloadedMediaProduct() {
  await Promise.all(
    playerConfig.map(pc => {
      const player = players[pc.player];

      if (player) {
        return player.unloadPreloadedMediaProduct();
      }

      return Promise.resolve();
    }),
  );
}
