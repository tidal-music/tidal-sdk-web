import { helloCatalogue } from './catalogue';

describe('helloCatalogue', () => {
  it("greets with Catalogue's name", () => {
    const debug = vi.fn();
    vi.stubGlobal('console', { debug });
    helloCatalogue();
    expect(debug).toHaveBeenCalledWith('This is a hello from Catalogue');
  });
});
