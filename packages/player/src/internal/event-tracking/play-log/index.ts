export { playbackSession, playbackSessionAction } from './playback-session.js';

import type { MediaProduct } from '../../../api/interfaces.js';
import { isAuthorizedWithUser } from '../../index.js';
import { commit as baseCommit } from '../index.js';
import type { Events } from '../types.js';

import type { PlayLogProductType } from './playback-session.js';

/**
 * Maps the product type of a media product to the product type used in play log events.
 */
export function mapProductTypeToPlayLogProductType(
  productType: MediaProduct['productType'],
): PlayLogProductType {
  switch (productType) {
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
