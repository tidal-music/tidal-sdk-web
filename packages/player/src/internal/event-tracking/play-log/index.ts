export { playbackSession, playbackSessionAction } from './playback-session';

import type { MediaProduct } from '../../../api/interfaces';
import { isAuthorizedWithUser } from '../../index';
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
 * Send event to event system scoped to play_log / play_log_open group.
 */
export async function commit(data: Events) {
  const authorizedWithUser = await isAuthorizedWithUser();
  for (const event of data) {
    if (event) {
      const resolvedEvent = await event;
      if (resolvedEvent) {
        await baseCommit({
          ...('extras' in resolvedEvent && { extras: resolvedEvent.extras }),
          group: authorizedWithUser ? 'play_log' : 'play_log_open',
          name: resolvedEvent.name,
          payload: resolvedEvent.payload,
          version: 2,
        });
      }
    }
  }
}
