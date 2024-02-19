import { expect } from 'chai';

import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/index';
import { trueTime } from '../internal/true-time';

import { saveAdaptation, shakaTrackToAdaptation } from './adaptations';

await trueTime.synchronize();

describe('shakaTrackToAdaptation', () => {
  it('generates an adaptation object for streaming metrics', () => {
    // Raw output from shaka
    const shakaTrack = JSON.parse(
      '{"id":0,"active":true,"type":"variant","bandwidth":983528,"language":"und","label":null,"kind":null,"width":null,"height":null,"frameRate":null,"pixelAspectRatio":null,"hdr":null,"mimeType":"audio/mp4","codecs":"flac","audioCodec":"flac","videoCodec":null,"primary":false,"roles":[],"audioRoles":[],"forced":false,"videoId":null,"audioId":1,"channelsCount":null,"audioSamplingRate":44100,"spatialAudio":false,"tilesLayout":null,"audioBandwidth":983528,"videoBandwidth":null,"originalVideoId":null,"originalAudioId":"0","originalTextId":null,"originalImageId":null}',
    );
    const adaptation = shakaTrackToAdaptation(shakaTrack, 0);

    // Mocked media element
    expect(adaptation.assetPosition).to.equal(0);
    expect(adaptation.bandwidth).to.equal(983528);
    expect(adaptation.codecs).to.equal('flac');

    // No width and height since the asserted shaka track is a audio only.
    expect(adaptation.videoWidth).to.equal(null);
    expect(adaptation.videoHeight).to.equal(null);
  });
});

// eslint-disable-next-line vitest/valid-describe-callback
describe('saveAdaptation', () => {
  it('saves the adaptation in streaming metrics', async () => {
    const activeShakaTrack = JSON.parse(
      '{"id":6,"active":true,"type":"variant","bandwidth":3117998,"language":"und","label":null,"kind":null,"width":1280,"height":720,"frameRate":null,"pixelAspectRatio":null,"hdr":null,"mimeType":"video/mp2t","codecs":"avc1.4D401F,mp4a.40.2","audioCodec":null,"videoCodec":"avc1.4D401F,mp4a.40.2","primary":false,"roles":[],"audioRoles":null,"forced":false,"videoId":5,"audioId":null,"channelsCount":null,"audioSamplingRate":null,"spatialAudio":false,"tilesLayout":null,"audioBandwidth":null,"videoBandwidth":null,"originalVideoId":null,"originalAudioId":null,"originalTextId":null,"originalImageId":null}',
    );
    const adaptation = await saveAdaptation(
      'jeremy-session',
      activeShakaTrack,
      1337,
    );
    const event = await StreamingMetrics.playbackStatistics({
      streamingSessionId: 'jeremy-session',
    });

    if (!event) {
      throw new Error('Event undefined');
    }

    expect(event.payload.adaptations[0]).to.deep.equal(adaptation);
  });
});
