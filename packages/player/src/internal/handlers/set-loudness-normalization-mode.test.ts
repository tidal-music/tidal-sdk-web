import { expect } from 'chai';

import * as Config from '../../config';

import { setLoudnessNormalizationMode } from './set-loudness-normalization-mode';

describe('setLoudnessNormalizationMode', () => {
  it('sets the normalization mode in config', () => {
    setLoudnessNormalizationMode('TRACK');

    expect(Config.get('loudnessNormalizationMode')).to.equal('TRACK');
  });
});
