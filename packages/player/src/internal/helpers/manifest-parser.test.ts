import { expect } from 'chai';

import { parseManifest } from './manifest-parser';
import type { PlaybackInfoTrack } from './playback-info-resolver';

const dashPlaybackInfoTrack: PlaybackInfoTrack = {
  albumPeakAmplitude: 0,
  albumReplayGain: 0,
  assetPresentation: 'FULL',
  audioMode: 'STEREO',
  audioQuality: 'LOSSLESS',
  bitDepth: null,
  manifest:
    'PD94bWwgdmVyc2lvbj0nMS4wJyBlbmNvZGluZz0nVVRGLTgnPz48TVBEIHhtbG5zPSJ1cm46bXBlZzpkYXNoOnNjaGVtYTptcGQ6MjAxMSIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbG5zOmNlbmM9InVybjptcGVnOmNlbmM6MjAxMyIgeHNpOnNjaGVtYUxvY2F0aW9uPSJ1cm46bXBlZzpkYXNoOnNjaGVtYTptcGQ6MjAxMSBEQVNILU1QRC54c2QiIHByb2ZpbGVzPSJ1cm46bXBlZzpkYXNoOnByb2ZpbGU6aXNvZmYtbWFpbjoyMDExIiB0eXBlPSJzdGF0aWMiIG1pbkJ1ZmZlclRpbWU9IlBUMlMiIG1lZGlhUHJlc2VudGF0aW9uRHVyYXRpb249IlBUMTkzLjkxOFMiPjxQZXJpb2QgaWQ9IjAiPjxBZGFwdGF0aW9uU2V0IGlkPSIwIiBtaW1lVHlwZT0iYXVkaW8vbXA0IiBzdWJzZWdtZW50QWxpZ25tZW50PSJ0cnVlIj48Q29udGVudFByb3RlY3Rpb24gc2NoZW1lSWRVcmk9InVybjptcGVnOmRhc2g6bXA0cHJvdGVjdGlvbjoyMDExIiB2YWx1ZT0iY2JjcyIgY2VuYzpkZWZhdWx0X0tJRD0iZTE3NDkzM2ItZTRlMi0xMjY0LWQxOGQtODNiYzQzNDU5YWE5Ii8+PENvbnRlbnRQcm90ZWN0aW9uIHNjaGVtZUlkVXJpPSJ1cm46dXVpZDplZGVmOGJhOS03OWQ2LTRhY2UtYTNjOC0yN2RjZDUxZDIxZWQiPjxjZW5jOnBzc2g+QUFBQU1uQnpjMmdBQUFBQTdlK0xxWG5XU3M2anlDZmMxUjBoN1FBQUFCSVNFT0Ywa3p2azRoSmswWTJEdkVORm1xaz08L2NlbmM6cHNzaD48L0NvbnRlbnRQcm90ZWN0aW9uPjxDb250ZW50UHJvdGVjdGlvbiBzY2hlbWVJZFVyaT0idXJuOnV1aWQ6OWEwNGYwNzktOTg0MC00Mjg2LWFiOTItZTY1YmUwODg1Zjk1Ij48Y2VuYzpwc3NoPkFBQUIzbkJ6YzJnQUFBQUFtZ1R3ZVpoQVFvYXJrdVpiNEloZmxRQUFBYjYrQVFBQUFRQUJBTFFCUEFCWEFGSUFUUUJJQUVVQVFRQkVBRVVBVWdBZ0FIZ0FiUUJzQUc0QWN3QTlBQ0lBYUFCMEFIUUFjQUE2QUM4QUx3QnpBR01BYUFCbEFHMEFZUUJ6QUM0QWJRQnBBR01BY2dCdkFITUFid0JtQUhRQUxnQmpBRzhBYlFBdkFFUUFVZ0JOQUM4QU1nQXdBREFBTndBdkFEQUFNd0F2QUZBQWJBQmhBSGtBVWdCbEFHRUFaQUI1QUVnQVpRQmhBR1FBWlFCeUFDSUFJQUIyQUdVQWNnQnpBR2tBYndCdUFEMEFJZ0EwQUM0QU13QXVBREFBTGdBd0FDSUFQZ0E4QUVRQVFRQlVBRUVBUGdBOEFGQUFVZ0JQQUZRQVJRQkRBRlFBU1FCT0FFWUFUd0ErQUR3QVN3QkpBRVFBVXdBK0FEd0FTd0JKQUVRQUlBQkJBRXdBUndCSkFFUUFQUUFpQUVFQVJRQlRBRU1BUWdCREFDSUFJQUJXQUVFQVRBQlZBRVVBUFFBaUFFOEFOUUJPQURBQU5BQmxBRXdBYXdCYUFFSUFUQUJTQUdvQVdRQlBBRGdBVVFBd0FGY0FZUUJ4QUZFQVBRQTlBQ0lBUGdBOEFDOEFTd0JKQUVRQVBnQThBQzhBU3dCSkFFUUFVd0ErQUR3QUx3QlFBRklBVHdCVUFFVUFRd0JVQUVrQVRnQkdBRThBUGdBOEFDOEFSQUJCQUZRQVFRQStBRHdBTHdCWEFGSUFUUUJJQUVVQVFRQkVBRVVBVWdBK0FBPT08L2NlbmM6cHNzaD48L0NvbnRlbnRQcm90ZWN0aW9uPjxSZXByZXNlbnRhdGlvbiBpZD0iMCIgY29kZWNzPSJmbGFjIiBiYW5kd2lkdGg9IjEyMjUwNTkiPjxTZWdtZW50VGVtcGxhdGUgdGltZXNjYWxlPSI0NDEwMCIgaW5pdGlhbGl6YXRpb249Imh0dHBzOi8vc3AtYWQtZmEuYXVkaW8udGlkYWwuY29tL21lZGlhdHJhY2tzL0dpa1NKMkkwWXpBek5XSmhPRGt6WlRnd1pHVXpZelEzTVRRNE5EazRaR0ZoTmpSa1h6WXhMbTF3TkNJZ0hRQUFnRUFnQVNvUTRYU1RPLVRpRW1UUmpZTzhRMFdhcVRJRkRRQUFvRUUvMC5tcDQ/dG9rZW49MjE0NzQ4MzY0N35MMjFsWkdsaGRISmhZMnR6TDBkcGExTktNa2t3V1hwQmVrNVhTbWhQUkd0NldsUm5kMXBIVlhwWmVsRXpUVlJSTkU1RWF6UmFSMFpvVG1wU2ExaDZXWGhNYlRGM1RrTkpaMGhSUVVGblJVRm5RVk52VVRSWVUxUlBMVlJwUlcxVVVtcFpUemhSTUZkaGNWUkpSa1JSUVVGdlJVVXZLbjVpWW1Zd1ptSXpOekEwWmpJeFlUZGpOakk1Tm1ZeFlXRmlZVEU1WXpCalltRmtPRGMxTURkaCIgbWVkaWE9Imh0dHBzOi8vc3AtYWQtZmEuYXVkaW8udGlkYWwuY29tL21lZGlhdHJhY2tzL0dpa1NKMkkwWXpBek5XSmhPRGt6WlRnd1pHVXpZelEzTVRRNE5EazRaR0ZoTmpSa1h6WXhMbTF3TkNJZ0hRQUFnRUFnQVNvUTRYU1RPLVRpRW1UUmpZTzhRMFdhcVRJRkRRQUFvRUUvJE51bWJlciQubXA0P3Rva2VuPTIxNDc0ODM2NDd+TDIxbFpHbGhkSEpoWTJ0ekwwZHBhMU5LTWtrd1dYcEJlazVYU21oUFJHdDZXbFJuZDFwSFZYcFplbEV6VFZSUk5FNUVhelJhUjBab1RtcFNhMWg2V1hoTWJURjNUa05KWjBoUlFVRm5SVUZuUVZOdlVUUllVMVJQTFZScFJXMVVVbXBaVHpoUk1GZGhjVlJKUmtSUlFVRnZSVVV2S241aVltWXdabUl6TnpBMFpqSXhZVGRqTmpJNU5tWXhZV0ZpWVRFNVl6QmpZbUZrT0RjMU1EZGgiIHN0YXJ0TnVtYmVyPSIxIj48U2VnbWVudFRpbWVsaW5lPjxTIGQ9IjE3NjEyOCIgcj0iNDciLz48UyBkPSI5NzYxOSIvPjwvU2VnbWVudFRpbWVsaW5lPjwvU2VnbWVudFRlbXBsYXRlPjwvUmVwcmVzZW50YXRpb24+PC9BZGFwdGF0aW9uU2V0PjwvUGVyaW9kPjwvTVBEPg==',
  manifestMimeType: 'application/dash+xml',
  prefetched: false,
  sampleRate: null,
  streamingSessionId: '',
  trackId: 170651820,
  trackPeakAmplitude: 0,
  trackReplayGain: 0,
};

