import type { MediaProductTransitionPayload } from '../../api/event/media-product-transition';

import type { StreamInfo } from './manifest-parser';
import type { PlaybackInfo } from './playback-info-resolver';

class StreamingSessionStore {
  #mediaProductTransitions = new Map<string, MediaProductTransitionPayload>();

  #playbackInfos = new Map<string, PlaybackInfo>();

  #streamInfos = new Map<string, StreamInfo>();

  /**
   * Clones a session to re-use the media product and playback content for a new session.
   *
   * @param from - streamingSessionId to clone
   * @param to - target streamingSessionId
   */
  clone(from: string, to: string) {
    const mediaProductTransition = this.getMediaProductTransition(from);
    const streamInfo = this.getStreamInfo(from);
    const playbackInfo = this.getPlaybackInfo(from);

    if (!mediaProductTransition || !streamInfo || !playbackInfo) {
      throw new Error(
        `Cannot clone ${from}. Missing mediaProductTransition or streamInfo.`,
      );
    }

    this.saveMediaProductTransition(to, {
      ...mediaProductTransition,
      playbackContext: {
        ...mediaProductTransition.playbackContext,
        playbackSessionId: to,
      },
    });
    this.saveStreamInfo(to, {
      ...streamInfo,
      streamingSessionId: to,
    });
    this.savePlaybackInfo(to, {
      ...playbackInfo,
      streamingSessionId: to,
    });
  }

  deleteMediaProductTransition(streamingSessionId: string) {
    this.#mediaProductTransitions.delete(streamingSessionId);
  }

  /**
   * Removed cached playbackInfo, streamInfo and mediaProductTransition for session.
   * For re-using playbackInfo etc for other sessions make sure to run clone before deletion!
   *
   * @see {@link StreamingSessionStore.clone}
   */
  deleteSession(streamingSessionId: string) {
    this.deleteMediaProductTransition(streamingSessionId);
    this.#playbackInfos.delete(streamingSessionId);
    this.deleteStreamInfo(streamingSessionId);
  }

  deleteStreamInfo(streamingSessionId: string) {
    this.#streamInfos.delete(streamingSessionId);
  }

  getMediaProductTransition(
    streamingSessionId: string | undefined,
  ): MediaProductTransitionPayload | undefined {
    return streamingSessionId
      ? this.#mediaProductTransitions.get(streamingSessionId)
      : undefined;
  }

  getPlaybackInfo(
    streamingSessionId: string | undefined,
  ): PlaybackInfo | undefined {
    return streamingSessionId
      ? this.#playbackInfos.get(streamingSessionId)
      : undefined;
  }

  getStreamInfo(
    streamingSessionId: string | undefined,
  ): StreamInfo | undefined {
    return streamingSessionId
      ? this.#streamInfos.get(streamingSessionId)
      : undefined;
  }

  hasMediaProductTransition(streamingSessionId: string) {
    return this.#mediaProductTransitions.has(streamingSessionId);
  }

  hasPlaybackInfo(streamingSessionId: string) {
    return this.#playbackInfos.has(streamingSessionId);
  }

  hasStreamInfo(streamingSessionId: string) {
    return this.#streamInfos.has(streamingSessionId);
  }

  overwriteDuration(streamingSessionId: string, updatedDuration: number) {
    const mediaProductTransition =
      this.#mediaProductTransitions.get(streamingSessionId);

    if (!mediaProductTransition) {
      return;
    }

    mediaProductTransition.playbackContext = {
      ...mediaProductTransition.playbackContext,
      actualDuration: updatedDuration,
    };

    this.saveMediaProductTransition(streamingSessionId, mediaProductTransition);
  }

  saveMediaProductTransition(
    streamingSessionId: string,
    mediaProductTransition: MediaProductTransitionPayload,
  ) {
    this.#mediaProductTransitions.set(
      streamingSessionId,
      mediaProductTransition,
    );
  }

  savePlaybackInfo(streamingSessionId: string, streamInfo: PlaybackInfo) {
    this.#playbackInfos.set(streamingSessionId, streamInfo);
  }

  saveStreamInfo(streamingSessionId: string, streamInfo: StreamInfo) {
    this.#streamInfos.set(streamingSessionId, streamInfo);
  }
}

export const streamingSessionStore = new StreamingSessionStore();
