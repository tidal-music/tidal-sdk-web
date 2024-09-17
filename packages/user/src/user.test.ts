import { createUserClient } from './user';

describe('createUserClient', () => {
  it('creates a User API client', () => {
    const client = createUserClient({
      bus: vi.fn(),
      getCredentials: vi.fn(),
    });
    expect(client).toBeDefined();
  });
});
