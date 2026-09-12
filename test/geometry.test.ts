import { describe, expect, it } from 'vitest';
import { barPosition } from '../src/cockpit.js';
import { saddlePosition } from '../src/geometry.js';
import type { FrameGeometry } from '../src/types.js';

const frame: FrameGeometry = {
  id: 't', brand: 'x', model: 'y', size: '1', discipline: 'road-race',
  stackMm: 560, reachMm: 390, headTubeAngleDeg: 73, seatTubeAngleDeg: 73.5, headTubeLengthMm: 150,
};

describe('saddlePosition', () => {
  it('liegt hinter und über dem Tretlager', () => {
    const p = saddlePosition(740, 73.5);
    expect(p.x).toBeCloseTo(-740 * Math.cos((73.5 * Math.PI) / 180), 6);
    expect(p.y).toBeCloseTo(740 * Math.sin((73.5 * Math.PI) / 180), 6);
    expect(p.x).toBeLessThan(0);
    expect(p.y).toBeGreaterThan(0);
  });
  it('rückt bei steilerem Sitzwinkel nach vorn', () => {
    expect(saddlePosition(740, 76).x).toBeGreaterThan(saddlePosition(740, 73).x);
  });
});

describe('barPosition', () => {
  it('ohne Spacer, Klemmversatz und Vorbau liegt der Lenker auf der Steuerrohr-Oberkante', () => {
    const p = barPosition(frame, { stemLengthMm: 0, stemAngleDeg: 0, spacersMm: 0 }, 0);
    expect(p.x).toBeCloseTo(390, 6);
    expect(p.y).toBeCloseTo(560, 6);
  });
  it('ein -17°-Vorbau auf 73° Steuerrohr ist waagerecht', () => {
    const p = barPosition(frame, { stemLengthMm: 100, stemAngleDeg: -17, spacersMm: 0 }, 0);
    expect(p.x).toBeCloseTo(490, 6);
    expect(p.y).toBeCloseTo(560, 6);
  });
  it('Spacer wandern entlang der Lenkachse nach hinten-oben', () => {
    const p = barPosition(frame, { stemLengthMm: 0, stemAngleDeg: 0, spacersMm: 20 }, 0);
    expect(p.x).toBeLessThan(390);
    expect(p.y).toBeCloseTo(560 + 20 * Math.sin((73 * Math.PI) / 180), 6);
  });
  it('ein geflippter Vorbau (+6°) liegt höher und kürzer als -6°', () => {
    const down = barPosition(frame, { stemLengthMm: 100, stemAngleDeg: -6, spacersMm: 0 }, 0);
    const up = barPosition(frame, { stemLengthMm: 100, stemAngleDeg: 6, spacersMm: 0 }, 0);
    expect(up.y).toBeGreaterThan(down.y);
    expect(up.x).toBeLessThan(down.x);
  });
  it('Lenker-Rise wird vertikal addiert', () => {
    const a = barPosition(frame, { stemLengthMm: 50, stemAngleDeg: 0, spacersMm: 10 }, 25, 0);
    const b = barPosition(frame, { stemLengthMm: 50, stemAngleDeg: 0, spacersMm: 10 }, 25, 20);
    expect(b.y - a.y).toBeCloseTo(20, 6);
    expect(b.x).toBeCloseTo(a.x, 6);
  });
});
