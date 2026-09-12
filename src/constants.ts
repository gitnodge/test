/**
 * Heuristische Koeffizienten.
 *
 * WICHTIG: Diese Werte sind Startannahmen aus der Bikefitting-Literatur und
 * Faustregeln, keine validierten Modelle. Sie sind bewusst an einer Stelle
 * gesammelt, damit sie gegen echte Fitting-Daten kalibriert werden können.
 * Siehe README, Abschnitt "Was noch nicht stimmt".
 */

import type { Discipline, Flexibility, Posture } from './types.js';

/** Sattelhöhe = Schrittlänge × Faktor (LeMond-Methode: 0,883; gängige Spanne 0,875 … 0,89). */
export const SADDLE_HEIGHT_FACTOR = 0.883;

/** Schätzung fehlender Körpermaße aus der Körpergröße (grobe Anthropometrie). */
export const ANTHRO = {
  torsoFromHeight: 0.30,
  armFromHeight: 0.35,
  inseamFromHeight: 0.47,
};

/** Bezugsgröße, auf die die Absolutwerte (Drop) skaliert sind. */
export const REFERENCE_HEIGHT_MM = 1780;

export interface DisciplineDefaults {
  /** Effektiver Sitzwinkel, den die Person anstrebt (unabhängig vom Rahmen). */
  seatAngleDeg: number;
  /** Basis-Überhöhung Sattel → Lenker bei Referenzgröße und "balanced". */
  baseDropMm: number;
  /** Basis-Faktor: Sattel-Lenker-Reach = (Rumpf + Arm) × Faktor bei "balanced". */
  baseReachFactor: number;
  /** Mindest-Überstandsfreiheit (Schrittlänge − Standover). */
  standoverClearanceMm: number;
  stemLengthsMm: number[];
  idealStemLengthMm: number;
  stemAnglesDeg: number[];
  maxSpacersMm: number;
  idealSpacersMm: number;
  /** Höhe Vorbauklemmung über Steuerrohr-Oberkante ohne Spacer (Steuersatzkappe + halbe Vorbauhöhe). */
  stemClampOffsetMm: number;
  /** Lenker-Rise (Klemmung → Griffhöhe). Bei Rennlenkern 0, weil die Zielposition auf die Klemmung bezogen ist. */
  barRiseMm: number;
}

export const DISCIPLINE_DEFAULTS: Record<Discipline, DisciplineDefaults> = {
  'road-race': {
    seatAngleDeg: 73.5,
    baseDropMm: 80,
    baseReachFactor: 0.605,
    standoverClearanceMm: 20,
    stemLengthsMm: [80, 90, 100, 110, 120, 130],
    idealStemLengthMm: 110,
    stemAnglesDeg: [-6, -17],
    maxSpacersMm: 30,
    idealSpacersMm: 10,
    stemClampOffsetMm: 25,
    barRiseMm: 0,
  },
  'road-endurance': {
    seatAngleDeg: 73.5,
    baseDropMm: 50,
    baseReachFactor: 0.59,
    standoverClearanceMm: 20,
    stemLengthsMm: [70, 80, 90, 100, 110, 120],
    idealStemLengthMm: 100,
    stemAnglesDeg: [-6, 6],
    maxSpacersMm: 40,
    idealSpacersMm: 15,
    stemClampOffsetMm: 25,
    barRiseMm: 0,
  },
  gravel: {
    seatAngleDeg: 73.5,
    baseDropMm: 40,
    baseReachFactor: 0.585,
    standoverClearanceMm: 30,
    stemLengthsMm: [60, 70, 80, 90, 100, 110],
    idealStemLengthMm: 90,
    stemAnglesDeg: [-6, 6],
    maxSpacersMm: 40,
    idealSpacersMm: 15,
    stemClampOffsetMm: 25,
    barRiseMm: 0,
  },
  'mtb-xc': {
    seatAngleDeg: 74.5,
    baseDropMm: 40,
    baseReachFactor: 0.595,
    standoverClearanceMm: 50,
    stemLengthsMm: [50, 60, 70, 80, 90],
    idealStemLengthMm: 70,
    stemAnglesDeg: [-6, 6],
    maxSpacersMm: 30,
    idealSpacersMm: 10,
    stemClampOffsetMm: 25,
    barRiseMm: 10,
  },
  'mtb-trail': {
    seatAngleDeg: 76,
    baseDropMm: 20,
    baseReachFactor: 0.575,
    standoverClearanceMm: 60,
    stemLengthsMm: [35, 40, 50, 60],
    idealStemLengthMm: 45,
    stemAnglesDeg: [0, 6],
    maxSpacersMm: 30,
    idealSpacersMm: 10,
    stemClampOffsetMm: 25,
    barRiseMm: 20,
  },
  'mtb-enduro': {
    seatAngleDeg: 77,
    baseDropMm: 10,
    baseReachFactor: 0.57,
    standoverClearanceMm: 70,
    stemLengthsMm: [35, 40, 50],
    idealStemLengthMm: 40,
    stemAnglesDeg: [0, 6],
    maxSpacersMm: 30,
    idealSpacersMm: 10,
    stemClampOffsetMm: 25,
    barRiseMm: 25,
  },
};

/** Zuschlag auf die Überhöhung je Haltung (mm bei Referenzgröße). */
export const POSTURE_DROP_OFFSET_MM: Record<Posture, number> = {
  aggressive: 30,
  balanced: 0,
  comfort: -30,
};

/** Zuschlag auf den Reach-Faktor je Haltung. */
export const POSTURE_REACH_OFFSET: Record<Posture, number> = {
  aggressive: 0.02,
  balanced: 0,
  comfort: -0.02,
};

/** Zuschlag auf die Überhöhung je Beweglichkeit (mm bei Referenzgröße). */
export const FLEX_DROP_OFFSET_MM: Record<Flexibility, number> = {
  low: -20,
  medium: 0,
  high: 15,
};

/** Bereich, in dem Sattelversatz über Stützen-Setback (0 … 25 mm) plus Sattelstreben (±20 mm) abgefangen werden kann (positiv = nach hinten). */
export const SEATPOST_SETBACK_RANGE_MM: [number, number] = [-20, 45];

/** Plausible Sattelstützen-Auszüge (Mindesteinstecktiefe / Stützenlänge). */
export const EXPOSED_SEATPOST_RANGE_MM: [number, number] = [60, 260];

/** Gewichtung der Strafpunkte im Score. */
export const SCORE_WEIGHTS = {
  /** Punkte pro mm Abweichung der Lenkerposition (euklidisch). */
  barDeltaPerMm: 1.2,
  /** Punkte pro mm Abweichung vom Ideal-Vorbau. */
  stemDeviationPerMm: 0.6,
  /** Punkte pro mm Abweichung von der Ideal-Spacerhöhe. */
  spacerDeviationPerMm: 0.5,
  /** Punkte pro mm Sattelversatz außerhalb des Stützenbereichs. */
  setbackOverflowPerMm: 1.5,
  /** Punkte pro mm Stützenauszug außerhalb des plausiblen Bereichs. */
  seatpostOverflowPerMm: 0.5,
  /** Punkte pro mm fehlender Überstandsfreiheit. */
  standoverShortfallPerMm: 2.0,
};

/** Toleranz, ab der eine Lenkerabweichung als Warnung gilt. */
export const BAR_DELTA_WARN_MM = 10;
