import { describe, expect, it } from 'vitest';
import { completeMeasurements } from '../src/anthropometry.js';
import { computeFitTargets } from '../src/fit.js';
import type { RiderProfile } from '../src/types.js';

const base: RiderProfile = {
  measurements: { heightMm: 1780, inseamMm: 840 },
  flexibility: 'medium',
  posture: 'balanced',
  discipline: 'road-race',
};

describe('completeMeasurements', () => {
  it('schätzt fehlende Maße und markiert sie', () => {
    const m = completeMeasurements({ heightMm: 1800, inseamMm: 850 });
    expect(m.estimated).toEqual(['torsoMm', 'armMm']);
    expect(m.torsoMm).toBeGreaterThan(400);
    expect(m.armMm).toBeGreaterThan(500);
  });
  it('übernimmt gemessene Werte unverändert', () => {
    const m = completeMeasurements({ heightMm: 1800, inseamMm: 850, torsoMm: 600, armMm: 650 });
    expect(m.estimated).toEqual([]);
    expect(m.torsoMm).toBe(600);
  });
  it('lehnt unplausible Eingaben ab', () => {
    expect(() => completeMeasurements({ heightMm: 0, inseamMm: 850 })).toThrow();
  });
});

describe('computeFitTargets', () => {
  it('Sattelhöhe folgt der LeMond-Regel', () => {
    expect(computeFitTargets(base).saddleHeightMm).toBeCloseTo(840 * 0.883, 6);
  });
  it('aggressiv = tiefer und länger als komfort', () => {
    const agg = computeFitTargets({ ...base, posture: 'aggressive' });
    const com = computeFitTargets({ ...base, posture: 'comfort' });
    expect(agg.saddleToBarDropMm).toBeGreaterThan(com.saddleToBarDropMm);
    expect(agg.saddleToBarReachMm).toBeGreaterThan(com.saddleToBarReachMm);
  });
  it('geringe Beweglichkeit reduziert die Überhöhung', () => {
    const low = computeFitTargets({ ...base, flexibility: 'low' });
    const high = computeFitTargets({ ...base, flexibility: 'high' });
    expect(low.saddleToBarDropMm).toBeLessThan(high.saddleToBarDropMm);
  });
  it('größere Person → weiter entfernter Lenker', () => {
    const small = computeFitTargets({ ...base, measurements: { heightMm: 1650, inseamMm: 770 } });
    const tall = computeFitTargets({ ...base, measurements: { heightMm: 1900, inseamMm: 900 } });
    expect(tall.bar.x).toBeGreaterThan(small.bar.x);
    expect(tall.bar.y).toBeGreaterThan(small.bar.y);
  });
  it('Trail-MTB: Lenker etwa auf Sattelhöhe, Rennrad deutlich darunter', () => {
    const road = computeFitTargets(base);
    const trail = computeFitTargets({ ...base, discipline: 'mtb-trail' });
    expect(road.saddleToBarDropMm).toBeGreaterThan(60);
    expect(Math.abs(trail.saddleToBarDropMm)).toBeLessThan(40);
  });
});
