import { createAPIClient } from './api';

const mockCredentialsProvider = () => ({
  bus: vi.fn(),
  getCredentials: vi.fn().mockResolvedValue({
    clientId: 'test-client',
    requestedScopes: [],
    token: 'test-access-token',
  }),
});

describe('createAPIClient', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          headers: new Headers({ 'Content-Type': 'application/json' }),
          status: 200,
        }),
      ),
    );
  });

  it('creates a TIDAL API client', () => {
    const provider = mockCredentialsProvider();
    const client = createAPIClient(provider);
    expect(client).toBeDefined();
    expect(client.GET).toBeDefined();
    expect(client.POST).toBeDefined();
  });

  function getLastFetchRequest(): Request {
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    const request = call?.[0];
    if (!request) {
      throw new Error('fetch was not called');
    }
    return request as Request;
  }

  it('calls getCredentials and sets Authorization header on request', async () => {
    const provider = mockCredentialsProvider();
    const client = createAPIClient(provider);
    await client.GET('/albums');

    expect(provider.getCredentials).toHaveBeenCalled();
    const request = getLastFetchRequest();
    expect(request.url).toBe('https://openapi.tidal.com/v2/albums');
    expect(request.headers.get('Authorization')).toBe(
      'Bearer test-access-token',
    );
  });

  it('uses custom baseUrl when provided', async () => {
    const provider = mockCredentialsProvider();
    const client = createAPIClient(provider, 'https://custom.api.example/');
    await client.GET('/albums');

    const request = getLastFetchRequest();
    expect(request.url).toBe('https://custom.api.example/albums');
  });

  it('sets Content-Type to application/vnd.api+json for POST requests', async () => {
    const provider = mockCredentialsProvider();
    const client = createAPIClient(provider);
    await client.POST('/albums', {
      body: {
        data: {
          attributes: { title: 'Test Album' },
          relationships: {
            artists: { data: [{ id: '123', type: 'artists' }] },
          },
          type: 'albums',
        },
      },
    });

    const request = getLastFetchRequest();
    expect(request.headers.get('Content-Type')).toBe(
      'application/vnd.api+json',
    );
  });

  it('does not set Content-Type for GET requests', async () => {
    const provider = mockCredentialsProvider();
    const client = createAPIClient(provider);
    await client.GET('/albums');

    const request = getLastFetchRequest();
    expect(request.headers.get('Content-Type')).not.toBe(
      'application/vnd.api+json',
    );
  });
});
