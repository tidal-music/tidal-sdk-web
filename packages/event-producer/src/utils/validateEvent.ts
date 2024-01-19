import type { EPEvent } from '../types';

const encoder = new TextEncoder();

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface String {
    isWellFormed?(): boolean;
  }
}

// TODO: review this implementation after first release, currently returns falsely true for older browsers
const isValidXMLString = (input: string): boolean =>
  input.isWellFormed ? input.isWellFormed() : true;
const isStringUnder20KiB = (input: string) =>
  encoder.encode(input).length < 20480;

export const validateEvent = ({ payload, ...eventWithoutPayload }: EPEvent) => {
  const stringifiedEvent = JSON.stringify(eventWithoutPayload) + payload;
  return (
    isStringUnder20KiB(stringifiedEvent) && isValidXMLString(stringifiedEvent)
  );
};
