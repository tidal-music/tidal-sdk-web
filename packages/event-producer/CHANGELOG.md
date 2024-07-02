# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2024-04-19

### Fixed

- Event Producer timestamps are now integer values which fixes an ingestion error for CDF events and a warning for older style events.

## [2.3.0] - 2024-07-02

### Fixed

- Event Producer now uses (Web)Worker instead of SharedWorker, which should make it Android compatible
