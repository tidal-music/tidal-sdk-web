export { playbackSession, playbackSessionAction } from './playback-session';

import type { MediaProduct } from 'api/interfaces';

import { commit as beaconCommit, worker } from '../../beacon/index';
import type { CommitData } from '../../beacon/types';
import { runIfAuthorizedWithUser } from '../../helpers/run-if-authorized-with-user';

import type { PlayLogProductType } from './playback-session';

/**
 * Maps the product type of a media product to the product type used in play log events.
 */
export function mapProductTypeToPlayLogProductType(
  productType: MediaProduct['productType'],
): PlayLogProductType {
  switch (productType) {
    case 'demo':
      return 'UC';
    case 'video':
      return 'VIDEO';
    case 'track':
    default:
      return 'TRACK';
  }
}

/**
 * Send event to event system scoped to play_log category.
 */
export function commit(data: Pick<CommitData, 'events'>) {
  return runIfAuthorizedWithUser(() =>
    beaconCommit(worker, {
      type: 'play_log' as const,
      ...data,
    }),
  );
}
