// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from '../../config';

import { getVolumeLevel } from './get-volume-level';

describe('getVolumeLevel', () => {
  it('returns desiredVolumeLevel from config', () => {
    expect(getVolumeLevel()).toEqual(Config.get('desiredVolumeLevel'));
  });
});
