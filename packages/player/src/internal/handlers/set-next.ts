import type { MediaProduct } from '../../api/interfaces';
import * as Config from '../../config';
import { generateGUID } from '../../internal/helpers/generate-guid';
import { parseManifest } from '../../internal/helpers/manifest-parser';
import { fetchPlaybackInfo } from '../../internal/helpers/playback-info-resolver';
import type { PlaybackInfo } from '../../internal/helpers/playback-info-resolver';
import {
  cancelQueuedOnendedHandler,
  getAppropriatePlayer,
  maybeSwitchPlayerOnEnd,
  unloadPreloadedMediaProduct,
} from '../../player/index';
import { playerState } from '../../player/state';
import * as PlayLog from '../event-tracking/play-log/index';
import * as StreamingMetrics from '../event-tracking/streaming-metrics/index';
import { streamingSessionStore } from '../helpers/streaming-session-store';
import { credentialsProviderStore } from '../index';
import { trueTime } from '../true-time';

let controller: AbortController;

/**
 * Cache the latest next call to assert on it for subsequent load and
 * next calls, to re-use the promise for the same media products.
 */
export let latestNextCall: {
  mediaProduct: MediaProduct | undefined;
  promise: ReturnType<typeof _setNext>;
};

async function _setNext(
  mediaProduct?: MediaProduct,
  sessionTags: Array<string> = [],
) {
  cancelQueuedOnendedHandler();

  // If next handler is called with undefined/null as media product, we treat that as an unset.
  if (!mediaProduct) {
    return unloadPreloadedMediaProduct();
  }

  const streamingSessionId = generateGUID();

  if (
    playerState.preloadedStreamingSessionId &&
    playerState.preloadedMediaProduct &&
    playerState.preloadedMediaProduct.productId === mediaProduct.productId
  ) {
    streamingSessionStore.clone(
      playerState.preloadedStreamingSessionId,
      streamingSessionId,
    );
  }

  const startTimestamp = trueTime.now();

  StreamingMetrics.commit({
    events: [
      StreamingMetrics.streamingSessionStart({
        sessionTags,
        startReason: 'IMPLICIT',
        streamingSessionId,
        timestamp: startTimestamp,
      }),
    ],
  }).catch(console.error);

  const { clientId, token } =
    await credentialsProviderStore.credentialsProvider.getCredentials();

  const streamingWifiAudioQuality = Config.get('streamingWifiAudioQuality');

  let playbackInfo: PlaybackInfo | undefined;

  if (streamingSessionStore.hasPlaybackInfo(streamingSessionId)) {
    const storedPlaybackInfo =
      streamingSessionStore.getPlaybackInfo(streamingSessionId);

    if (storedPlaybackInfo && storedPlaybackInfo.expires > trueTime.now()) {
      playbackInfo = storedPlaybackInfo;
    }
  }

  if (playbackInfo === undefined) {
    try {
      playbackInfo = await fetchPlaybackInfo({
        accessToken: token,
        audioQuality: streamingWifiAudioQuality,
        clientId,
        mediaProduct,
        prefetch: false,
        streamingSessionId,
      });

      streamingSessionStore.savePlaybackInfo(streamingSessionId, playbackInfo);
    } catch (e) {
      console.error(
        'Fetching playback info for preloaded item failed. Try again or do a load when playback ends.',
        e,
      );
      throw e;
    }
  }

  playerState.preloadPlayer = await getAppropriatePlayer(
    mediaProduct.productType,
    'trackId' in playbackInfo ? playbackInfo.audioQuality : undefined,
  );

  const streamInfo = parseManifest(playbackInfo);

  streamingSessionStore.saveStreamInfo(
    streamInfo.streamingSessionId,
    streamInfo,
  );

  PlayLog.playbackSession({
    actualAssetPresentation: playbackInfo.assetPresentation,
    actualAudioMode:
      'audioMode' in playbackInfo ? playbackInfo.audioMode : null,
    actualProductId: String(
      'videoId' in playbackInfo ? playbackInfo.videoId : playbackInfo.trackId,
    ),
    actualQuality: streamInfo.quality,
    isPostPaywall: playbackInfo.assetPresentation === 'FULL',
    // Euw...
    playbackSessionId: streamingSessionId,
    productType: mediaProduct.productType === 'track' ? 'TRACK' : 'VIDEO',
    requestedProductId: mediaProduct.productId,
    sourceId: mediaProduct.sourceId,
    sourceType: mediaProduct.sourceType,
    startAssetPosition: 0,
    startTimestamp,
    streamingSessionId,
  });

  StreamingMetrics.commit({
    events: [
      StreamingMetrics.streamingSessionStart({ streamingSessionId }),
      StreamingMetrics.playbackInfoFetch({ streamingSessionId }),
    ],
  }).catch(console.error);

  const { activePlayer } = playerState;
  const samePlayer =
    activePlayer &&
    playerState.preloadPlayer &&
    activePlayer.name === playerState.preloadPlayer.name;

  if (samePlayer) {
    await activePlayer.next({
      assetPosition: 0,
      mediaProduct,
      playbackInfo,
      streamInfo,
    });
  } else if (activePlayer) {
    await playerState.preloadPlayer.next({
      assetPosition: 0,
      mediaProduct,
      playbackInfo,
      streamInfo,
    });
  }

  maybeSwitchPlayerOnEnd(playerState.preloadPlayer);
}

/**
 * Tell TIDAL Player to make an implicit transition to the selected media product
 * once the currently active product finishes playing. Can also be used to prepare
 * a media product for playback. Calling with mediaProduct set to undefined triggers
 * an unset of the previously setNext call.
 *
 * @param {MediaProduct | undefined} mediaProduct
 * @param {Array<string>} sessionTags
 */
export function setNext(
  mediaProduct?: MediaProduct,
  sessionTags: Array<string> = [],
) {
  /**
   * If next has already been called with the same media product,
   * return that promise instead of fetching playback info and
   * setting up the player again.
   */
  if (
    mediaProduct !== undefined &&
    latestNextCall &&
    latestNextCall.mediaProduct?.productId === mediaProduct.productId
  ) {
    // Spam protection, return same promise as before
    if (controller && !controller.signal.aborted) {
      return latestNextCall.promise;
    }
  }

  controller = new AbortController();
  const promise = _setNext(mediaProduct, sessionTags).then(() => {
    controller.abort('done');
  });

  latestNextCall = {
    mediaProduct,
    promise,
  };

  return promise;
}
