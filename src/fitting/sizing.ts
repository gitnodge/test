import type { CrankRecommendation, LegMeasurements, SizingRow } from './types.js';

/** Rahmengrößen-Übersicht Rennrad (Anhang 1 der Methodik). Bereiche überlappen absichtlich. */
export const SIZING_TABLE: SizingRow[] = [
  { size: 48, heightCm: [152, 160], inseamCm: [70, 74], seatTubeMm: [435, 445], topTubeMm: [505, 520], seatAngleDeg: [74, 75], headTubeMm: [100, 120], reachMm: [355, 370], stackMm: [500, 515], crankMm: [165, 165], barWidthMm: [380, 380] },
  { size: 50, heightCm: [160, 168], inseamCm: [74, 77.7], seatTubeMm: [455, 480], topTubeMm: [510, 530], seatAngleDeg: [73.5, 74.5], headTubeMm: [110, 140], reachMm: [360, 375], stackMm: [505, 535], crankMm: [165, 165], barWidthMm: [400, 400] },
  { size: 52, heightCm: [165, 173], inseamCm: [76.3, 80], seatTubeMm: [485, 500], topTubeMm: [520, 540], seatAngleDeg: [73.25, 74], headTubeMm: [120, 155], reachMm: [375, 380], stackMm: [510, 550], crankMm: [165, 170], barWidthMm: [420, 420] },
  { size: 54, heightCm: [170, 178], inseamCm: [78.6, 82.3], seatTubeMm: [500, 520], topTubeMm: [535, 550], seatAngleDeg: [73, 73.5], headTubeMm: [120, 175], reachMm: [380, 390], stackMm: [520, 565], crankMm: [170, 170], barWidthMm: [420, 420] },
  { size: 56, heightCm: [175, 183], inseamCm: [81, 84.6], seatTubeMm: [515, 565], topTubeMm: [540, 565], seatAngleDeg: [73, 73.5], headTubeMm: [140, 190], reachMm: [385, 400], stackMm: [550, 590], crankMm: [172.5, 172.5], barWidthMm: [420, 420] },
  { size: 58, heightCm: [178, 188], inseamCm: [82.3, 87], seatTubeMm: [540, 580], topTubeMm: [560, 585], seatAngleDeg: [73, 73], headTubeMm: [160, 225], reachMm: [390, 410], stackMm: [570, 620], crankMm: [172.5, 172.5], barWidthMm: [440, 440] },
  { size: 60, heightCm: [183, 190], inseamCm: [84.6, 88], seatTubeMm: [560, 600], topTubeMm: [580, 605], seatAngleDeg: [72.5, 73.5], headTubeMm: [180, 240], reachMm: [395, 415], stackMm: [600, 645], crankMm: [172.5, 175], barWidthMm: [440, 440] },
  { size: 62, heightCm: [188, 210], inseamCm: [87, 100], seatTubeMm: [580, 620], topTubeMm: [600, 625], seatAngleDeg: [72.5, 73], headTubeMm: [200, 260], reachMm: [405, 430], stackMm: [610, 660], crankMm: [175, 175], barWidthMm: [440, 460] },
];

const within = (v: number, [a, b]: [number, number]): boolean => v >= a && v <= b;

/** Passende Rahmengrößen nach Körpergröße und Schrittlänge; Schrittlänge wiegt schwerer. */
export function frameSizesFor(m: Pick<LegMeasurements, 'heightCm' | 'inseamCm'>): Array<{ row: SizingRow; matches: Array<'height' | 'inseam'> }> {
  return SIZING_TABLE.map((row) => {
    const matches: Array<'height' | 'inseam'> = [];
    if (m.heightCm !== undefined && within(m.heightCm, row.heightCm)) matches.push('height');
    if (m.inseamCm !== undefined && within(m.inseamCm, row.inseamCm)) matches.push('inseam');
    return { row, matches };
  }).filter((r) => r.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length || (b.matches.includes('inseam') ? 1 : 0) - (a.matches.includes('inseam') ? 1 : 0));
}

