import { expect } from 'chai';

import * as Config from '../../config.js';

import { getLoudnessNormalizationMode } from './get-loudness-normalization-mode.js';

describe('getLoudnessNormalizationMode', () => {
  it('returns loudnessNormalizationMode from config', () => {
    expect(getLoudnessNormalizationMode()).to.equal(
      Config.get('loudnessNormalizationMode'),
    );
  });
});
