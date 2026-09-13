/**
 * Virtuelles Fitting-Rad (nach dem Prinzip verstellbarer Fit-Bikes wie Retül Müve / Shimano):
 * Sattel und Lenker sind frei im Raum positionierbar, es gibt keinen Rahmen. Ein 2D-Körpermodell
 * aus starren Segmenten liefert Gelenkwinkel über den Kurbelumlauf, die gegen die Schwellwerte des
 * Fitting-Protokolls geprüft werden. Das ersetzt die Beobachtung auf dem echten Rad durch ein Modell –
 * mit allen Vereinfachungen eines Modells (siehe README).
 *
 * Koordinaten: Ursprung Tretlager, x nach vorn, y nach oben, mm.
 */
import { computeFitTargets } from './fit.js';
import { predictSaddleHeight } from './fitting/calculators.js';
import { FORE_AFT_INDICATORS, HANDLEBAR_INDICATORS, SADDLE_HEIGHT_INDICATORS } from './fitting/indicators.js';
import { RECORD_ASSUMPTIONS } from './fitting/record.js';
import type { FitRecord } from './fitting/types.js';
import { DEG } from './geometry.js';
import type { FitTargets, Point, Posture, RiderProfile } from './types.js';

export interface FitBikeSetup {
  crankLengthMm: number;
  /** Tretlagermitte → Satteloberkante an der Sitzposition (entspricht Aufzeichnung A). */
  saddleHeightMm: number;
  /** Sattelspitze hinter der Tretlagermitte (entspricht Aufzeichnung G). */
  saddleSetbackMm: number;
  /** Lenkerklemmung relativ zum Tretlager (HX / HY). */
  barXMm: number;
  barYMm: number;
  barType: 'drop' | 'flat';
  barWidthMm?: number;
}

export interface BodySegments {
  /** Hüftgelenk → Schultergelenk. */
  trunkMm: number;
  upperArmMm: number;
  /** Ellbogen → Griffmitte (Unterarm + Hand). */
  lowerArmMm: number;
  thighMm: number;
  shankMm: number;
  /** Pedalachse (Fußballen) → Sprunggelenk. */
  footLeverMm: number;
  /** Hüftgelenk relativ zur Sattel-Sitzposition. */
  hipOffset: Point;
  /** Welche Segmente aus der Körpergröße geschätzt wurden. */
  estimated: string[];
}

export interface BodyInput {
  heightMm: number;
  inseamMm?: number;
  /** Boden → Trochanter major, stehend. */
  gtHeightMm?: number;
  /** Sitzfläche → Schulter, sitzend. */
  torsoMm?: number;
  /** Acromion → Handwurzel. */
  armMm?: number;
}

/** Segmentlängen aus Körpermaßen; Anteile der Körpergröße nach gängiger Anthropometrie. */
export function bodySegments(b: BodyInput): BodySegments {
  const H = b.heightMm;
  const estimated: string[] = [];
  let thighMm: number, shankMm: number;
  if (b.gtHeightMm !== undefined) {
    thighMm = b.gtHeightMm * 0.462; shankMm = b.gtHeightMm * 0.464;
  } else if (b.inseamMm !== undefined) {
    const gt = b.inseamMm + 90; // GT liegt üblicherweise 6 … 12 cm über der Schrittlänge
    thighMm = gt * 0.462; shankMm = gt * 0.464; estimated.push('Trochanterhöhe');
  } else {
    thighMm = H * 0.245; shankMm = H * 0.246; estimated.push('Beinlänge');
  }
  // Rumpf und Arm in der Markerkonvention des Protokolls: Schultermarke sitzt unterhalb des Acromions,
  // Griffpunkt liegt in der Handfläche. Kalibriert, sodass die Faustregel-Lenkerposition (die zu realen
  // Rädern passt) etwa 45° Torso und 85° Oberarm–Rumpf ergibt.
  let trunkMm: number;
  if (b.torsoMm !== undefined) trunkMm = b.torsoMm - 110; else { trunkMm = H * 0.26; estimated.push('Rumpf'); }
  let upperArmMm: number, lowerArmMm: number;
  if (b.armMm !== undefined) { upperArmMm = b.armMm * 0.56; lowerArmMm = b.armMm * 0.44 + H * 0.02; } else { upperArmMm = H * 0.186; lowerArmMm = H * 0.166; estimated.push('Arm'); }
  return { trunkMm, upperArmMm, lowerArmMm, thighMm, shankMm, footLeverMm: H * 0.085, hipOffset: { x: 30, y: 40 }, estimated };
}

