import type { FitTargets } from '../types.js';
import type { FitRecord } from './types.js';

export interface RecordField {
  key: keyof FitRecord;
  code: string;
  title: string;
  how: string;
  transferable: boolean;
}

/** Positionsaufzeichnung A … H mit Messanweisung. */
export const RECORD_FIELDS: RecordField[] = [
  { key: 'saddleHeightMm', code: 'A', title: 'Satteloberkante bis Tretlagermitte', how: 'Von der Tretlagermitte entlang der Sitzrohrachse bis zur Satteloberkante.', transferable: true },
  { key: 'saddleTipToHeadBoltMm', code: 'B', title: 'Sattelspitze bis Kopfschraube', how: 'Sattelspitze bis zur Schraube oben im Vorbau; gilt nur für dieses Rad.', transferable: false },
  { key: 'saddleTipToHoodsMm', code: 'C', title: 'Sattelspitze bis Hoods', how: 'Diagonal von der Sattelspitze bis zur Aufwölbung der Hoods, wo die Daumenbeuge liegt.', transferable: true },
  { key: 'stemLengthMm', code: 'D', title: 'Vorbaulänge', how: 'Steht meist auf dem Vorbau; sonst Lenkermitte bis Gabelschaftmitte.', transferable: false },
  { key: 'crankLengthMm', code: 'E', title: 'Kurbellänge', how: 'Steht meist innen auf dem Kurbelarm.', transferable: true },
  { key: 'saddleToBarDropMm', code: 'F', title: 'Überhöhung Sattel zu Lenker', how: 'Höhenunterschied Satteloberkante zu Lenkermitte, mit Wasserwaage.', transferable: true },
  { key: 'saddleSetbackMm', code: 'G', title: 'Sattelversatz', how: 'Waagerechter Abstand vom Lot an der Sattelspitze zur Tretlagermitte.', transferable: true },
  { key: 'barWidthMm', code: 'H', title: 'Lenkerbreite', how: 'Mitte–Mitte am Unterlenker.', transferable: true },
];

export function missingTransferable(r: FitRecord): RecordField[] {
  return RECORD_FIELDS.filter((f) => f.transferable && r[f.key] === undefined);
}

/** Annahmen für die Umrechnung auf Kontaktpunkte. */
export const RECORD_ASSUMPTIONS = {
  /** Sattelspitze bis Sattelmitte (Sitzposition). */
  saddleTipToCenterMm: 130,
  /** Hoods relativ zur Lenkerklemmung. */
  hoodOffset: { x: 85, y: 12 },
};

/**
 * Übersetzt eine Aufzeichnung in rahmenunabhängige Zielpositionen (relativ zum Tretlager),
 * damit das Rahmen-Matching mit einer real ermittelten Position statt mit Faustregeln arbeiten kann.
 * Braucht A, F, G; C verfeinert den Reach, sonst fällt er auf die Faustregel zurück (undefined).
 */
export function targetsFromRecord(r: FitRecord, opts: { inseamMm: number; heightMm: number; torsoMm: number; armMm: number }): FitTargets | undefined {
  if (r.saddleHeightMm === undefined || r.saddleToBarDropMm === undefined || r.saddleSetbackMm === undefined) return undefined;
  const A = r.saddleHeightMm, F = r.saddleToBarDropMm, G = r.saddleSetbackMm;
  const saddleX = -(G + RECORD_ASSUMPTIONS.saddleTipToCenterMm);
  const saddleY = Math.sqrt(Math.max(0, A * A - saddleX * saddleX));
  const seatAngleDeg = (Math.atan2(saddleY, -saddleX) * 180) / Math.PI;
  const barY = saddleY - F;
  let barX: number;
  if (r.saddleTipToHoodsMm !== undefined) {
    const tipX = -G, tipY = saddleY;
    const hoodY = barY + RECORD_ASSUMPTIONS.hoodOffset.y;
    const dx = Math.sqrt(Math.max(0, r.saddleTipToHoodsMm ** 2 - (hoodY - tipY) ** 2));
    barX = tipX + dx - RECORD_ASSUMPTIONS.hoodOffset.x;
  } else {
    return undefined;
  }
  return {
    saddleHeightMm: A,
    seatAngleDeg: Math.round(seatAngleDeg * 10) / 10,
    saddle: { x: saddleX, y: saddleY },
    saddleToBarDropMm: F,
    saddleToBarReachMm: barX - saddleX,
    bar: { x: barX, y: barY },
    measurementsUsed: { heightMm: opts.heightMm, inseamMm: opts.inseamMm, torsoMm: opts.torsoMm, armMm: opts.armMm },
  };
}
