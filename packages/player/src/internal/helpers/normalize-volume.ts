export function normalizeVolume(replayGain: number, peak = 1): number {
  const preAmp = 4;

  return Math.min(Math.pow(10, (preAmp + replayGain) / 20), 1 / peak);
}
