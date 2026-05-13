# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-05-13

### Fixed

- Reordered the `package.json` `"exports"` so the `"types"` condition precedes `"import"`, ensuring TypeScript resolves types via the primary condition rather than a fallback (TS#50762) ([#633](https://github.com/tidal-music/tidal-sdk-web/issues/633)).
- Removed an accidental `@tidal-music/true-time` self-dependency from the published `package.json`.

## [0.3.0] - 2024-04-16

### Changed

- Change that will avoid trueTime.now() throwing errors, hopefully making it easier to use.