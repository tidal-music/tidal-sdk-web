import { nanoid as _nanoid } from 'nanoid';

vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('aRandomIdFromNanoid'),
}));
const nanoid = vi.mocked(_nanoid);

describe.sequential('uuid', () => {
  beforeEach(() => {
    nanoid.mockReturnValue('aRandomIdFromNanoid');
    // need to reset imports since there are scoped variables in the import for the lazy fallback
    vi.resetModules();
  });

  it('throws error if used before init if crypto not in globalThis', async () => {
    vi.stubGlobal('crypto', undefined);
    const { uuid } = await import('./uuid');
    expect(() => uuid()).toThrowError(
      'Uuid not initialized; run await init(); before using uuid.',
    );
  });

  it('default case: uses crypto.randomUUID', async () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('aRandomIdFromCrypto'),
    });
    const { init, uuid } = await import('./uuid');

    await init();
    expect(uuid()).toEqual('aRandomIdFromCrypto');
  });

  it('uses nanoid as a fallback', async () => {
    vi.stubGlobal('crypto', {
      randomUUID: undefined,
    });
    const { init, uuid } = await import('./uuid');
    await init();
    expect(uuid()).toEqual('aRandomIdFromNanoid');
  });
});
