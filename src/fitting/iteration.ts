import type { IterationEntry, NextStep, Outcome, SaddleHeightVerdict } from './types.js';

/**
 * Erster Grobschritt: Sattel auf die Vorhersage setzen. Widersprechen die Indikatoren
 * der Vorhersage geschlossen, den Indikatoren folgen und 10 … 15 mm in deren Richtung gehen.
 */
export function initialCoarseChange(actualMm: number, predictedMm: number | undefined, verdict: SaddleHeightVerdict | 'inconclusive'): NextStep {
  const toPrediction = predictedMm === undefined ? 0 : predictedMm - actualMm;
  if (predictedMm !== undefined) {
    const predictsUp = toPrediction > 0;
    if (verdict === 'high' && predictsUp) return { changeMm: -12, reason: 'Indikatoren sagen „zu hoch“, die Vorhersage will nach oben: den Indikatoren folgen, 10 … 15 mm tiefer.' };
    if (verdict === 'low' && !predictsUp && toPrediction < 0) return { changeMm: 12, reason: 'Indikatoren sagen „zu tief“, die Vorhersage will nach unten: den Indikatoren folgen, 10 … 15 mm höher.' };
    return { changeMm: Math.round(toPrediction), reason: `Sattel auf die Vorhersage setzen (${predictedMm} mm).` };
  }
  if (verdict === 'high') return { changeMm: -12, reason: 'Keine Vorhersage; Indikatoren sagen „zu hoch“.' };
  if (verdict === 'low') return { changeMm: 12, reason: 'Keine Vorhersage; Indikatoren sagen „zu tief“.' };
  return { changeMm: 0, reason: 'Weder Vorhersage noch klare Indikatoren – Beinmaße eintragen oder Indikatoren nachtragen.' };
}

/**
 * Grobabstimmung nach einer Änderung. Frage an die fahrende Person ist nur: leichter oder schwerer, das Tempo zu halten?
 * Schlechter: Differenz halbieren (erst halber Schritt, dann halber Schritt in die Gegenrichtung).
 * Besser: 5 mm weiter in gleicher Richtung, bis keine Verbesserung mehr. Unklar: ±5 mm probieren.
 */
export function nextCoarseStep(history: IterationEntry[]): NextStep {
  const coarse = history.filter((h) => h.phase === 'coarse');
  const last = coarse[coarse.length - 1];
  if (!last) return { changeMm: 0, reason: 'Erste Änderung nach initialCoarseChange eintragen.' };
  const dir = Math.sign(last.changeMm) || 1;
  if (last.outcome === 'better') return { changeMm: 5 * dir, reason: 'Besser: weitere 5 mm in dieselbe Richtung, bis keine Verbesserung mehr spürbar ist.' };
  if (last.outcome === 'worse') {
    const prev = coarse[coarse.length - 2];
    const half = Math.max(2, Math.round(Math.abs(last.changeMm) / 2));
    if (prev && prev.outcome === 'worse' && Math.sign(prev.changeMm) === -dir) {
      return { changeMm: 0, reason: 'In beide Richtungen schlechter: Ausgangshöhe war nahe am Optimum. Zur Feinabstimmung mit dem 2-mm-Pad wechseln.' };
    }
    if (prev && prev.outcome === 'worse') return { changeMm: half * -dir, reason: `Erneut schlechter: ${half} mm in die Gegenrichtung.` };
    return { changeMm: -Math.round(last.changeMm / 2), reason: `Schlechter: Differenz halbieren, ${half} mm zurück (netto halber Schritt vom Ausgangspunkt).` };
  }
  return { changeMm: 5 * dir, reason: 'Unklar: 5-mm-Schritte nach oben und unten vergleichen, bis ein Unterschied spürbar ist.' };
}

/**
 * Feinabstimmung mit 2-mm-Pad zwischen Sattel und Person. Pad besser → 2 mm höher. Pad schlechter → 2 mm tiefer.
 * Sweet Spot: sowohl Pad als auch 2 … 3 mm tiefer sind spürbar schlechter.
 */
export function nextFineStep(padResult: Outcome, lowerResult?: Outcome): NextStep {
  if (padResult === 'worse' && lowerResult === 'worse') return { changeMm: 0, done: true, reason: 'Pad und Absenken sind beide schlechter: Sweet Spot gefunden. Eher am unteren Rand des Fensters bleiben (dickere Polster, Winterhosen, verkürzte Hamstrings).' };
  if (padResult === 'better') return { changeMm: 2, reason: 'Mit Pad besser: Sattel 2 mm höher, dann erneut mit Pad prüfen.' };
  if (padResult === 'worse') return { changeMm: -2, reason: 'Mit Pad schlechter: Sattel 2 mm tiefer, dann erneut prüfen.' };
  return { changeMm: 0, reason: 'Kein Unterschied spürbar: Sattel ist noch zu weit vom Optimum entfernt, zurück zur Grobabstimmung, oder Pad-Wechsel schneller machen.' };
}

/** Hinweis zum Unterlenker: dort kann der Sattel 1 … 2 mm tiefer gehören. */
export const DROPS_COMPROMISE_NOTE =
  'Der Sweet Spot gilt für den Torsowinkel der Standard-Handposition. Im Unterlenker dehnen sich die Hamstrings zusätzlich; dort kann der Sattel 1 … 2 mm tiefer gehören. Hoods und Unterlenker mit und ohne Pad vergleichen und den Kompromiss bewusst wählen.';

/** Empfohlener Klebeband-Abstand über der Klemme, damit Änderungen ablesbar bleiben. */
export function tapeMarkAboveClampMm(actualMm: number, predictedMm: number | undefined): number {
  if (predictedMm === undefined) return 20;
  const drop = actualMm - predictedMm;
  return drop > 30 ? 60 : drop > 15 ? 40 : 20;
}
