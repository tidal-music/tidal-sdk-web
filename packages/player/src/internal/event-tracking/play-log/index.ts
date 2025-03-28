export { playbackSession, playbackSessionAction } from './playback-session';

import type { MediaProduct } from 'api/interfaces';

import { runIfAuthorizedWithUser } from '../../helpers/run-if-authorized-with-user';
import { commit as baseCommit } from '../index';
import type { Events } from '../types';

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
export async function commit(data: Events) {
  return runIfAuthorizedWithUser(async () => {
    for (const event of data) {
      if (event) {
        const resolvedEvent = await event;
        if (resolvedEvent) {
          await baseCommit({
            group: 'play_log',
            name: resolvedEvent.name,
            payload: resolvedEvent.payload,
            version: 2,
          });
        }
      }
    }
  });
}
