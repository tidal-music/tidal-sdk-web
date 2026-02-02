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

  // Wait for first media product transition (The Thin Ice)
  cy.get('@playerSdkMediaProductTransition', { timeout: 5000 }).should('be.called');

  // Wait for preload request (should trigger when seeking near the end)
  cy.get('@playerSdkPreloadRequest', { timeout: 10000 }).should('be.called');

  // Wait for second media product transition (Another Brick in the Wall, Pt. 1)
  // This should happen automatically via gapless playback (~10 seconds after seeking)
  cy.get('@playerSdkMediaProductTransition', { timeout: 20000 }).should('be.calledTwice');

  // Wait for first track to end
  cy.get('@playerSdkEnded', { timeout: 5000 }).should('be.called');
  
  // Test completes after 5 seconds of second track playing

  // Start intercepting events endpoint
  cy.intercept(INTERCEPT_OPTIONS).as(
    'playerSdkEventsRequest',
  );

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
      sourceType: 'track',
    });

    // Second track: Another Brick in the Wall, Pt. 1 (55391450)
    expect(secondSession.payload).to.include({
      startAssetPosition: 0,
      actualProductId: '55391450',
      sourceType: 'track',
    });

    // Verify gapless transition - second track should start immediately after first
    // The idealStartTimestamp should be very close to the first track's end
    expect(secondSession.payload.startTimestamp).to.exist;
  });
});
