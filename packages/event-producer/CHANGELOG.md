# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.1] - 2026-05-13

### Fixed

- Published `.d.ts` files now use explicit `.js` extensions on relative imports so the types resolve correctly under TypeScript's `"moduleResolution": "NodeNext"`/`"Node16"` ([#633](https://github.com/tidal-music/tidal-sdk-web/issues/633)).
- Reordered the `package.json` `"exports"` so the `"types"` condition precedes `"import"`, ensuring TypeScript resolves types via the primary condition rather than a fallback (TS#50762).
- Removed an accidental `@tidal-music/event-producer` self-dependency from the published `package.json`.

## [2.4.0] - 2025-08-13

### Changed

- Removed unneeded Action header from monitoring and submit event functions

## [2.3.2] - 2025-02-19

### Fixed

- Queue Worker is now inlined, hopefully making it more compatible with Vite dev mode

## [2.3.1] - 2025-01-28

### Fixed

- Queue Worker is now built in a slightly different way, making it more compatible with Vite

## [2.3.0] - 2024-07-02

### Fixed

- Event Producer now uses (Web)Worker instead of SharedWorker, which should make it Android compatible

## [2.2.0] - 2024-04-19

### Fixed

- Event Producer timestamps are now integer values which fixes an ingestion error for CDF events and a warning for older style events.
