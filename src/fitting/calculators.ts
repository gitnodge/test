import type { BodyProportions, LegMeasurements, SaddleHeightPrediction } from './types.js';

/**
 * Vorhersage der Sattelhöhe (Tretlagermitte → Satteloberkante entlang Sitzrohr) aus Beinmaßen.
 * Beste Korrelation: Schrittlänge + Trochanterhöhe (R² ≈ 0,95). Einzelmaße R² ≈ 0,91 … 0,92.
 * Streuung realer Positionen um die Vorhersage: gut 10 … 15 mm sind normal.
 */
export function predictSaddleHeight(m: LegMeasurements): SaddleHeightPrediction | undefined {
  const { inseamCm, gtHeightCm } = m;
  if (inseamCm !== undefined && gtHeightCm !== undefined) {
    const diff = gtHeightCm - inseamCm;
    return {
      predictedMm: Math.round(4.4808 * (inseamCm + gtHeightCm) - 43.3),
      basis: 'inseam+gt',
      r2: 0.9526,
      sanity: { gtMinusInseamCm: Math.round(diff * 10) / 10, plausible: diff >= 6 && diff <= 12 },
    };
  }
  if (inseamCm !== undefined) return { predictedMm: Math.round(8.4639 * inseamCm + 40.494), basis: 'inseam', r2: 0.913 };
  if (gtHeightCm !== undefined) return { predictedMm: Math.round(8.7969 * gtHeightCm - 70.661), basis: 'gt', r2: 0.9213 };
  return undefined;
}

/** Vergleich Ist-Sattelhöhe mit Vorhersage. Ab 20 mm Abweichung: Maße und Schlüsse prüfen. */
export function compareSaddleHeight(actualMm: number, predictedMm: number): { deltaMm: number; level: 'close' | 'notable' | 'alarm'; message: string } {
  const deltaMm = Math.round(actualMm - predictedMm);
  const abs = Math.abs(deltaMm);
  const dir = deltaMm > 0 ? 'höher' : 'tiefer';
  if (abs > 20) return { deltaMm, level: 'alarm', message: `Sattel ${abs} mm ${dir} als vorhergesagt. Über 20 mm: Maße und Beobachtungen noch einmal prüfen.` };
  if (abs > 10) return { deltaMm, level: 'notable', message: `Sattel ${abs} mm ${dir} als vorhergesagt. Innerhalb der normalen Streuung, aber die Indikatoren müssen das stützen.` };
  return { deltaMm, level: 'close', message: `Sattel ${abs} mm ${dir} als vorhergesagt – nahe an der Erwartung.` };
}

/** Körperproportionen: lange Beine über 0,475, kurze unter 0,45; Spannweite üblich ±1 … 2 cm zur Größe. */
export function bodyProportions(m: LegMeasurements): BodyProportions | undefined {
  if (m.heightCm === undefined || m.inseamCm === undefined) return undefined;
  const ratio = m.inseamCm / m.heightCm;
  const out: BodyProportions = {
    inseamToHeight: Math.round(ratio * 1000) / 1000,
    legs: ratio > 0.475 ? 'long' : ratio < 0.45 ? 'short' : 'average',
  };
  if (m.spanCm !== undefined) {
    const d = m.spanCm - m.heightCm;
    out.spanMinusHeightCm = Math.round(d * 10) / 10;
    out.arms = d < -3 ? 'short' : d > 3 ? 'long' : 'average';
  }
  return out;
}

/** Cleats 10 mm nach hinten wirkt wie Sattel 5 … 6 mm höher. */
export function cleatShiftAsSaddleHeight(cleatBackMm: number): [number, number] {
  return [Math.round(cleatBackMm * 0.5), Math.round(cleatBackMm * 0.6)];
}

/** Sattel 10 mm nach hinten wirkt wie 3 … 5 mm höher (abhängig von der Neigung der Sattelstreben). */
export function foreAftAsSaddleHeight(saddleBackMm: number): [number, number] {
  return [Math.round(saddleBackMm * 0.3), Math.round(saddleBackMm * 0.5)];
}

export interface EffortTargets {
  warmupKph: [number, number];
  assessmentKph: [number, number];
  rpe: [number, number];
  heartRateBpm?: [number, number];
  powerW?: [number, number];
}

/** Belastung für Aufwärmen und Bewertungsfahrt auf der Rolle. */
export function effortTargets(opts: { maxHrBpm?: number; ftpW?: number } = {}): EffortTargets {
  const t: EffortTargets = { warmupKph: [21, 26], assessmentKph: [30, 34], rpe: [4, 5] };
  if (opts.maxHrBpm) t.heartRateBpm = [Math.round(opts.maxHrBpm * 0.65), Math.round(opts.maxHrBpm * 0.85)];
  if (opts.ftpW) t.powerW = [Math.round(opts.ftpW * 0.6), Math.round(opts.ftpW * 0.75)];
  return t;
}

/** Torsowinkel-Zielbereich zur Horizontalen, Hüfte–Schulter, Kurbeln waagerecht. */
export function torsoAngleTarget(style: 'race' | 'balanced' | 'comfort'): { rangeDeg: [number, number]; startDeg: number } {
  if (style === 'race') return { rangeDeg: [40, 44], startDeg: 42 };
  if (style === 'comfort') return { rangeDeg: [45, 50], startDeg: 48 };
  return { rangeDeg: [43, 47], startDeg: 45 };
}
