import { expect } from 'chai';
import type shaka from 'shaka-player';

import {
  idToBitDepth,
  shakaTrackToAudioQuality,
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
});
