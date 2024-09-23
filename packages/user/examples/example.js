/* eslint-disable no-console */
import { credentialsProvider, init as initAuth } from '@tidal-music/auth';

import { createUserClient } from '../dist';

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

  const userClient = createUserClient(credentialsProvider);
  const results = document.getElementById('results');

  /**
   * Retrieves User Public Profile by their ID.
   *
   * @param {string} id The ID of the user.
   */
  async function getUserPublicProfile(id) {
    const { data, error } = await userClient.GET('/userPublicProfiles/{id}', {
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
  // Example of an API request
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

  await runExample(clientId, clientSecret);

  form.style.display = 'none';
};

window.addEventListener('load', () => {
  const form = document.getElementById('clientCredentialsForm');

  form?.addEventListener('submit', event => {
    authenticateHandler(event, form).catch(error => console.error(error));
  });
});
