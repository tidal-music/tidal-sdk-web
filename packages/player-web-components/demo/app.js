import * as auth from '@tidal-music/auth';

import * as playerWebComponents from '../dist';

window.credform.addEventListener('submit', async submitEvent => {
  submitEvent.preventDefault();

  /** @type {HTMLFormElement} */
  const form = submitEvent.target;

  const clientId = form.elements.namedItem('clientId').value;
  const clientSecret = form.elements.namedItem('clientSecret').value;

  try {
    await auth.init({
      clientId,
      clientSecret,
      credentialsStorageKey: 'key',
      scopes: [],
    });

    playerWebComponents.setCredentialsProvider(auth.credentialsProvider);

    const span = document.createElement('span');
    span.textContent = 'Credentials are set!';

    form.replaceWith(span);
  } catch (err) {
    console.error(err);
  }

  return false;
});
