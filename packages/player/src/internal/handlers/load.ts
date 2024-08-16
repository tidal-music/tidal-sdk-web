import type { MediaProduct } from '../../api/interfaces';
import * as Config from '../../config';
import { events } from '../../event-bus';
import * as StreamingMetrics from '../../internal/event-tracking/streaming-metrics/index';
import { generateGUID } from '../../internal/helpers/generate-guid';
import { parseManifest } from '../../internal/helpers/manifest-parser';
import { fetchPlaybackInfo } from '../../internal/helpers/playback-info-resolver';
import type { PlaybackInfo } from '../../internal/helpers/playback-info-resolver';
import { streamingSessionStore } from '../../internal/helpers/streaming-session-store';
import { PlayerError, credentialsProviderStore } from '../../internal/index';
import ConnectionHandler from '../../internal/services/connection-handler';
import { getAppropriatePlayer, setActivePlayer } from '../../player/index';
import { playerState } from '../../player/state';
import { Pushkin } from '../services/pushkin';
import { trueTime } from '../true-time';

import { reset } from './reset';
import { latestNextCall } from './set-next';

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
 * @see {@link import('../../api/event/playback-state-change').PlaybackStateChange}
 *
 * @returns {Promise<void>} - On resolve, the requested media product is considered the active one and a MediaProductTransition will have been sent.
 */
export async function load(
  mediaProduct: MediaProduct,
  assetPosition = 0,
  prefetch = false,
) {
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
    playerState.activePlayer?.nextItem &&
    playerState.activePlayer.nextItem.mediaProduct.productId ===
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

  StreamingMetrics.commit({
    events: [
      StreamingMetrics.streamingSessionStart({
        sessionProductId: mediaProduct.productId,
        sessionProductType:
          mediaProduct.productType === 'track' ? 'TRACK' : 'VIDEO',
        sessionType: 'PLAYBACK',
        startReason: 'EXPLICIT',
        streamingSessionId,
        timestamp: trueTime.now(),
      }),
    ],
  }).catch(console.error);

  performance.mark(
    'streaming_metrics:playback_statistics:idealStartTimestamp',
    {
      detail: streamingSessionId,
      startTime: trueTime.now(),
    },
  );

  const { clientId, token } =
    await credentialsProviderStore.credentialsProvider.getCredentials();

  const streamingWifiAudioQuality = Config.get('streamingWifiAudioQuality');

  let playbackInfo: PlaybackInfo | null = null;

  try {
    playbackInfo = await fetchPlaybackInfo({
      accessToken: token,
      audioQuality: streamingWifiAudioQuality,
      clientId,
      mediaProduct,
      prefetch,
      streamingSessionId,
    });
  } catch (e) {
    if (e instanceof PlayerError) {
      events.dispatchError(e);
    }

    if (document.location.href.includes('localhost')) {
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
  const player = await getAppropriatePlayer(
    mediaProduct.productType,
    audioQuality,
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
