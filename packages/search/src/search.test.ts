import { createSearchClient } from './search';

describe('createSearchClient', () => {
  it('creates a Search API client', () => {
    const client = createSearchClient({
      bus: vi.fn(),
      getCredentials: vi.fn(),
    });
    expect(client).toBeDefined();
  });
});
