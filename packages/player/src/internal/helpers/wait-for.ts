export function waitFor(ms: number): Promise<void> {
  // setTimeout are garbage collected on a "this" basis.
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}

export function waitForEvent(target: EventTarget, eventName: string): Promise<Event> {
  return new Promise(resolve => {
    target.addEventListener(eventName, event => resolve(event), false);
  });
}
