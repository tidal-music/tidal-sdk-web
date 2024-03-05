# TIDAL Player

## Usage

`npm install @tidal-music/player` (or similar for other package managers)

Then see [the docs](https://tidal-music.github.io/tidal-sdk-web/modules/_tidal_music_player.html) or the examples elsewhere in this repository.

## Development

The src/ folder contains the source code. Structured under api/ is the outside facing API. The player/ folder contains the underlying players and their integration into TIDAL player. The internal/ folder the business logic that the outside facing API end up calling.

The dist/ folder contains the latest built version of the code in src/.

## Prerequisites

- [NPM/Node.js](https://nodejs.org/en/)

## Building

Building is done with Vite.

`pnpm build` to build the package to dist/

## Testing

`pnpm test`. You need a `.env` file containing `TEST_USER="base64string"` before running. base64string is base 64 encoded stringified JS object containing oAuthAccessToken, oAuthRefreshToken, oAuthExpirationDate and clientId.

### Linking

To load TIDAL Player into a project locally without publishing to npm; using `pnpm link`, `yarn link` or `npm link` can be problematic, especially if your project does not also use pnpm like this repo does. If so, you need to manually configure a "hard link" using the `file:` protocol in package.json of the destination project like so:

1. Open the package.json in the project. (in the case of webclient, the root one)
2. Add or edit a `"resolutions"` property on the top level. (this is an object)
3. Add an entry for @tidal-music/player like so: `"@tidal-music/player": "file:/Users/<your-username>/dev/tidal-sdk-web/packages/player"`
4. Run `npm/yarn/pnpm install` in your destination project.

!! Remove the entry in `"resolution"` and run `npm/yarn/pnpm install` again when you are done testing to have the NPM version of the package load instead.


## Types in shaka

Run the `patch-shaka` script to get TS working for shaka-player.
