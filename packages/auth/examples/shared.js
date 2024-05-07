import { credentialsProvider } from '../dist';

/**
 * Gets the token from the SDK, extracts the user id and displays it
 *
 * @param {string?} apiSubStatus
 */
export const getUserInfo = async apiSubStatus => {
  const credentials = await credentialsProvider.getCredentials(apiSubStatus);

  try {
    const decodedToken = base64UrlDecode(credentials.token);
    const userInfo = document.getElementById('userInfo');

    if (userInfo && decodedToken) {
      userInfo.innerHTML = `<h3>User id: ${decodedToken.uid}</h3>`;

      const logoutBtn = document.getElementById('logoutBtn');
      logoutBtn.style.display = 'block';
    }
  } catch (error) {
    console.error(error);
  }
};

/**
 * Search for an artist and display the results in the DOM.
 *
 * @param {string} query
 */
export const searchForArtist = async query => {
  const searchResults = document.getElementById('searchResults');
  const credentials = await credentialsProvider.getCredentials();
  const searchResult = await search(credentials.token, query, 'ARTISTS');

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
 * @param {string} query
 * @param {string} type
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

/**
 * Decodes a base64 url encoded access token.
 *
 * @param {string} token
 * @returns {{uid:number}}
 */
const base64UrlDecode = token => {
  try {
    const [, body] = token.split('.');
    return JSON.parse(globalThis.atob(body));
  } catch (error) {
    console.error(error);
  }
};
