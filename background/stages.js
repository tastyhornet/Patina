// stages are multiples of the threshold: 1x faded, 2x dusty, 4x cracked, 8x crumbling
export function stageof(age, settings) {
  const t = settings.threshold;
  if (age < t) return 0;
  const r = age / t;
  if (r < 2) return 1;
  if (r < 4) return 2;
  if (r < 8) return 3;
  return 4;
}