export interface Joints {
  hip: Point; shoulder: Point; elbow: Point; grip: Point; head: Point;
  knee: Point; ankle: Point; pedal: Point;
  /** Hinteres Bein (gegenüberliegende Kurbel). */
  kneeRear: Point; ankleRear: Point; pedalRear: Point;
}
export interface Angles {
  /** Innenwinkel am Knie, 180 = gestreckt. */
  kneeDeg: number;
  /** Winkel Rumpf–Oberschenkel an der Hüfte. */
  hipDeg: number;
  /** Winkel Unterschenkel–Fußsohle am Sprunggelenk (Konvention des Protokolls: größer = Zehen nach unten). */
  ankleDeg: number;
  /** Rumpf zur Horizontalen. */
  torsoDeg: number;
  /** Rumpf–Oberarm an der Schulter, in der Konvention des Protokolls (gegen die obere Brustwirbelsäule). */
  torsoArmDeg: number;
  elbowDeg: number;
}
export interface Pose { joints: Joints; angles: Angles; armStretched: boolean; legStretched: boolean }

const angleAt = (v: Point, a: Point, b: Point): number => {
  const ax = a.x - v.x, ay = a.y - v.y, bx = b.x - v.x, by = b.y - v.y;
  const c = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
};

function meet(a: Point, b: Point, ra: number, rb: number, left: boolean): { p: Point; stretched: boolean } {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-9;
  if (d >= ra + rb) return { p: { x: a.x + (dx * ra) / d, y: a.y + (dy * ra) / d }, stretched: true };
  const k = (d * d + ra * ra - rb * rb) / (2 * d), h = Math.sqrt(Math.max(0, ra * ra - k * k));
  const ux = dx / d, uy = dy / d, s = left ? 1 : -1;
  return { p: { x: a.x + ux * k - s * uy * h, y: a.y + uy * k + s * ux * h }, stretched: false };
}

/** Sattel-Sitzposition und Griffpunkt aus dem Aufbau. */
export function contactPoints(s: FitBikeSetup): { saddle: Point; bar: Point; grip: Point; saddleTip: Point } {
  const x = -(s.saddleSetbackMm + RECORD_ASSUMPTIONS.saddleTipToCenterMm);
  const y = Math.sqrt(Math.max(0, s.saddleHeightMm ** 2 - x * x));
  const bar = { x: s.barXMm, y: s.barYMm };
  const off = s.barType === 'drop' ? RECORD_ASSUMPTIONS.hoodOffset : { x: 5, y: 10 };
  return { saddle: { x, y }, saddleTip: { x: -s.saddleSetbackMm, y }, bar, grip: { x: bar.x + off.x, y: bar.y + off.y } };
}

/** Pedalposition; Kurbelwinkel 0° = oben, 90° = vorn, 180° = unten. */
export const pedalAt = (crankMm: number, crankDeg: number): Point => ({ x: crankMm * Math.sin(crankDeg * DEG), y: crankMm * Math.cos(crankDeg * DEG) });

/**
 * Fußmodell: Sprunggelenk hinter-über der Pedalachse (Fußballen). Die Linie Ballen→Sprunggelenk liegt
 * bei flacher Sohle 30° über der Horizontalen; zum unteren Totpunkt kommen 16° Zehen-nach-unten dazu.
 * Das ist eine Annahme, keine Messung – deshalb werden Sprunggelenkwinkel nicht als Indikator übernommen.
 */
export const FOOT_SOLE_OFFSET_DEG = 28;
export function ankleAt(pedal: Point, footLeverMm: number, crankDeg: number): Point {
  const a = (30 + 8 * (1 - Math.cos(crankDeg * DEG))) * DEG;
  return { x: pedal.x - footLeverMm * Math.cos(a), y: pedal.y + footLeverMm * Math.sin(a) };
}

export interface PoseOptions { elbowDeg?: number }

