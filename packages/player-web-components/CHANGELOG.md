# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-05-13

### Fixed

- Published `.d.ts` files now use explicit `.js` extensions on relative imports so the types resolve correctly under TypeScript's `"moduleResolution": "NodeNext"`/`"Node16"` ([#633](https://github.com/tidal-music/tidal-sdk-web/issues/633)).
- Reordered the `package.json` `"exports"` so the `"types"` condition precedes `"import"`, ensuring TypeScript resolves types via the primary condition rather than a fallback (TS#50762).

## [0.2.1] - 2025-8-14

### Changed

- Update to latest Player module (v0.11.0)

## [0.2.0] - 2025-8-13

### Changed

- Update to latest Player module (v0.10.0)
- Remove preventDefault from click handler in TidalPlayTrigger, as it fails for passive event listeners
- Add event listeners for playback state changes and media product transitions in demo

## [0.1.2] - 2024-05-29

### Fixed

- Update player module to v0.2.0

## [0.1.1] - 2024-01-22

### Fixed

- Fixed package.json metadata
