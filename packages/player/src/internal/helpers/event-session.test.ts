import { expect } from 'chai';

import { db } from './event-session';

describe('EventSessionDB', () => {
  it('should put and get an event', async () => {
    const event = {
      name: 'test_event',
      payload: { data: 'testPayload' },
      streamingSessionId: crypto.randomUUID(),
    };

    // Put the event into the database
    await db.put(event);

    // Get the event from the database
    const retrievedEvent = await db.get<{ data: string }>({
      name: event.name,
      streamingSessionId: event.streamingSessionId,
    });

    // Assert that the retrieved event matches the original event
    expect(retrievedEvent?.payload.data).to.equal('testPayload');
  });

  it('should delete an event', async () => {
    const event = {
      name: 'test_event',
      payload: { data: 'testPayload' },
      streamingSessionId: crypto.randomUUID(),
    };

    // Put the event into the database
    await db.put(event);

    // Delete the event from the database
    await db.delete({
      name: event.name,
      streamingSessionId: event.streamingSessionId,
    });

    // Get the event from the database
    const retrievedEvent = await db.get({
      name: event.name,
      streamingSessionId: event.streamingSessionId,
    });

    // Assert that the retrieved event is undefined (deleted)
    expect(retrievedEvent).to.equal(undefined);
  });

  it('should update an event', async () => {
    const event = {
      name: 'testEvent',
      payload: { data: 'testPayload' },
      streamingSessionId: 'testSessionId',
    };

    // Put the event into the database
    await db.put(event);

    // Update the event in the database
    const updatedEvent = {
      ...event,
      payload: { data: 'updatedPayload' },
    };
    await db.put(updatedEvent);

    // Get the event from the database
    const retrievedEvent = await db.get<{ data: string }>({
      name: updatedEvent.name,
      streamingSessionId: updatedEvent.streamingSessionId,
    });

    // Assert that the retrieved event matches the updated event
    expect(retrievedEvent?.payload.data).to.equal('updatedPayload');
  });
});
