# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-05-13

### Fixed

- Published `.d.ts` files now use explicit `.js` extensions on relative imports so the types resolve correctly under TypeScript's `"moduleResolution": "NodeNext"`/`"Node16"` ([#633](https://github.com/tidal-music/tidal-sdk-web/issues/633)).
- Reordered the `package.json` `"exports"` so the `"types"` condition precedes `"import"`, ensuring TypeScript resolves types via the primary condition rather than a fallback (TS#50762).
- Removed an accidental `@tidal-music/common` self-dependency from the published `package.json`.

## [0.2.0] - 2025-08-13

### Changed

- Improved type safety of credentialsUpdated message


## [0.1.5] - 2024-03-01

### Changed

- Minor types update
