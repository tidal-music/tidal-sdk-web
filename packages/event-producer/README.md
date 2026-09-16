# TIDAL Event Producer

## Description
This module is only intended for internal use at TIDAL, but feel free to look at the code.

For the full specification, see the [EventProducer specification](https://github.com/tidal-music/tidal-sdk/blob/main/EventProducer.md).

Transportation layer (TL) - The part of event platform that is responsible for transporting events from
the app to the backend.

The design uses a [Job queue pattern](https://en.wikipedia.org/wiki/Job_queue) for sending events, where each event
is considered a job. As such, the design divides the functionality of sending an events into three major parts:
- Submitter - This logic is triggered by the sendEvent function. The responsibility of the submitter logic is
  to perform basic processing of the event and storing it in the Queue, gathering information about anything that
  causes the event not to end up in the queue.
- Queue - A data structure in persistent memory that contains events that are submitted, but not yet confirmed received
  by the TL Consumer.
- Scheduler - This logic is executed in a background process/thread owned by the EventProducer. The responsibility of
  this logic is to read events from the Queue, send them to the TL Consumer, and remove events from the Queue once
  confirmed received by the TL Consumer.

## Performance
To keep the package from blocking the main thread we wrap it in a worker and use localforage with indexedDB as the driver.


## Repo Setup

Run `pnpm i` in the event-producer root folder.


## Running Tests

### Unit Tests

`pnpm test` or `pnpm test:ui`

### Demo
`pnpm dev`


## How to use

```typescript
import { init, sendEvent, bus } from '@tidal-music/event-producer';
import { credentialsProvider } from './credentialsProvider';


async function main() {
  /**
   * Bootstrap the event producer by calling the init function.
   * This will start the scheduler and restore any previously stored events.
   * Note must be called before dispatchEvent.
   */
  await init({
    appInfo: { appName: 'YourApp', appVersion: '1.2.3' },
    // Used to initialize the blockedConsentCategories property
    blockedConsentCategories: {
      NECESSARY: false,
      PERFORMANCE: false,
      TARGETING: true,
    },
    // An access token provider, from @tidal-music/auth.
    credentialsProvider,
    // platform details
    platform: {
      browserName: 'Ice Hippo',
      browserVersion: '1.2.3',
      deviceVendor: 'Binocular',
      model: 'shyPhone',
      osName: 'Hov OS',
      version: '1.2.3',
    },
    // Optional Debug for integration purposes. Checks if consentCategory is missing.
    strictMode: false,
    // URI identifying the TL Consumer ingest endpoint.
    tlConsumerUri: '/api/event-batch',
    // URI for unauthorized event batches.
    tlPublicConsumerUri: '/api/public/event-batch',
  });

  // Now we can send events
  sendEvent({
    consentCategory: 'PERFORMANCE',
    name: 'listened_to_track',
    payload: {
      certifiedBanger: true,
    }
  })

  bus(()=>{
      console.log('Event producer outage state changed', )
  })
}


```

### Draining the queue (logout / profile switch)

Queued events are only sent on the scheduler's interval, so events produced right
before a user logs out can be left in the queue. If the credentials provider then
throws because nobody is logged in, they stay there until the next login.

Call `flush()` before signing out or switching the active user to submit everything
that is queued while the current credentials are still available:

```typescript
import { flush } from '@tidal-music/event-producer';

async function logout() {
  // Best effort: resolves when the queue is empty or a batch fails.
  // Rejects only if no credentialsProvider is set or getCredentials() rejects.
  await flush().catch(console.error);
  // ...now swap the credentials provider / sign out
}
```

Notes:

- Each event carries its own authorization header and user payload from the moment
  it was produced, and the backend attributes events from that record. Events left
  over after a failed `flush()` are still attributed to the user who produced them,
  so it is safe for them to be sent later.
- A credentials provider that returns client credentials (no user token) when nobody
  is logged in lets the queue drain through `tlPublicConsumerUri` instead of stalling.
- `flush()` shares the in-flight submit with the scheduler: if a scheduled submit is
  already running, `flush()` awaits that run rather than starting a second one.
