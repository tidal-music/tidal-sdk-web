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

/* eslint-disable */

/**
 * Search for an artist and display the results in the DOM.
 *
 * @param {string} query
 */
export const searchForArtist = async query => {
  // This is a minimal implementation to demonstrate CredentialsProvider usage.
  // To call the API, you would normally use the `api` package.

  const searchResultsTag = document.getElementById('searchResults');
  const credentials = await credentialsProvider.getCredentials();
  const searchResult = await searchArtists(credentials.token, query);

  searchResultsTag.innerHTML = '';

  const imageHrefs = searchResult.included
    .filter(x => x.type === 'artworks' && x.attributes.mediaType === 'IMAGE')
    .reduce((hrefs, includedArtwork) => {
      hrefs[includedArtwork.id] = includedArtwork.attributes.files.find(
        f => f.meta.width === 160,
      )?.href;
      return hrefs;
    }, {});

  for (const includedArtist of searchResult.included.filter(
    x => x.type === 'artists',
  )) {
    const imgId = includedArtist.relationships.profileArt.data[0]?.id;
    const imgHref = imageHrefs[imgId];
    const imgTag = imgHref ? `<img src=${imgHref}>` : '';
    searchResultsTag.innerHTML += `
      <li>
        <a href="${includedArtist.attributes.externalLinks[0].href}">
          ${imgTag}
          <span>${includedArtist.attributes.name}</span>
        </a>
      </li>`;
  }
};

/**
 * Fetches artists and adds their names and profile art to the DOM.
 *
 * @param {string} token
 * @param {string} query
 */
export const searchArtists = async (token, query) => {
  const queryString = new URLSearchParams({
    countryCode: 'NO',
    include: 'artists.profileArt',
  }).toString();

  const headers = new Headers({
    Accept: 'application/vnd.api+json',
    Authorization: `Bearer ${token}`,
  });
  // proxy in vite handling CORS
  const searchResult = await window.fetch(
    `/api/searchResults/${query}/relationships/artists?${queryString}`,
    {
      headers,
    },
  );

  if (!searchResult.ok) {
    throw new Error(
      `Search response status is ${searchResult.status}: ${searchResult.statusText}`,
    );
  }

  return await searchResult.json();
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
