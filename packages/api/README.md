# TIDAL API

A thin wrapper around the API domains described at: https://tidal-music.github.io/tidal-api-reference/ (which is again built on the JSON API spec: https://jsonapi.org/format/)

The module provides Typescript types and a `fetch` based function for getting data, using: https://openapi-ts.pages.dev/

## Usage

One function is exposed that can be used for creating a function that can then do network calls: `createAPIClient`. Also the API types are exposed and can be used directly.

### Example
See the `examples/` folder for some ways it can be used.

To run it do: `pnpm dev`

### Usage in Node.js
The previous examples assume usage in a browser context, but for server-side / `Node.js` usage there is an extra step needed. As the Auth package uses `LocalStorage` you have two options:

1. Shim or polyfill `LocalStorage` into `Node.js`, for instance with something like: https://github.com/capaj/localstorage-polyfill
2. Implementing a `CredentialsProvider` per the interface defined here: https://github.com/tidal-music/tidal-sdk-web/blob/main/packages/common/src/credentialsProvider.ts (more details on how it should work in the Auth module and related spec: https://github.com/tidal-music/tidal-sdk-web/tree/main/packages/auth) and pass that in when initializing this module: `createAPIClient(myAuthProvider)`

Which approach to choose will depend on how much control you need over the Auth flow.

## Development

Run `pnpm generateTypes` to regenerate the types from the API specs.
.
