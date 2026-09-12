import { findBestCockpit } from './cockpit.js';
import {
  BAR_DELTA_WARN_MM,
  DISCIPLINE_DEFAULTS,
  EXPOSED_SEATPOST_RANGE_MM,
  SCORE_WEIGHTS,
  SEATPOST_SETBACK_RANGE_MM,
} from './constants.js';
import { computeFitTargets } from './fit.js';
import { round, saddlePosition } from './geometry.js';
import type { CockpitSetup, FitTargets, FrameGeometry, FrameMatch, MatchNote, MatchOptions, RiderProfile } from './types.js';

function outside(value: number, [min, max]: [number, number]): number {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

/** Bewertet einen einzelnen Rahmen gegen die Zielpositionen einer Person. */
export function matchFrame(rider: RiderProfile, frame: FrameGeometry, targets: FitTargets = computeFitTargets(rider), options: MatchOptions = {}): FrameMatch {
  const d = DISCIPLINE_DEFAULTS[rider.discipline];
  const notes: MatchNote[] = [];
  let penalty = 0;
  let hardFail = false;

  // 1. Überstandshöhe – hartes Kriterium.
  if (frame.standoverMm !== undefined) {
    const clearance = targets.measurementsUsed.inseamMm - frame.standoverMm;
    if (clearance < 0) {
      hardFail = true;
      notes.push({ severity: 'fail', code: 'standover', message: `Überstandshöhe ${frame.standoverMm} mm liegt über der Schrittlänge – der Rahmen ist zu groß.` });
    } else if (clearance < d.standoverClearanceMm) {
      penalty += (d.standoverClearanceMm - clearance) * SCORE_WEIGHTS.standoverShortfallPerMm;
      notes.push({ severity: 'warn', code: 'standover', message: `Nur ${Math.round(clearance)} mm Überstandsfreiheit (empfohlen ≥ ${d.standoverClearanceMm} mm).` });
    }
  } else {
    notes.push({ severity: 'warn', code: 'standover-unknown', message: 'Überstandshöhe unbekannt – Ausschluss nach Größe nicht geprüft.' });
  }

  // 2. Sattelposition: Versatz, den die Sattelstütze ausgleichen muss.
  const saddleOnFrame = saddlePosition(targets.saddleHeightMm, frame.seatTubeAngleDeg);
  const saddleSetbackMm = saddleOnFrame.x - targets.saddle.x; // positiv = Sattel muss nach hinten
  const setbackOverflow = outside(saddleSetbackMm, SEATPOST_SETBACK_RANGE_MM);
  if (setbackOverflow > 0) {
    penalty += setbackOverflow * SCORE_WEIGHTS.setbackOverflowPerMm;
    notes.push({
      severity: setbackOverflow > 20 ? 'fail' : 'warn',
      code: 'seat-angle',
      message: `Sitzwinkel ${frame.seatTubeAngleDeg}° erfordert ${Math.round(saddleSetbackMm)} mm Sattelversatz – außerhalb des üblichen Stützenbereichs (${SEATPOST_SETBACK_RANGE_MM[0]} … ${SEATPOST_SETBACK_RANGE_MM[1]} mm).`,
    });
    if (setbackOverflow > 20) hardFail = true;
  }

  // 3. Sattelstützenauszug.
  let exposedSeatpostMm: number | undefined;
  if (frame.seatTubeMm !== undefined) {
    exposedSeatpostMm = targets.saddleHeightMm - frame.seatTubeMm;
    const overflow = outside(exposedSeatpostMm, EXPOSED_SEATPOST_RANGE_MM);
    if (overflow > 0) {
      penalty += overflow * SCORE_WEIGHTS.seatpostOverflowPerMm;
      const tooSmall = exposedSeatpostMm > EXPOSED_SEATPOST_RANGE_MM[1];
      notes.push({
        severity: overflow > 40 ? 'fail' : 'warn',
        code: 'seatpost',
        message: tooSmall
          ? `Sattelstütze müsste ${Math.round(exposedSeatpostMm)} mm herausstehen – Rahmen vermutlich zu klein.`
          : `Sattelstütze nur ${Math.round(exposedSeatpostMm)} mm herausstehend – Mindesteinstecktiefe/Sattelhöhe evtl. nicht erreichbar, Rahmen vermutlich zu groß.`,
      });
      if (overflow > 40) hardFail = true;
    }
  }

  // 4. Lenkerposition über Vorbau/Spacer erreichen.
  const stemLengthsMm = options.stemLengthsMm ?? d.stemLengthsMm;
  const stemAnglesDeg = options.stemAnglesDeg ?? d.stemAnglesDeg;
  const maxSpacersMm = options.maxSpacersMm ?? d.maxSpacersMm;
  const cockpitCost = (c: CockpitSetup): number =>
    Math.abs(c.stemLengthMm - d.idealStemLengthMm) * SCORE_WEIGHTS.stemDeviationPerMm +
    Math.abs(c.spacersMm - d.idealSpacersMm) * SCORE_WEIGHTS.spacerDeviationPerMm;
  const best = findBestCockpit(frame, targets.bar, { stemLengthsMm, stemAnglesDeg, maxSpacersMm, stemClampOffsetMm: d.stemClampOffsetMm, barRiseMm: d.barRiseMm }, cockpitCost);

  const barDelta = { x: best.bar.x - targets.bar.x, y: best.bar.y - targets.bar.y };
  penalty += best.distanceMm * SCORE_WEIGHTS.barDeltaPerMm + cockpitCost(best.cockpit);

  if (best.distanceMm > BAR_DELTA_WARN_MM) {
    const dir = [
      barDelta.x > BAR_DELTA_WARN_MM / 2 ? 'zu lang' : barDelta.x < -BAR_DELTA_WARN_MM / 2 ? 'zu kurz' : '',
      barDelta.y > BAR_DELTA_WARN_MM / 2 ? 'zu hoch' : barDelta.y < -BAR_DELTA_WARN_MM / 2 ? 'zu tief' : '',
    ].filter(Boolean).join(' und ');
    notes.push({
      severity: best.distanceMm > 30 ? 'fail' : 'warn',
      code: 'bar-position',
      message: `Lenker trotz Anpassung ${Math.round(best.distanceMm)} mm neben der Zielposition (${dir || 'Abweichung'}): Δx ${Math.round(barDelta.x)} mm, Δy ${Math.round(barDelta.y)} mm.`,
    });
  }
  if (best.cockpit.stemLengthMm === Math.min(...stemLengthsMm) || best.cockpit.stemLengthMm === Math.max(...stemLengthsMm)) {
    notes.push({ severity: 'warn', code: 'stem-length', message: `Vorbau am Rand des sinnvollen Bereichs (${best.cockpit.stemLengthMm} mm) – Lenkverhalten weicht vom Rahmenkonzept ab.` });
  }
  if (best.cockpit.spacersMm >= maxSpacersMm) {
    notes.push({ severity: 'warn', code: 'spacers', message: `Maximale Spacerhöhe (${maxSpacersMm} mm) ausgeschöpft.` });
  }

  const score = hardFail ? 0 : Math.max(0, Math.round(100 - penalty));
  if (!hardFail && notes.length === 0) {
    notes.push({ severity: 'ok', code: 'fit', message: 'Zielposition mit üblichem Cockpit erreichbar.' });
  }

  const match: FrameMatch = {
    frame,
    score,
    cockpit: best.cockpit,
    resultingBar: round(best.bar),
    barDelta: round(barDelta),
    saddleSetbackMm: Math.round(saddleSetbackMm),
    notes,
  };
  if (exposedSeatpostMm !== undefined) match.exposedSeatpostMm = Math.round(exposedSeatpostMm);
  return match;
}

/** Bewertet alle Rahmen und sortiert absteigend nach Score. */
export function rankFrames(rider: RiderProfile, frames: FrameGeometry[], options: MatchOptions = {}): FrameMatch[] {
  const targets = computeFitTargets(rider);
  const discipline = options.discipline ?? rider.discipline;
  const candidates = discipline === 'any' ? frames : frames.filter((f) => f.discipline === discipline);
  return candidates
    .map((frame) => matchFrame(rider, frame, targets, options))
    .sort((a, b) => b.score - a.score || a.frame.id.localeCompare(b.frame.id));
}
