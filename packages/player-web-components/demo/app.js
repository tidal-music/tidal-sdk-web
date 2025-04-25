import * as auth from '@tidal-music/auth';
import * as eventProducer from '@tidal-music/event-producer';

import * as playerWebComponents from '../dist';

window.credform.addEventListener('submit', async submitEvent => {
  submitEvent.preventDefault();

  /** @type {HTMLFormElement} */
  const form = submitEvent.target;

  const clientId = form.elements.namedItem('clientId').value;
  const clientSecret = form.elements.namedItem('clientSecret').value;

  try {
    await auth.init({
      clientId,
      clientSecret,
      credentialsStorageKey: 'key',
      scopes: [],
    });

    eventProducer.init({
      appInfo: { appName: 'YourApp', appVersion: '1.2.3' },
      // Used to initialize the blockedConsentCategories property
      blockedConsentCategories: {
        NECESSARY: false,
        PERFORMANCE: true,
        TARGETING: true,
      },
      // An access token provider, from @tidal-music/auth.
      credentialsProvider: auth.credentialsProvider,
      // platform details
      platform: {
        browserName: 'Ice Hippo',
        browserVersion: '1.2.3',
        osName: 'Some OS',
      },
      // URI identifying the TL Consumer ingest endpoint.
      tlConsumerUri: '/api/event-batch',
      // URI for unauthorized event batches.
      tlPublicConsumerUri: '/api/public/event-batch',
    });

    playerWebComponents.setCredentialsProvider(auth.credentialsProvider);
    playerWebComponents.setEventSender(eventProducer);

    const span = document.createElement('span');
    span.textContent = 'Credentials are set!';

    form.replaceWith(span);
  } catch (err) {
    console.error(err);
  }

  return false;
});
