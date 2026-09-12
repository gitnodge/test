import { describe, expect, it } from 'vitest';
import {
  assessCrank, bodyProportions, cleatShiftAsSaddleHeight, compareSaddleHeight, diagnose, effortTargets, foreAftAsSaddleHeight,
  frameSizesFor, initialCoarseChange, missingTransferable, nextCoarseStep, nextFineStep, predictSaddleHeight, recommendBarWidth,
  recommendCrankLength, tallyBarHeight, tallyBarReach, tallyForeAft, tallySaddleHeight, targetsFromRecord,
  SADDLE_HEIGHT_INDICATORS, FORE_AFT_INDICATORS, HANDLEBAR_INDICATORS, PROTOCOL, RECORD_FIELDS, TOOLS, MARKERS,
} from '../src/fitting/index.js';
import { rankFrames } from '../src/match.js';
import { readFileSync } from 'node:fs';
import type { FrameGeometry } from '../src/types.js';

describe('Sattelhöhen-Vorhersage', () => {
  it('Schrittlänge + GT: 4,4808·x − 43,3', () => {
    const p = predictSaddleHeight({ inseamCm: 84, gtHeightCm: 93 })!;
    expect(p.basis).toBe('inseam+gt');
    expect(p.predictedMm).toBe(Math.round(4.4808 * 177 - 43.3));
    expect(p.sanity?.plausible).toBe(true);
  });
  it('GT − Schrittlänge außerhalb 6…12 cm ist unplausibel', () => {
    expect(predictSaddleHeight({ inseamCm: 84, gtHeightCm: 100 })!.sanity?.plausible).toBe(false);
  });
  it('fällt auf Einzelmaße zurück', () => {
    expect(predictSaddleHeight({ inseamCm: 84 })!.basis).toBe('inseam');
    expect(predictSaddleHeight({ gtHeightCm: 93 })!.basis).toBe('gt');
    expect(predictSaddleHeight({})).toBeUndefined();
  });
  it('Vergleich: über 20 mm ist Alarm', () => {
    expect(compareSaddleHeight(770, 745).level).toBe('alarm');
    expect(compareSaddleHeight(757, 745).level).toBe('notable');
    expect(compareSaddleHeight(748, 745).level).toBe('close');
  });
});

describe('Kurbel, Lenkerbreite, Proportionen, Größe', () => {
  it('Kurbel aus Schrittlänge + GT', () => {
    expect(recommendCrankLength({ inseamCm: 84, gtHeightCm: 93 })!.crankLengthMm).toBe(172.5);
    expect(recommendCrankLength({ inseamCm: 78 })!.crankLengthMm).toBe(165);
    expect(recommendCrankLength({ heightCm: 168, sex: 'female' })!.crankLengthMm).toBe(167.5);
    expect(recommendCrankLength({ inseamCm: 95 })!.crankLengthMm).toBe(177.5);
  });
  it('Bewertung vorhandener Kurbel', () => {
    expect(assessCrank(175, { crankLengthMm: 170, basis: 'inseam' }).verdict).toBe('long');
    expect(assessCrank(165, { crankLengthMm: 170, basis: 'inseam' }).verdict).toBe('short');
  });
  it('Lenkerbreite auf gängige Größen', () => {
    expect(recommendBarWidth(411)).toBe(420);
    expect(recommendBarWidth(388)).toBe(380);
  });
  it('Proportionen: lange Beine über 0,475, kurze Arme bei Spannweite > 3 cm kürzer', () => {
    const p = bodyProportions({ heightCm: 178, inseamCm: 86, spanCm: 174 })!;
    expect(p.legs).toBe('long');
    expect(p.arms).toBe('short');
    expect(bodyProportions({ heightCm: 178, inseamCm: 79 })!.legs).toBe('short');
  });
  it('Rahmengröße: 178 cm / 84 cm → 56 zuerst', () => {
    const r = frameSizesFor({ heightCm: 178, inseamCm: 84 });
    expect(r[0]!.row.size).toBe(56);
    expect(r[0]!.matches).toEqual(['height', 'inseam']);
  });
  it('Cleat- und Vor/zurück-Äquivalenz', () => {
    expect(cleatShiftAsSaddleHeight(10)).toEqual([5, 6]);
    expect(foreAftAsSaddleHeight(10)).toEqual([3, 5]);
  });
  it('Belastungsziele', () => {
    const t = effortTargets({ maxHrBpm: 190, ftpW: 250 });
    expect(t.heartRateBpm).toEqual([124, 162]);
    expect(t.powerW).toEqual([150, 188]);
  });
});