const btsPlaybackInfo: PlaybackInfoTrack = {
  albumPeakAmplitude: 0,
  albumReplayGain: 0,
  assetPresentation: 'PREVIEW',
  audioMode: 'STEREO',
  audioQuality: 'LOW',
  bitDepth: null,
  manifest:
    'eyJtaW1lVHlwZSI6ImF1ZGlvL21wZWciLCJjb2RlY3MiOiJtcDMiLCJlbmNyeXB0aW9uVHlwZSI6Ik5PTkUiLCJ1cmxzIjpbImh0dHBzOi8vYWItcHItZmEuYXVkaW8udGlkYWwuY29tLzdhYTY2MWIxODA4YWYxYjE0M2Y3YzVlYzIwOTU4NWVmXzEyLm1wMz90b2tlbj0xNjEzNzQwMjI1flpHWmpabUpoWVRrMk9EazVPR016TjJJeFlqSXdNVEF6TTJabE5qTTFPREkwT0dNNU16a3laUT09Il19',
  manifestMimeType: 'application/vnd.tidal.bts',
  prefetched: false,
  sampleRate: null,
  streamingSessionId: '',
  trackId: 173307641,
  trackPeakAmplitude: 0,
  trackReplayGain: 0,
};

const emuPlaybackInfo: PlaybackInfoTrack = {
  albumPeakAmplitude: 0,
  albumReplayGain: 0,
  assetPresentation: 'FULL',
  audioMode: 'STEREO',
  audioQuality: 'LOW',
  bitDepth: null,
  licenseSecurityToken: '',
  manifest:
    'eyJtaW1lVHlwZSI6ImFwcGxpY2F0aW9uL3ZuZC5hcHBsZS5tcGVndXJsIiwidXJscyI6WyJodHRwczovL2ltLWZhLm1hbmlmZXN0LnRpZGFsLmNvbS8xL21hbmlmZXN0cy9FZ2t5TmpBeE1USTVNRFlpRmsxb2RIaEVhbkV3TVRacU9FNWliMGd6TWtSTU9FRW9BVEFDLm0zdTg/dG9rZW49MTY5Njg0Njg2Mn5NR1ExWm1JMk1ESm1NemxsTm1ZNE5HTTNNMlV4TXpCa1l6TTFOMkkwT1RGbU5UTmhabUl4T0E9PSJdfQ==',
  manifestHash: 'QAF3B7UqOdZY5ch5NwIY6FRNg1ZsTVeGbA4sTC466XE=',
  manifestMimeType: 'application/vnd.tidal.emu',
  prefetched: false,
  sampleRate: null,
  streamingSessionId: '',
  trackId: 260112906,
  trackPeakAmplitude: 0,
  trackReplayGain: 0,
};

