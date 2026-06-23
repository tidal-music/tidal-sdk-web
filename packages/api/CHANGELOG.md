# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.30.0] - 2026-06-23

### Changed

- Sync to new API definitions (version: 1.10.39)

## [0.29.0] - 2026-06-18

### Added

- HTTP retry mechanism for read-only (GET/HEAD/OPTIONS) requests. Transient
  failures (HTTP 429/5xx, network errors and read timeouts) are retried with
  per-category exponential backoff and jitter, and requests now use a 10s read
  timeout. Configurable via the new optional `retryOptions` parameter of
  `createAPIClient` (pass `{ enabled: false }` to opt out).

## [0.28.0] - 2026-06-13

### Changed

- Sync to new API definitions (version: 1.10.33)
## [0.27.0] - 2026-06-11

### Changed

- Sync to new API definitions (version: 1.10.32)
## [0.26.0] - 2026-06-06

### Changed

- Sync to new API definitions (version: 1.10.26)
## [0.25.0] - 2026-05-15

### Changed

- Sync to new API definitions (version: 1.9.5)

## [0.24.1] - 2026-05-13

### Fixed

- Published `.d.ts` files now use explicit `.js` extensions on relative imports so the types resolve correctly under TypeScript's `"moduleResolution": "NodeNext"`/`"Node16"`. Previously `components` (and other re-exports) silently degraded to an error type for NodeNext consumers ([#633](https://github.com/tidal-music/tidal-sdk-web/issues/633)).
- Reordered the `package.json` `"exports"` so the `"types"` condition precedes `"import"`, ensuring TypeScript resolves types via the primary condition rather than a fallback (TS#50762).
- Removed an accidental `@tidal-music/api` self-dependency from the published `package.json` (originated from a `workspace:*` entry).

## [0.24.0] - 2026-05-09

### Changed

- Sync to new API definitions (version: 1.9.3)
## [0.23.0] - 2026-05-01

### Changed

- Sync to new API definitions (version: 1.7.1)

## [0.22.0] - 2026-04-28

### Changed

- Sync to new API definitions (version: 1.7.0)

## [0.21.0] - 2026-04-22

### Changed

- Sync to new API definitions (version: 1.6.1)
## [0.20.0] - 2026-04-10

### Changed

- Sync to new API definitions (version: 1.4.17)

## [0.19.0] - 2026-04-09

### Fixed

- Set openapi-fetch `querySerializer.allowReserved` so JSON:API query parameters (comma-separated `include` paths, `page[cursor]`, etc.) are not over-encoded.

## [0.18.0] - 2026-04-01

### Changed

- Sync to new API definitions (version: 1.4.15)

## [0.17.0] - 2026-03-31

### Changed

- Sync to new API definitions (version: 1.4.14)
## [0.16.0] - 2026-03-27

### Changed

- Sync to new API definitions (version: 1.4.12)

## [0.15.0] - 2026-03-26

### Changed

- Sync to new API definitions (version: 1.4.11)

## [0.14.0] - 2026-03-24

### Changed

- Sync to new API definitions (version: 1.4.8)

## [0.13.0] - 2026-03-20

### Changed

- Sync to new API definitions (version: 1.4.5)

## [0.12.0] - 2026-03-19

### Changed

- Sync to new API definitions (version: 1.4.4)

## [0.11.0] - 2026-03-18

### Changed

- Sync to new API definitions (version: 1.4.0)

## [0.10.0] - 2026-03-17

### Changed

- Sync to new API definitions (version: 1.3.0)

## [0.9.0] - 2026-03-11

### Changed

- Sync to new API definitions (version: 1.2.3)

## [0.8.0] - 2026-02-10

### Changed

- Expose `baseUrl` in `createAPIClient`
- Sync to new API definitions (version: 1.1.7)

## [0.7.0] - 2025-12-03

### Changed

- Sync to new API definitions (version: 1.0.7)

## [0.6.0] - 2025-10-09

### Changed

- Sync to new API definitions (version: 0.1.85)

## [0.5.0] - 2025-08-13

### Changed

- Sync to new API definitions

## [0.4.0] - 2025-07-09

### Changed

- Sync to new API definitions

## [0.3.0] - 2025-06-17

### Changed

- Sync to new API definitions

## [0.2.0] - 2025-03-12

### Changed

- Update to new single OpenAPI definition file for all API endpoints

## [0.1.0] - 2024-xx-xx

### Changed

- Initial release of joined API types and `fetch` wrapper
