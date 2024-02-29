import { expect } from 'chai';
import { INTERCEPT_OPTIONS, SDK_BATCH_INTERVAL } from '../../helpers';

it('Client Test Case 1', () => {
  console.log(JSON.stringify(Cypress.env()));
  console.log(Cypress.env().TEST_USER);

  const credentials = JSON.parse(atob(Cypress.env().TEST_USER.substring(1, Cypress.env().TEST_USER.length - 1)));

  // Pass env to test app
  Cypress.env('credentials', credentials);

  // Load test case that logins in and plays a track
  cy.visit('http://localhost:5173/demo/test-case-1.html', {
    onBeforeLoad (win) {
      // start spying
      win.document.addEventListener('player-sdk:ended', cy.stub().as('playerSdkEnded'));
      win.document.addEventListener('player-sdk:media-product-transition', cy.stub().as('playerSdkMediaProductTransition'));
    }
  });

  // Wait for media product transition
  cy.get('@playerSdkMediaProductTransition', { timeout: 5000 }).should('be.called');

  // Wait for track to finish playing.
  cy.get('@playerSdkEnded', { timeout: 10000 }).should('be.called');

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
    const playbackSessions = request.body.events.filter(({ name }) => name === 'playback_session');

    expect(playbackSessions).to.have.lengthOf(1);

    const playbackSession = playbackSessions[0];

    expect(playbackSession.payload).to.include({
      startAssetPosition: 0,
      endAssetPosition: 0.999999,
      actualProductId: '108506136',
      sourceType: 'ALBUM',
      sourceId: '4141352'
    });

    expect(playbackSession.payload.actions).to.have.lengthOf(0);
  })
});
