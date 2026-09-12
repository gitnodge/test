import { ANTHRO } from './constants.js';
import type { RiderMeasurements } from './types.js';

export interface CompleteMeasurements {
  heightMm: number;
  inseamMm: number;
  torsoMm: number;
  armMm: number;
  /** Welche Werte geschätzt statt gemessen wurden. */
  estimated: Array<'torsoMm' | 'armMm'>;
}

/**
 * Ergänzt fehlende Körpermaße per Faustregel aus der Körpergröße.
 * Geschätzte Werte sind grob (±5 % sind normal) und werden gekennzeichnet.
 */
export function completeMeasurements(m: RiderMeasurements): CompleteMeasurements {
  if (!(m.heightMm > 0) || !(m.inseamMm > 0)) {
    throw new Error('heightMm und inseamMm müssen positive Zahlen sein.');
  }
  const estimated: CompleteMeasurements['estimated'] = [];
  let torsoMm = m.torsoMm;
  if (torsoMm === undefined) {
    torsoMm = Math.round(m.heightMm * ANTHRO.torsoFromHeight);
    estimated.push('torsoMm');
  }
  let armMm = m.armMm;
  if (armMm === undefined) {
    armMm = Math.round(m.heightMm * ANTHRO.armFromHeight);
    estimated.push('armMm');
  }
  return { heightMm: m.heightMm, inseamMm: m.inseamMm, torsoMm, armMm, estimated };
}
