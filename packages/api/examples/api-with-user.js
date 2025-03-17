import {
  credentialsProvider,
  finalizeLogin,
  init,
  initializeLogin,
  logout,
} from '@tidal-music/auth';

import { createAPIClient } from '../dist';

window.addEventListener('load', () => {
  const loginForm = document.getElementById('authorizationCodeForm');
  const logoutButton = document.getElementById('logoutBtn');
  const createPlaylistForm = document.getElementById('createPlaylistForm');

  loginForm?.addEventListener('submit', event => {
    submitHandler(event).catch(error => console.error(error));
  });

  logoutButton?.addEventListener('click', () => {
    logout();
    window.location.reload();
    localStorage.clear();
  });

  createPlaylistForm?.addEventListener('submit', event => {
    createPlaylist(event).catch(error => console.error(error));
  });

  loadHandler().catch(error => console.error(error));
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
    scopes: [
      'entitlements.read',
      'collection.read',
      'playback',
      'playlists.write',
      'collection.write',
      'recommendations.read',
      'user.read',
      'playlists.read',
    ],
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
      window.location.replace('/examples/api-with-user.html');
    } else {
      document.getElementById('createPlaylistForm').style.display = 'block';
      document.getElementById('logoutBtn').style.display = 'block';
    }
  }
};

const createPlaylist = async event => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const name = formData.get('playlistName');
  const privacy = formData.get('playlistVisibility');
  const description = formData.get('playlistDescription');

  const apiClient = createAPIClient(credentialsProvider);

  const apiResults = await apiClient.POST('/playlists', {
    body: {
      data: {
        attributes: {
          description,
          name,
          privacy,
        },
        type: 'playlists',
      },
    },
    headers: {
      'Content-Type': 'application/vnd.api+json', // TODO: set this by default for all POST/PUT requests
    },
  });

  const results = document.getElementById('playlistResults');
  results.innerHTML = '';

  if (apiResults.error) {
    apiResults.error.errors.forEach(
      err => (results.innerHTML += `<li>${err.detail}</li>`),
    );
  } else {
    for (const [key, value] of Object.entries(
      apiResults.data.data.attributes,
    )) {
      results.innerHTML += `<li><b>${key}:</b>${JSON.stringify(value)}</li>`;
    }
  }
};
