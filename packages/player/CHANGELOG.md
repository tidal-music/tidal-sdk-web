# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
