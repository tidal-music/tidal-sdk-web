import { waitForPlayers } from '../internal/helpers/wait-for-players';

export const mediaElementOne = document.createElement('video');
export const mediaElementTwo = document.createElement('video');

const prepareMediaElement = (mediaEl: HTMLMediaElement) => {
  mediaEl.setAttribute('crossorigin', 'anonymous');
  mediaEl.setAttribute('playsinline', 'playsinline');
};

prepareMediaElement(mediaElementOne);
mediaElementOne.id = 'video-one';

prepareMediaElement(mediaElementTwo);
mediaElementTwo.id = 'video-two';

const tidalPlayerRootId = 'tidal-player-root';

export function mountVideoElements() {
  let containerEl = document.getElementById(tidalPlayerRootId);

  // If the existing element isn't a plain <div>, replace it. The most
  // problematic case is HTMLTemplateElement: appending children stuffs them
  // into its inert DocumentFragment, so video playback never starts. Other
  // tags (custom elements, <span>, etc.) might also have side effects we
  // don't want -- this id is owned by the SDK, so reclaim it.
  if (containerEl && !(containerEl instanceof HTMLDivElement)) {
    containerEl.remove();
    containerEl = null;
  }

  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.id = tidalPlayerRootId;
    containerEl.style.position = 'absolute';
    containerEl.style.width = '0';
    containerEl.style.height = '0';
    containerEl.style.overflow = 'hidden';
    document.body.appendChild(containerEl);
  }

  return ensureVideoElementsMounted();
}

export function ensureVideoElementsMounted() {
  const containerEl = document.getElementById(tidalPlayerRootId);

  if (containerEl) {
    // Use Node.contains() rather than `id in children` -- the latter checks
    // for a property name on the HTMLCollection (which isn't reliably the
    // child's id), so it would return false even when the element is already
    // mounted and we'd re-appendChild() on every call (which moves the node).
    if (!containerEl.contains(mediaElementOne)) {
      containerEl.appendChild(mediaElementOne);
    }
    if (!containerEl.contains(mediaElementTwo)) {
      containerEl.appendChild(mediaElementTwo);
    }
  }

  return waitForPlayers();
}

export function activateVideoElements() {
  return new Promise<void>(resolve =>
    document.addEventListener(
      'click',
      () => {
        if (
          mediaElementOne.readyState === HTMLMediaElement.HAVE_NOTHING &&
          !mediaElementOne.src
        ) {
          mediaElementOne.load();
        }

        if (
          mediaElementTwo.readyState === HTMLMediaElement.HAVE_NOTHING &&
          !mediaElementTwo.src
        ) {
          mediaElementTwo.load();
        }

        resolve();
      },
      { once: true },
    ),
  );
}

/*
export let audioContext;
export let analyser;

const connectedMediaElements = [];
const connectedMediaElementsSourceNodes = [];

function createAudioStealerNode () {
  if ('AudioWorkletNode' in window) {
    return class AudioStealerNode extends AudioWorkletNode {
      constructor (context) {
        super(context, 'audio-stealer');

        const audioWebSocket = new WebSocket('ws://localhost:1337');

        this.port.onmessage = event => {
          const audio = event.data;

          if (audioWebSocket.readyState === WebSocket.OPEN) {
            audioWebSocket.send(audio);
          }
        };
      }
    };
  }

  return null;
}

export async function createContext (sampleRate: number, onlyCreateNewIfNoneAlready?: boolean) {
  if (onlyCreateNewIfNoneAlready && audioContext) {
    return;
  }

  if (audioContext && audioContext.sampleRate === sampleRate) {
    console.debug('Current audio context already has sample rate', sampleRate, 'reusing...');

    return audioContext;
  }

  if (audioContext) {
    console.debug('Current audio context has the wrong sample rate', sampleRate, 'creating a new one...');
    audioContext.close();
  }

  audioContext = new AudioContext(sampleRate ? {
    sampleRate
  } : {});

  console.debug('Audio context created with sample rate', sampleRate);

  const sourceNodeOne = getConnectedSourceNode(mediaElementOne);

  analyser = audioContext.createAnalyser();

  sourceNodeOne.connect(analyser);

  analyser.connect(audioContext.destination);

  return audioContext;
}

export function mediaElementIsConnected (mediaElement: HTMLMediaElement) {
  return connectedMediaElements.includes(mediaElement);
}

export function getConnectedSourceNode (
  mediaElement: HTMLMediaElement
): MediaElementAudioSourceNode {
  if (mediaElementIsConnected(mediaElement)) {
    return connectedMediaElementsSourceNodes[
      connectedMediaElements.indexOf(mediaElement)
    ];
  }

  return connectMediaElement(mediaElement);
}

export function connectMediaElement (
  mediaElement: HTMLMediaElement
): MediaElementAudioSourceNode {
  const sourceNode = audioContext.createMediaElementSource(mediaElement);

  connectedMediaElements.push(mediaElement);
  connectedMediaElementsSourceNodes.push(sourceNode);

  return sourceNode;
}

export default audioContext;
*/
