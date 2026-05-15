import { helloTemplate } from './template.js';

vi.mock('./template', () => ({
  helloTemplate: vi.fn(),
}));

describe('helloTemplate', () => {
  it("greets with Template's name", async () => {
    await import('./index.js');
    expect(helloTemplate).toHaveBeenCalled();
  });
});
