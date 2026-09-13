import { describe, expect, it } from 'vitest';
import { analyzeCycle, ankleAt, bodySegments, contactPoints, optimizeBars, optimizeSaddleHeight, pedalAt, setupToRecord, setupToTargets, solvePose, suggestSetup } from '../src/fitbike.js';
import type { FitBikeSetup } from '../src/fitbike.js';
import { matchFrame } from '../src/match.js';
import { readFileSync } from 'node:fs';
import type { FrameGeometry, RiderProfile } from '../src/types.js';

const rider: RiderProfile = { measurements: { heightMm: 1780, inseamMm: 840 }, flexibility: 'medium', posture: 'balanced', discipline: 'road-race' };
const body = bodySegments({ heightMm: 1780, inseamMm: 840, gtHeightMm: 930 });
const setup: FitBikeSetup = { crankLengthMm: 172.5, saddleHeightMm: 750, saddleSetbackMm: 83, barXMm: 600, barYMm: 690, barType: 'drop' };

describe('bodySegments', () => {
  it('Segmentlängen summieren sich zur Trochanterhöhe', () => {
    expect(body.thighMm + body.shankMm).toBeCloseTo(930 * 0.926, 3);
    expect(body.estimated).toEqual(['Rumpf', 'Arm']);
  });
  it('ohne Beinmaße wird aus der Körpergröße geschätzt', () => {
    expect(bodySegments({ heightMm: 1780 }).estimated).toContain('Beinlänge');
  });
});

describe('Kinematik', () => {
  it('Pedal: 0° oben, 90° vorn, 180° unten', () => {
    expect(pedalAt(170, 0)).toEqual({ x: 0, y: 170 });
    expect(pedalAt(170, 90).x).toBeCloseTo(170, 6);
    expect(pedalAt(170, 180).y).toBeCloseTo(-170, 6);
  });
  it('Sprunggelenk liegt hinter und über der Pedalachse', () => {
    const a = ankleAt({ x: 0, y: 0 }, 150, 180);
    expect(a.x).toBeLessThan(0); expect(a.y).toBeGreaterThan(0);
  });
  it('Kontaktpunkte: Sattel hinter dem Tretlager, Griff vor der Klemmung', () => {
    const c = contactPoints(setup);
    expect(c.saddle.x).toBe(-213);
    expect(Math.hypot(c.saddle.x, c.saddle.y)).toBeCloseTo(750, 6);
    expect(c.grip.x).toBe(685);
  });
  it('Knie ist unten gestreckter als oben, Hüftwinkel oben am kleinsten', () => {
    const top = solvePose(setup, body, 0), bottom = solvePose(setup, body, 170);
    expect(bottom.angles.kneeDeg).toBeGreaterThan(top.angles.kneeDeg + 50);
    expect(top.angles.hipDeg).toBeLessThan(bottom.angles.hipDeg);
  });
  it('Vorhersagehöhe landet in den Protokollbereichen', () => {
    const a = analyzeCycle(setup, body);
    expect(a.kneeMaxDeg).toBeGreaterThanOrEqual(135); expect(a.kneeMaxDeg).toBeLessThanOrEqual(150);
    expect(a.kneeMinDeg).toBeGreaterThanOrEqual(66); expect(a.kneeMinDeg).toBeLessThanOrEqual(76);
    expect(a.legStretched).toBe(false);
    expect(Math.abs(a.kopsMm)).toBeLessThan(20);
  });
  it('höherer Sattel → gestreckteres Knie, Knie hinter der Achse; tiefer → gebeugter, Knie vor der Achse', () => {
    const hi = analyzeCycle({ ...setup, saddleHeightMm: 785 }, body), lo = analyzeCycle({ ...setup, saddleHeightMm: 700 }, body);
    expect(hi.kneeMaxDeg).toBeGreaterThan(lo.kneeMaxDeg);
    expect(hi.verdicts['knee-max']).toBe('high');
    expect(lo.verdicts['knee-max']).toBe('low');
    expect(hi.kopsMm).toBeLessThan(lo.kopsMm);
  });
  it('unerreichbarer Lenker → Arme gestreckt, gestreckter Sattel → Bein gestreckt', () => {
    expect(solvePose({ ...setup, barXMm: 950 }, body, 90).armStretched).toBe(true);
    expect(analyzeCycle({ ...setup, saddleHeightMm: 900 }, body).legStretched).toBe(true);
  });
  it('Sprunggelenk wird nicht als Indikator übernommen', () => {
    expect(Object.keys(analyzeCycle(setup, body).indicatorValues)).not.toContain('ankle-top');
  });
});

describe('Vorschlag, Optimierung, Übergabe', () => {
  it('Startaufbau aus Vorhersage und Faustregel', () => {
    const s = suggestSetup(rider, { gtHeightCm: 93 });
    expect(s.saddleHeightMm).toBe(750);
    expect(s.saddleSetbackMm).toBeGreaterThan(50);
    expect(s.barType).toBe('drop');
    expect(suggestSetup({ ...rider, discipline: 'mtb-trail' }).barType).toBe('flat');
  });
  it('Lenkeroptimierung bringt Torso- und Oberarmwinkel in den Bereich', () => {
    const o = optimizeBars(setup, body, { torsoDeg: 45 });
    expect(Math.abs(o.torsoDeg - 45)).toBeLessThanOrEqual(1.5);
    expect(o.torsoArmDeg).toBeGreaterThanOrEqual(80); expect(o.torsoArmDeg).toBeLessThanOrEqual(90);
    const race = optimizeBars(setup, body, { torsoDeg: 40 });
    expect(race.setup.barYMm).toBeLessThan(o.setup.barYMm);
  });
  it('Faustregel-Position liegt schon im Bereich und wird kaum bewegt', () => {
    const s = suggestSetup(rider);
    const o = optimizeBars(s, body, { torsoDeg: 45 });
    expect(Math.abs(o.setup.barXMm - s.barXMm) + Math.abs(o.setup.barYMm - s.barYMm)).toBeLessThan(40);
  });
  it('Sattelhöhe auf Kniewinkel', () => {
    const o = optimizeSaddleHeight({ ...setup, saddleHeightMm: 770 }, body);
    expect(o.kneeMaxDeg).toBeGreaterThanOrEqual(139); expect(o.kneeMaxDeg).toBeLessThanOrEqual(143);
    expect(o.setup.saddleHeightMm).toBeLessThan(770);
  });
  it('Aufbau → Aufzeichnung → Rahmen', () => {
    const rec = setupToRecord(setup);
    expect(rec.saddleHeightMm).toBe(750); expect(rec.saddleSetbackMm).toBe(83); expect(rec.crankLengthMm).toBe(172.5);
    expect(rec.saddleToBarDropMm).toBe(Math.round(contactPoints(setup).saddle.y - 690));
    const t = setupToTargets(setup, { heightMm: 1780, inseamMm: 840, torsoMm: 534, armMm: 623 });
    expect(t.bar).toEqual({ x: 600, y: 690 });
    const frames = JSON.parse(readFileSync(new URL('../src/data/frames.example.json', import.meta.url), 'utf8')) as FrameGeometry[];
    // Vorgeschlagener Aufbau entspricht der Faustregel-Zielposition, die der 56er Race-Rahmen erreicht.
    const ts = setupToTargets(suggestSetup(rider), { heightMm: 1780, inseamMm: 840, torsoMm: 534, armMm: 623 });
    const m = matchFrame(rider, frames.find((f) => f.id === 'race-56')!, ts);
    expect(m.score).toBeGreaterThan(70);
  });
});
