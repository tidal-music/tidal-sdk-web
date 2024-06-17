import { finalizeLogin, init, initializeLogin, logout } from '../dist';

import { debounce, getUserInfo, searchForArtist } from './shared';

window.addEventListener('load', () => {
  const form = document.getElementById('authorizationCodeForm');
  const logoutButton = document.getElementById('logoutBtn');
  const searchField = document.getElementById('searchField');

  form?.addEventListener('submit', event => {
    submitHandler(event).catch(error => console.error(error));
  });

  logoutButton?.addEventListener('click', () => {
    logout();
    window.location.reload();
    localStorage.clear();
  });

  loadHandler().catch(error => console.error(error));

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
});

const submitHandler = async event => {
  event.preventDefault();

  const formData = new FormData(event.target);

  const clientId = formData.get('clientId');
  const redirectUri = formData.get('redirectUrl');

  // store these values, since we need them after the redirect
  localStorage.setItem('clientId', clientId);
  localStorage.setItem('redirectUri', redirectUri);

  await init({
    clientId,
    credentialsStorageKey: 'authorizationCode',
  });

  const loginUrl = await initializeLogin({
    redirectUri,
  });

  window.open(loginUrl, '_self');
};

const loadHandler = async () => {
  const clientId = localStorage.getItem('clientId');
  const redirectUri = localStorage.getItem('redirectUri');
  const form = document.getElementById('authorizationCodeForm');

  if (clientId && redirectUri) {
    form.style.display = 'none';

    await init({
      clientId,
      credentialsStorageKey: 'authorizationCode',
    });

    if (window.location.search.length > 0) {
      await finalizeLogin(window.location.search);
      window.location.replace('/examples/authorization-code.html');
    } else {
      await getUserInfo();
      document.getElementById('searchField').style.display = 'block';
      document.getElementById('forceRefreshBtn').style.display = 'block';
    }
  }
};

document.getElementById('forceRefreshBtn')?.addEventListener('click', () => {
  const userInfo = document.getElementById('userInfo');
  // clear userInfo to make sure its filled again
  userInfo.innerHTML = '';

  // call credentialsProvider.getCredentials with a known subStatus that needs refreshing
  getUserInfo('6001').catch(error => console.error(error));
});
