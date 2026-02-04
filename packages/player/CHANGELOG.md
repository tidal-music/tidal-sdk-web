# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Implemented gapless playback using dual media elements with crossfade
  - ShakaPlayer now uses two media elements for seamless track transitions
  - Next track preloads and buffers in background at volume 0
  - Equal-power crossfade (25ms duration, starting 0.2s before track end) provides smooth transitions
  - Maintained backward compatibility with existing public API (setNext, load, etc.)
  - Internal refactoring of ShakaPlayer to manage dual playback instances

## [0.12.0] - 2026-01-26

### Changed

- ABR streaming for audio (#480)
- Use new `trackManifests` API for (Shaka) track playback (#465)
- Shaka player updated to: 4.16.14 (patching TS-types removed, no longer needed)

## [0.11.3] - 2026-01-14

### Changed

- Fix NativePlayer initialized with unsupported media formats (#470)
- Shaka player updated to: 4.16.13

## [0.11.2] - 2025-12-09

### Changed

- Fix NativePlayer incorrect seek issue (#452)

## [0.11.1] - 2025-12-03

### Changed

- Preserve the player position when hard reloading (#447)

## [0.11.0] - 2025-08-14

### Changed

- Remove support for 'demo' product type (#350)
- Update getOutputDevices function type to return an array of OutputDevice (#351)

## [0.10.2] - 2025-08-13

### Fixed

- Version bump only, as last version failed to release

## [0.10.0] - 2025-08-13

### Changed

- Update to latest Shaka Player (4.15.9)

## [0.9.1] - 2025-05-19

### Changed

- Update to latest Shaka Player again

## [0.9.0] - 2025-05-09

### Changed

- Update to latest Shaka Player (#306)

## [0.8.0] - 2025-04-25

### Changed

- Switch event tracking implementation (#91)

## [0.7.1] - 2025-04-22

### Fixed

- Allow using `setEventUrl` again (#299)

## [0.7.0] - 2025-04-15

### Changed

- Add `extras` to playback events (#295)

## [0.6.2] - 2025-04-11

### Changed

- Add `play_log_open` events (#285)

## [0.6.1] - 2025-04-11

### Fixed

- Avoid setting invalid Bearer token header (#289)

## [0.6.0] - 2025-03-07

### Fixed

- Listen to correct Auth event in Player (#220)
- Add handler for get next media product (#237)

## [0.5.4] - 2024-10-10

### Fixed

- Avoid shaka error 3016 on Safari. #218

## [0.5.3] - 2024-10-03

### Fixed

- Fix steaming-session-id linked to wrong playback info on some preloads. #214

## [0.5.2] - 2024-10-02

### Fixed

- Handle products that are not preloadable in the shaka-player PreloadManager.


## [0.5.1] - 2024-09-25

### Changed

- Rework reset state for native player to avoid incorrect states. (Could be the trigger for various "wrong track displayed" issues.)


## [0.5.0] - 2024-09-18

### Changed

- Use Shaka Preload API for preparing the next track, instead of dual instances of shaka.
- Removed mux.js dependency as shaka no longer requires that
- Add authorization header to Widevine license request, to enable playback for Open API clients

## [0.4.3] - 2024-09-10

### Changed

- Device restoration failure now throws an error to prevent further actions related to device change.

## [0.4.2] - 2024-08-21

### Changed

- More solid fix for demo content in safari (#173)
- Fix transitions from MAX in native player to LOW/HIGH in shaka player causing playback to stop (#177)
- Fix some transitions between players causing reset to not work correctly leading to simultaneous playback (#177)

## [0.4.1] - 2024-08-07

### Changed

- Instantiates Shaka with the correct config for FairPlay depending on initial item loaded

## [0.4.0] - 2024-07-25

### Changed

- Removed support for MQA
- Added support for playback of demo content in Safari

## [0.3.0] - 2024-07-15

### Changed

- Added support for demo content
- Added support for legacy browsers

## [0.2.0] - 2024-04-16

### Changed

- Use of the new TrueTime module
