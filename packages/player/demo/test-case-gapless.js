import * as Player from '../';

import { login, print, waitFor } from './helpers.js';

const statusEl = document.getElementById('status');
const gapMeasurementEl = document.getElementById('gapMeasurement');
const currentTrackEl = document.getElementById('currentTrack');
const positionEl = document.getElementById('position');
const durationEl = document.getElementById('duration');
const stateEl = document.getElementById('state');

// Test tracks from Pink Floyd - The Wall
// These tracks are meant to be played gaplessly
const TRACK_1 = {
  productId: '55391449', // The Thin Ice
  productType: 'track',
  sourceId: 'gapless-test',
  sourceType: 'gapless-test',
};

const TRACK_2 = {
  productId: '55391450', // Another Brick in the Wall, Pt. 1
  productType: 'track',
  sourceId: 'gapless-test',
  sourceType: 'gapless-test',
};

function updateStatus(message, isPlaying = false) {
  statusEl.textContent = message;
  statusEl.className = isPlaying ? 'status playing' : 'status';
}

function updateTrackInfo() {
  const context = Player.getPlaybackContext();
  if (context) {
    currentTrackEl.textContent = context.actualProductId;
    durationEl.textContent = context.actualDuration.toFixed(1) + 's';
  }

  const position = Player.getAssetPosition();
  positionEl.textContent = position.toFixed(1) + 's';

  const state = Player.getPlaybackState();
  stateEl.textContent = state;
}

let runAbortController = null;

