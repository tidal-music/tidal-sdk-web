const handler = (
  mutationList: Array<MutationRecord>,
  childName: string,
  resolve: (value: PromiseLike<void> | void) => void,
) => {
  for (const mutation of mutationList) {
    const addedElement = mutation.addedNodes[0] as Element;

    if (mutation.type === 'childList' && addedElement.id === childName) {
      resolve();
    }
  }
};

export function waitForPlayers() {
  const playerRoot = document.getElementById('tidal-player-root');

  if (!playerRoot) {
    return Promise.reject('No player root');
  }

  if (
    'video-one' in playerRoot.children &&
    'video-two' in playerRoot.children
  ) {
    return Promise.resolve();
  }

  const promises = [];

  if (!('video-one' in playerRoot.children)) {
    promises.push(
      new Promise<void>(resolve => {
        new MutationObserver(mutationList =>
          handler(mutationList, 'video-one', resolve),
        ).observe(playerRoot, { childList: true });
      }),
    );
  }

  if (!('video-two' in playerRoot.children)) {
    promises.push(
      new Promise<void>(resolve => {
        new MutationObserver(mutationList =>
          handler(mutationList, 'video-two', resolve),
        ).observe(playerRoot, { childList: true });
      }),
    );
  }

  return Promise.all(promises);
}
