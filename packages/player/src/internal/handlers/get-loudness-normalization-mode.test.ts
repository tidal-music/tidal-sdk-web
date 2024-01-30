import { expect } from 'chai';

import * as Config from '../../config';

import { getLoudnessNormalizationMode } from './get-loudness-normalization-mode';

describe('getLoudnessNormalizationMode', () => {
  it('returns loudnessNormalizationMode from config', () => {
    expect(getLoudnessNormalizationMode()).to.equal(
      Config.get('loudnessNormalizationMode'),
    );
  });
});
