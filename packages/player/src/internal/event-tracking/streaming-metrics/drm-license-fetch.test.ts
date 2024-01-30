import { expect } from 'chai';

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

    expect(before).to.not.equal(after);
    expect(after.payload.endReason).to.equal('ERROR');
  });
});
