/* eslint-disable no-console */
import { credentialsProvider, init as initAuth } from '@tidal-music/auth';

import { createAPIClient } from '../dist';

/**
 * Runs the example with a client ID and client secret (from https://developer.tidal.com).
 *
 * @param {string} clientId The client ID.
 * @param {string} clientSecret The client secret.
 * @param {string} searchTerm The search term.
 */
async function runExample(clientId, clientSecret, searchTerm) {
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
  // Example of a playlist API request
  await getPlaylist('bd878bbc-c0a1-4b81-9a2a-a16dc9926300');

  /**
   * Do a search for a term
   *
   * @param {string} query The search term.
   */
  async function doSearch(query) {
    const { data, error } = await apiClient.GET('/searchresults/{query}', {
      params: {
        path: { query },
        query: { countryCode: 'NO', include: 'topHits' },
      },
    });

    if (error) {
      error.errors.forEach(
        err => (results.innerHTML += `<li>${err.detail}</li>`),
      );
    } else {
      data.data.relationships.topHits.data.forEach(hit => {
        const item = data.included.find(i => i.id === hit.id);
        const text = item.attributes.title || item.attributes.name;
        results.innerHTML += `<li><b>${hit.type}:</b>${text}</li>`;
      });
    }
  }
  // Example of a search API request
  await doSearch(searchTerm);

  /**
   * Retrieves User Public Profile by their ID.
   *
   * @param {string} id The ID of the user.
   */
  async function getUserPublicProfile(id) {
    const { data, error } = await apiClient.GET('/userPublicProfiles/{id}', {
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
      for (const [key, value] of Object.entries(data.data)) {
        results.innerHTML += `<li><b>${key}:</b>${JSON.stringify(value)}</li>`;
      }
    }
  }
  // Example of a user API request
  await getUserPublicProfile('12345');
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

  await runExample(clientId, clientSecret, searchTerm);
};

window.addEventListener('load', () => {
  const form = document.getElementById('clientCredentialsForm');

  form?.addEventListener('submit', event => {
    authenticateHandler(event, form).catch(error => console.error(error));
  });
});
