/* eslint-disable no-console */
import { credentialsProvider, init as initAuth } from '@tidal-music/auth';

import { createCatalogueClient } from '../dist';

/**
 * Runs the example with a client ID and client secret (from https://developer.tidal.com).
 *
 * @param {string} clientId The client ID.
 * @param {string} clientSecret The client secret.
 */
async function runExample(clientId, clientSecret) {
  await initAuth({
    clientId,
    clientSecret,
    credentialsStorageKey: 'clientCredentials',
  });

  const catalogueClient = createCatalogueClient(credentialsProvider);
  const results = document.getElementById('results');

  /**
   * Retrieves an album by its ID.
   *
   * @param {string} id The ID of the album.
   */
  async function getAlbum(id) {
    const { data, error } = await catalogueClient.GET('/albums/{id}', {
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
    const { data, error } = await catalogueClient.GET('/albums/{albumId}', {
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
    const { data, error } = await catalogueClient.GET('/artists/{id}', {
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
}

const authenticateHandler = async (event, form) => {
  event.preventDefault();

  if (!form) {
    return;
  }

  const formData = new FormData(form);
  const clientId = formData.get('clientId');
  const clientSecret = formData.get('clientSecret');

  await runExample(clientId, clientSecret);

  form.style.display = 'none';
};

window.addEventListener('load', () => {
  const form = document.getElementById('clientCredentialsForm');

  form?.addEventListener('submit', event => {
    authenticateHandler(event, form).catch(error => console.error(error));
  });
});
