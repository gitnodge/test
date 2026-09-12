/**
 * Bike Geo – Bikefitting-Protokoll.
 *
 * Methodik angelehnt an das dynamische Bikefitting nach BikeDynamics (M. Veal):
 * Reihenfolge Cleats → Kurbellänge → Sattelhöhe → Sattel vor/zurück → Lenker,
 * iterativ, mit Indikatoren, Rechnern und Aufzeichnung. Alle Formulierungen hier
 * sind eigene; Schwellwerte und Formeln sind Fakten aus der Methodik.
 */

export type SaddleHeightVerdict = 'high' | 'inconclusive' | 'low';
export type ForeAftVerdict = 'forward' | 'inconclusive' | 'back';
/** Lenker: Reach-und-Höhe-Indikatoren. */
export type BarReachVerdict = 'far-or-low' | 'inconclusive' | 'close-or-high';
/** Lenker: reine Höhen-Indikatoren. */
export type BarHeightVerdict = 'low' | 'inconclusive' | 'high';
export type ObservationVerdict = 'wrong' | 'inconclusive' | 'right';

export type IndicatorGroup = 'saddle-height' | 'saddle-fore-aft' | 'handlebar';

export type IndicatorInput =
  | { kind: 'angle'; unit: '°'; min: number; max: number }
  | { kind: 'scale5' }
  | { kind: 'choice'; options: Array<{ value: string; label: string }> };

export interface Indicator<V extends string = string> {
  id: string;
  group: IndicatorGroup;
  title: string;
  /** Wie wird beobachtet oder gemessen (eigene Kurzfassung). */
  how: string;
  input: IndicatorInput;
  /** Auswertung eines Eingabewerts. */
  evaluate(value: number | string): V;
  /** Einschränkung, die die Aussage abschwächen kann. */
  caveat?: string;
  /** Nur Höhe (bei Lenker) statt Höhe und Reach. */
  heightOnly?: boolean;
}

export interface Tally<V extends string> {
  counts: Record<V, number>;
  answered: number;
  total: number;
  /** Mehrheitsurteil oder 'inconclusive'. */
  verdict: V | 'inconclusive';
}

export interface LegMeasurements {
  /** Schrittlänge barfuß, Boden bis Schritt, cm. */
  inseamCm?: number;
  /** Boden bis Oberkante Trochanter major, stehend, cm. */
  gtHeightCm?: number;
  heightCm?: number;
  /** Spannweite Fingerspitze zu Fingerspitze, cm. */
  spanCm?: number;
  /** Schulterbreite Gelenkmitte zu Gelenkmitte, mm. */
  shoulderWidthMm?: number;
  sex?: 'male' | 'female';
}

export interface SaddleHeightPrediction {
  predictedMm: number;
  basis: 'inseam+gt' | 'inseam' | 'gt';
  /** Bestimmtheitsmaß der jeweiligen Korrelation. */
  r2: number;
  /** Plausibilität GT − Schrittlänge (üblich 6 … 12 cm). */
  sanity?: { gtMinusInseamCm: number; plausible: boolean };
}

export interface CrankRecommendation {
  crankLengthMm: number;
  basis: 'inseam+gt' | 'inseam' | 'gt' | 'height';
  note?: string;
}

export interface BodyProportions {
  inseamToHeight: number;
  legs: 'long' | 'average' | 'short';
  spanMinusHeightCm?: number;
  arms?: 'short' | 'average' | 'long';
}

export interface SizingRow {
  size: number;
  heightCm: [number, number];
  inseamCm: [number, number];
  seatTubeMm: [number, number];
  topTubeMm: [number, number];
  seatAngleDeg: [number, number];
  headTubeMm: [number, number];
  reachMm: [number, number];
  stackMm: [number, number];
  crankMm: [number, number];
  barWidthMm: [number, number];
}

/** Aufzeichnung der Sitzposition (A … H). Sterne = auf andere Räder übertragbar. */
export interface FitRecord {
  /** A* Satteloberkante bis Tretlagermitte entlang Sitzrohrachse. */
  saddleHeightMm?: number;
  /** B Sattelspitze bis Vorbau-Kopfschraube (radspezifisch). */
  saddleTipToHeadBoltMm?: number;
  /** C* Sattelspitze diagonal bis Hoods (Daumenbeuge). */
  saddleTipToHoodsMm?: number;
  /** D Vorbaulänge (radspezifisch). */
  stemLengthMm?: number;
  /** E* Kurbellänge. */
  crankLengthMm?: number;
  /** F* Überhöhung: Satteloberkante zu Lenkermitte. */
  saddleToBarDropMm?: number;
  /** G* Sattelversatz: Lot von der Sattelspitze zur Tretlagermitte. */
  saddleSetbackMm?: number;
  /** H* Lenkerbreite Mitte–Mitte. */
  barWidthMm?: number;
}

export type Outcome = 'better' | 'worse' | 'ambiguous';

export interface IterationEntry {
  phase: 'coarse' | 'fore-aft' | 'fine' | 'bars';
  /** Änderung gegenüber dem vorherigen Zustand, mm; Höhe positiv = nach oben, Versatz positiv = nach hinten. */
  changeMm: number;
  outcome: Outcome;
  note?: string;
}

export interface NextStep {
  /** Empfohlene nächste Änderung, mm (Vorzeichen wie IterationEntry). */
  changeMm: number;
  reason: string;
  /** Sweet Spot gefunden – keine weitere Änderung. */
  done?: boolean;
}
