import { helloSearch } from './search';

describe('helloSearch', () => {
  it("greets with Search's name", () => {
    const debug = vi.fn();
    vi.stubGlobal('console', { debug });
    helloSearch();
    expect(debug).toHaveBeenCalledWith('This is a hello from Search');
  });
});
