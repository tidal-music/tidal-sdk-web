import { helloTemplate } from './template';

vi.mock('./template', () => ({
  helloTemplate: vi.fn(),
}));

describe('helloTemplate', () => {
  it("greets with Template's name", async () => {
    await import('./index');
    expect(helloTemplate).toHaveBeenCalled();
  });
});
