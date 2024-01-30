import { expect } from 'chai';

import { playbackStateChange } from './playback-state-change';

describe('PlaybackStateChange', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const result = playbackStateChange('IDLE');

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal('playback-state-change');
    expect(result.detail.state).to.equal('IDLE');
  });
});
