import { expect } from 'chai';
import { INTERCEPT_OPTIONS, SDK_BATCH_INTERVAL } from '../../helpers';

it('Gapless Playback Test - Pink Floyd Album Transition', () => {
  const credentials = JSON.parse(atob(Cypress.env().TEST_USER.substring(1, Cypress.env().TEST_USER.length - 1)));

  // Pass env to test app
  Cypress.env('credentials', credentials);

  // Load test case that tests gapless transition between two consecutive album tracks
  cy.visit('http://localhost:5173/demo/test-case-gapless.html', {
    onBeforeLoad (win) {
      // Clear IndexedDB to prevent cached data from previous tests
      win.indexedDB.deleteDatabase('EventProducerDB');

      // start spying
      win.document.addEventListener('player-sdk:ended', cy.stub().as('playerSdkEnded'));
      win.document.addEventListener('player-sdk:media-product-transition', cy.stub().as('playerSdkMediaProductTransition'));
      win.document.addEventListener('player-sdk:preload-request', cy.stub().as('playerSdkPreloadRequest'));
    }
  });

  // Start intercepting events endpoint BEFORE any analytics are sent
  cy.intercept(INTERCEPT_OPTIONS).as(
    'playerSdkEventsRequest',
  );

  // Wait for first media product transition (The Thin Ice)
  cy.get('@playerSdkMediaProductTransition', { timeout: 5000 }).should('be.called');

  // Wait for preload request (should trigger immediately after seeking near the end)
  cy.get('@playerSdkPreloadRequest', { timeout: 3000 }).should('be.called');

  // Wait for second media product transition (Another Brick in the Wall, Pt. 1)
  // With gapless crossfade, this happens ~5s after seeking (0.2s before first track ends)
  cy.get('@playerSdkMediaProductTransition', { timeout: 10000 }).should('be.calledTwice');

  // In gapless mode, the 'ended' event is NOT dispatched for the first track
  // because playback continues seamlessly. Dispatching 'ended' would cause apps
  // to incorrectly try to advance to the next track (which already started).
  // Analytics/metrics are still tracked via internal eventTrackingStreamingEnded.

  // Wait for second track to play for 5 seconds to ensure playback session is logged
  cy.wait(5000);

  // Wait for next event batch
  cy.wait('@playerSdkEventsRequest', {
    timeout: SDK_BATCH_INTERVAL + 1000,
  });

  // Assert on event batch
  // @ts-expect-error - Wrong type from Cypress
  cy.get('@playerSdkEventsRequest').should(({ request }) => {
    // Parse the form data to get all message bodies
    const formData = new URLSearchParams(request.body);
    const events = [];

    // Iterate through all entries to find MessageBody parameters
    for (const [key, value] of formData.entries()) {
      if (key.includes('MessageBody')) {
        const event = JSON.parse(decodeURIComponent(value));
        events.push(event);
      }
    }

    const playbackSessions = events.filter(({ name }) => name === 'playback_session');

    // Should have two playback sessions (one for each track)
    expect(playbackSessions).to.have.lengthOf(2);

    const firstSession = playbackSessions[0];
    const secondSession = playbackSessions[1];

    // First track: The Thin Ice (55391449)
    expect(firstSession.payload).to.include({
      startAssetPosition: 0,
      actualProductId: '55391449',
      sourceType: 'gapless-test',
    });

    // Verify first track ended at correct position (~147s, the track's full duration)
    // This validates the fix where endAssetPosition comes from the correct media element
    expect(firstSession.payload.endAssetPosition).to.be.closeTo(147, 1);

    // Second track: Another Brick in the Wall, Pt. 1 (55391450)
    expect(secondSession.payload).to.include({
      startAssetPosition: 0,
      actualProductId: '55391450',
      sourceType: 'gapless-test',
    });

    // Verify second track ended at correct position (~5s, where we called reset)
    // This ensures we're not using the wrong player's currentTime
    expect(secondSession.payload.endAssetPosition).to.be.closeTo(5, 1);

    // Verify gapless transition - second track should start very close to first track ending
    // With crossfade starting 200ms before track 1 ends, track 2 actually starts BEFORE track 1 ends
    // We allow up to 300ms tolerance for event processing and timing variations
    expect(firstSession.payload.endTimestamp).to.exist;
    expect(secondSession.payload.startTimestamp).to.exist;
    const gapBetweenTracks = secondSession.payload.startTimestamp - firstSession.payload.endTimestamp;
    expect(Math.abs(gapBetweenTracks)).to.be.lessThan(300); // Less than 300ms gap/overlap
  });
});
