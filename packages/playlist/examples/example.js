import { credentialsProvider, init as initAuth } from '@tidal-music/auth';

import { createPlaylistClient } from '../dist';

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

  const playlistClient = createPlaylistClient(credentialsProvider);
  const results = document.getElementById('results');

  /**
   * Retrieves an playlist by its ID.
   *
   * @param {string} id The ID of the playlist.
   */
  async function getPlaylist(id) {
    const { data, error } = await playlistClient.GET('/playlists/{id}', {
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
  await getPlaylist('bd878bbc-c0a1-4b81-9a2a-a16dc9926300');
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
