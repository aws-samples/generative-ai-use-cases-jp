export enum Threshold {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export function getThreshold(inputParam: number | undefined): Threshold {
  if ( inputParam === undefined) {
    return Threshold.NONE;
  }
  const threshold: { [key: number]: Threshold } = {
    0: Threshold.NONE,
    1: Threshold.LOW,
    2: Threshold.MEDIUM,
    3: Threshold.HIGH
  };Threshold

  return threshold[inputParam] || Threshold.NONE;
}
