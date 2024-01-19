import { credentialsProvider } from '../dist';

/**
 * fetch user info and display in DOM
 *
 * @param {string?} apiSubStatus
 */
export const getUserInfo = async apiSubStatus => {
  const credentials = await credentialsProvider.getCredentials(apiSubStatus);

  const headers = new Headers({
    Accept: 'application/json',
    Authorization: `Bearer ${credentials.token}`,
  });
  const response = await window.fetch('https://login.tidal.com/oauth2/me', {
    headers,
  });
  const userJson = await response.json();
  const userInfo = document.getElementById('userInfo');

  if (userInfo && response.ok) {
    userInfo.innerHTML = `<h3>User id: ${userJson.userId}</h3>`;
    userInfo.innerHTML += `<h3>Email: ${userJson.email}</h3>`;

    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.style.display = 'block';
  }
};

/**
 * Search for an artist and display the results in the DOM.
 *
 * @param {string} artistId
 */
export const searchForArtist = async artistId => {
  const searchResults = document.getElementById('searchResults');
  const credentials = await credentialsProvider.getCredentials();
  const searchResult = await search(credentials.token, artistId, 'ARTISTS');

  searchResults.innerHTML = '';

  searchResult.artists.forEach(artist => {
    const imageObj = artist.resource.picture.find(p => p.width === 160);
    const link = `https://listen.tidal.com/artist/${artist.resource.id}`;
    if (imageObj) {
      const img = `<img src=${imageObj.url}>`;
      searchResults.innerHTML += `<li><a href="${link}">${img}<span>${artist.resource.name}<span></a></li>`;
    }
  });
};

/**
 * Fetches an artists and adds it name to DOM.
 *
 * @param {string} token
 * @param {string} artistId
 */
export const search = async (token, query, type) => {
  const queryString = new URLSearchParams({
    countryCode: 'NO',
    limit: 10,
    query,
    type,
  }).toString();

  const headers = new Headers({
    Accept: 'application/vnd.tidal.v1+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/vnd.tidal.v1+json',
  });
  // proxy in vite handling CORS
  const searchResult = await window.fetch(`/api/search?${queryString}`, {
    headers,
  });
  const response = await searchResult.json();

  return response;
};

/**
 * source: https://www.freecodecamp.org/news/javascript-debounce-example/
 *
 */
export function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
