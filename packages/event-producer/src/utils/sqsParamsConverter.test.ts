import { epEvent1 } from '../../test/fixtures/events';

import { eventsToSqsRequestParameters } from './sqsParamsConverter';

describe('sqsParamsConverter', () => {
  it('eventToSqsRequestParameters - contains every event value stringified', () => {
    const sqsParams = eventsToSqsRequestParameters([epEvent1]);

    expect(sqsParams.get('SendMessageBatchRequestEntry.1.Id')).toEqual(
      String(epEvent1.id),
    );
    expect(sqsParams.get('SendMessageBatchRequestEntry.1.MessageBody')).toEqual(
      epEvent1.payload,
    );
    expect(
      sqsParams.get('SendMessageBatchRequestEntry.1.MessageAttribute.1.Name'),
    ).toEqual('Name');
    expect(
      sqsParams.get(
        'SendMessageBatchRequestEntry.1.MessageAttribute.1.Value.StringValue',
      ),
    ).toEqual(epEvent1.name);
    expect(
      sqsParams.get(
        'SendMessageBatchRequestEntry.1.MessageAttribute.1.Value.DataType',
      ),
    ).toEqual('String');
    expect(
      sqsParams.get('SendMessageBatchRequestEntry.1.MessageAttribute.2.Name'),
    ).toEqual('Headers');
    expect(
      sqsParams.get(
        'SendMessageBatchRequestEntry.1.MessageAttribute.2.Value.StringValue',
      ),
    ).toEqual(JSON.stringify(epEvent1.headers));
    expect(
      sqsParams.get(
        'SendMessageBatchRequestEntry.1.MessageAttribute.2.Value.DataType',
      ),
    ).toEqual('String');
  });
});
