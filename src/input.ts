/** Frame-rate independent exponential smoothing factor. */
export function smoothing(rate: number, seconds: number): number {
  return 1 - Math.exp(-rate * seconds);
}