/** Ellbogenwinkel „weich gebeugt“ als Annahme. */
export const DEFAULT_ELBOW_DEG = 160;
/**
 * Das Protokoll misst Oberarm–Rumpf gegen die obere Brustwirbelsäule, nicht gegen die Linie Hüfte–Schulter.
 * Mit den kalibrierten Markersegmenten liefert die Linie Hüfte–Schulter an der Faustregel-Position ~80°,
 * also den Bereich des Protokolls; eine Korrektur ist deshalb nicht nötig (0). Bleibt als Stellschraube.
 */
export const THORACIC_CORRECTION_DEG = 0;

export function solvePose(s: FitBikeSetup, body: BodySegments, crankDeg: number, opts: PoseOptions = {}): Pose {
  const { saddle, grip } = contactPoints(s);
  const hip = { x: saddle.x + body.hipOffset.x, y: saddle.y + body.hipOffset.y };
  // Rumpf und Arm: Ellbogenwinkel als Annahme (weich gebeugt), Rumpfwinkel ergibt sich daraus.
  let elbowDeg = opts.elbowDeg ?? DEFAULT_ELBOW_DEG;
  let reach = Math.sqrt(body.upperArmMm ** 2 + body.lowerArmMm ** 2 - 2 * body.upperArmMm * body.lowerArmMm * Math.cos(elbowDeg * DEG));
  let sh = meet(hip, grip, body.trunkMm, reach, true);
  let armStretched = false;
  if (sh.stretched) { elbowDeg = 180; reach = body.upperArmMm + body.lowerArmMm; sh = meet(hip, grip, body.trunkMm, reach, true); armStretched = sh.stretched; }
  const shoulder = sh.p;
  const el = meet(shoulder, grip, body.upperArmMm, body.lowerArmMm, false);
  const elbow = el.p;
  const neckA = Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x) + 22 * DEG;
  const head = { x: shoulder.x + 165 * Math.cos(neckA), y: shoulder.y + 165 * Math.sin(neckA) };
  // Beine
  const pedal = pedalAt(s.crankLengthMm, crankDeg);
  const ankle = ankleAt(pedal, body.footLeverMm, crankDeg);
  const kn = meet(hip, ankle, body.thighMm, body.shankMm, true);
  const pedalRear = pedalAt(s.crankLengthMm, crankDeg + 180);
  const ankleRear = ankleAt(pedalRear, body.footLeverMm, crankDeg + 180);
  const kneeRear = meet(hip, ankleRear, body.thighMm, body.shankMm, true).p;
  const knee = kn.p;
  const angles: Angles = {
    kneeDeg: kn.stretched ? 180 : angleAt(knee, hip, ankle),
    hipDeg: angleAt(hip, shoulder, knee),
    ankleDeg: angleAt(ankle, knee, pedal) + FOOT_SOLE_OFFSET_DEG,
    torsoDeg: Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x) / DEG,
    torsoArmDeg: angleAt(shoulder, hip, elbow) - THORACIC_CORRECTION_DEG,
    elbowDeg: el.stretched ? 180 : angleAt(elbow, shoulder, grip),
  };
  return { joints: { hip, shoulder, elbow, grip, head, knee, ankle, pedal, kneeRear, ankleRear, pedalRear }, angles, armStretched, legStretched: kn.stretched };
}

export interface CycleAnalysis {
  kneeMaxDeg: number; kneeMaxAtDeg: number;
  kneeMinDeg: number; kneeMinAtDeg: number;
  hipMinDeg: number;
  ankleTopDeg: number; ankleBottomDeg: number;
  torsoDeg: number; torsoArmDeg: number; elbowDeg: number;
  /** Knie vor (+) oder hinter (−) der Pedalachse bei waagerechter Kurbel. */
  kopsMm: number;
  armStretched: boolean; legStretched: boolean;
  /** Indikatorwerte im Format des Fitting-Protokolls (ohne Sprunggelenk: Fußhaltung ist Modellannahme). */
  indicatorValues: Record<string, number | string>;
  verdicts: Record<string, string>;
}

