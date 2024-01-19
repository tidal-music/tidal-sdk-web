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
  let templateEl = document.getElementById(tidalPlayerRootId);

  if (!templateEl) {
    const template = document.createElement('template');

    template.id = tidalPlayerRootId;
    document.body.appendChild(template);
    templateEl = document.getElementById(tidalPlayerRootId);
  }

  return ensureVideoElementsMounted();
}

export function ensureVideoElementsMounted() {
  const templateEl = document.getElementById(
    tidalPlayerRootId,
  ) as HTMLTemplateElement | null;

  if (templateEl) {
    if (!(mediaElementOne.id in templateEl.children)) {
      templateEl.appendChild(mediaElementOne);
    }

    if (!(mediaElementTwo.id in templateEl.children)) {
      templateEl.appendChild(mediaElementTwo);
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
  const sourceNodeTwo = getConnectedSourceNode(mediaElementTwo);

  analyser = audioContext.createAnalyser();

  sourceNodeOne.connect(analyser);
  sourceNodeTwo.connect(analyser);

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
