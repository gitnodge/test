import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { matchFrame, rankFrames } from '../src/match.js';
import type { FrameGeometry, RiderProfile } from '../src/types.js';

const frames = JSON.parse(readFileSync(new URL('../src/data/frames.example.json', import.meta.url), 'utf8')) as FrameGeometry[];
const byId = (id: string): FrameGeometry => {
  const f = frames.find((x) => x.id === id);
  if (!f) throw new Error(id);
  return f;
};

const rider178: RiderProfile = {
  measurements: { heightMm: 1780, inseamMm: 840 },
  flexibility: 'medium',
  posture: 'balanced',
  discipline: 'road-race',
};

describe('rankFrames', () => {
  it('filtert standardmäßig auf die Disziplin der Person', () => {
    const r = rankFrames(rider178, frames);
    expect(r.every((m) => m.frame.discipline === 'road-race')).toBe(true);
    expect(r.length).toBe(5);
  });
  it('1,78 m / 84 cm Schrittlänge → Race 56 vorn, 52 und 61 hinten', () => {
    const ids = rankFrames(rider178, frames).map((m) => m.frame.id);
    expect(ids[0]).toBe('race-56');
    expect(ids.slice(-2).sort()).toEqual(['race-52', 'race-61']);
  });
  it('bester Rahmen erreicht die Zielposition mit üblichem Vorbau', () => {
    const best = rankFrames(rider178, frames)[0]!;
    expect(best.score).toBeGreaterThan(80);
    expect(Math.hypot(best.barDelta.x, best.barDelta.y)).toBeLessThan(10);
    expect(best.cockpit.stemLengthMm).toBeGreaterThanOrEqual(90);
    expect(best.cockpit.stemLengthMm).toBeLessThanOrEqual(120);
  });
  it('kleine Person → kleiner Rahmen vorn', () => {
    const ids = rankFrames({ ...rider178, measurements: { heightMm: 1620, inseamMm: 750 } }, frames).map((m) => m.frame.id);
    expect(ids[0]).toBe('race-52');
  });
  it('große Person → großer Rahmen vorn', () => {
    const ids = rankFrames({ ...rider178, measurements: { heightMm: 1930, inseamMm: 920 } }, frames).map((m) => m.frame.id);
    expect(ids[0]).toBe('race-61');
  });
  it('Trail: 1,78 m landet auf M oder L, nicht mit Score 0', () => {
    const r = rankFrames({ ...rider178, discipline: 'mtb-trail' }, frames);
    expect(['trail-m', 'trail-l']).toContain(r[0]!.frame.id);
    expect(r[0]!.score).toBeGreaterThan(60);
  });
  it('discipline: any bewertet alle Rahmen', () => {
    expect(rankFrames(rider178, frames, { discipline: 'any' }).length).toBe(frames.length);
  });
});

describe('matchFrame – harte Kriterien', () => {
  it('Überstandshöhe über Schrittlänge → Score 0 und fail-Note', () => {
    const m = matchFrame({ ...rider178, measurements: { heightMm: 1700, inseamMm: 780 } }, byId('race-61'));
    expect(m.score).toBe(0);
    expect(m.notes.some((n) => n.code === 'standover' && n.severity === 'fail')).toBe(true);
  });
  it('fehlende Überstandshöhe wird als Warnung gemeldet', () => {
    const { standoverMm: _drop, ...noStandover } = byId('race-56');
    const m = matchFrame(rider178, noStandover);
    expect(m.notes.some((n) => n.code === 'standover-unknown')).toBe(true);
  });
  it('viel zu kleiner Rahmen → Sattelstützen-Warnung', () => {
    const m = matchFrame({ ...rider178, measurements: { heightMm: 1950, inseamMm: 940 } }, byId('race-52'));
    expect(m.notes.some((n) => n.code === 'seatpost')).toBe(true);
    expect(m.exposedSeatpostMm).toBeGreaterThan(260);
  });
  it('unpassender Sitzwinkel → Setback-Note', () => {
    const steep = { ...byId('race-56'), seatTubeAngleDeg: 80 };
    const m = matchFrame(rider178, steep);
    expect(m.notes.some((n) => n.code === 'seat-angle')).toBe(true);
    expect(m.saddleSetbackMm).toBeGreaterThan(45);
  });
  it('Score liegt immer zwischen 0 und 100', () => {
    for (const f of frames) {
      const s = matchFrame({ ...rider178, discipline: f.discipline }, f).score;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