interface CrankRow { crank: number; inseam: [number, number]; gt: [number, number]; sum: [number, number]; male: [number, number]; female: [number, number] }
const INF = 1e9;
/** Kurbellängen-Empfehlung nach Beinmaßen (Anhang 1). Obergrenzen exklusiv, außer letzte Zeile. */
export const CRANK_TABLE: CrankRow[] = [
  { crank: 162.5, inseam: [0, 77], gt: [0, 86], sum: [0, 163.4], male: [0, 166.3], female: [0, 164] },
  { crank: 165, inseam: [77, 79], gt: [86, 88], sum: [163.4, 167], male: [166.3, 170], female: [164, 165.5] },
  { crank: 167.5, inseam: [79, 81], gt: [88, 90], sum: [167, 171], male: [170, 173], female: [165.5, 170] },
  { crank: 170, inseam: [81, 83.5], gt: [90, 93.3], sum: [171, 177], male: [173, 179], female: [170, 175.5] },
  { crank: 172.5, inseam: [83.5, 86], gt: [93.3, 96], sum: [177, 182.5], male: [179, 185.5], female: [175.5, 181] },
  { crank: 175, inseam: [86, 89.5], gt: [96, 101], sum: [182.5, 189], male: [185.5, 192], female: [181, 187] },
  { crank: 177.5, inseam: [89.5, INF], gt: [101, INF], sum: [189, INF], male: [192, INF], female: [187, INF] },
];

function lookup(key: keyof Omit<CrankRow, 'crank'>, v: number): number {
  const row = CRANK_TABLE.find((r) => v >= r[key][0] && v < r[key][1]) ?? CRANK_TABLE[CRANK_TABLE.length - 1]!;
  return row.crank;
}

/**
 * Kurbellänge: bevorzugt Schrittlänge + GT-Höhe, sonst einzelne Beinmaße, zuletzt Körpergröße
 * (setzt durchschnittliche Beinproportionen voraus).
 */
export function recommendCrankLength(m: LegMeasurements): CrankRecommendation | undefined {
  if (m.inseamCm !== undefined && m.gtHeightCm !== undefined) return { crankLengthMm: lookup('sum', m.inseamCm + m.gtHeightCm), basis: 'inseam+gt' };
  if (m.inseamCm !== undefined) return { crankLengthMm: lookup('inseam', m.inseamCm), basis: 'inseam' };
  if (m.gtHeightCm !== undefined) return { crankLengthMm: lookup('gt', m.gtHeightCm), basis: 'gt' };
  if (m.heightCm !== undefined) {
    return { crankLengthMm: lookup(m.sex === 'female' ? 'female' : 'male', m.heightCm), basis: 'height', note: 'Nur aus der Körpergröße geschätzt – setzt durchschnittliche Beinlänge voraus.' };
  }
  return undefined;
}

/** Bewertet eine vorhandene Kurbel gegen die Empfehlung. */
export function assessCrank(currentMm: number, rec: CrankRecommendation): { deltaMm: number; verdict: 'ok' | 'long' | 'short'; message: string } {
  const deltaMm = currentMm - rec.crankLengthMm;
  if (deltaMm > 0) return { deltaMm, verdict: 'long', message: `Kurbel ${deltaMm} mm länger als empfohlen (${rec.crankLengthMm} mm). Zu lange Kurbeln vergrößern die Gelenkwinkel oben und unten; sie sind der häufigste Grund, warum kein Sattelhöhen-Sweet-Spot zu finden ist.` };
  if (deltaMm < 0) return { deltaMm, verdict: 'short', message: `Kurbel ${-deltaMm} mm kürzer als empfohlen (${rec.crankLengthMm} mm). Kurze Kurbeln haben kaum Nachteile; unkritisch.` };
  return { deltaMm, verdict: 'ok', message: `Kurbellänge ${currentMm} mm entspricht der Empfehlung.` };
}

/** Lenkerbreite Mitte–Mitte aus Schultergelenkbreite, auf gängige Größen gerundet. */
export function recommendBarWidth(shoulderWidthMm: number): number {
  const sizes = [360, 380, 400, 420, 440, 460];
  return sizes.reduce((best, s) => (Math.abs(s - shoulderWidthMm) < Math.abs(best - shoulderWidthMm) ? s : best), sizes[0]!);
}
