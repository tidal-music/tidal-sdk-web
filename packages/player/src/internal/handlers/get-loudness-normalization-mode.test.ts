// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from '../../config';

import { getLoudnessNormalizationMode } from './get-loudness-normalization-mode';

describe('getLoudnessNormalizationMode', () => {
  it('returns loudnessNormalizationMode from config', () => {
    expect(getLoudnessNormalizationMode()).toEqual(
      Config.get('loudnessNormalizationMode'),
    );
  });
});
