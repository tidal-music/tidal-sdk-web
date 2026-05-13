import { streamingSessionStore } from '../internal/helpers/streaming-session-store.js';

import type BrowserPlayer from './browserPlayer.js';
import type NativePlayer from './nativePlayer.js';
import type ShakaPlayer from './shakaPlayer.js';

type Player = BrowserPlayer | NativePlayer | ShakaPlayer;

class PlayerState {
  activePlayer: Player | undefined;
  preloadPlayer: Player | undefined;

  get preloadedMediaProduct() {
    return (
      streamingSessionStore.getMediaProductTransition(
        this.preloadedStreamingSessionId,
      )?.mediaProduct ?? undefined
    );
  }

  get preloadedStreamingSessionId() {
    return this.preloadPlayer?.preloadedStreamingSessionId ?? undefined;
  }
}

export const playerState = new PlayerState();