describe('Indikatoren', () => {
  it('es gibt 10 beobachtbare Sattelhöhen-, 4 Vor/zurück- und 7 Lenker-Indikatoren', () => {
    expect(SADDLE_HEIGHT_INDICATORS.length).toBe(10);
    expect(FORE_AFT_INDICATORS.length).toBe(4);
    expect(HANDLEBAR_INDICATORS.length).toBe(7);
    expect(HANDLEBAR_INDICATORS.filter((i) => i.heightOnly).length).toBe(3);
  });
  it('Kniewinkel-Schwellen', () => {
    const k = SADDLE_HEIGHT_INDICATORS.find((i) => i.id === 'knee-max')!;
    expect(k.evaluate(130)).toBe('low');
    expect(k.evaluate(140)).toBe('inconclusive');
    expect(k.evaluate(150)).toBe('high');
    const m = SADDLE_HEIGHT_INDICATORS.find((i) => i.id === 'knee-min')!;
    expect(m.evaluate(65)).toBe('low');
    expect(m.evaluate(76)).toBe('high');
  });
  it('Sprunggelenk oben/unten', () => {
    const t = SADDLE_HEIGHT_INDICATORS.find((i) => i.id === 'ankle-top')!;
    expect(t.evaluate(95)).toBe('low'); expect(t.evaluate(125)).toBe('high');
    const b = SADDLE_HEIGHT_INDICATORS.find((i) => i.id === 'ankle-bottom')!;
    expect(b.evaluate(105)).toBe('low'); expect(b.evaluate(140)).toBe('high');
  });
  it('Tally Sattelhöhe: Mehrheit „hoch“', () => {
    const t = tallySaddleHeight({ 'knee-max': 150, 'knee-min': 76, 'ankle-bottom': 120, 'hip-stability': 4, 'knee-decel': 'abrupt' });
    expect(t.counts.high).toBe(4);
    expect(t.verdict).toBe('high');
    expect(t.answered).toBe(5);
  });
  it('Tally ohne Mehrheit ist unentschieden', () => {
    expect(tallySaddleHeight({ 'knee-max': 150, 'knee-min': 65 }).verdict).toBe('inconclusive');
  });
  it('Vor/zurück: Hüftmarke vor der Linie und KOPS vorn → vorn', () => {
    expect(tallyForeAft({ kops: 'front', 'hip-seat-tube': 'front' }).verdict).toBe('forward');
    expect(tallyForeAft({ kops: 'behind', 'hip-seat-tube': 'behind', balance: 'easy' }).verdict).toBe('back');
  });
  it('Lenker: Reach und Höhe getrennt', () => {
    expect(tallyBarReach({ 'hand-position': 'stretch', elbows: 'locked', 'torso-angle': 38 }).verdict).toBe('far-or-low');
    expect(tallyBarHeight({ 'power-drops': 'less', 'drops-time': '<5' }).verdict).toBe('low');
    expect(tallyBarHeight({ 'drops-time': '>75', 'power-drops': 'more' }).verdict).toBe('inconclusive');
  });
});

