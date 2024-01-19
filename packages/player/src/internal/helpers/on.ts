export function on(target: EventTarget, eventName: string) {
  return new Promise(resolve => {
    target.addEventListener(eventName, event => resolve(event), { once: true });
  });
}
