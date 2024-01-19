export function waitFor(ms: number) {
  // setTimeout are garbage collected on a "this" basis.
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}

export function waitForEvent(target: EventTarget, eventName: string) {
  return new Promise(resolve => {
    target.addEventListener(eventName, event => resolve(event), false);
  });
}