describe('Iteration', () => {
  it('erster Schritt: auf Vorhersage, außer Indikatoren widersprechen', () => {
    expect(initialCoarseChange(760, 745, 'inconclusive').changeMm).toBe(-15);
    expect(initialCoarseChange(730, 745, 'high').changeMm).toBe(-12);
    expect(initialCoarseChange(760, 745, 'low').changeMm).toBe(12);
    expect(initialCoarseChange(760, undefined, 'inconclusive').changeMm).toBe(0);
  });
  it('besser → 5 mm weiter, schlechter → halbieren, zweimal schlechter → Gegenrichtung', () => {
    expect(nextCoarseStep([{ phase: 'coarse', changeMm: -10, outcome: 'better' }]).changeMm).toBe(-5);
    expect(nextCoarseStep([{ phase: 'coarse', changeMm: -10, outcome: 'worse' }]).changeMm).toBe(5);
    expect(nextCoarseStep([{ phase: 'coarse', changeMm: -10, outcome: 'worse' }, { phase: 'coarse', changeMm: 5, outcome: 'worse' }]).changeMm).toBe(0);
    expect(nextCoarseStep([{ phase: 'coarse', changeMm: -10, outcome: 'ambiguous' }]).changeMm).toBe(-5);
  });
  it('Feinabstimmung mit Pad', () => {
    expect(nextFineStep('better').changeMm).toBe(2);
    expect(nextFineStep('worse').changeMm).toBe(-2);
    expect(nextFineStep('worse', 'worse').done).toBe(true);
  });
});

describe('Fehlerbilder und Aufzeichnung', () => {
  it('Streben am vorderen Anschlag → Inline-Stütze', () => {
    const d = diagnose({ railsAtEnd: 'front' });
    expect(d[0]!.id).toBe('fore-aft-range');
    expect(d[0]!.actions[0]).toMatch(/inline/i);
  });
  it('Hoods nicht erreichbar mit passender Größe → Proportionen', () => {
    const d = diagnose({ cannotReachHoods: true, frameSizeOk: true, measurements: { heightCm: 178, inseamCm: 86 } });
    expect(d[0]!.id).toBe('proportions');
    expect(d[0]!.cause).toMatch(/lange Beine/);
  });
  it('fehlende übertragbare Maße', () => {
    expect(missingTransferable({ saddleHeightMm: 742 }).map((f) => f.code)).toEqual(['C', 'E', 'F', 'G', 'H']);
    expect(RECORD_FIELDS.filter((f) => f.transferable).length).toBe(6);
  });
  it('Aufzeichnung → Zielpositionen → Rahmenranking', () => {
    const t = targetsFromRecord({ saddleHeightMm: 742, saddleToBarDropMm: 80, saddleSetbackMm: 80, saddleTipToHoodsMm: 590 }, { inseamMm: 840, heightMm: 1780, torsoMm: 534, armMm: 623 })!;
    expect(t.saddle.x).toBe(-210);
    expect(t.saddle.y).toBeCloseTo(Math.sqrt(742 ** 2 - 210 ** 2), 6);
    expect(t.bar.y).toBeCloseTo(t.saddle.y - 80, 6);
    expect(t.bar.x).toBeGreaterThan(400);
    const frames = JSON.parse(readFileSync(new URL('../src/data/frames.example.json', import.meta.url), 'utf8')) as FrameGeometry[];
    const rider = { measurements: { heightMm: 1780, inseamMm: 840 }, flexibility: 'medium' as const, posture: 'balanced' as const, discipline: 'road-race' as const };
    const ranked = frames.filter((f) => f.discipline === 'road-race').map((f) => ({ f, s: (rankFrames(rider, [f]))[0]! }));
    expect(ranked.length).toBe(5);
    expect(targetsFromRecord({ saddleHeightMm: 742 }, { inseamMm: 840, heightMm: 1780, torsoMm: 534, armMm: 623 })).toBeUndefined();
  });
  it('Protokoll deckt alle Kapitel ab', () => {
    const ids = PROTOCOL.map((s) => s.id);
    for (const id of ['baseline-road', 'setup', 'cleats', 'cranks', 'assess', 'coarse', 'fore-aft', 'fine', 'bars', 'record', 'road']) expect(ids).toContain(id);
    expect(TOOLS.filter((t) => t.essential).length).toBeGreaterThanOrEqual(6);
    expect(MARKERS.length).toBe(5);
  });
});