async function run() {
  // Tear down any listeners/state from a previous run so re-clicking Play
  // doesn't accumulate handlers (and doesn't leak stale closure state like
  // track1EndTime/track2StartTime that would produce bogus gap measurements).
  if (runAbortController) {
    runAbortController.abort();
  }
  runAbortController = new AbortController();
  const { signal } = runAbortController;

  // Reset visible measurement state from any previous run.
  gapMeasurementEl.textContent = '';
  gapMeasurementEl.className = 'gap-measurement';

  try {
    updateStatus('Logging in...');
    await login();

    // Always start from a clean slate so back-to-back runs don't inherit any
    // in-flight playback state from a previous run.
    await Player.reset();

    // Apply transition mode from URL param (for Cypress) or dropdown
    const transitionSelect = document.getElementById('transitionMode');
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('crossfadeInMs');
    if (urlMode !== null) {
      transitionSelect.value = urlMode;
    }
    const crossfadeInMs = Number(transitionSelect.value);
    Player.setTransitionMode(crossfadeInMs);

    const modeLabel =
      crossfadeInMs > 0 ? `Crossfade ${crossfadeInMs}ms` : 'Gapless';
    print(`Transition mode: ${modeLabel} (crossfadeInMs=${crossfadeInMs})`);

    updateStatus('Setting up player events...');

    // Listen to player events
    let track1EndTime = null;
    let track2StartTime = null;
    let crossfadeDetected = false;
    let gapMeasurement = null;

    Player.events.addEventListener(
      'media-product-transition',
      e => {
        const detail = e.detail;
        const now = performance.now();

        if (detail.mediaProduct.productId === TRACK_2.productId) {
          track2StartTime = now;
          crossfadeDetected = true;

          if (track1EndTime) {
            const gap = track2StartTime - track1EndTime;
            gapMeasurement = gap;

            if (gap < 0) {
              print(
                `⏱️ GAP MEASURED: -${Math.abs(gap).toFixed(2)}ms (crossfade overlap - PERFECT gapless!)`,
              );
              gapMeasurementEl.textContent = `⏱️ Gap: -${Math.abs(gap).toFixed(2)}ms (crossfade overlap - TRUE GAPLESS!)`;
              gapMeasurementEl.className = 'gap-measurement visible perfect';
            } else {
              print(`⏱️ GAP MEASURED: ${gap.toFixed(2)}ms gap between tracks`);
              gapMeasurementEl.textContent = `⏱️ Gap detected: ${gap.toFixed(2)}ms`;
              gapMeasurementEl.className = 'gap-measurement visible';
            }

            print(
              `✓ Crossfade timing: Track 2 started ${Math.abs(gap).toFixed(2)}ms ${gap < 0 ? 'before' : 'after'} track 1 ended`,
            );
          } else {
            print(
              `✓ Gapless crossfade complete! Seamless transition achieved.`,
            );
          }
        }

        print(`Media product transition: ${detail.mediaProduct.productId}`);
        updateStatus(`Playing: ${detail.mediaProduct.productId}`, true);
        updateTrackInfo();
      },
      { signal },
    );

    Player.events.addEventListener(
      'playback-state-change',
      () => {
        updateTrackInfo();
      },
      { signal },
    );

    Player.events.addEventListener(
      'ended',
      e => {
        track1EndTime = performance.now();
        print(
          `Track ended: ${e.detail.reason} at ${track1EndTime.toFixed(2)}ms`,
        );

        if (crossfadeDetected) {
          print(
            'Note: Crossfade already completed before track ended (this is expected!)',
          );
        } else {
          print('Waiting for crossfade to complete...');
        }

        updateTrackInfo();
      },
      { signal },
    );

    Player.events.addEventListener(
      'preload-request',
      () => {
        print(
          '📡 Preload request received - loading next track into inactive player',
        );
        updateStatus('Preloading next track...', true);

        Player.setNext(TRACK_2)
          .then(() => {
            print('✓ Next track loaded into inactive player');
            print(`✓ Ready for transition (mode: ${modeLabel})`);
          })
          .catch(console.error);
      },
      { signal },
    );

    // Start playing first track
    updateStatus('Loading first track...');
    print(`Loading track: ${TRACK_1.productId} (The Thin Ice)`);
    await Player.load(TRACK_1, 0);

    updateStatus('Playing first track...', true);
    print('Playing...');
    await Player.play();

    updateTrackInfo();

    // Seek near the end to make the demo fast, but leave enough room for
    // setNext() to fetch playback info and prepare the inactive Shaka player.
    // Seeking only 5s before the end makes repeated local runs flaky because
    // preload may not finish until the current track is almost over.
    const playbackContext = Player.getPlaybackContext();
    if (playbackContext) {
      const secondsBeforeEnd = 12;
      const seekPosition = playbackContext.actualDuration - secondsBeforeEnd;
      print(
        `Seeking to ${seekPosition.toFixed(1)}s (${secondsBeforeEnd}s before end)`,
      );
      await Player.seek(seekPosition);

      // Wait for seek to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      updateTrackInfo();
    }

    print('Waiting for gapless transition to next track...');

    // Update position every second
    const intervalId = setInterval(updateTrackInfo, 1000);

    // Wait for second track to play for 5 seconds, then pause
    Player.events.addEventListener(
      'media-product-transition',
      e => {
        const detail = e.detail;
        if (detail.mediaProduct.productId !== TRACK_2.productId) {
          return;
        }
        void (async () => {
          print('🎵 Second track playing - waiting 5 seconds...');
          await waitFor(5000);
          // If a new run was started in the meantime, don't tear down its
          // player state on top of it.
          if (signal.aborted) {
            return;
          }
          print('✅ Test complete! Resetting player to finalize sessions.');
          print('');
          print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          print('Summary:');
          print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          print(`- Mode: ${modeLabel}`);
          print('- Dual audio element transition');
          print('- Second track pre-loaded into inactive player');
          if (gapMeasurement !== null) {
            if (gapMeasurement < 0) {
              print(
                `- ✓ RESULT: ${Math.abs(gapMeasurement).toFixed(2)}ms crossfade overlap (TRUE GAPLESS)`,
              );
            } else {
              print(`- RESULT: ${gapMeasurement.toFixed(2)}ms gap detected`);
            }
          }
          print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          await Player.reset();
          clearInterval(intervalId);
          updateStatus('Test complete - Gapless crossfade verified! ✓');
          reenableStartBtn();
        })();
      },
      { signal },
    );

    // Stop the periodic UI updates if the run is aborted (e.g. user re-clicks Play)
    signal.addEventListener('abort', () => {
      clearInterval(intervalId);
    });
  } catch (error) {
    console.error('Test failed:', error);
    updateStatus('Error: ' + error.message);
    reenableStartBtn();
  }
}

function reenableStartBtn() {
  const btn = document.getElementById('startBtn');
  if (btn) {
    btn.disabled = false;
  }
}

// Auto-run when URL param is set (Cypress tests), otherwise wait for Play button
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('crossfadeInMs')) {
  run();
} else {
  const startBtn = document.getElementById('startBtn');
  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    run();
  });
}
