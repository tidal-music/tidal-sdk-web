import { createPlaylistClient } from './playlist';

describe('createPlaylistClient', () => {
  it('creates a Playlist API client', () => {
    const client = createPlaylistClient({
      bus: vi.fn(),
      getCredentials: vi.fn(),
    });
    expect(client).toBeDefined();
  });
});
