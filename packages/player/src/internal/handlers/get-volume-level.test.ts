import { expect } from 'chai';

import * as Config from '../../config.js';

import { getVolumeLevel } from './get-volume-level.js';

describe('getVolumeLevel', () => {
  it('returns desiredVolumeLevel from config', () => {
    expect(getVolumeLevel()).to.equal(Config.get('desiredVolumeLevel'));
  });
});
