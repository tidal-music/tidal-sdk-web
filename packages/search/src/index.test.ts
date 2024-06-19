import { helloSearch } from './search';

vi.mock('./search', () => ({
  helloSearch: vi.fn(),
}));

describe('helloSearch', () => {
  it("greets with Search's name", async () => {
    await import('./index');
    expect(helloSearch).toHaveBeenCalled();
  });
});
