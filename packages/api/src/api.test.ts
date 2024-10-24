import { createAPIClient } from './api';

describe('createAPIClient', () => {
  it('creates a TIDAL API client', () => {
    const client = createAPIClient({
      bus: vi.fn(),
      getCredentials: vi.fn(),
    });
    expect(client).toBeDefined();
  });
});
