/* eslint-disable no-console */
import { credentialsProvider, init as initAuth } from '@tidal-music/auth';

import { createSearchClient } from '../dist';

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

  const searchClient = createSearchClient(credentialsProvider);
  const results = document.getElementById('results');

  async function doSearch(query) {
    results.innerHTML = '';

    const { data, error } = await searchClient.GET('/searchresults/{query}', {
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
  // Example of an API request
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

  await runExample(clientId, clientSecret, searchTerm);
};

window.addEventListener('load', () => {
  const form = document.getElementById('clientCredentialsForm');

  form?.addEventListener('submit', event => {
    authenticateHandler(event, form).catch(error => console.error(error));
  });
});
