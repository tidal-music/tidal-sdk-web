# TIDAL Catalogue v2 Beta

A thin wrapper around the API described at: https://developer.tidal.com/reference/web-api?spec=catalogue-v2&ref=get-albums-v2 (which is again built on the JSON API spec: https://jsonapi.org/format/)

The module provides Typescript types and a `fetch` based function for getting data, using: https://openapi-ts.pages.dev/

## Usage

One function is exposed that can be used for creating a function that can then do network calls: `createCatalogueClient`. Also the API types are exposed and can be used directly.

### Example
See the `examples/` folder for some ways it can be used.

To run it do: `pnpm dev`

## Development

Run `pnpm generateTypes` to regenerate the types from the API specs.
