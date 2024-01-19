# v0.0.4

- Use the new cancelPreload method on NativePlayer to invalidate preloaded items.
- Fix console error when trying to access localStorage in environments that does not support it. (Embed player in iframes)
- Expose the new bitRate and sampleRate fields from the playback API in the PlaybackContext.
