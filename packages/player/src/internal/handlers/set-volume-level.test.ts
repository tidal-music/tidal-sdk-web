// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from '../../config';

import { setVolumeLevel } from './set-volume-level';

describe('setVolumeLevel', () => {
  it('sets desiredVolumeLevel in config', () => {
    setVolumeLevel(0.6);

    expect(Config.get('desiredVolumeLevel')).toEqual(0.6);
  });
});
