# TIDAL User v2 Beta

A thin wrapper around the API described at: https://developer.tidal.com/apiref?spec=user-v2&ref=get-me-v2 (which is again built on the JSON API spec: https://jsonapi.org/format/)

The module provides Typescript types and a `fetch` based function for getting data, using: https://openapi-ts.pages.dev/

## Usage

One function is exposed that can be used for creating a function that can then do network calls: `createUserClient`. Also the API types are exposed and can be used directly.

### Example
See the `examples/` folder for some ways it can be used.

To run it do: `pnpm dev`

## Development

Run `pnpm generateTypes` to regenerate the types from the API specs.


PS: Client Credentials Flow is not supported yet for this endpoint (so only user login).
