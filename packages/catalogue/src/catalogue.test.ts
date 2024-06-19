import { createCatalogueClient } from './catalogue';

describe('createCatalogueClient', () => {
  it('creates a Catalogue API client', () => {
    const client = createCatalogueClient({
      bus: vi.fn(),
      getCredentials: vi.fn(),
    });
    expect(client).toBeDefined();
  });
});
