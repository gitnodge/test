import { completeMeasurements } from './anthropometry.js';
import {
  DISCIPLINE_DEFAULTS,
  FLEX_DROP_OFFSET_MM,
  POSTURE_DROP_OFFSET_MM,
  POSTURE_REACH_OFFSET,
  REFERENCE_HEIGHT_MM,
  SADDLE_HEIGHT_FACTOR,
} from './constants.js';
import { saddlePosition } from './geometry.js';
import type { FitTargets, RiderProfile } from './types.js';

/**
 * Leitet aus Körpermaßen, Haltung, Beweglichkeit und Disziplin die Zielpositionen
 * von Sattel und Lenker ab – rahmenunabhängig.
 *
 * Das ist ein Faustregel-Modell (siehe constants.ts), kein Ersatz für ein Bikefitting.
 */
export function computeFitTargets(rider: RiderProfile): FitTargets {
  const m = completeMeasurements(rider.measurements);
  const d = DISCIPLINE_DEFAULTS[rider.discipline];

  const saddleHeightMm = m.inseamMm * SADDLE_HEIGHT_FACTOR;
  const saddle = saddlePosition(saddleHeightMm, d.seatAngleDeg);

  // Überhöhung: Basis + Haltung + Beweglichkeit, skaliert mit der Körpergröße.
  const scale = m.heightMm / REFERENCE_HEIGHT_MM;
  const saddleToBarDropMm =
    (d.baseDropMm + POSTURE_DROP_OFFSET_MM[rider.posture] + FLEX_DROP_OFFSET_MM[rider.flexibility]) * scale;

  // Sattel-Lenker-Reach aus Rumpf + Arm.
  const reachFactor = d.baseReachFactor + POSTURE_REACH_OFFSET[rider.posture];
  const saddleToBarReachMm = (m.torsoMm + m.armMm) * reachFactor;

  const bar = { x: saddle.x + saddleToBarReachMm, y: saddle.y - saddleToBarDropMm };

  return {
    saddleHeightMm,
    seatAngleDeg: d.seatAngleDeg,
    saddle,
    saddleToBarDropMm,
    saddleToBarReachMm,
    bar,
    measurementsUsed: { heightMm: m.heightMm, inseamMm: m.inseamMm, torsoMm: m.torsoMm, armMm: m.armMm },
  };
}
