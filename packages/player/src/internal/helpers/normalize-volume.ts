export function normalizeVolume(replayGain: number): number {
  const peak = 1;
  const preAmp = 4;

  return Math.min(Math.pow(10, (preAmp + replayGain) / 20), 1 / peak);
}
