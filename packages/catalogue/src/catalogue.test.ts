import { createCatalogueClient } from './catalogue';

describe('createCatalogueClient', () => {
  it.todo("greets with Catalogue's name", () => {
    const debug = vi.fn();
    vi.stubGlobal('console', { debug });
    createCatalogueClient();
    expect(debug).toHaveBeenCalledWith('This is a hello from Catalogue');
  });
});