/** Winkel über den Kurbelumlauf (5°-Schritte) und daraus die Protokoll-Indikatoren. */
export function analyzeCycle(s: FitBikeSetup, body: BodySegments, opts: PoseOptions = {}): CycleAnalysis {
  let kneeMax = -1, kneeMaxAt = 0, kneeMin = 999, kneeMinAt = 0, hipMin = 999, legStretched = false;
  for (let a = 0; a < 360; a += 5) {
    const p = solvePose(s, body, a, opts);
    if (p.angles.kneeDeg > kneeMax) { kneeMax = p.angles.kneeDeg; kneeMaxAt = a; }
    if (p.angles.kneeDeg < kneeMin) { kneeMin = p.angles.kneeDeg; kneeMinAt = a; }
    if (p.angles.hipDeg < hipMin) hipMin = p.angles.hipDeg;
    legStretched = legStretched || p.legStretched;
  }
  const top = solvePose(s, body, 0, opts), bottom = solvePose(s, body, 180, opts), fwd = solvePose(s, body, 90, opts);
  const r = (v: number): number => Math.round(v);
  const indicatorValues: Record<string, number | string> = {
    'knee-max': r(kneeMax), 'knee-min': r(kneeMin),
    'torso-angle': r(fwd.angles.torsoDeg), 'torso-arm': r(fwd.angles.torsoArmDeg), 'hip-min': r(hipMin),
    kops: fwd.joints.knee.x - fwd.joints.pedal.x > 15 ? 'front' : fwd.joints.knee.x - fwd.joints.pedal.x < -15 ? 'behind' : 'through',
    elbows: fwd.angles.elbowDeg >= 178 ? 'locked' : 'soft',
  };
  const all = [...SADDLE_HEIGHT_INDICATORS, ...FORE_AFT_INDICATORS, ...HANDLEBAR_INDICATORS];
  const verdicts: Record<string, string> = {};
  for (const [id, v] of Object.entries(indicatorValues)) { const ind = all.find((i) => i.id === id); if (ind) verdicts[id] = ind.evaluate(v); }
  return {
    kneeMaxDeg: r(kneeMax), kneeMaxAtDeg: kneeMaxAt, kneeMinDeg: r(kneeMin), kneeMinAtDeg: kneeMinAt, hipMinDeg: r(hipMin),
    ankleTopDeg: r(top.angles.ankleDeg), ankleBottomDeg: r(bottom.angles.ankleDeg),
    torsoDeg: r(fwd.angles.torsoDeg), torsoArmDeg: r(fwd.angles.torsoArmDeg), elbowDeg: r(fwd.angles.elbowDeg),
    kopsMm: r(fwd.joints.knee.x - fwd.joints.pedal.x), armStretched: fwd.armStretched, legStretched, indicatorValues, verdicts,
  };
}

export interface SuggestOptions { gtHeightCm?: number; crankLengthMm?: number; barType?: 'drop' | 'flat' }

/** Startaufbau aus Körpermaßen: Sattelhöhe aus Vorhersage oder LeMond-Regel, Setback über 73,5°, Lenker aus der Faustregel. */
export function suggestSetup(rider: RiderProfile, o: SuggestOptions = {}): FitBikeSetup {
  const t = computeFitTargets(rider);
  const inseamCm = rider.measurements.inseamMm / 10;
  const pred = o.gtHeightCm !== undefined ? predictSaddleHeight({ inseamCm, gtHeightCm: o.gtHeightCm }) : undefined;
  const saddleHeightMm = Math.round(pred ? pred.predictedMm : t.saddleHeightMm);
  const saddleX = -saddleHeightMm * Math.cos(t.seatAngleDeg * DEG);
  const setback = Math.round(-saddleX - RECORD_ASSUMPTIONS.saddleTipToCenterMm);
  return {
    crankLengthMm: o.crankLengthMm ?? 172.5,
    saddleHeightMm,
    saddleSetbackMm: Math.max(0, setback),
    barXMm: Math.round(t.bar.x), barYMm: Math.round(t.bar.y),
    barType: o.barType ?? (rider.discipline.startsWith('mtb') ? 'flat' : 'drop'),
  };
}

export const TORSO_TARGET_DEG: Record<Posture, number> = { aggressive: 42, balanced: 45, comfort: 48 };

