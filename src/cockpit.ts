import { add, polar } from './geometry.js';
import type { CockpitSetup, FrameGeometry, Point } from './types.js';

/**
 * Lenkermitte (Vorbauklemmung), die sich aus Rahmen + Cockpit ergibt.
 *
 * Steuerrohr-Oberkante liegt bei (reach, stack). Spacer und Klemmversatz laufen
 * entlang der Lenkachse (Steuerrohrwinkel, nach hinten oben geneigt). Der Vorbau
 * steht senkrecht auf der Lenkachse, gedreht um seinen Winkel.
 */
export function barPosition(frame: FrameGeometry, cockpit: CockpitSetup, stemClampOffsetMm: number, barRiseMm = 0): Point {
  const top: Point = { x: frame.reachMm, y: frame.stackMm };
  // Lenkachse zeigt nach hinten-oben: Winkel zur Horizontalen = 180° − Steuerrohrwinkel.
  const alongSteerer = polar(cockpit.spacersMm + stemClampOffsetMm, 180 - frame.headTubeAngleDeg);
  // Vorbau: senkrecht zur Lenkachse nach vorn = (90° − HTA) über der Horizontalen, plus Vorbauwinkel.
  const stemRiseDeg = 90 - frame.headTubeAngleDeg + cockpit.stemAngleDeg;
  const stem = polar(cockpit.stemLengthMm, stemRiseDeg);
  return add(add(add(top, alongSteerer), stem), { x: 0, y: barRiseMm });
}

export interface CockpitSearchSpace {
  stemLengthsMm: number[];
  stemAnglesDeg: number[];
  maxSpacersMm: number;
  spacerStepMm?: number;
  stemClampOffsetMm: number;
  barRiseMm?: number;
}

export interface CockpitCandidate {
  cockpit: CockpitSetup;
  bar: Point;
  /** Abstand zur Zielposition. */
  distanceMm: number;
}

/**
 * Durchsucht alle Vorbau/Spacer-Kombinationen und liefert die, die der Ziel-Lenkerposition
 * am nächsten kommt. Bei Gleichstand gewinnt die mit dem geringeren Aufwand (Rangfolge: Kandidat mit
 * kleinerem `cost`).
 */
export function findBestCockpit(
  frame: FrameGeometry,
  targetBar: Point,
  space: CockpitSearchSpace,
  cost: (c: CockpitSetup) => number,
): CockpitCandidate {
  const step = space.spacerStepMm ?? 5;
  let best: CockpitCandidate | undefined;
  let bestCost = Infinity;
  for (const stemLengthMm of space.stemLengthsMm) {
    for (const stemAngleDeg of space.stemAnglesDeg) {
      for (let spacersMm = 0; spacersMm <= space.maxSpacersMm + 1e-9; spacersMm += step) {
        const cockpit: CockpitSetup = { stemLengthMm, stemAngleDeg, spacersMm };
        const bar = barPosition(frame, cockpit, space.stemClampOffsetMm, space.barRiseMm ?? 0);
        const distanceMm = Math.hypot(bar.x - targetBar.x, bar.y - targetBar.y);
        const total = distanceMm + cost(cockpit);
        if (total < bestCost) {
          bestCost = total;
          best = { cockpit, bar, distanceMm };
        }
      }
    }
  }
  if (!best) throw new Error('Cockpit-Suchraum ist leer.');
  return best;
}
