import { expect } from 'chai';

import * as Config from '../../config.js';

import { setLoudnessNormalizationMode } from './set-loudness-normalization-mode.js';

describe('setLoudnessNormalizationMode', () => {
  it('sets the normalization mode in config', () => {
    setLoudnessNormalizationMode('TRACK');

    expect(Config.get('loudnessNormalizationMode')).to.equal('TRACK');
  });
});
