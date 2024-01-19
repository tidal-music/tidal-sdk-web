import { helloTemplate } from './template';

describe('helloTemplate', () => {
  it("greets with Template's name", () => {
    const debug = vi.fn();
    vi.stubGlobal('console', { debug });
    helloTemplate();
    expect(debug).toHaveBeenCalledWith('This is a hello from Template');
  });
});
