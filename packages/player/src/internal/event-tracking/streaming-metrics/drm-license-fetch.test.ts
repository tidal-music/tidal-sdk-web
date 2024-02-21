// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import { drmLicenseFetch } from './drm-license-fetch';

describe('drmLicenseFetch', () => {
  it('sets values', async () => {
    const before = await drmLicenseFetch({
      streamingSessionId: 'the-fitness-gram-pacer-text',
    });

    const after = await drmLicenseFetch({
      endReason: 'ERROR',
      streamingSessionId: 'the-fitness-gram-pacer-text',
    });

    if (!after) {
      throw new Error('Event undefined');
    }

    expect(before).not.toEqual(after);
    expect(after.payload.endReason).toEqual('ERROR');
  });
});
