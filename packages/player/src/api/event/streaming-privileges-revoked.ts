export type StreamingPrivilegesRevokedEvent = CustomEvent<string>;
export const eventName = 'streaming-privileges-revoked';

export function streamingPrivilegesRevokedEvent(
  otherDevice: string,
): StreamingPrivilegesRevokedEvent {
  return new CustomEvent<string>(eventName, {
    detail: otherDevice,
  });
}
