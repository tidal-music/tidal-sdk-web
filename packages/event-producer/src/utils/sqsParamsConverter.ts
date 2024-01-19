import type { EPEvent } from '../types';

export function eventsToSqsRequestParameters(events: Array<EPEvent>) {
  const params = new URLSearchParams();

  events.forEach((event, index) => {
    const eventIndex = index + 1;
    const eventKey = `SendMessageBatchRequestEntry.${eventIndex}`;
    const attributeKey = `${eventKey}.MessageAttribute`;

    params.append(`${eventKey}.Id`, event.id);
    params.append(
      `${eventKey}.MessageBody`,
      typeof event.payload === 'string'
        ? event.payload
        : JSON.stringify(event.payload),
    );
    params.append(`${attributeKey}.1.Name`, 'Name');
    params.append(`${attributeKey}.1.Value.StringValue`, event.name);
    params.append(`${attributeKey}.1.Value.DataType`, 'String');
    if (event.headers) {
      params.append(`${attributeKey}.2.Name`, 'Headers');
      params.append(`${attributeKey}.2.Value.DataType`, 'String');
      params.append(
        `${attributeKey}.2.Value.StringValue`,
        JSON.stringify(event.headers),
      );
    }
  });

  return params;
}
