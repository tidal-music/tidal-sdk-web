// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import { ended } from './ended';

describe('ended', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const result = ended('completed', {
      productId: '123',
      productType: 'track',
      sourceId: '',
      sourceType: '',
    });

    expect(result instanceof CustomEvent).toEqual(true);
    expect(result.type).toEqual('ended');
    expect(result.detail.reason).toEqual('completed');
  });
});
