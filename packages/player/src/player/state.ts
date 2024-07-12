import type { MediaProduct } from '../api/interfaces';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store';

import type BrowserPlayer from './browserPlayer';
import type NativePlayer from './nativePlayer';
import type ShakaPlayer from './shakaPlayer';

type Player = BrowserPlayer | NativePlayer | ShakaPlayer;

class PlayerState {
  activePlayer: Player | undefined;
  preloadPlayer: Player | undefined;

  get preloadedMediaProduct(): MediaProduct | undefined {
    return (
      streamingSessionStore.getMediaProductTransition(
        this.preloadedStreamingSessionId,
      )?.mediaProduct ?? undefined
    );
  }

  get preloadedStreamingSessionId(): string | undefined {
    return this.preloadPlayer?.preloadedStreamingSessionId ?? undefined;
  }
}

export const playerState: PlayerState = new PlayerState();