describe('manifestParser', function () {
  it('correctly parses a dash playback info', async () => {
    const result = parseManifest({
      expires: 0,
      ...dashPlaybackInfoTrack,
    });

    expect(result.type).to.equal('track');
    expect(result.id).to.equal('170651820');

    expect(result.streamUrl).to.equal(
      `data:${dashPlaybackInfoTrack.manifestMimeType};base64,${dashPlaybackInfoTrack.manifest}`,
    );
    expect(result.quality).to.equal(dashPlaybackInfoTrack.audioQuality);

    expect(result.streamingSessionId).to.not.equal(undefined);
    expect(result.sampleRate).to.equal(undefined);

    expect(result.codec).to.equal('flac');
  });

  it('correctly parses a bts playback info', async () => {
    const result = parseManifest({
      expires: 0,
      ...btsPlaybackInfo,
    });

    expect(result.type).to.equal('track');
    expect(result.id).to.equal('173307641');

    expect(result.streamUrl).to.not.equal(undefined);
    expect(result.quality).to.equal(btsPlaybackInfo.audioQuality);

    expect(result.streamingSessionId).to.not.equal(undefined);
    expect(result.sampleRate).to.equal(undefined);

    expect(result.codec).to.equal('mp3');
  });

  it('correctly parses a emu playback info', async () => {
    const result = parseManifest({
      expires: 0,
      ...emuPlaybackInfo,
    });

    expect(result.type).to.equal('track');
    expect(result.id).to.equal('260112906');

    expect(result.streamUrl).to.not.equal(undefined);
    expect(result.quality).to.equal(emuPlaybackInfo.audioQuality);

    expect(result.streamingSessionId).to.not.equal(undefined);
    expect(result.sampleRate).to.equal(undefined);

    expect(result.codec).to.equal('aac');
  });
});
