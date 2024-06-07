import type { EPEvent, SentEvent } from '../../src';

export const eventPayload1: SentEvent = {
  consentCategory: 'NECESSARY',
  name: 'display_page',
  payload: {
    contentId: '15349',
    contentType: 'artist',
    currentRoute: '/artist/15349',
    pageId:
      'eyJwIjoiYWUyMjMzMTAtYTRjMi00NTY4LWE3NzAtZmZlZjcwMzQ0NDQxIiwicFYiOjR9',
    previousRoute: '/',
  },
};

export const epEvent1: EPEvent = {
  headers: {},
  id: 'mcLovin',
  name: 'fakeName',
  payload: JSON.stringify(eventPayload1.payload),
};

export const epEvent2: EPEvent = {
  headers: {},
  id: 'idnr2',
  name: 'bacon',
  payload: JSON.stringify(eventPayload1.payload),
};
