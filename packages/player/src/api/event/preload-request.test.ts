// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import { preloadRequest } from './preload-request';

describe('preloadRequest', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const result = preloadRequest();

    expect(result instanceof CustomEvent).toEqual(true);
    expect(result.type).toEqual('preload-request');
  });
});
