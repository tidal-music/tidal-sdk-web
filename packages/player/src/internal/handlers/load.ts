import type { MediaProduct } from '../../api/interfaces.js';
import * as Config from '../../config.js';
import { events } from '../../event-bus.js';
import * as StreamingMetrics from '../../internal/event-tracking/streaming-metrics/index.js';
import { generateGUID } from '../../internal/helpers/generate-guid.js';
import { parseManifest } from '../../internal/helpers/manifest-parser.js';
import { fetchPlaybackInfo } from '../../internal/helpers/playback-info-resolver.js';
import type { PlaybackInfo } from '../../internal/helpers/playback-info-resolver.js';
import { streamingSessionStore } from '../../internal/helpers/streaming-session-store.js';
import {
  PlayerError,
  credentialsProviderStore,
  eventSenderStore,
} from '../../internal/index.js';
import ConnectionHandler from '../../internal/services/connection-handler.js';
import {
  getAppropriatePlayer,
  predictPlayerType,
  setActivePlayer,
} from '../../player/index.js';
import { playerState } from '../../player/state.js';
import { Pushkin } from '../services/pushkin.js';
import { trueTime } from '../true-time.js';

import { reset } from './reset.js';
import { latestNextCall } from './set-next.js';

/**
 * Will reset TIDAL Player from any current state and immediately make a
 * transition to the provided media product.
 *
 * Playback state will immediately change to NOT_PLAYING.
 *
 * @param {MediaProduct} mediaProduct - The media product to load.
 * @param {number} assetPosition - At which time in seconds playback should start when later calling the play method, defaults to 0.
 * @param {boolean} prefetch - Wether or not this is a prefetch. This should be set to true if you need a media product transition to boot the UI.
 *
 * @see {@link PlaybackStateChange}
 *
 * @returns {Promise<void>} - On resolve, the requested media product is considered the active one and a MediaProductTransition will have been sent.
 */
export async function load(
  mediaProduct: MediaProduct,
  assetPosition = 0,
  prefetch = false,
) {
  if (!eventSenderStore.hasEventSender()) {
    throw new Error('Playback not allowed without an event sender.');
  }

  await trueTime.synchronize();

  Pushkin.ensure().catch(console.error);

  /**
   * If next has been called and is processing, or is done with, loading the media product
   * we're trying to load; await that promise so the next if check for next item passes.
   */
  if (
    latestNextCall &&
    latestNextCall.mediaProduct?.productId === mediaProduct.productId
  ) {
    await latestNextCall.promise;
  }

  /**
   * Is the item we're going to play is already preloaded, skip to the preloaded
   * playbackinfo and player instead of loading it again.
   */
  if (
    playerState.activePlayer?.nextItem?.mediaProduct.productId ===
    mediaProduct.productId
  ) {
    const player = playerState.activePlayer;

    performance.mark(
      'streaming_metrics:playback_statistics:idealStartTimestamp',
      {
        detail: playerState.preloadedStreamingSessionId,
        startTime: trueTime.now(),
      },
    );

    await player.reset({ keepPreload: true });

    if (mediaProduct.referenceId && playerState.preloadedStreamingSessionId) {
      player.overwriteMediaProduct(
        playerState.preloadedStreamingSessionId,
        mediaProduct,
      );
    }

    return player.skipToPreloadedMediaProduct();
  }

  // Start reset process but do not wait for it to finish - keep fetching PBI.
  // Awaited further down before calling the load method on the player.
  const resetPromise = reset();

  const streamingSessionId = generateGUID();

  StreamingMetrics.commit([
    StreamingMetrics.streamingSessionStart({
      sessionProductId: mediaProduct.productId,
      sessionProductType:
        mediaProduct.productType === 'track' ? 'TRACK' : 'VIDEO',
      sessionType: 'PLAYBACK',
      startReason: 'EXPLICIT',
      streamingSessionId,
      timestamp: trueTime.now(),
    }),
  ]).catch(console.error);

  performance.mark(
    'streaming_metrics:playback_statistics:idealStartTimestamp',
    {
      detail: streamingSessionId,
      startTime: trueTime.now(),
    },
  );

  const { clientId, token } =
    await credentialsProviderStore.credentialsProvider.getCredentials();

  const audioAdaptiveBitrateStreaming = Config.get(
    'audioAdaptiveBitrateStreaming',
  );
  const streamingWifiAudioQuality = Config.get('streamingWifiAudioQuality');

  let playbackInfo: PlaybackInfo | null = null;

  const playerType = predictPlayerType(
    mediaProduct.productType,
    streamingWifiAudioQuality,
  );

  try {
    playbackInfo = await fetchPlaybackInfo({
      accessToken: token,
      audioAdaptiveBitrateStreaming,
      audioQuality: streamingWifiAudioQuality,
      clientId,
      mediaProduct,
      playerType,
      prefetch,
      streamingSessionId,
    });
  } catch (e) {
    if (e instanceof PlayerError) {
      events.dispatchError(e);
    }

    if (
      document.location.hostname === 'localhost' ||
      document.location.hostname === 'dev.tidal.com'
    ) {
      console.error(e);
    }
  }

  if (!playbackInfo) {
    return;
  }

  const streamInfo = parseManifest(playbackInfo);

  streamingSessionStore.saveStreamInfo(
    streamInfo.streamingSessionId,
    streamInfo,
  );

  await resetPromise;

  ConnectionHandler.enable();

  const audioQuality =
    'trackId' in playbackInfo ? playbackInfo.audioQuality : undefined;

  const mimeType = playbackInfo.manifestMimeType;

  /**
   * At the moment a config is provided by the client to pick the player based on quality.
   * This is not ideal we need to pick the optimal player based on the current
   * platform & the mimeType the players support not the quality mapping provided by the client.
   */
  const player = await getAppropriatePlayer(
    mediaProduct.productType,
    audioQuality,
    mimeType,
  );

  setActivePlayer(player);

  return player.load(
    {
      assetPosition,
      mediaProduct,
      playbackInfo,
      streamInfo,
    },
    'explicit',
  );
}

events.addEventListener('load', e => {
  if (e instanceof CustomEvent) {
    const { currentTime, mediaProduct } = e.detail as {
      currentTime: number;
      mediaProduct: MediaProduct;
    };

    load(mediaProduct, currentTime).then().catch(console.error);
  }
});
