import { expect } from 'chai';

import * as Config from '../../config';

import { getVolumeLevel } from './get-volume-level';

describe('getVolumeLevel', () => {
  it('returns desiredVolumeLevel from config', () => {
    expect(getVolumeLevel()).to.equal(Config.get('desiredVolumeLevel'));
  });
});
