import {
  type RetryOptions,
  type components,
  createAPIClient,
} from '@tidal-music/api';

declare const acceptString: (value: string) => void;
declare const acceptNumber: (value: number) => void;

/** Compile-only examples of required and optional playlist request fields. */
export async function playlistRequests(
  client: ReturnType<typeof createAPIClient>,
): Promise<void> {
  await client.POST('/playlists', {
    body: { data: { attributes: { name: 'Road trip' }, type: 'playlists' } },
  });
  await client.POST('/playlists', {
    // @ts-expect-error Creating a playlist requires its name when a body is supplied.
    body: { data: { attributes: {}, type: 'playlists' } },
  });
  await client.PATCH('/playlists/{id}', {
    body: { data: { attributes: {}, id: 'playlist-1', type: 'playlists' } },
    params: { path: { id: 'playlist-1' } },
  });
  await client.PATCH('/playlists/{id}', {
    body: {
      data: {
        // @ts-expect-error An omitted update field is allowed; explicit undefined is not.
        attributes: { description: undefined },
        id: 'playlist-1',
        type: 'playlists',
      },
    },
    params: { path: { id: 'playlist-1' } },
  });
  // @ts-expect-error A resource request must provide its required path id.
  await client.GET('/playlists/{id}');
  await client.GET('/playlists', {
    params: { query: { 'filter[owners.id]': ['me'], sort: ['-name'] } },
  });
  await client.GET('/playlists', {
    // @ts-expect-error Sort values must come from this endpoint's generated contract.
    params: { query: { sort: ['-unknown'] } },
  });
}

/** Success responses retain their resource types and missing-value checks. */
export async function playlistResponses(
  client: ReturnType<typeof createAPIClient>,
): Promise<void> {
  const result = await client.GET('/playlists');
  // @ts-expect-error The client may return an API error rather than a success document.
  acceptNumber(result.data.data.length);
  if (result.data) {
    const playlist = result.data.data[0];
    // @ts-expect-error A successful list response may contain no playlists.
    acceptString(playlist.id);
    if (playlist) {
      acceptString(playlist.id);
      // @ts-expect-error Playlist identifiers are strings, not numbers.
      acceptNumber(playlist.id);
      // @ts-expect-error Sparse responses may omit attributes or their optional description.
      acceptString(playlist.attributes?.description);
    }
  }
}

/** A nullable API value must be narrowed before use as a string. */
export function nullableResponse(
  attributes: components['schemas']['Tracks_Attributes'],
): void {
  // @ts-expect-error The API permits a null ISRC even when the attributes are present.
  acceptString(attributes.isrc);
  if (attributes.isrc !== null) {
    acceptString(attributes.isrc);
  }
}

export const defaultShare: components['schemas']['SharesCreateOperation_Payload_Data_Attributes'] =
  { role: 'VIEWER' };
export const nullableShare: components['schemas']['SharesCreateOperation_Payload_Data_Attributes'] =
  { expiresAt: null, maxUses: null, role: 'VIEWER' };
// @ts-expect-error Nullable share options allow omission and null, but not explicit undefined.
export const undefinedShare: components['schemas']['SharesCreateOperation_Payload_Data_Attributes'] =
  { expiresAt: undefined, role: 'VIEWER' };

export const defaultRetry: RetryOptions = {};
export const partialRetry: RetryOptions = { status: { maxRetries: 2 } };
// @ts-expect-error An omitted retry switch uses its default; undefined is not an explicit setting.
export const undefinedRetry: RetryOptions = { enabled: undefined };
