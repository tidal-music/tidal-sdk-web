import { init } from '../dist';

import { debounce, searchForArtist } from './shared';

window.addEventListener('load', () => {
  const form = document.getElementById('clientCredentialsForm');
  const searchField = document.getElementById('searchField');

  form?.addEventListener('submit', event => {
    submitHandler(event).catch(error => console.error(error));
  });

  searchField?.addEventListener(
    'keyup',
    debounce(event => {
      if (event.target.value.length > 0) {
        searchForArtist(event.target.value).catch(error =>
          console.error(error),
        );
      }
    }, 500),
  );

  const submitHandler = async event => {
    event.preventDefault();

    if (!form) {
      return;
    }

    const formData = new FormData(form);

    const clientId = formData.get('clientId');
    const clientSecret = formData.get('clientSecret');

    await init({
      clientId,
      clientSecret,
      credentialsStorageKey: 'clientCredentials',
    });

    // hide form to signal "logged in state", display search
    form.style.display = 'none';
    searchField.style.display = 'block';
  };
});
