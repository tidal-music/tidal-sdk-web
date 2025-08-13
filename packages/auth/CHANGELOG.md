# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-08-13

### Changed

- Stop endless upgrade loop when client secret changed (#334)

## [1.3.4] - 2025-03-12

### Changed

- Update docs link in Readme

## [1.3.3] - 2024-08-19

### Changed

- Omit scope validity check for client credentials

## [1.3.2] - 2024-08-19

### Changed

- Remove scope param from client credentials request

## [1.3.1] - 2024-06-03

### Changed

- Improved examples [#116](https://github.com/tidal-music/tidal-sdk-web/pull/116), [#122](https://github.com/tidal-music/tidal-sdk-web/pull/122)
- Fix sending empty clientUniqueKey [#130](https://github.com/tidal-music/tidal-sdk-web/pull/130)
- Stop upgrading token if no clientSecret was present [#140](https://github.com/tidal-music/tidal-sdk-web/pull/140)

## [1.3.0] - 2024-04-16

### Changed

- Use of the new TrueTime module
