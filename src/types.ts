/**
 * Bike Geo – Domänenmodell.
 *
 * Koordinatensystem für alle Positionsangaben:
 *   Ursprung = Tretlagermitte, x zeigt nach vorn (Richtung Vorderrad), y nach oben.
 *   Alle Längen in Millimetern, alle Winkel in Grad.
 */

export type Discipline =
  | 'road-race'
  | 'road-endurance'
  | 'gravel'
  | 'mtb-xc'
  | 'mtb-trail'
  | 'mtb-enduro';

/** Beweglichkeit der Person (Hüftbeuger / hintere Kette). */
export type Flexibility = 'low' | 'medium' | 'high';

/** Gewünschte Sitzposition. */
export type Posture = 'aggressive' | 'balanced' | 'comfort';

export interface RiderMeasurements {
  /** Körpergröße ohne Schuhe. */
  heightMm: number;
  /** Schrittlänge (Boden bis Schritt, ohne Schuhe, Buch fest nach oben gedrückt). */
  inseamMm: number;
  /** Rumpflänge: Sitzfläche bis Schulterhöhe (Acromion), sitzend. Optional, wird sonst geschätzt. */
  torsoMm?: number;
  /** Armlänge: Acromion bis Handwurzel. Optional, wird sonst geschätzt. */
  armMm?: number;
  /** Schulterbreite (Acromion zu Acromion). Optional, nur für Lenkerbreite. */
  shoulderWidthMm?: number;
}

export interface RiderProfile {
  measurements: RiderMeasurements;
  flexibility: Flexibility;
  posture: Posture;
  discipline: Discipline;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Zielpositionen der Kontaktpunkte einer Person, unabhängig von einem konkreten Rahmen.
 * Alles relativ zum Tretlager.
 */
export interface FitTargets {
  /** Sattelhöhe entlang der Sitzrohr-Achse (Tretlagermitte bis Satteloberkante). */
  saddleHeightMm: number;
  /** Angenommener effektiver Sitzwinkel der Person (nicht des Rahmens). */
  seatAngleDeg: number;
  /** Sattelmitte. */
  saddle: Point;
  /** Vertikaler Abstand Satteloberkante zu Lenkermitte (positiv = Lenker tiefer als Sattel). */
  saddleToBarDropMm: number;
  /** Horizontaler Abstand Sattelmitte zu Lenkermitte. */
  saddleToBarReachMm: number;
  /** Lenkermitte (Vorbauklemmung). */
  bar: Point;
  /** Verwendete (ggf. geschätzte) Körpermaße. */
  measurementsUsed: Required<Pick<RiderMeasurements, 'heightMm' | 'inseamMm' | 'torsoMm' | 'armMm'>>;
}

export type WheelSize = '700c' | '650b' | '29' | '27.5' | '26';

export interface FrameGeometry {
  id: string;
  brand: string;
  model: string;
  /** Größenbezeichnung des Herstellers, z. B. "56" oder "M". */
  size: string;
  discipline: Discipline;
  /** Vertikaler Abstand Tretlagermitte → Oberkante Steuerrohr. */
  stackMm: number;
  /** Horizontaler Abstand Tretlagermitte → Oberkante Steuerrohr. */
  reachMm: number;
  headTubeAngleDeg: number;
  /** Effektiver Sitzwinkel (bei Sattelhöhe ~ Normgröße). */
  seatTubeAngleDeg: number;
  headTubeLengthMm: number;
  /** Sitzrohrlänge Mitte-Oberkante. */
  seatTubeMm?: number;
  topTubeEffectiveMm?: number;
  chainstayMm?: number;
  wheelbaseMm?: number;
  bbDropMm?: number;
  /** Überstandshöhe am typischen Standpunkt. */
  standoverMm?: number;
  forkOffsetMm?: number;
  trailMm?: number;
  wheelSize?: WheelSize;
  /** Vom Hersteller empfohlener Körpergrößenbereich, falls bekannt. Nur informativ. */
  riderHeightRangeMm?: [number, number];
}

export interface CockpitSetup {
  stemLengthMm: number;
  /** Vorbauwinkel relativ zur Senkrechten auf den Gabelschaft; -6 = klassischer "6°-Vorbau" nach unten. */
  stemAngleDeg: number;
  /** Spacer unter dem Vorbau. */
  spacersMm: number;
}

export type Severity = 'ok' | 'warn' | 'fail';

export interface MatchNote {
  severity: Severity;
  /** Maschinenlesbarer Schlüssel, z. B. "standover", "stem-length". */
  code: string;
  /** Erklärung für die Person, deutsch. */
  message: string;
}

export interface FrameMatch {
  frame: FrameGeometry;
  /** 0 … 100, höher ist besser. 0 bei harten Ausschlusskriterien. */
  score: number;
  /** Bester gefundener Vorbau/Spacer-Aufbau. */
  cockpit: CockpitSetup;
  /** Lenkerposition, die sich mit `cockpit` auf diesem Rahmen ergibt. */
  resultingBar: Point;
  /** Abweichung zur Ziel-Lenkerposition in mm (x = horizontal, y = vertikal). */
  barDelta: Point;
  /** Benötigter Sattelversatz gegenüber der Sitzrohrachse (positiv = Sattel weiter hinten). */
  saddleSetbackMm: number;
  /** Aus dem Sitzrohr herausstehende Sattelstütze; undefined wenn Sitzrohrlänge unbekannt. */
  exposedSeatpostMm?: number;
  notes: MatchNote[];
}

export interface MatchOptions {
  /** Nur Rahmen dieser Disziplin berücksichtigen. Standard: Disziplin der Person. */
  discipline?: Discipline | 'any';
  /** Erlaubte Vorbaulängen. Standard je Disziplin. */
  stemLengthsMm?: number[];
  /** Erlaubte Vorbauwinkel. Standard je Disziplin. */
  stemAnglesDeg?: number[];
  /** Maximale Spacerhöhe. Standard je Disziplin. */
  maxSpacersMm?: number;
}
