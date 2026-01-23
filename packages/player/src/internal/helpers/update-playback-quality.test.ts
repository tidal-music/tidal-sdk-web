import { expect } from 'chai';
import type shaka from 'shaka-player';

import type { PlaybackQualityChangedPayload } from '../../api/event/playback-quality-changed';
import type { MediaProduct, PlaybackContext } from '../../api/interfaces';
import { events } from '../../event-bus';

import { streamingSessionStore } from './streaming-session-store';
import {
  idToBitDepth,
  shakaTrackToAudioQuality,
  updatePlaybackQuality,
} from './update-playback-quality';

describe('update-playback-quality', () => {
  describe('shakaTrackToAudioQuality', () => {
    it('returns HI_RES_LOSSLESS for FLAC with sample rate > 44100', () => {
      const track = {
        audioCodec: 'flac',
        audioSamplingRate: 96000,
      } as shaka.extern.Track;

      expect(shakaTrackToAudioQuality(track)).to.equal('HI_RES_LOSSLESS');
    });

    it('returns HI_RES_LOSSLESS for FLAC with bit depth > 16', () => {
      const track = {
        audioCodec: 'flac',
        audioSamplingRate: 44100,
        originalAudioId: 'FLAC,44100,24',
      } as shaka.extern.Track;

      expect(shakaTrackToAudioQuality(track)).to.equal('HI_RES_LOSSLESS');
    });

    it('returns LOSSLESS for FLAC with standard sample rate and bit depth', () => {
      const track = {
        audioCodec: 'flac',
        audioSamplingRate: 44100,
        originalAudioId: 'FLAC,44100,16',
      } as shaka.extern.Track;

      expect(shakaTrackToAudioQuality(track)).to.equal('LOSSLESS');
    });

    it('returns LOSSLESS for FLAC without originalAudioId and standard sample rate', () => {
      const track = {
        audioCodec: 'flac',
        audioSamplingRate: 44100,
      } as shaka.extern.Track;

      expect(shakaTrackToAudioQuality(track)).to.equal('LOSSLESS');
    });

    it('returns HIGH for AAC-LC codec (mp4a.40.2)', () => {
      const track = {
        audioCodec: 'mp4a.40.2',
        audioSamplingRate: 44100,
      } as shaka.extern.Track;

      expect(shakaTrackToAudioQuality(track)).to.equal('HIGH');
    });

    it('returns LOW for HE-AAC codec (mp4a.40.5)', () => {
      const track = {
        audioCodec: 'mp4a.40.5',
        audioSamplingRate: 44100,
      } as shaka.extern.Track;

      expect(shakaTrackToAudioQuality(track)).to.equal('LOW');
    });

    it('returns LOW for unknown codecs', () => {
      const track = {
        audioCodec: 'unknown',
        audioSamplingRate: 44100,
      } as shaka.extern.Track;

      expect(shakaTrackToAudioQuality(track)).to.equal('LOW');
    });

    it('returns LOW when audioCodec is undefined', () => {
      const track = {
        audioSamplingRate: 44100,
      } as shaka.extern.Track;

      expect(shakaTrackToAudioQuality(track)).to.equal('LOW');
    });
  });

  describe('idToBitDepth', () => {
    it('extracts bit depth from comma-separated format like "FLAC,44100,16"', () => {
      expect(idToBitDepth('FLAC,44100,16')).to.equal(16);
    });

    it('extracts bit depth from comma-separated format like "FLAC,96000,24"', () => {
      expect(idToBitDepth('FLAC,96000,24')).to.equal(24);
    });

    it('returns undefined for formats without commas like "HEAACV1"', () => {
      expect(idToBitDepth('HEAACV1')).to.equal(undefined);
    });

    it('returns undefined for formats without commas like "AACLC"', () => {
      expect(idToBitDepth('AACLC')).to.equal(undefined);
    });

    it('returns undefined for empty string', () => {
      expect(idToBitDepth('')).to.equal(undefined);
    });
  });

  describe('updatePlaybackQuality', () => {
    const testSessionId = 'test-session-123';
    const testMediaProduct: MediaProduct = {
      productId: '12345',
      productType: 'track',
      sourceId: 'test-source',
      sourceType: 'test',
    };
    const testPlaybackContext: PlaybackContext = {
      actualAssetPresentation: 'FULL',
      actualAudioMode: 'STEREO',
      actualAudioQuality: 'LOSSLESS',
      actualDuration: 200,
      actualProductId: '12345',
      actualStreamType: 'ON_DEMAND',
      actualVideoQuality: null,
      assetPosition: 0,
      bandwidth: null,
      bitDepth: 16,
      codec: 'flac',
      playbackSessionId: testSessionId,
      sampleRate: 44100,
    };

    afterEach(() => {
      streamingSessionStore.deleteSession(testSessionId);
    });

    it('does nothing when currentStreamingSessionId is undefined', () => {
      const track = {
        audioCodec: 'flac',
        audioSamplingRate: 44100,
        bandwidth: 1000000,
      } as shaka.extern.Track;

      // Should not throw and should not update store
      updatePlaybackQuality(undefined, track);
      expect(
        streamingSessionStore.getMediaProductTransition(testSessionId),
      ).to.equal(undefined);
    });

    it('does nothing when activeShakaTrack is undefined', () => {
      // Should not throw and should not update store
      updatePlaybackQuality(testSessionId, undefined);
      expect(
        streamingSessionStore.getMediaProductTransition(testSessionId),
      ).to.equal(undefined);
    });

    it('does nothing when activeShakaTrack has no audioCodec', () => {
      const track = {
        audioSamplingRate: 44100,
        bandwidth: 1000000,
      } as shaka.extern.Track;

      // Should not throw and should not update store
      updatePlaybackQuality(testSessionId, track);
      expect(
        streamingSessionStore.getMediaProductTransition(testSessionId),
      ).to.equal(undefined);
    });

    it('does nothing when no media product transition is saved', () => {
      const track = {
        audioCodec: 'flac',
        audioSamplingRate: 44100,
        bandwidth: 1000000,
      } as shaka.extern.Track;

      // Should not throw (just logs a warning) and store remains empty
      updatePlaybackQuality(testSessionId, track);
      expect(
        streamingSessionStore.getMediaProductTransition(testSessionId),
      ).to.equal(undefined);
    });

    it('updates streaming session store with new playback context', () => {
      // Setup: save a media product transition
      streamingSessionStore.saveMediaProductTransition(testSessionId, {
        mediaProduct: testMediaProduct,
        playbackContext: testPlaybackContext,
      });

      const track = {
        audioCodec: 'flac',
        audioSamplingRate: 96000,
        bandwidth: 2000000,
        originalAudioId: 'FLAC,96000,24',
      } as shaka.extern.Track;

      updatePlaybackQuality(testSessionId, track);

      const updated =
        streamingSessionStore.getMediaProductTransition(testSessionId);
      expect(updated).to.not.equal(undefined);
      expect(updated?.playbackContext.actualAudioQuality).to.equal(
        'HI_RES_LOSSLESS',
      );
      expect(updated?.playbackContext.bandwidth).to.equal(2000000);
      expect(updated?.playbackContext.bitDepth).to.equal(24);
      expect(updated?.playbackContext.sampleRate).to.equal(96000);
    });

    it('dispatches playback-quality-changed event', done => {
      // Setup: save a media product transition
      streamingSessionStore.saveMediaProductTransition(testSessionId, {
        mediaProduct: testMediaProduct,
        playbackContext: testPlaybackContext,
      });

      const track = {
        audioCodec: 'flac',
        audioSamplingRate: 96000,
        bandwidth: 2000000,
        originalAudioId: 'FLAC,96000,24',
      } as shaka.extern.Track;

      const handler = (e: Event) => {
        events.removeEventListener('playback-quality-changed', handler);
        const customEvent = e as CustomEvent<PlaybackQualityChangedPayload>;
        expect(customEvent.detail.playbackContext.actualAudioQuality).to.equal(
          'HI_RES_LOSSLESS',
        );
        expect(customEvent.detail.playbackContext.bandwidth).to.equal(2000000);
        done();
      };

      events.addEventListener('playback-quality-changed', handler);

      updatePlaybackQuality(testSessionId, track);
    });

    it('sets codec to null when audioCodec is not a recognized format', () => {
      streamingSessionStore.saveMediaProductTransition(testSessionId, {
        mediaProduct: testMediaProduct,
        playbackContext: testPlaybackContext,
      });

      const track = {
        audioCodec: 'unknown-codec',
        audioSamplingRate: 44100,
        bandwidth: 1000000,
      } as shaka.extern.Track;

      updatePlaybackQuality(testSessionId, track);

      const updated =
        streamingSessionStore.getMediaProductTransition(testSessionId);
      expect(updated?.playbackContext.codec).to.equal(null);
    });

    it('sets bitDepth to null when originalAudioId is not present', () => {
      streamingSessionStore.saveMediaProductTransition(testSessionId, {
        mediaProduct: testMediaProduct,
        playbackContext: testPlaybackContext,
      });

      const track = {
        audioCodec: 'mp4a.40.2',
        audioSamplingRate: 44100,
        bandwidth: 320000,
      } as shaka.extern.Track;

      updatePlaybackQuality(testSessionId, track);

      const updated =
        streamingSessionStore.getMediaProductTransition(testSessionId);
      expect(updated?.playbackContext.bitDepth).to.equal(null);
      expect(updated?.playbackContext.actualAudioQuality).to.equal('HIGH');
    });
  });
});
