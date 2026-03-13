import { expect } from 'chai';
import { INTERCEPT_OPTIONS, SDK_BATCH_INTERVAL } from '../../helpers';

it('Crossfade Playback Test - 5s crossfade between tracks', () => {
  const credentials = JSON.parse(atob(Cypress.env().TEST_USER.substring(1, Cypress.env().TEST_USER.length - 1)));

  Cypress.env('credentials', credentials);

  cy.visit('http://localhost:5173/demo/test-case-gapless.html?crossfadeInMs=5000', {
    onBeforeLoad (win) {
      win.indexedDB.deleteDatabase('EventProducerDB');

      win.document.addEventListener('player-sdk:ended', cy.stub().as('playerSdkEnded'));
      win.document.addEventListener('player-sdk:media-product-transition', cy.stub().as('playerSdkMediaProductTransition'));
      win.document.addEventListener('player-sdk:preload-request', cy.stub().as('playerSdkPreloadRequest'));
    }
  });

  cy.intercept(INTERCEPT_OPTIONS).as('playerSdkEventsRequest');

  cy.get('@playerSdkMediaProductTransition', { timeout: 5000 }).should('be.called');

  cy.get('@playerSdkPreloadRequest', { timeout: 3000 }).should('be.called');

  // With 5s crossfade, the transition event fires ~5s before track 1 ends
  cy.get('@playerSdkMediaProductTransition', { timeout: 15000 }).should('be.calledTwice');

  cy.wait(5000);

  cy.wait('@playerSdkEventsRequest', {
    timeout: SDK_BATCH_INTERVAL + 1000,
  });

  // @ts-expect-error - Wrong type from Cypress
  cy.get('@playerSdkEventsRequest').should(({ request }) => {
    const formData = new URLSearchParams(request.body);
    const events = [];

    for (const [key, value] of formData.entries()) {
      if (key.includes('MessageBody')) {
        const event = JSON.parse(decodeURIComponent(value));
        events.push(event);
      }
    }

    const playbackSessions = events.filter(({ name }) => name === 'playback_session');

    expect(playbackSessions).to.have.lengthOf(2);

    const firstSession = playbackSessions[0];
    const secondSession = playbackSessions[1];

    expect(firstSession.payload).to.include({
      startAssetPosition: 0,
      actualProductId: '55391449',
      sourceType: 'gapless-test',
    });

    expect(firstSession.payload.endAssetPosition).to.be.closeTo(147, 1);

    expect(secondSession.payload).to.include({
      startAssetPosition: 0,
      actualProductId: '55391450',
      sourceType: 'gapless-test',
    });

    expect(secondSession.payload.endAssetPosition).to.be.closeTo(5, 1);

    // With 5s crossfade, track 2 starts ~5s before track 1 ends
    // so the gap should be negative (overlap) and roughly -5000ms
    expect(firstSession.payload.endTimestamp).to.exist;
    expect(secondSession.payload.startTimestamp).to.exist;
    const gapBetweenTracks = secondSession.payload.startTimestamp - firstSession.payload.endTimestamp;
    expect(gapBetweenTracks).to.be.lessThan(0);
    expect(Math.abs(gapBetweenTracks)).to.be.lessThan(6000);
  });
});
