/* eslint-disable no-console */
import { credentialsProvider, init as initAuth } from '@tidal-music/auth';

import { createAPIClient } from '../dist';

/**
 * Runs the example with a client ID and client secret (from https://developer.tidal.com).
 *
 * @param {string} clientId The client ID.
 * @param {string} clientSecret The client secret.
 * @param {string} searchTerm The search term.
 * @param {string} playlistId The playlist ID for pagination testing.
 */
async function runExample(clientId, clientSecret, searchTerm, playlistId) {
  await initAuth({
    clientId,
    clientSecret,
    credentialsStorageKey: 'clientCredentials',
  });

  const apiClient = createAPIClient(credentialsProvider);
  const results = document.getElementById('results');
  results.innerHTML = '';

  /**
   * Retrieves an album by its ID.
   *
   * @param {string} id The ID of the album.
   */
  async function getAlbum(id) {
    const { data, error } = await apiClient.GET('/albums/{id}', {
      params: {
        path: { id },
        query: { countryCode: 'NO' },
      },
    });

    if (error) {
      error.errors.forEach(
        err => (results.innerHTML += `<li>${err.detail}</li>`),
      );
    } else {
      for (const [key, value] of Object.entries(data.data.attributes)) {
        results.innerHTML += `<li><b>${key}:</b>${JSON.stringify(value)}</li>`;
      }
    }
  }
  // Example of an API request
  await getAlbum('75413011');

  /**
   * Retrieves an album with the tracks and other relationships.
   *
   * @param {string} albumId The ID of the album.
   */
  async function getAlbumWithTracks(albumId) {
    const { data, error } = await apiClient.GET('/albums/{albumId}', {
      params: {
        path: { albumId },
        query: { countryCode: 'NO', include: 'items,artists,providers' },
      },
    });

    if (error) {
      console.error(error);
    } else {
      console.log(data);
      console.log(JSON.stringify(data));
    }
  }
  // Example of another API request
  await getAlbumWithTracks('75413011');

  /**
   * Retrieves an artist by its ID.
   *
   * @param {string} id The ID of the artist.
   */
  async function getArtist(id) {
    const { data, error } = await apiClient.GET('/artists/{id}', {
      params: {
        path: { id },
        query: { countryCode: 'NO' },
      },
    });

    if (error) {
      console.error(error);
    } else {
      console.log(data.data.attributes.name);
    }
  }
  // Example failing API request
  await getArtist('1');

  /**
   * Retrieves a playlist by its ID.
   *
   * @param {string} id The ID of the playlist.
   */
  async function getPlaylist(id) {
    const { data, error } = await apiClient.GET('/playlists/{id}', {
      params: {
        path: { id },
        query: { countryCode: 'NO' },
      },
    });

    if (error) {
      error.errors.forEach(
        err => (results.innerHTML += `<li>${err.detail}</li>`),
      );
    } else {
      for (const [key, value] of Object.entries(data.data.attributes)) {
        results.innerHTML += `<li><b>${key}:</b>${JSON.stringify(value)}</li>`;
      }
    }
  }
  // Example of a playlist API request (basic)
  await getPlaylist('58d7349f-e79a-4e3e-aaa4-2281556fa565');

  /**
   * Retrieves all items from a playlist with pagination.
   * Tests the page[cursor] parameter handling.
   *
   * @param {string} id The ID of the playlist.
   */
  async function getPlaylistItemsWithPagination(id) {
    results.innerHTML += '<h2>Playlist Items (with pagination):</h2>';

    let allItems = [];
    let currentCursor = undefined;
    let pageCount = 0;

    // Fetch first page
    const firstResponse = await apiClient.GET('/playlists/{id}/relationships/items', {
      params: {
        path: { id },
        query: {
          countryCode: 'NO',
          include: 'items',
        },
      },
    });

    if (firstResponse.error) {
      results.innerHTML += '<h3>Error fetching first page:</h3>';
      firstResponse.error.errors.forEach(
        err => (results.innerHTML += `<li>${err.detail}</li>`),
      );
      return;
    }

    pageCount++;
    allItems = [...firstResponse.data.data];
    results.innerHTML += `<h3>Page ${pageCount} (${firstResponse.data.data.length} items):</h3>`;

    // Log the response structure for debugging
    console.log('First page response:', firstResponse.data);
    console.log('Links:', firstResponse.data.links);
    console.log('Meta cursor:', firstResponse.data.links?.meta?.nextCursor);

    // Get cursor for next page, FIXME:with "fix" for the cursor format
    currentCursor = firstResponse.data.links?.meta?.nextCursor.replaceAll("=", "");

    // Fetch remaining pages
    while (currentCursor) {
      console.log(`Fetching page ${pageCount + 1} with cursor:`, currentCursor);

      const nextResponse = await apiClient.GET('/playlists/{id}/relationships/items', {
        params: {
          path: { id },
          query: {
            countryCode: 'NO',
            include: 'items',
            'page[cursor]': currentCursor,
          },
        },
      });

      if (nextResponse.error) {
        results.innerHTML += `<h3>Error fetching page ${pageCount + 1}:</h3>`;
        nextResponse.error.errors.forEach(
          err => (results.innerHTML += `<li>Status: ${err.status}, Detail: ${err.detail}</li>`),
        );
        console.error('Error response:', nextResponse.error);
        break;
      }

      pageCount++;
      allItems = [...allItems, ...nextResponse.data.data];
      results.innerHTML += `<h3>Page ${pageCount} (${nextResponse.data.data.length} items):</h3>`;

      // Get next cursor, FIXME: with "fix" for the cursor format
      currentCursor = nextResponse.data.links?.meta?.nextCursor.replaceAll("=", "");

      // Safety limit to prevent infinite loops
      if (pageCount >= 10) {
        results.innerHTML += '<p>⚠️ Stopped at 10 pages for safety</p>';
        break;
      }
    }

    results.innerHTML += `<p><strong>Total items fetched: ${allItems.length} across ${pageCount} pages</strong></p>`;

    // Display first few items
    results.innerHTML += '<h3>First 5 items:</h3>';
    allItems.slice(0, 5).forEach((item, index) => {
      results.innerHTML += `<li>${index + 1}. Type: ${item.type}, ID: ${item.id}</li>`;
    });
  }

  // Example of paginated playlist items request
  // Using the playlist ID from the form (or default)
  await getPlaylistItemsWithPagination(playlistId || '58d7349f-e79a-4e3e-aaa4-2281556fa565');

  /**
   * Do a search for a term
   *
   * @param {string} id The search term.
   */
  async function doSearch(id) {
    // First page of results
    const { data, error } = await apiClient.GET('/searchResults/{id}', {
      params: {
        path: { id },
        query: { countryCode: 'NO', include: 'topHits' },
      },
    });

    if (error) {
      error.errors.forEach(
        err => (results.innerHTML += `<li>${err.detail}</li>`),
      );
      return;
    }

    results.innerHTML += '<h2>Search:</h2><h3>Page 1 Results:</h3>';
    data.data.relationships.topHits.data.forEach(hit => {
      const item = data.included?.find(i => i.id === hit.id);
      if (item) {
        const text = item.attributes.title || item.attributes.name;
        results.innerHTML += `<li><b>${hit.type}:</b>${text}</li>`;
      }
    });

    // Get cursor for next page
    const cursor = data.data.relationships.topHits.links.meta?.nextCursor;
    if (!cursor) {
      results.innerHTML += '<p>No more results available</p>';
      return;
    }

    // Second page of results using cursor
    const { data: data2, error: error2 } = await apiClient.GET('/searchResults/{id}/relationships/topHits', {
      params: {
        path: { id },
        query: { countryCode: 'NO', include: 'topHits', 'page[cursor]': cursor },
      },
    });

    if (error2) {
      error2.errors.forEach(
        err => (results.innerHTML += `<li>${err.detail}</li>`),
      );
    } else {
      results.innerHTML += '<h3>Page 2 Results:</h3>';
      data2.data.forEach(hit => {
        const item = data2.included?.find(i => i.id === hit.id);
        if (item) {
          const text = item.attributes.title || item.attributes.name;
          results.innerHTML += `<li><b>${hit.type}:</b>${text}</li>`;
        }
      });
    }
  }
  // Example of a search API request
  await doSearch(searchTerm);
}

const authenticateHandler = async (event, form) => {
  event.preventDefault();

  if (!form) {
    return;
  }

  const formData = new FormData(form);
  const clientId = formData.get('clientId');
  const clientSecret = formData.get('clientSecret');
  const searchTerm = formData.get('searchTerm');
  const playlistId = formData.get('playlistId');

  await runExample(clientId, clientSecret, searchTerm, playlistId);
};

window.addEventListener('load', () => {
  const form = document.getElementById('clientCredentialsForm');

  form?.addEventListener('submit', event => {
    authenticateHandler(event, form).catch(error => console.error(error));
  });
});
