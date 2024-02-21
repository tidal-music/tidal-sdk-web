import { credentialsProvider, init as initAuth } from '@tidal-music/auth';

import { createCatalogueClient } from '../dist';

async function runExample(clientId, clientSecret) {
  await initAuth({
    clientId,
    clientSecret,
    credentialsStorageKey: 'clientCredentials',
  });

  const catalogueClient = createCatalogueClient(credentialsProvider);

  // Example of an API request
  const { data, error } = await catalogueClient.GET('/albums/{id}', {
    params: {
      path: { id: '251380836' },
      query: { countryCode: 'no' }, // would be nice with a default value?
    },
  });

  const results = document.getElementById('results');

  if (error) {
    error.errors.forEach(
      err => (results.innerHTML += `<li>${err.category}</li>`),
    );
  } else {
    for (const [key, value] of Object.entries(data.resource)) {
      results.innerHTML += `<li><b>${key}:</b>${JSON.stringify(value)}</li>`;
    }
  }
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

  // hide form to signal "logged in state"
  form.style.display = 'none';
};

window.addEventListener('load', () => {
  const form = document.getElementById('clientCredentialsForm');

  form?.addEventListener('submit', event => {
    authenticateHandler(event, form).catch(error => console.error(error));
  });
});
