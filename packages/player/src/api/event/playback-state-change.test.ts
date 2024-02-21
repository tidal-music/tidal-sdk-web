// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import { playbackStateChange } from './playback-state-change';

describe('PlaybackStateChange', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const result = playbackStateChange('IDLE');

    expect(result instanceof CustomEvent).toEqual(true);
    expect(result.type).toEqual('playback-state-change');
    expect(result.detail.state).toEqual('IDLE');
  });
});
