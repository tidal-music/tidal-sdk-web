export "$(grep -vE "^(#.*|\s*)$" .env)"
# TEST_USER=$TEST_USER npm run wtr $1
# Event Producer seems to prevent WTR from running all tests in one go, so we need to run them one by one
TEST_USER=$TEST_USER npm run wtr src/config.test.ts
TEST_USER=$TEST_USER npm run wtr src/event-bus.test.ts
TEST_USER=$TEST_USER npm run wtr src/api/event/active-device-changed.test.ts
TEST_USER=$TEST_USER npm run wtr src/api/event/active-device-disconnected.test.ts
TEST_USER=$TEST_USER npm run wtr src/api/event/active-device-mode-changed.test.ts
TEST_USER=$TEST_USER npm run wtr src/api/event/active-device-pass-through-changed.test.ts
TEST_USER=$TEST_USER npm run wtr src/api/event/device-change.test.ts
TEST_USER=$TEST_USER npm run wtr src/api/event/playback-state-change.test.ts
TEST_USER=$TEST_USER npm run wtr src/api/event/preload-request.test.ts
TEST_USER=$TEST_USER npm run wtr src/api/event/streaming-privileges-revoked.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/output-devices.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/event-tracking/streaming-metrics/drm-license-fetch.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/event-tracking/streaming-metrics/streaming-session-start.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/get-asset-position.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/get-loudness-normalization-mode.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/get-media-product.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/get-output-devices.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/get-playback-context.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/get-volume-level.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/load.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/set-api-url.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/set-loudness-normalization-mode.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/set-next.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/set-streaming-wifi-audio-quality.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/set-volume-level.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/handlers/start-native-player.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/helpers/event-session.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/helpers/generate-guid.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/helpers/manifest-parser.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/helpers/playback-info-resolver.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/services/connection-handler.test.ts
TEST_USER=$TEST_USER npm run wtr src/internal/services/pushkin.test.ts
TEST_USER=$TEST_USER npm run wtr src/player/adaptations.test.ts