/**
 * Lenkerposition mit möglichst kleiner Bewegung so wählen, dass Torsowinkel (Ziel ±1°) und
 * Oberarm–Rumpf (Protokollbereich 80 … 90°, hier 81 … 89°) getroffen werden, bei weich gebeugten Ellbogen.
 * Rastersuche um die aktuelle Lenkerposition; Sattel bleibt fest.
 */
export function optimizeBars(s: FitBikeSetup, body: BodySegments, target: { torsoDeg: number; torsoArmDeg?: number }): { setup: FitBikeSetup; torsoDeg: number; torsoArmDeg: number; cost: number } {
  const tArm = target.torsoArmDeg ?? 85;
  const band = (v: number, c: number, half: number): number => Math.max(0, Math.abs(v - c) - half);
  let best = { setup: s, torsoDeg: 0, torsoArmDeg: 0, cost: Infinity };
  for (let dx = -200; dx <= 200; dx += 5) {
    for (let dy = -200; dy <= 200; dy += 5) {
      const c: FitBikeSetup = { ...s, barXMm: s.barXMm + dx, barYMm: s.barYMm + dy };
      const p = solvePose(c, body, 90);
      if (p.armStretched) continue;
      const cost = band(p.angles.torsoDeg, target.torsoDeg, 1) ** 2 * 4 + band(p.angles.torsoArmDeg, tArm, 4) ** 2 + (dx * dx + dy * dy) * 2e-4;
      if (cost < best.cost) best = { setup: c, torsoDeg: p.angles.torsoDeg, torsoArmDeg: p.angles.torsoArmDeg, cost };
    }
  }
  return best;
}

/**
 * Sattelhöhe so wählen, dass der maximale Kniewinkel das Ziel trifft (Mitte des Protokollbereichs 135 … 146°).
 * Setback bleibt; Suche ±60 mm in 1-mm-Schritten.
 */
export function optimizeSaddleHeight(s: FitBikeSetup, body: BodySegments, targetKneeMaxDeg = 141): { setup: FitBikeSetup; kneeMaxDeg: number; kneeMinDeg: number } {
  let best = { setup: s, kneeMaxDeg: 0, kneeMinDeg: 0, err: Infinity };
  for (let d = -60; d <= 60; d += 1) {
    const c: FitBikeSetup = { ...s, saddleHeightMm: s.saddleHeightMm + d };
    const a = analyzeCycle(c, body);
    const err = Math.abs(a.kneeMaxDeg - targetKneeMaxDeg) + (a.legStretched ? 100 : 0);
    if (err < best.err) best = { setup: c, kneeMaxDeg: a.kneeMaxDeg, kneeMinDeg: a.kneeMinDeg, err };
  }
  return { setup: best.setup, kneeMaxDeg: best.kneeMaxDeg, kneeMinDeg: best.kneeMinDeg };
}

/** Aufbau → Aufzeichnung A … H (B und D entfallen: kein Rahmen). */
export function setupToRecord(s: FitBikeSetup): FitRecord {
  const { saddle, saddleTip, bar, grip } = contactPoints(s);
  const rec: FitRecord = {
    saddleHeightMm: Math.round(s.saddleHeightMm),
    saddleSetbackMm: Math.round(s.saddleSetbackMm),
    crankLengthMm: s.crankLengthMm,
    saddleToBarDropMm: Math.round(saddle.y - bar.y),
    saddleTipToHoodsMm: Math.round(Math.hypot(grip.x - saddleTip.x, grip.y - saddleTip.y)),
  };
  if (s.barWidthMm !== undefined) rec.barWidthMm = s.barWidthMm;
  return rec;
}

/** Aufbau → Zielpositionen fürs Rahmen-Matching. */
export function setupToTargets(s: FitBikeSetup, m: { heightMm: number; inseamMm: number; torsoMm: number; armMm: number }): FitTargets {
  const { saddle, bar } = contactPoints(s);
  return {
    saddleHeightMm: s.saddleHeightMm,
    seatAngleDeg: Math.round((Math.atan2(saddle.y, -saddle.x) / DEG) * 10) / 10,
    saddle, bar,
    saddleToBarDropMm: saddle.y - bar.y,
    saddleToBarReachMm: bar.x - saddle.x,
    measurementsUsed: m,
  };
}
