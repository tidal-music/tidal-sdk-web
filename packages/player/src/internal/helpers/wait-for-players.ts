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
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    return Promise.reject('No player root');
  }

  if ('video-one' in playerRoot.children) {
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

  return Promise.all(promises);
}
